(function () {
    var NEGATIVE_ACTIONS = [6, 19, 15, 42, 44, 51];
    var TICK_COOLDOWN = 15;
    var MAX_STRIKES = 5;
    var STRIKE_COOLDOWN = 300;
    var negativeActionTicks;
    var numberOfOffenses;
    function rateLimitMain() {
        negativeActionTicks = {};
        numberOfOffenses = {};
        if (network.mode === 'server') {
            context.subscribe('action.query', function (e) {
                if (NEGATIVE_ACTIONS.indexOf(e.type) !== -1 && e.player >= 0) {
                    var player = getPlayer(e.player);
                    if (player == null) {
                        e.result = {
                            error: 1,
                            errorTitle: 'UNKNOWN USER',
                            errorMessage: "Could not find user with ID " + e.player
                        };
                    }
                    else if (!isPlayerAdmin(player)) {
                        var lastTick = 0;
                        var currentTick = date.ticksElapsed;
                        if (player.publicKeyHash in negativeActionTicks) {
                            lastTick = negativeActionTicks[player.publicKeyHash];
                        }
                        negativeActionTicks[player.publicKeyHash] = currentTick;
                        if (currentTick - lastTick < TICK_COOLDOWN) {
                            var strikes = 0;
                            if (player.publicKeyHash in numberOfOffenses) {
                                strikes = numberOfOffenses[player.publicKeyHash];
                            }
                            strikes += 1;
                            e.result = {
                                error: 1,
                                errorTitle: 'TOO FAST',
                                errorMessage: 'You are being rate limited'
                            };
                            if (strikes >= MAX_STRIKES) {
                                console.log("kicking " + player.name);
                                network.kickPlayer(getPlayerIndex(player));
                                strikes += MAX_STRIKES;
                            }
                            else {
                                network.sendMessage('{RED}ATTENTION: {WHITE}You are going too fast! Slow down before performing your next action.', [e.player]);
                            }
                            numberOfOffenses[player.publicKeyHash] = strikes;
                        }
                    }
                }
            });
            context.subscribe('interval.tick', function () {
                var currentTick = date.ticksElapsed;
                if (currentTick % STRIKE_COOLDOWN === 0) {
                    for (var playerhash in numberOfOffenses) {
                        var lastTick = 0;
                        if (playerhash in negativeActionTicks) {
                            lastTick = negativeActionTicks[playerhash];
                        }
                        if (currentTick - lastTick > STRIKE_COOLDOWN && --numberOfOffenses[playerhash] <= 0) {
                            delete numberOfOffenses[playerhash];
                        }
                    }
                }
                else if (currentTick % STRIKE_COOLDOWN === Math.floor(STRIKE_COOLDOWN / 2)) {
                    for (var playerhash in negativeActionTicks) {
                        if (currentTick - negativeActionTicks[playerhash] > STRIKE_COOLDOWN) {
                            delete negativeActionTicks[playerhash];
                        }
                    }
                }
            });
        }
    }
    function doNothing() {
    }
    function isPlayerAdmin(player) {
        var perms = network.getGroup(player.group).permissions;
        return perms.indexOf('kick_player') >= 0;
    }
    function getPlayer(playerID) {
        var match = null;
        network.players.every(function (p) {
            if (p.id === playerID) {
                match = p;
            }
            return match == null;
        });
        return match;
    }
    function getPlayerIndex(player) {
        var playerID = (typeof player === 'number') ? player : player.id;
        var match = -1;
        network.players.every(function (p, index) {
            if (p.id === playerID) {
                match = index;
            }
            return match === -1;
        });
        return match;
    }
    registerPlugin({
        name: 'ffa-rate-limit',
        version: '0.0.3',
        authors: ['Cory Sanin'],
        type: 'remote',
        licence: 'GPL-3.0',
        main: rateLimitMain
    });
})();
