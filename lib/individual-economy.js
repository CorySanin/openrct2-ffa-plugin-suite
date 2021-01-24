var MINIMUM_STARTING_DOLLARS = 10000;
var buildActions = [
    'bannerplace',
    'bannerremove',
    'clearscenery',
    'footpathplace',
    'footpathplacefromtrack',
    'foothpathremove',
    'footpathsceneryplace',
    'footpathsceneryremove',
    'landbuyrights',
    'landlower',
    'landraise',
    'largesceneryplace',
    'largesceneryremove',
    'mazeplacetrack',
    'mazesettrack',
    'parkmarketing',
    'parksetloan',
    'ridecreate',
    'ridedemolish',
    'smallsceneryplace',
    'smallsceneryremove',
    'surfacesetstyle',
    'tilemodify',
    'trackdesign',
    'trackplace',
    'trackremove',
    'wallplace',
    'wallremove',
    'waterlower',
    'waterraise'
];
var initialDollars;
var playerProfiles;
var rideProperties;
if (typeof context.setTimeout !== 'function') {
    context.setTimeout = function (callback, delay) {
        callback();
        return -1;
    };
}
function individualEconMain() {
    if (network.mode === 'server') {
        playerProfiles = {};
        rideProperties = {};
        initialDollars = Math.max(MINIMUM_STARTING_DOLLARS, park.cash);
        context.subscribe('network.join', function (e) {
            context.setTimeout(function () { return network.sendMessage("{NEWLINE}{YELLOW}This server uses ffa-individual-economy.{NEWLINE}To see your balance at any time, say `{WHITE}!cash{YELLOW}` in chat.", [e.player]); }, 1000);
        });
        context.subscribe('action.query', function (e) {
            if ('cost' in e.result && e.result.cost >= 0 && e.player !== -1) {
                var playerCash = getPlayerCash(e.player);
                if (buildActions.indexOf(e.action) >= 0) {
                    setCheatAction(17, playerCash);
                }
                if (playerCash < e.result.cost) {
                    network.sendMessage("{RED}ERROR: Not enough cash to perform that action! It costs " + e.result.cost + " and you have " + playerCash, [e.player]);
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
                var player = e.player;
                if (e.action === 'ridecreate' &&
                    'ride' in e.result) {
                    addRide(e.player, e.result['ride']);
                }
                else if (e.action === 'ridedemolish' &&
                    'ride' in e.args) {
                    player = removeRide(e.args['ride']);
                }
                if ('cost' in e.result) {
                    spendMoney(player, e.result.cost);
                    if (buildActions.indexOf(e.action) >= 0) {
                        setCheatAction(17, getPlayerCash(e.player));
                    }
                }
            }
        });
        context.subscribe('interval.day', function (e) {
            if (park.cash <= 0) {
                setCheatAction(17, initialDollars);
            }
            if (date.day === 1) {
                var mostProfitableTotal = {
                    name: '',
                    profit: 0
                };
                var mostProfitableAverage = {
                    name: '',
                    profit: 0
                };
                var mostProfitableRide = {
                    name: '',
                    author: '',
                    profit: 0
                };
                for (var playerHash in playerProfiles) {
                    var profit = getProfitDifference(playerHash);
                    var aveProfit = Math.floor(profit / playerProfiles[playerHash].ridesCreated.length);
                    if (profit > mostProfitableTotal.profit) {
                        mostProfitableTotal = {
                            name: playerProfiles[playerHash].name,
                            profit: profit
                        };
                    }
                    if (aveProfit > mostProfitableAverage.profit) {
                        mostProfitableAverage = {
                            name: playerProfiles[playerHash].name,
                            profit: aveProfit
                        };
                    }
                }
                for (var _i = 0, _a = map.rides; _i < _a.length; _i++) {
                    var ride = _a[_i];
                    if (ride.id in rideProperties) {
                        var profit = getRideProfitDifference(ride.id);
                        if (profit > mostProfitableRide.profit) {
                            mostProfitableRide = {
                                name: ride.name,
                                author: playerProfiles[rideProperties[ride.id].authorHash].name,
                                profit: profit
                            };
                        }
                    }
                }
                var sendmsg = '';
                if (mostProfitableTotal.profit > 0) {
                    sendmsg += "{NEWLINE}{YELLOW}This month's quality ride expert is {WHITE}" + mostProfitableAverage.name + "{YELLOW}! They're average profit per ride was " + mostProfitableAverage.profit + ".";
                }
                if (mostProfitableAverage.profit > 0) {
                    sendmsg += "{NEWLINE}{YELLOW}This month's quality ride expert is {WHITE}" + mostProfitableAverage.name + "{YELLOW}! They're average profit per ride was " + mostProfitableAverage.profit + ".";
                }
                if (mostProfitableRide.profit > 0) {
                    sendmsg += "{NEWLINE}{YELLOW}This month's most profitable ride is {WHITE}" + mostProfitableRide.name + "{YELLOW} by {WHITE}" + mostProfitableRide.author + "{YELLOW}!";
                }
                if (sendmsg != '') {
                    network.sendMessage(sendmsg);
                }
            }
        });
        context.subscribe('network.chat', function (e) {
            var msg = e.message.toLowerCase();
            if (msg === '!cash' || msg === '/cash') {
                context.setTimeout(function () { return network.sendMessage("{TOPAZ}Your current balance is {WHITE}" + getPlayerCash(e.player), [e.player]); }, 100);
            }
        });
    }
}
function getPlayer(playerID) {
    if (playerID === -1) {
        return null;
    }
    var player = null;
    var players = network.players;
    for (var _i = 0, players_1 = players; _i < players_1.length; _i++) {
        var p = players_1[_i];
        if (p.id === playerID) {
            player = p;
        }
    }
    if (player && !(player.publicKeyHash in playerProfiles)) {
        playerProfiles[player.publicKeyHash] = {
            moneySpent: 0,
            name: player.name,
            previousTotalProfit: 0,
            ridesCreated: []
        };
        network.sendMessage("{NEWLINE}{YELLOW}This server uses ffa-individual-economy. You currently have a balance of {WHITE}" + initialDollars + "{YELLOW} to build with.{NEWLINE}To see your balance at any time, say `{WHITE}!cash{YELLOW}` in chat.", [playerID]);
    }
    else if (player) {
        playerProfiles[player.publicKeyHash].name = player.name;
    }
    return player;
}
function getRide(rideID) {
    if (rideID === -1) {
        return null;
    }
    var ride = null;
    var rides = map.rides;
    for (var _i = 0, rides_1 = rides; _i < rides_1.length; _i++) {
        var r = rides_1[_i];
        if (r.id === rideID) {
            ride = r;
        }
    }
    return ride;
}
function spendMoney(player, cost) {
    playerProfiles[(typeof player === 'number') ? getPlayer(player).publicKeyHash : player].moneySpent += cost;
}
function getPlayerCash(playerID) {
    var player = getPlayer(playerID);
    return initialDollars - playerProfiles[player.publicKeyHash].moneySpent + getPlayerProfit(player.publicKeyHash);
}
function getPlayerProfit(playerHash) {
    var profit = 0;
    for (var _i = 0, _a = playerProfiles[playerHash].ridesCreated; _i < _a.length; _i++) {
        var rideID = _a[_i];
        var ride = getRide(rideID);
        profit += Math.max(ride.totalProfit, (ride.type === 36) ? 0 : ride.totalProfit);
    }
    return profit;
}
function getProfitDifference(playerHash) {
    var profit = getPlayerProfit(playerHash);
    var previous = playerProfiles[playerHash].previousTotalProfit;
    playerProfiles[playerHash].previousTotalProfit = profit;
    return profit - previous;
}
function getRideProfitDifference(rideID) {
    var profit = getRide(rideID).totalProfit;
    var previous = rideProperties[rideID].previousTotalProfit;
    rideProperties[rideID].previousTotalProfit = profit;
    return profit - previous;
}
function addRide(playerID, rideID) {
    var player = getPlayer(playerID);
    if (playerProfiles[player.publicKeyHash].ridesCreated.indexOf(rideID) === -1) {
        playerProfiles[player.publicKeyHash].ridesCreated.push(rideID);
    }
    rideProperties[rideID] = {
        authorHash: player.publicKeyHash,
        previousTotalProfit: 0
    };
}
function removeRide(rideID) {
    var playerHash = rideProperties[rideID].authorHash;
    var index = playerProfiles[playerHash].ridesCreated.indexOf(rideID);
    if (index !== -1) {
        playerProfiles[playerHash].ridesCreated.splice(index, 1);
    }
    delete rideProperties[rideID];
    return playerHash;
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
