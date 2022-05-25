// REQUEST command
const SWAP_GEM = "Battle.SWAP_GEM";
const USE_SKILL = "Battle.USE_SKILL";
const SURRENDER = "Battle.SURRENDER";
const FINISH_TURN = "Battle.FINISH_TURN";
const I_AM_READY = "Battle.I_AM_READY";

const LOBBY_FIND_GAME = "LOBBY_FIND_GAME";
const PLAYER_JOINED_GAME = "PLAYER_JOINED_GAME";

// RESPONSE command
const LEAVE_ROOM = "LEAVE_ROOM";
const START_GAME = "START_GAME";
const END_GAME = "END_GAME";
const START_TURN = "START_TURN";
const END_TURN = "END_TURN";

const ON_SWAP_GEM = "ON_SWAP_GEM";
const ON_PLAYER_USE_SKILL = "ON_PLAYER_USE_SKILL";

const BATTLE_MODE = "BATTLE_MODE";

const ENEMY_PLAYER_ID = 0;
const BOT_PLAYER_ID = 2;

const delaySwapGem = 2000;
const delayFindGame = 5000;

const SINGLEATTACKHEROS = ["DISPATER", "SKELETON", "FIRE_SPIRIT"];
const BUFFHEROS = ["SEA_SPIRIT", "MONK", "MERMAID"];

var sfs;
var room;

var botPlayer;
var enemyPlayer;
var currentPlayerId;
var grid;

const username = "manh.nguyenvan";
const token = "eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJtYW5oLm5ndXllbnZhbiIsImF1dGgiOiJST0xFX1VTRVIiLCJMQVNUX0xPR0lOX1RJTUUiOjE2NTM0NzM2NzAyNTAsImV4cCI6MTY1NTI3MzY3MH0.rtFPjxh--Hdc-LCvspC5tgvWakKuqbeusOjm3nCYSlQkWqSK2wTbw0l5v8BKpr-gcdWU1dyBXUPJDIuJCzYclw";
var visualizer = new Visualizer({ el: '#visual' });
var params = window.params;
var strategy = window.strategy;
visualizer.start();

// Connect to Game server
initConnection();

if (params.username) {
	document.querySelector('#accountIn').value = params.username;
}

function initConnection() {
	document.getElementById("log").innerHTML = "";

	trace("Connecting...");

	// Create configuration object
	var config = {};
	config.host = "172.16.100.112";
	config.port = 8080;
	// config.host = "10.10.10.18";
	// config.port = 8888;
	//config.debug = true;
	config.useSSL = false;

	// Create SmartFox client instance
	sfs = new SFS2X.SmartFox(config);

	// Set logging
	sfs.logger.level = SFS2X.LogLevel.INFO;
	sfs.logger.enableConsoleOutput = true;
	sfs.logger.enableEventDispatching = true;

	sfs.logger.addEventListener(SFS2X.LoggerEvent.DEBUG, onDebugLogged, this);
	sfs.logger.addEventListener(SFS2X.LoggerEvent.INFO, onInfoLogged, this);
	sfs.logger.addEventListener(SFS2X.LoggerEvent.WARNING, onWarningLogged, this);
	sfs.logger.addEventListener(SFS2X.LoggerEvent.ERROR, onErrorLogged, this);

	sfs.addEventListener(SFS2X.SFSEvent.CONNECTION, onConnection, this);
	sfs.addEventListener(SFS2X.SFSEvent.CONNECTION_LOST, onConnectionLost, this);

	sfs.addEventListener(SFS2X.SFSEvent.LOGIN_ERROR, onLoginError, this);
	sfs.addEventListener(SFS2X.SFSEvent.LOGIN, onLogin, this);

	sfs.addEventListener(SFS2X.SFSEvent.ROOM_JOIN, OnRoomJoin, this);
	sfs.addEventListener(SFS2X.SFSEvent.ROOM_JOIN_ERROR, OnRoomJoinError, this);
	sfs.addEventListener(SFS2X.SFSEvent.EXTENSION_RESPONSE, OnExtensionResponse, this);

	// Attempt connection
	sfs.connect();
}

function onDisconnectBtClick() {
	// Log message
	trace("Disconnecting...");

	// Disconnect
	sfs.disconnect();
}

//------------------------------------
// LOGGER EVENT HANDLERS
//------------------------------------

function onDebugLogged(event) {
	trace(event.message, "DEBUG", true);
}

function onInfoLogged(event) {
	trace(event.message, "INFO", true);
}

function onWarningLogged(event) {
	trace(event.message, "WARN", true);
}

function onErrorLogged(event) {
	trace(event.message, "ERROR", true);
}

//------------------------------------
// SFS EVENT HANDLERS
//------------------------------------

function onConnection(event) {
	if (event.success) {
		trace("Connected to SmartFoxServer 2X!<br>SFS2X API version: " + sfs.version + "<br> IP: " + sfs.config.host);
	}
	else {
		trace("Connection failed: " + (event.errorMessage ? event.errorMessage + " (" + event.errorCode + ")" : "Is the server running at all?"));

		// Reset
		reset();
	}
}

function onConnectionLost(event) {
	trace("Disconnection occurred; reason is: " + event.reason);

	reset();
}

//------------------------------------
// OTHER METHODS
//------------------------------------

function trace(message, prefix, isDebug) {
	var text = document.getElementById("log").innerHTML;

	var open = "<div" + (isDebug ? " class='debug'" : "") + ">" + (prefix ? "<strong>[SFS2X " + prefix + "]</strong><br>" : "");
	var close = "</div>";

	if (isDebug)
		message = "<pre>" + message.replace(/(?:\r\n|\r|\n)/g, "<br>") + "</pre>";

	const log = text + open + message + close;
	document.getElementById("log").innerHTML = log;
	visualizer.log(log);
}

function reset() {
	// Remove SFS2X listeners
	sfs.removeEventListener(SFS2X.SFSEvent.CONNECTION, onConnection);
	sfs.removeEventListener(SFS2X.SFSEvent.CONNECTION_LOST, onConnectionLost);

	sfs.logger.removeEventListener(SFS2X.LoggerEvent.DEBUG, onDebugLogged);
	sfs.logger.removeEventListener(SFS2X.LoggerEvent.INFO, onInfoLogged);
	sfs.logger.removeEventListener(SFS2X.LoggerEvent.WARNING, onWarningLogged);
	sfs.logger.removeEventListener(SFS2X.LoggerEvent.ERROR, onErrorLogged);

	sfs = null;
}

function onLoginBtnClick() {
	let uName = username || document.querySelector('#accountIn').value;
	trace("Try login as " + uName);

	let data = new SFS2X.SFSObject();
	data.putUtfString("BATTLE_MODE", "NORMAL");
	data.putUtfString("ID_TOKEN", token);
	data.putUtfString("NICK_NAME", uName);

	var isSent = sfs.send(new SFS2X.LoginRequest(uName, "", data, "gmm"));

	if (isSent) trace("Sent");
}

function onLoginError(event) {
	var error = "Login error: " + event.errorMessage + " (code " + event.errorCode + ")";
	trace(error);
}

function onLogin(event) {
	trace("Login successful!" +
		"\n\tZone: " + event.zone +
		"\n\tUser: " + event.user);

	document.getElementById("loginBtn").style.visibility = "hidden";
	document.getElementById("findBtn").style.visibility = "visible";
}

function findGame() {
	var data = new SFS2X.SFSObject();
	data.putUtfString("type", "");
	data.putUtfString("adventureId", "");
	sfs.send(new SFS2X.ExtensionRequest("LOBBY_FIND_GAME", data));
}

function OnRoomJoin(event) {
	trace("OnRoomJoin " + event.room.name);

	room = event.room;
}

function OnRoomJoinError(event) {
	trace("OnRoomJoinError");
}

function OnExtensionResponse(event) {
	let evtParam = event.params;
	var cmd = event.cmd;
	trace("OnExtensionResponse " + cmd);

	switch (cmd) {
		case "START_GAME":
			let gameSession = evtParam.getSFSObject("gameSession");
			StartGame(gameSession, room);
			break;
		case "END_GAME":
			EndGame();
			break;
		case "START_TURN":
			StartTurn(evtParam);
			break;
		case "ON_SWAP_GEM":
			SwapGem(evtParam);
			break;
		case "ON_PLAYER_USE_SKILL":
			HandleGems(evtParam);
			break;
		case "PLAYER_JOINED_GAME":
			sfs.send(new SFS2X.ExtensionRequest(I_AM_READY, new SFS2X.SFSObject(), room));
			break;
	}
}
//-------------------------------
// HELPER method
function getCountGem(gemType) {
	let countGem = 0;
	grid.gems.forEach(gem => {
		gem.type == gemType && countGem++;
	});
	return countGem;
}

function enemyTeamHaveFate() {
	return enemyPlayer.getHerosAlive().some(hero => hero.id == "DISPATER");
}

function enemyTeamHaveFireSpirit() {
	return enemyPlayer.getHerosAlive().some(hero => hero.id == "FIRE_SPIRIT");
}

function getDameEnemyFireSpirit() {
	let countRedGem = getCountGem(3);
	const myHeros = botPlayer.getHerosAlive();
	let attackEnemy = [];
	myHeros.forEach(hero => {
		attackEnemy.push(hero.attack + countRedGem);
	});
	return attackEnemy;
}

function getDameMyFireSpirit() {
	let countRedGem = getCountGem(3);
	const myHeros = enemyPlayer.getHerosAlive();
	let attackEnemy = [];
	myHeros.forEach(hero => {
		attackEnemy.push(hero.attack + countRedGem);
	});
	return attackEnemy;
}

function isHaveSeaGodFullMana() {
	const seaGod = enemyPlayer.getHerosAlive().find(h => h.id == "SEA_GOD");
	return seaGod !=null && seaGod.mana >= seaGod.maxMana;
}

function isHeroSingleAttack(hero) {
	return SINGLEATTACKHEROS.includes(hero) ? true : false;
}

function isHeroBuff(hero) {
	return BUFFHEROS.includes(hero) ? true : false;
}
// END helper method

function StartGame(gameSession, room) {
	// Assign Bot player & enemy player
	AssignPlayers(room);

	// Player & Heroes
	let objBotPlayer = gameSession.getSFSObject(botPlayer.displayName);
	let objEnemyPlayer = gameSession.getSFSObject(enemyPlayer.displayName);

	let botPlayerHero = objBotPlayer.getSFSArray("heroes");
	let enemyPlayerHero = objEnemyPlayer.getSFSArray("heroes");

	for (let i = 0; i < botPlayerHero.size(); i++) {
		botPlayer.heroes.push(new Hero(botPlayerHero.getSFSObject(i)));
	}

	for (let i = 0; i < enemyPlayerHero.size(); i++) {
		enemyPlayer.heroes.push(new Hero(enemyPlayerHero.getSFSObject(i)));
	}

	// Gems
	grid = new Grid(gameSession.getSFSArray("gems"), null, botPlayer.getRecommendGemType());
	currentPlayerId = gameSession.getInt("currentPlayerId");
	trace("StartGame ");

	setTimeout(function () { SendFinishTurn(true) }, delaySwapGem);
	visualizer.setGame({
		game: gameSession,
		grid,
		botPlayer,
		enemyPlayer,
	});

	if (strategy) {
		strategy.setGame({
			game: gameSession,
			grid,
			botPlayer,
			enemyPlayer,
		});

		strategy.addSwapGemHandle(SendSwapGem);
		strategy.addCastSkillHandle(SendCastSkill);
	}

}

function AssignPlayers(room) {

	let users = room.getPlayerList();

	let user1 = users[0];

	let arrPlayerId1 = Array.from(user1._playerIdByRoomId).map(([name, value]) => (value));
	let playerId1 = arrPlayerId1.length > 1 ? arrPlayerId1[1] : arrPlayerId1[0];


	log("id user1: " + playerId1);

	log("users.length : " + users.length);

	if (users.length == 1) {
		if (user1.isItMe) {

			botPlayer = new Player(playerId1, "player1");
			enemyPlayer = new Player(ENEMY_PLAYER_ID, "player2");
		} else {
			botPlayer = new Player(BOT_PLAYER_ID, "player2");
			enemyPlayer = new Player(ENEMY_PLAYER_ID, "player1");
		}
		return;
	}

	let user2 = users[1];

	let arrPlayerId2 = Array.from(user2._playerIdByRoomId).map(([name, value]) => (value));
	let playerId2 = arrPlayerId2.length > 1 ? arrPlayerId2[1] : arrPlayerId2[0];

	log("id user2: " + playerId2);

	log("id user1: " + playerId1);

	if (user1.isItMe) {
		botPlayer = new Player(playerId1, "player" + playerId1);
		enemyPlayer = new Player(playerId2, "player" + playerId2);
	}
	else {
		botPlayer = new Player(playerId2, "player" + playerId2);
		enemyPlayer = new Player(playerId1, "player" + playerId1);
	}
}

function EndGame() {
	isJoinGameRoom = false;

	document.getElementById("log").innerHTML = "";
	visualizer.snapShot();
}

function SendFinishTurn(isFirstTurn) {
	let data = new SFS2X.SFSObject();
	data.putBool("isFirstTurn", isFirstTurn);
	log("sendExtensionRequest()|room:" + room.name + "|extCmd:" + FINISH_TURN + " first turn " + isFirstTurn);
	trace("sendExtensionRequest()|room:" + room.name + "|extCmd:" + FINISH_TURN + " first turn " + isFirstTurn);

	SendExtensionRequest(FINISH_TURN, data);
}

function castFireSkill() {
	let killableArr = [];

	killableArr = enemyPlayer.getHerosAlive().map(item => {
		if (isFireKillable(item.hp, item.attack, getCountGem(3))) {
			return item;
		}
	}).filter(item => item !== undefined).sort(compareAttack);

	killableArr.length > 0 ? 
	SendCastSkill(botPlayer.heroes[1], { targetId: killableArr[0].id }) : 
	buffEnemyHasSkill().length > 0 ? SendSwapGem() : 
	SendCastSkill(botPlayer.heroes[1], { targetId: enemyHighestAttack().id });
}

function StartTurn(param) {
	setTimeout(function() {
		visualizer.snapShot();
		currentPlayerId = param.getInt("currentPlayerId");
		if (!isBotTurn()) {
			trace("not isBotTurn");
			return;
		}

		if (strategy) {
			strategy.playTurn();
			return;
		}

		let matchGemSizeThanFour = grid.suggestMatch().find(gemMatch => gemMatch.sizeMatch > 4);
		console.log("5", matchGemSizeThanFour);
		if (matchGemSizeThanFour) {
			SendSwapGem(matchGemSizeThanFour)
			return;
		}

		let matchGemSizeThanThree = grid.suggestMatch().find(gemMatch => gemMatch.sizeMatch > 3);

		console.log("4", matchGemSizeThanThree);
		if (matchGemSizeThanThree) {
			SendSwapGem(matchGemSizeThanThree)
			return;
		}

		if (botPlayer.heroes[0].isFullMana() && botPlayer.heroes[2].isFullMana()) {
			SendCastSkill(botPlayer.heroes[0], { targetId: botPlayer.heroes[2].id })
			SendCastSkill(botPlayer.heroes[2])
		}

		if (botPlayer.heroes[0].isFullMana()) {
			botPlayer.heroes[2].isAlive() ?
			SendCastSkill(botPlayer.heroes[0], { targetId: botPlayer.heroes[2].id }) :
			SendCastSkill(botPlayer.heroes[0], { targetId: "SEA_SPIRIT" });
		}

		if (botPlayer.heroes[2].isFullMana()) {
			SendCastSkill(botPlayer.heroes[2])
		}

		if (isHaveSeaGodFullMana()) {
			if (botPlayer.heroes[1].isFullMana()) {
				let killableArr = [];

				killableArr = enemyPlayer.getHerosAlive().map(item => {
					if (isFireKillable(item.hp, item.attack, getCountGem(3))) {
						return item;
					}
				}).filter(item => item !== undefined).sort(compareAttack);

				killableArr.length > 0 &&
				SendCastSkill(botPlayer.heroes[1], { targetId: killableArr[0].id });
			}
		}

		if (botPlayer.heroes[1].isFullMana()) {
			castFireSkill();
		}

		SendSwapGem()
	
	}, delaySwapGem);
}

function compare( a, b ) {
	if ( a.hp < b.hp ){
	  return -1;
	}
	if ( a.hp > b.hp ){
	  return 1;
	}
	return 0;
}

function compareAttack( a, b ) {
	if ( a.attack > b.attack ){
	  return -1;
	}
	if ( a.attack < b.attack ){
	  return 1;
	}
	return 0;
}

function enemyHighestAttack() {
	return enemyPlayer.heroes.sort(compareAttack)[0];
}

function buffEnemyHasSkill() {
	return enemyPlayer.heroes.filter((item) => isHeroBuff(item.id) && item.isFullMana())
}

function enemyLowestHP() {
	return enemyPlayer.heroes.sort(compare)[0];
}

function isFireKillable(hp, attack, gem) {
	return hp - (attack + gem) <= 0 ? true : false
}

function GetBuffEnemy() {
	return enemyPlayer.heroes.filter((item) => item.id === 'MONK' || item.id === 'SEA_SPIRIT' || item.id === 'MERMAID');
}

function isBotTurn() {
	return botPlayer.playerId == currentPlayerId;
}

function SendCastSkill(heroCastSkill, { targetId, selectedGem, gemIndex, isTargetAllyOrNot } = {}) {
	var data = new SFS2X.SFSObject();
	data.putUtfString("casterId", heroCastSkill.id.toString());
	if (targetId) {
		data.putUtfString("targetId", targetId);
	} else if (heroCastSkill.isHeroSelfSkill()) {
		data.putUtfString("targetId", botPlayer.firstHeroAlive().id.toString());
	} else {
		data.putUtfString("targetId", enemyPlayer.firstHeroAlive().id.toString());
	}
	if (selectedGem) {
		data.putUtfString("selectedGem", selectedGem);
	} {
		data.putUtfString("selectedGem", SelectGem().toString());
	}
	if (gemIndex) {
		data.putUtfString("gemIndex", gemIndex);
	} {
		data.putUtfString("gemIndex", GetRandomInt(64).toString());
	}

	if (isTargetAllyOrNot) {
		data.putBool("isTargetAllyOrNot", isTargetAllyOrNot);
	} else {
		data.putBool("isTargetAllyOrNot", false);
	}
	log("sendExtensionRequest()|room:" + room.Name + "|extCmd:" + USE_SKILL + "|Hero cast skill: " + heroCastSkill.name);
	trace("sendExtensionRequest()|room:" + room.Name + "|extCmd:" + USE_SKILL + "|Hero cast skill: " + heroCastSkill.name);

	SendExtensionRequest(USE_SKILL, data);
	SendExtensionRequest(END_TURN, data);
}

function SendSwapGem(swap) {

	let indexSwap = swap ? swap.getIndexSwapGem() : grid.recommendSwapGem();
	log("sendExtensionRequest()|room:" + room.Name + "|extCmd:" + SWAP_GEM + "|index1: " + indexSwap[0] + " index2: " + indexSwap[1]);
	trace("sendExtensionRequest()|room:" + room.Name + "|extCmd:" + SWAP_GEM + "|index1: " + indexSwap[0] + " index2: " + indexSwap[1]);
	
	var data = new SFS2X.SFSObject();
	if(swap) {
		data.putInt("index1", parseInt(indexSwap[0]));
		data.putInt("index2", parseInt(indexSwap[1]));
		SendExtensionRequest(SWAP_GEM, data);
		return;
	}

	var myFirstHero = botPlayer.getHerosAlive()[0];
	var enemyFirstHero = enemyPlayer.getHerosAlive()[0];
	if(myFirstHero.attack >= enemyFirstHero.hp) {
		indexSwap.listMatchGem.forEach(item => {
			if(item.type == 0) {
				data.putInt("index1", parseInt(item.index1));
				data.putInt("index2", parseInt(item.index2));
				
				console.log("listMatchGemHUHUHUHU",data);
				SendExtensionRequest(SWAP_GEM, data);
				return;
			};
		});
	}

	if(enemyTeamHaveFate()) {
		indexSwap.listMatchGem.forEach(item => {
			if(item.type == 3) {
				data.putInt("index1", parseInt(item.index1));
				data.putInt("index2", parseInt(item.index2));
				
				console.log("listMatchGemHUHUHUHU",data);
				SendExtensionRequest(SWAP_GEM, data);
				return;
			};
		});
	};

	const brownGemMatch = findGemTypeMatch(indexSwap.listMatchGem, 6);
	const blueGemMatch = findGemTypeMatch(indexSwap.listMatchGem, 5);
	const greenGemMatch = findGemTypeMatch(indexSwap.listMatchGem, 1);
	const yellowGemMatch = findGemTypeMatch(indexSwap.listMatchGem, 2);
	const redGemMatch = findGemTypeMatch(indexSwap.listMatchGem, 3);
	const purpleGemMatch = findGemTypeMatch(indexSwap.listMatchGem, 4);
	const swordGemMatch = findGemTypeMatch(indexSwap.listMatchGem, 0);

	if(botPlayer.heroes[0].isAlive() && yellowGemMatch.length > 0) {
		data.putInt("index1", parseInt(yellowGemMatch[0].index1));
		data.putInt("index2", parseInt(yellowGemMatch[0].index2));
		
		SendExtensionRequest(SWAP_GEM, data);
		return;
	} else if (botPlayer.heroes[0].isAlive() && greenGemMatch.length > 0) {
		data.putInt("index1", parseInt(greenGemMatch[0].index1));
		data.putInt("index2", parseInt(greenGemMatch[0].index2));
		
		SendExtensionRequest(SWAP_GEM, data);
		return
	} else if (botPlayer.heroes[2].isAlive() && brownGemMatch.length > 0) {
		data.putInt("index1", parseInt(brownGemMatch[0].index1));
		data.putInt("index2", parseInt(brownGemMatch[0].index2));
		
		SendExtensionRequest(SWAP_GEM, data);
		return
	} else if (botPlayer.heroes[2].isAlive() && blueGemMatch.length > 0) {
		data.putInt("index1", parseInt(blueGemMatch[0].index1));
		data.putInt("index2", parseInt(blueGemMatch[0].index2));
		
		SendExtensionRequest(SWAP_GEM, data);
		return
	} else if (botPlayer.heroes[1].isAlive() && redGemMatch.length > 0) {
		data.putInt("index1", parseInt(redGemMatch[0].index1));
		data.putInt("index2", parseInt(redGemMatch[0].index2));
		
		SendExtensionRequest(SWAP_GEM, data);
		return
	} else if (botPlayer.heroes[1].isAlive() && purpleGemMatch.length > 0) {
		data.putInt("index1", parseInt(purpleGemMatch[0].index1));
		data.putInt("index2", parseInt(purpleGemMatch[0].index2));
		
		SendExtensionRequest(SWAP_GEM, data);
		return
	} else if (swordGemMatch.length > 0) {
		data.putInt("index1", parseInt(swordGemMatch[0].index1));
		data.putInt("index2", parseInt(swordGemMatch[0].index2));
		
		SendExtensionRequest(SWAP_GEM, data);
		return
	}

	data.putInt("index1", parseInt(indexSwap.matchGemFirst[0]));
	data.putInt("index2", parseInt(indexSwap.matchGemFirst[1]));
	SendExtensionRequest(SWAP_GEM, data);
}

function findGemTypeMatch(listMatchGem, gemType) {
	return listMatchGem.filter(gem => gem.type == gemType);
}

function SwapGem(param) {
	let isValidSwap = param.getBool("validSwap");
	if (!isValidSwap) {
		return;
	}

	HandleGems(param);
}


function HandleGems(paramz) {
	let gameSession = paramz.getSFSObject("gameSession");
	currentPlayerId = gameSession.getInt("currentPlayerId");
	//get last snapshot
	let snapshotSfsArray = paramz.getSFSArray("snapshots");
	let lastSnapshot = snapshotSfsArray.getSFSObject(snapshotSfsArray.size() - 1);
	let needRenewBoard = paramz.containsKey("renewBoard");
	// update information of hero
	HandleHeroes(lastSnapshot);
	if (needRenewBoard) {
		grid.updateGems(paramz.getSFSArray("renewBoard"), null);
		// TaskSchedule(delaySwapGem, _ => SendFinishTurn(false));
		setTimeout(function () { SendFinishTurn(false) }, delaySwapGem);
		return;
	}
	// update gem
	grid.gemTypes = botPlayer.getRecommendGemType();

	let gemCode = lastSnapshot.getSFSArray("gems");
	let gemModifiers = lastSnapshot.getSFSArray("gemModifiers");

	grid.updateGems(gemCode, gemModifiers);
	// SendExtensionRequest(END_TURN);
	// setTimeout(function () { SendFinishTurn(false) }, delaySwapGem);
}

function HandleHeroes(paramz) {
	let heroesBotPlayer = paramz.getSFSArray(botPlayer.displayName);
	for (let i = 0; i < botPlayer.heroes.length; i++) {
		botPlayer.heroes[i].updateHero(heroesBotPlayer.getSFSObject(i));
	}

	let heroesEnemyPlayer = paramz.getSFSArray(enemyPlayer.displayName);
	for (let i = 0; i < enemyPlayer.heroes.length; i++) {
		enemyPlayer.heroes[i].updateHero(heroesEnemyPlayer.getSFSObject(i));
	}
}


var log = function (msg) {
	console.log("truong : " + "|" + msg);
}


function SendExtensionRequest(extCmd, paramz) {
	sfs.send(new SFS2X.ExtensionRequest(extCmd, paramz, room));
}

function GetRandomInt(max) {
	return Math.floor(Math.random() * max);
}


function SelectGem() {
	let recommendGemType = botPlayer.getRecommendGemType();

	let gemSelect = Array.from(recommendGemType).find(gemType => Array.from(grid.gemTypes).includes(gemType));

	return gemSelect;
}