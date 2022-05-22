class AotGameState {
  constructor({ game, grid, botPlayer, enemyPlayer }) {
    this.game = game;
    this.grid = grid;
    this.botPlayer = botPlayer;
    this.enemyPlayer = enemyPlayer;
    this.currentPlayer = botPlayer;
    this.distinctions = [];
  }

  calcScore() {
    const bot = this.getCurrentPlayer();
    const enemy = this.getCurrentEnemyPlayer();
    bot.metrics.calc(bot, enemy);
  }

  isGameOver() {
    return this.botPlayer.isLose() || this.enemyPlayer.isLose();
  }

  isExtraturn() {
    return this.hasExtraTurn;
  }

  isBotTurn() {
    return this.currentPlayer.sameOne(this.botPlayer);
  }

  switchTurn() {
    if(this.isBotTurn()) {
      this.currentPlayer = this.botPlayer;
    } else {
      this.currentPlayer = this.enemyPlayer;
    }
  }

  getCurrentPlayer() {
    if(this.isBotTurn()) {
      return this.botPlayer;
    }
    return this.enemyPlayer;
  }

  getCurrentEnemyPlayer() {
    if(this.isBotTurn()) {
      return this.enemyPlayer;
    }
    return this.botPlayer;
  }

  copyTurn(other) {
    this.botPlayer = other.botPlayer;
    this.enemyPlayer
  }

  addDistinction(result) {
    this.distinctions.push(result);
  }

  clone() {
    const game = this.game;
    const grid = this.grid.clone();
    const botPlayer = this.botPlayer.clone();
    const enemyPlayer = this.enemyPlayer.clone();
    return new AotGameState({ game, grid, botPlayer, enemyPlayer });
  }
}

class AotMove {
  type = "";
}

class AotCastSkill extends AotMove {
  type = "CAST_SKILL";
  isCastSkill = true;
  constructor(hero) {
    super();
    this.hero = hero;
  }
}

class AotSwapGem extends AotMove {
  type = "SWAP_GEM";
  isSwap = true;
  constructor(swap) {
    super();
    this.swap = swap;
  }
}

class ScaleFn {}

class LinearScale extends ScaleFn {
  constructor(a, b) {
    super();
    this.a = a;
    this.b = b;
  }

  exec(x) {
    return this.a * x + this.b;
  }
}

class AttackDamgeMetric extends ScaleFn {
  exec(gem, hero) {
    return (gem - 3) * hero.attack + hero.attack;
  }
}

class SumScale extends ScaleFn {
  exec(...args) {
    return args.reduce((a, c) => a + c, 0);
  }
}

class TurnEfect {
  attackGem = 0;
  manaGem = {};
  buffAttack = 0;
  buffExtraTurn = 0;
  buffHitPoint = 0;
  buffMana = 0;
  buffPoint = 0;
  maxMatchedSize = 0;

  static fromDistinction(distinction) {
    const turnEffect = new TurnEfect();
    const maxMatchedSize = Math.max(...distinction.matchesSize);
    turnEffect.maxMatchedSize = maxMatchedSize;

    for (const gem of distinction.removedGems) {
      if(gem.type == GemType.SWORD) {
        turnEffect.applyAttack(gem);
      } else {
        turnEffect.applyCollect(gem);
      }

      if(gem.modifier == GemModifier.BUFF_ATTACK) {
        turnEffect.applyBuffAttack(gem);
      }

      if(gem.modifier == GemModifier.EXTRA_TURN) {
        turnEffect.applyExtraTurn(gem);
      }

      if(gem.modifier == GemModifier.HIT_POINT) {
        turnEffect.applyHitPoint(gem);
      }


      if(gem.modifier == GemModifier.MANA) {
        turnEffect.applyMana(gem);
      }

      if(gem.modifier == GemModifier.POINT) {
        turnEffect.applyPoint(gem);
      }
    }

    return turnEffect;
  }
  applyBuffAttack(gem) {
    this.buffAttack += 1;
  }

  applyExtraTurn(gem) {
    this.buffExtraTurn += 1;
  }

  applyHitPoint(gem) {
    this.buffHitPoint += 1;
  }

  applyMana(gem) {
    this.buffMana += 1;
  }

  applyPoint(gem) {
    this.buffPoint += 0;
  }

  applyAttack(gem){
    this.attackGem += 1;
  }

  applyCollect(gem) {
    if(!this.manaGem[gem.type]) {
      this.manaGem[gem.type] = 0;
    }
    this.manaGem[gem.type] += 1;
  }
}

class GameSimulator {
  buffAttackMetric = new LinearScale(2, 0);
  buffHitPointMetric = new LinearScale(2, 0);
  buffManaMetric = new LinearScale(2, 0);
  damgeMetric = new AttackDamgeMetric();

  constructor(state) {
    this.state = state;
  }

  getState() {
    return this.state;
  }

  applyMove(move) {
    if (move.isSwap) {
      this.applySwap(move);
    } else if (move.isCastSkill) {
      this.applyCastSkill(move);
    }
    return this;
  }

  applySwap(move) {
    const { swap } = move;
    const { index1, index2 } = swap;
    const result = this.state.grid.performSwap(index1, index2);
    this.applyDistinctionResult(result);
    return result;
  }

  applyDistinctionResult(result) {
    const turnEffect = TurnEfect.fromDistinction(result);
    this.applyTurnEffect(turnEffect);
    this.state.addDistinction(result);
  }

  applyTurnEffect(turn) {
    this.turnEffect = this.turnEffect;
    this.applyAttack(turn.attackGem);
    for (const [type, value] of Object.entries(turn.manaGem)) {
      this.applyMana(type, value);
    }
    this.applyMaxMatchedSize(turn.maxMatchedSize);
    this.applyBuffAttack(turn.buffAttack);
    this.applyBuffMana(turn.buffMana);
    this.applyHitPoint(turn.buffHitPoint);
    this.applyBuffExtraTurn(turn.buffExtraTurn);
  }

  applyMaxMatchedSize(value) {
    if(value >= 5) {
      this.state.hasExtraTurn = value > 0;
    }
  }

  applyBuffExtraTurn(value) {
    if(value > 0) {
      this.state.hasExtraTurn = value > 0;
    }
  }

  applyBuffMana(value) {
    const additionalMana = this.buffManaMetric.exec(value);
    this.state
      .getCurrentPlayer()
      .getHerosAlive()
      .forEach(hero => hero.buffMana(additionalMana));
  }

  applyHitPoint(value) {
    const additionalHp = this.buffHitPointMetric.exec(value);
    this.state
      .getCurrentPlayer()
      .getHerosAlive()
      .forEach(hero => hero.buffHp(additionalHp));
  }

  applyBuffAttack(value) {
    const additionalAttack = this.buffAttackMetric.exec(value);
    this.state
      .getCurrentPlayer()
      .getHerosAlive()
      .forEach(hero => hero.buffAttack(additionalAttack));
  }

  applyAttack(attackGem) {
    const myHeroAlive = this.state.getCurrentPlayer().firstHeroAlive();
    const attackDame = this.damgeMetric.exec(attackGem, myHeroAlive);
    const enemyHeroAlive = this.state.getCurrentEnemyPlayer().firstHeroAlive();
    enemyHeroAlive.takeDamge(attackDame);
  }

  applyMana(type, value) {
    const firstAliveHeroCouldReceiveMana = this.state
      .getCurrentPlayer()
      .firstAliveHeroCouldReceiveMana(type);
    if (firstAliveHeroCouldReceiveMana) {
      const maxManaHeroCannCeceive =
        firstAliveHeroCouldReceiveMana.getMaxManaCouldTake();
      const manaToSend = Math.max(value, maxManaHeroCannCeceive);
      firstAliveHeroCouldReceiveMana.takeMana(manaToSend);

      const manaRemains = value - manaToSend;
      if (manaRemains > 0) {
        return this.applyMana(type, manaRemains);
      }
    }
    return value;
  }

  applyCastSkill(move) {}
}

class AttackDamgeScoreMetric {
  exec(hero, enemyPlayer) {
    //todo: check has hero counter phisical damge 
    return hero.attack;
  }
}

class AotLineUpSetup {
  static line = []
  constructor(player, enemy) {
    this.player = player;
    this.enemy = enemy;
    this.metrics = this.createScoreMetrics();
  }

  createScoreMetrics() {
    return new AotScoreMetric(this);
  }

  static isMatched(player) {
    return player.heroes.every(hero => this.line.includes(hero.id))
  }
}

// class AotGeneralLineup extends AotGeneralLineup {

// }

class AotMagniTerraSigmudLineup extends AotLineUpSetup {
  static line = [HeroIdEnum.FIRE_SPIRIT, HeroIdEnum.SEA_SPIRIT, HeroIdEnum.SEA_GOD];

  createScoreMetrics() {
    return new AotMagniTerraSigmudScoreMetric(this);
  }
}

class AotLineUpFactory {
  static lineups = [AotMagniTerraSigmudLineup];
  metrics = null;

  static ofPlayer(player, enemy) {
    for(const lineup of this.lineups) {
      if(lineup.isMatched(player)) {
        return new lineup(player, enemy);
      }
    }

    return new AotGeneralLineup(player, enemy);
  }

}

class AotHeroMetrics {
  sumMetric = new SumScale();
  hpMetric = new LinearScale(1, 0);
  manaMetric = new LinearScale(1, 0);
  maxManaMetric = new LinearScale(0, 3);
  overManaMetric = new LinearScale(-1, 0);
  attackMetric = new AttackDamgeScoreMetric(1, 0);

  static isMatched(hero) {
    return false;
  }

  calcScore(player, enemyPlayer) {
    const hpScore = this.hpMetric.exec(hero.hp);
    const manaScore = this.maxManaMetric.exec(hero.mana);
    const overManaScore = this.overManaMetric.exec(0);
    const attackScore = this.attackMetric.exec(hero, enemyPlayer)
    const heroScore = this.sumMetric.exec(hpScore, manaScore, overManaScore, attackScore);
    return heroScore;
  }
}

class AotGeneralHeroMetrics extends AotHeroMetrics {
  static fromHero(hero, player, enemy) {
    return new this(hero, player, enemy);
  }
}
class AotScoreMetric {
  score = 0;
  heroMetrics = [];
  sumMetric = new SumScale();

  constructor(lineup) {
    for(const hero of lineup.player.heros) {
      const heroMetrics = this.createHeroMetric(hero, player, enemy);
      hero.metrics = heroMetrics;
    }
  }

  createHeroMetric(hero, player, enemy) {
    return new AotGeneralHeroMetrics(hero, player, enemy);
  }

  caclcHeroScore(hero, player, enemyPlayer) {
    const score = hero.metrics.calcScore(hero, player, enemyPlayer);
    return score;
  }

  calcScoreOfPlayer(player, enemyPlayer) {
    const heros = player.getHerosAlive();
    const heroScores = heros.map((hero) => this.caclcHeroScore(hero, player, enemyPlayer));
    const totalHeroScore = this.sumMetric.exec(...heroScores);
    return totalHeroScore;
  }

  calc(player, enemy, state) {
    const myScore = this.calcScoreOfPlayer(player, enemy, state);
    const score = myScore;
    return score;
  }
}

class AotSigmudHeroMetric extends AotHeroMetrics {

}

class AotTerraHeroMetric extends AotHeroMetrics {

}

class AotMagniHeroMetric extends AotHeroMetrics {

}

class AotMagniTerraSigmudScoreMetric extends AotScoreMetric {
  constructor(lineup) {
    super();
  }

  createHeroMetric(hero) {
    if(hero.id == HeroIdEnum.SEA_GOD) {
      return this.createMagniHeroMetric(hero);
    }

    if(hero.id == HeroIdEnum.FIRE_SPIRIT) {
      return this.createSigmudHeroMetric();
    }

    if(hero.id == HeroIdEnum.SEA_SPIRIT) {
      return this.createTerraHeroMetric();
    }
  }

  createMagniHeroMetric(hero) {
    const metric = new AotMagniHeroMetric();
    return metric;
  }

  createTerraHeroMetric() {
    const metric = new AotTerraHeroMetric();
    return metric;
  }

  createSigmudHeroMetric() {
    const metric = new AotSigmudHeroMetric();
    return metric;
  }
}
class AoTStrategy {
  static name = "aot";
  static factory() {
    return new AoTStrategy();
  }

  setGame({ game, grid, botPlayer, enemyPlayer }) {
    this.game = game;

    this.initPlayer(botPlayer);
    this.initPlayer(enemyPlayer);
    
    this.state = new AotGameState({ grid, botPlayer, enemyPlayer });
    this.snapshots = [];
  }

  initPlayer(player) {
    player.lineup = AotLineUpFactory.ofPlayer(player, enemy);
    player.metrics = lineup.metrics;
  }

  playTurn() {
    console.log(`${AoTStrategy.name}: playTurn`);
    const action = this.chooseBestPosibleMove(this.state, 1);
    if(!action) {
      console.log("Cannot choose");
      return;
    }
    if (action.isCastSkill) {
      console.log(`${AoTStrategy.name}: isCastSkill`);
      this.castSkillHandle(action.hero);
    } else if (action.isSwap) {
      console.log(`${AoTStrategy.name}: isSwap`);
      this.swapGemHandle(action.swap);
    }
  }

  getCurrentState() {
    return this.state.clone();
  }

  chooseBestPosibleMove(state, deep = 2) {
    console.log(`${AoTStrategy.name}: chooseBestPosibleMove`);
    const posibleMoves = this.getAllPosibleMove(state);
    if(!posibleMoves || posibleMoves.length == 0) {
      return null;
    }
    let currentBestMove = posibleMoves[0];
    let currentBestMoveScore = Number.NEGATIVE_INFINITY;
    for (const move of posibleMoves) {
      const futureState = this.seeFutureState(move, state, deep);
      const simulateMoveScore = this.compareScoreOnStates(state, futureState);
      console.log(
        `${AoTStrategy.name}: simulateMoveScore  ${simulateMoveScore}`
      );

      if (simulateMoveScore > currentBestMoveScore) {
        currentBestMove = move;
        currentBestMoveScore = simulateMoveScore;
      }
    }
    return currentBestMove;
  }

  seeFutureState(move, state, deep) {
    console.log("See the future", deep);
    if (deep === 0 || !move) {
      return state;
    }

    if(state.isGameOver()) {
      return state;
    }

    const clonedState = state.clone();
    clonedState.hasExtraTurn = false;

    const futureState = this.applyMoveOnState(move, clonedState);
    if (futureState.isExtraturn()) {
      const newMove = this.chooseBestPosibleMove(futureState, deep);
      return this.seeFutureState(newMove, futureState, deep);
    }

    futureState.switchTurn();
    const newMove = this.chooseBestPosibleMove(futureState, deep - 1);
    const afterState = this.seeFutureState(newMove, futureState, deep - 1);
    return afterState;
  }

  compareScoreOnStates(state1, state2) {
    console.log(`${AoTStrategy.name}: compareScoreOnState`);
    const score1 = this.caculateScoreOnState(state1);
    
    const state2Cloned = state2.clone();
    if(!state2Cloned.getCurrentPlayer().sameOne(state1.getCurrentPlayer())) {
      state2Cloned.switchTurn();
    }

    const score2 = this.caculateScoreOnState(state2Cloned);

    return score2 - score1;
  }

  caculateScoreOnState(state) {
    const score = state.calcScore();
    return score;
  }

  applyMoveOnState(move, state) {
    const cloneState = state.clone();
    const simulator = new GameSimulator(cloneState);
    simulator.applyMove(move);
    const newState = simulator.getState();
    return newState;
  }

  getAllPosibleMove(state) {
    const posibleSkillCasts = this.getAllPosibleSkillCast(state);
    const posibleGemSwaps = this.getAllPosibleGemSwap(state);
    return [...posibleSkillCasts, ...posibleGemSwaps];
  }

  getAllPosibleSkillCast(state) {
    const currentPlayer = state.getCurrentPlayer();
    const castableHeros = currentPlayer.getCastableHeros();

    const posibleCastOnHeros = castableHeros.map((hero) =>
      this.posibleCastOnHero(hero, state)
    );
    const allPosibleCasts = [].concat(...posibleCastOnHeros);

    return allPosibleCasts;
  }

  posibleCastOnHero(hero, state) {
    // const casts = [new AotCastSkill(hero)];
    const casts = [];
    return casts;
  }

  getAllPosibleGemSwap(state) {
    const allPosibleSwaps = state.grid.suggestMatch();
    const allSwapMove = allPosibleSwaps.map((swap) => new AotSwapGem(swap));

    return allSwapMove;
  }

  addSwapGemHandle(callback) {
    this.swapGemHandle = callback;
  }

  addCastSkillHandle(callback) {
    this.castSkillHandle = callback;
  }
}

class SeeTheFutureStrategy extends AoTStrategy {
  static name = "see";
  static factory() {
    const strategy = new SeeTheFutureStrategy();
    return strategy;
  }
}

window.strategies = {
  ...(window.strategies || {}),
  [AoTStrategy.name]: AoTStrategy,
  [SeeTheFutureStrategy.name]: SeeTheFutureStrategy,
};
