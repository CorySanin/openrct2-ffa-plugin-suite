var MINIMUM_STARTING_DOLLARS = 10000;
var initialDollars;
var playerProfiles;
var rideCreators;
function individualEconMain() {
    if (network.mode === 'server') {
        playerProfiles = {};
        rideCreators = {};
        initialDollars = Math.max(MINIMUM_STARTING_DOLLARS, park.cash);
        context.subscribe('action.query', function (e) {
            if ('cost' in e.result && e.result.cost >= 0 && e.player !== -1) {
                var playerCash = getPlayerCash(e.player);
                if (playerCash < e.result.cost) {
                    network.sendMessage("ERROR: Not enough cash to perform that action! It costs " + e.result.cost + " and you have " + playerCash, [e.player]);
                    e.result = {
                        error: 1,
                        errorTitle: 'NOT ENOUGH CASH MONEY',
                        errorMessage: 'Can\'t afford to perform action'
                    };
                }
            }
        });
        context.subscribe('action.execute', function (e) {
            if (e.player !== -1) {
                if (e.action === 'ridecreate' &&
                    'ride' in e.result) {
                    addRide(e.player, e.result['ride']);
                }
                else if (e.action === 'ridedemolish' &&
                    'ride' in e.args) {
                    removeRide(e.args['ride']);
                }
                if ('cost' in e.result) {
                    spendMoney(e.player, e.result.cost);
                }
            }
        });
        context.subscribe('network.chat', function (e) {
            if (e.message.toLowerCase() === '!cash') {
                network.sendMessage("Your current balance is " + getPlayerCash(e.player), [e.player]);
            }
        });
    }
}
function getPlayer(playerID) {
    if (playerID === -1) {
        return null;
    }
    var player = network.getPlayer(playerID);
    if (!(player.publicKeyHash in playerProfiles)) {
        playerProfiles[player.publicKeyHash] = {
            moneySpent: 0,
            ridesCreated: []
        };
        setCheatAction(16, initialDollars);
        network.sendMessage("This server uses ffa-individual-economy. You currently have a balance of " + initialDollars + " to build with.", [playerID]);
        network.sendMessage("To see your balance at any time, say `!cash` in chat.", [playerID]);
    }
    return player;
}
function spendMoney(playerID, cost) {
    var player = getPlayer(playerID);
    playerProfiles[player.publicKeyHash].moneySpent += cost;
}
function getPlayerCash(playerID) {
    var player = getPlayer(playerID);
    var cash = initialDollars - playerProfiles[player.publicKeyHash].moneySpent;
    for (var i = 0; i < playerProfiles[player.publicKeyHash].ridesCreated.length; i++) {
        cash += map.getRide(playerProfiles[player.publicKeyHash].ridesCreated[i]).totalProfit;
    }
    return cash;
}
function addRide(playerID, rideID) {
    var player = getPlayer(playerID);
    if (playerProfiles[player.publicKeyHash].ridesCreated.indexOf(rideID) === -1) {
        playerProfiles[player.publicKeyHash].ridesCreated.push(rideID);
    }
    rideCreators[rideID] = player.publicKeyHash;
}
function removeRide(rideID) {
    var playerHash = rideCreators[rideID];
    var index = playerProfiles[playerHash].ridesCreated.indexOf(rideID);
    if (index !== -1) {
        playerProfiles[playerHash].ridesCreated.splice(index, 1);
    }
    delete rideCreators[rideID];
}
function setCheatAction(type, param1, param2) {
    if (param1 === void 0) { param1 = 1; }
    if (param2 === void 0) { param2 = 0; }
    context.executeAction('setcheataction', {
        type: type,
        param1: param1,
        param2: param2
    }, doNothing);
}
function doNothing() {
}
registerPlugin({
    name: 'ffa-individual-economy',
    version: '0.0.1',
    minApiVersion: 2,
    authors: ['Cory Sanin'],
    type: 'remote',
    licence: 'GPL-3.0',
    main: individualEconMain
});
