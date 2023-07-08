(function () {
    var NEGATIVE_ACTIONS = [6, 19, 15, 42, 44, 51];
    var TICK_COOLDOWN = 15;
    var CHAT_COOLDOWN = 35;
    var MAX_STRIKES = 5;
    var STRIKE_COOLDOWN = 300;
    var negativeActionTicks;
    var numberOfOffenses;
    var chatTicks;
    var numberOfChatOffenses;
    function rateLimitMain() {
        negativeActionTicks = {};
        numberOfOffenses = {};
        chatTicks = {};
        numberOfChatOffenses = {};
        if (network.mode === 'server') {
            context.subscribe('network.chat', function (e) {
                var player = getPlayer(e.player);
                if (!isPlayerAdmin(player)) {
                    var lastTick = 0;
                    var currentTick = date.ticksElapsed;
                    if (player.publicKeyHash in chatTicks) {
                        lastTick = chatTicks[player.publicKeyHash];
                    }
                    chatTicks[player.publicKeyHash] = currentTick;
                    if (currentTick - lastTick < CHAT_COOLDOWN) {
                        var strikes = 0;
                        if (player.publicKeyHash in numberOfChatOffenses) {
                            strikes = numberOfChatOffenses[player.publicKeyHash];
                        }
                        strikes += 1;
                        if (strikes * 2 >= MAX_STRIKES) {
                            console.log("kicking ".concat(player.name));
                            network.kickPlayer(player.id);
                            strikes += MAX_STRIKES;
                        }
                        else if (strikes > 1) {
                            network.sendMessage('{RED}ATTENTION: {WHITE}You are chatting too fast! Please slow down.', [e.player]);
                        }
                        numberOfChatOffenses[player.publicKeyHash] = strikes;
                    }
                }
            });
            context.subscribe('action.query', function (e) {
                if (NEGATIVE_ACTIONS.indexOf(e.type) !== -1 && e.player >= 0) {
                    var player = getPlayer(e.player);
                    if (player == null) {
                        e.result = {
                            error: 1,
                            errorTitle: 'UNKNOWN USER',
                            errorMessage: "Could not find user with ID ".concat(e.player)
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
                                console.log("kicking ".concat(player.name));
                                network.kickPlayer(player.id);
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
                var mod = currentTick % STRIKE_COOLDOWN;
                if (mod === 0) {
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
                else if (mod === Math.floor(STRIKE_COOLDOWN / 2)) {
                    for (var playerhash in negativeActionTicks) {
                        if (currentTick - negativeActionTicks[playerhash] > STRIKE_COOLDOWN) {
                            delete negativeActionTicks[playerhash];
                        }
                    }
                }
                else if (mod === Math.floor(STRIKE_COOLDOWN / 4)) {
                    for (var playerhash in numberOfChatOffenses) {
                        var lastTick = 0;
                        if (playerhash in chatTicks) {
                            lastTick = chatTicks[playerhash];
                        }
                        if (currentTick - lastTick > STRIKE_COOLDOWN && --numberOfChatOffenses[playerhash] <= 0) {
                            delete numberOfChatOffenses[playerhash];
                        }
                    }
                }
                else if (mod === Math.floor(STRIKE_COOLDOWN * 3 / 4)) {
                    for (var playerhash in chatTicks) {
                        if (currentTick - chatTicks[playerhash] > STRIKE_COOLDOWN) {
                            delete chatTicks[playerhash];
                        }
                    }
                }
            });
        }
        else if (typeof FFAPLUGINMSG === 'undefined') {
            FFAPLUGINMSG = true;
            console.log('\n' +
                '    This server uses one or more plugins from the FFA plugin suite.\n' +
                '    https://github.com/CorySanin/Openrct2-ffa-plugin-suite\n' +
                '    Found a bug? Please create an issue on GitHub with reproducible steps. Please and thank you!' +
                '\n');
        }
    }
    function isPlayerAdmin(player) {
        var perms = network.getGroup(player.group).permissions;
        return perms.indexOf('kick_player') >= 0;
    }
    function getPlayer(playerID) {
        if (playerID === -1) {
            return null;
        }
        return network.getPlayer(playerID);
    }
    registerPlugin({
        name: 'ffa-rate-limit',
        version: '0.0.8',
        authors: ['Cory Sanin'],
        type: 'remote',
        licence: 'GPL-3.0',
        minApiVersion: 65,
        targetApiVersion: 77,
        main: rateLimitMain
    });
})();
