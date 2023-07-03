(function () {
    var GROUP_NAME = 'IP-BAN';
    var TICKS_PER_MINUTE = 2400;
    var MS_PER_MINUTE = 60000;
    var DEFAULT_TIMEOUT = 60;
    var PREFIX = new RegExp('^(!|/)');
    var CMDBAN = new RegExp('^ban ', 'i');
    var CMDUNBAN = new RegExp('^unban($| )', 'i');
    var GUID = new RegExp(/\S{8}(-\S{4}){3}-\S{12}/);
    var ACTION_NAME = 'statget';
    var STORAGE_KEY = 'objectStore.PrivateReadonly.objectId';
    var SUCCESSRESULT = { error: 0 };
    var ERRRESULT = { error: 1 };
    var PLAYER_OBJECTS = {};
    var timeout, bannedIPs, bannedObjects, banGroup = -1;
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
                if (ip in bannedIPs && !isPlayerAdmin(newPlayer)) {
                    var timeout_1 = bannedIPs[ip] || -1;
                    network.kickPlayer(getPlayerIndex(newPlayer.id));
                    if (timeout_1 > 0) {
                        sendToAdmins("Kicked ".concat(newPlayer.name, " (").concat(ip, "). Time remaining: ").concat(Math.ceil((timeout_1 - date.ticksElapsed) / TICKS_PER_MINUTE), " minutes."));
                    }
                    else {
                        sendToAdmins("Kicked ".concat(newPlayer.name, " (").concat(ip, ")."));
                    }
                }
                else {
                    sendToAdmins("".concat(newPlayer.name, "'s IP: ").concat(ip));
                }
            });
            context.subscribe('network.leave', function (e) {
                var player = getPlayer(e.player);
                delete PLAYER_OBJECTS["".concat(e.player, "|").concat(player.name)];
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
                                outmsg = "{YELLOW}Unbanned ".concat(args, "!");
                                cleanHashes(false);
                            }
                            else {
                                initializeBannedIps();
                                bannedObjects = {};
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
                            if (args[0].match(GUID)) {
                                banKey(args[0], t);
                            }
                            else {
                                banIP(args[0], t);
                            }
                            outmsg = "{YELLOW}Banned ".concat(args[0], " for ").concat(t, " minutes!");
                        }
                    }
                    if (outmsg) {
                        context.setTimeout(function () { return network.sendMessage(outmsg, [e.player]); }, 100);
                    }
                }
            });
            initializeBannedIps();
            bannedObjects = {};
            context.setInterval(cleanHashes, DEFAULT_TIMEOUT * MS_PER_MINUTE);
            getBanGroup();
            context.sharedStorage.get('ip-ban.banned', []).forEach(function (ip) {
                banIP(ip, -1);
            });
            context.sharedStorage.get('ip-ban.bannedKeys', []).forEach(function (key) {
                banKey(key, -1);
            });
            context.registerAction(ACTION_NAME, function (arg) {
                var player = getPlayer(arg.player);
                var stat = arg.args.stat;
                if (bannedObjects[stat] in bannedIPs && !(player.ipAddress in bannedIPs)) {
                    sendToAdmins("".concat(player.name, " connected from a new location. New IP is banned."));
                    banPlayer(player, Math.ceil((bannedIPs[bannedObjects[stat]] - date.ticksElapsed) / TICKS_PER_MINUTE));
                }
                else {
                    sendToAdmins("".concat(player.name, "'s key: ").concat(stat));
                    PLAYER_OBJECTS[getPlayerGuidKey(player)] = stat;
                }
                return ERRRESULT;
            }, function () { return ERRRESULT; });
        }
        else {
            function generateUUID() {
                var s;
                var d = new Date().getTime();
                var d2 = date.ticksElapsed;
                s = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
                    var r = Math.random() * 16;
                    if (d > 0) {
                        r = (d + r) % 16 | 0;
                        d = Math.floor(d / 16);
                    }
                    else {
                        r = (d2 + r) % 16 | 0;
                        d2 = Math.floor(d2 / 16);
                    }
                    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
                });
                context.sharedStorage.set(STORAGE_KEY, s);
                return s;
            }
            if (typeof FFAPLUGINMSG === 'undefined') {
                FFAPLUGINMSG = true;
                console.log('\n' +
                    '    This server uses one or more plugins from the FFA plugin suite.\n' +
                    '    https://github.com/CorySanin/Openrct2-ffa-plugin-suite\n' +
                    '    Found a bug? Please create an issue on GitHub with reproducible steps. Please and thank you!' +
                    '\n');
            }
            var statid = context.sharedStorage.get(STORAGE_KEY, false) || generateUUID();
            context.registerAction(ACTION_NAME, function () { return SUCCESSRESULT; }, function () { return SUCCESSRESULT; });
            context.executeAction(ACTION_NAME, {
                stat: statid
            });
        }
    }
    function getPlayer(playerID) {
        if (playerID === -1) {
            return null;
        }
        return network.getPlayer(playerID);
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
    function initializeBannedIps() {
        bannedIPs = {
            null: -1
        };
    }
    function getPlayerGuidKey(player) {
        return "".concat(player.id, "|").concat(player.name);
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
                sendToAdmins("{YELLOW}Banned ".concat(player.ipAddress, " for ").concat(timeout, " minutes!"));
            }
        });
    }
    function banPlayer(player, time) {
        if (!time) {
            time = timeout;
        }
        var ip = player.ipAddress;
        var stat = PLAYER_OBJECTS[getPlayerGuidKey(player)];
        if (stat && !(stat in bannedObjects)) {
            bannedObjects[stat] = ip;
        }
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
    function banKey(key, time) {
        if (!time) {
            time = timeout;
        }
        var val = -1;
        if (time > 0) {
            val = date.ticksElapsed + (time * TICKS_PER_MINUTE);
            context.setTimeout(function () {
                if (val in bannedIPs) {
                    delete bannedIPs[val];
                }
                cleanHashes(false);
            }, time * MS_PER_MINUTE);
        }
        bannedObjects[key] = bannedIPs[val] = val;
    }
    function cleanHashes(reduceBlocking) {
        if (reduceBlocking === void 0) { reduceBlocking = true; }
        for (var h in bannedObjects) {
            if (!(bannedObjects[h] in bannedIPs)) {
                delete bannedObjects[h];
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
        version: '0.2.1',
        authors: ['Cory Sanin'],
        type: 'remote',
        licence: 'GPL-3.0',
        minApiVersion: 17,
        targetApiVersion: 77,
        main: main
    });
})();
