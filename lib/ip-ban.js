(function () {
    var GROUP_NAME = 'IP-BAN';
    var TICKS_PER_MINUTE = 2400;
    var MS_PER_MINUTE = 60000;
    var DEFAULT_TIMEOUT = 60;
    var PREFIX = new RegExp('^(!|/)');
    var CMDBAN = new RegExp('^ban ', 'i');
    var CMDUNBAN = new RegExp('^unban($| )', 'i');
    var timeout, bannedIPs, bannedHashes, banGroup = -1;
    function main() {
        timeout = context.sharedStorage.get('ip-ban.timeout', DEFAULT_TIMEOUT);
        if (network.mode === 'server') {
            context.subscribe('action.execute', function (e) {
                if (e.type === 63) {
                    banPlayersWithGroup(e);
                }
                else if (banGroup === -1 && e.type === 64) {
                    banGroup = network.groups.length - 1;
                    network.groups[banGroup].name = GROUP_NAME;
                    network.groups[banGroup].permissions = [];
                }
            });
            context.subscribe('network.join', function (e) {
                var newPlayer = getPlayer(e.player);
                var ip = newPlayer.ipAddress;
                var hash = newPlayer.publicKeyHash;
                if (bannedHashes[hash] in bannedIPs && !(ip in bannedIPs)) {
                    sendToAdmins(newPlayer.name + " connected from a new location. New IP is banned.");
                    banPlayer(newPlayer, bannedIPs[bannedHashes[hash]]);
                }
                if (ip in bannedIPs && !isPlayerAdmin(newPlayer)) {
                    var timeout_1 = bannedIPs[ip] || -1;
                    bannedHashes[hash] = ip;
                    network.kickPlayer(getPlayerIndex(newPlayer.id));
                    if (timeout_1 > 0) {
                        sendToAdmins("Kicked " + newPlayer.name + " (" + ip + "). Time remaining: " + Math.ceil((timeout_1 - date.ticksElapsed) / TICKS_PER_MINUTE) + " minutes.");
                    }
                    else {
                        sendToAdmins("Kicked " + newPlayer.name + " (" + ip + ").");
                    }
                }
                else {
                    sendToAdmins(newPlayer.name + "'s IP: " + ip);
                }
            });
            context.subscribe('network.chat', function (e) {
                var msg = e.message;
                var outmsg, args, command = getCommand(msg);
                if (command !== false) {
                    if ((args = doesCommandMatch(command, [CMDUNBAN])) !== false) {
                        if (isPlayerAdmin(getPlayer(e.player))) {
                            if (args) {
                                args = args.split(' ')[0];
                                delete bannedIPs[args];
                                outmsg = "{YELLOW}Unbanned " + args + "!";
                            }
                            else {
                                bannedIPs = {};
                                bannedHashes = {};
                                outmsg = '{YELLOW}All bans have been undone!';
                            }
                        }
                    }
                    else if ((args = doesCommandMatch(command, [CMDBAN])) !== false) {
                        if (isPlayerAdmin(getPlayer(e.player)) && args.length > 0) {
                            var t = void 0;
                            args = args.split(' ');
                            if (args.length > 1) {
                                t = parseFloat(args[1]);
                            }
                            if (!t) {
                                t = timeout;
                            }
                            banIP(args[0], t);
                            outmsg = "{YELLOW}Banned " + args[0] + " for " + t + " minutes!";
                        }
                    }
                    if (outmsg) {
                        context.setTimeout(function () { return network.sendMessage(outmsg, [e.player]); }, 100);
                    }
                }
            });
            bannedIPs = {};
            bannedHashes = {};
            context.setInterval(cleanHashes, DEFAULT_TIMEOUT * MS_PER_MINUTE);
            getBanGroup();
            context.sharedStorage.get('ip-ban.banned', []).forEach(function (ip) {
                banIP(ip, -1);
            });
        }
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
    function sendToAdmins(message) {
        network.players.forEach(function (player) {
            if (isPlayerAdmin(player)) {
                network.sendMessage(message, [player.id]);
            }
        });
    }
    function getBanGroup() {
        var index = -1;
        for (var i = 0; i < network.groups.length; i++) {
            if (network.groups[i].name === GROUP_NAME) {
                index = i;
            }
        }
        if (index === -1) {
            network.addGroup();
        }
        else {
            banGroup = index;
        }
    }
    function banPlayersWithGroup(e) {
        network.players.forEach(function (player) {
            if (player.group === banGroup) {
                player.group = network.defaultGroup;
                banPlayer(player);
                sendToAdmins("{YELLOW}Banned " + player.ipAddress + " for " + timeout + " minutes!");
            }
        });
    }
    function banPlayer(player, time) {
        if (!time) {
            time = timeout;
        }
        var ip = player.ipAddress;
        var hash = player.publicKeyHash;
        bannedHashes[hash] = ip;
        banIP(ip, time);
        network.kickPlayer(getPlayerIndex(player));
    }
    function banIP(ip, time) {
        if (!time) {
            time = timeout;
        }
        bannedIPs[ip] = -1;
        if (time > 0) {
            bannedIPs[ip] = date.ticksElapsed + (time * TICKS_PER_MINUTE);
            context.setTimeout(function () {
                if (ip in bannedIPs) {
                    delete bannedIPs[ip];
                }
                cleanHashes(false);
            }, time * MS_PER_MINUTE);
        }
    }
    function cleanHashes(reduceBlocking) {
        if (reduceBlocking === void 0) { reduceBlocking = true; }
        for (var h in bannedHashes) {
            if (!(bannedHashes[h] in bannedIPs)) {
                delete bannedHashes[h];
            }
            if (reduceBlocking) {
                break;
            }
        }
    }
    function isPlayerAdmin(player) {
        var perms = network.getGroup(player.group).permissions;
        return perms.indexOf('kick_player') >= 0;
    }
    function getCommand(str) {
        if (str.match(PREFIX)) {
            return str.replace(PREFIX, '').trim();
        }
        return false;
    }
    function doesCommandMatch(str, commands) {
        for (var _i = 0, commands_1 = commands; _i < commands_1.length; _i++) {
            var command = commands_1[_i];
            if (typeof command === 'string') {
                if (str.startsWith(command)) {
                    var ret = str.substring(command.length, str.length).trim();
                    return (ret) ? ret : true;
                }
            }
            else {
                if (str.match(command)) {
                    return str.replace(command, '').trim();
                }
            }
        }
        return false;
    }
    registerPlugin({
        name: 'ffa-ip-ban',
        version: '0.1.0',
        minApiVersion: 17,
        authors: ['Cory Sanin'],
        type: 'remote',
        licence: 'GPL-3.0',
        main: main
    });
})();
