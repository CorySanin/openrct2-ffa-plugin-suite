(function () {
    var GROUP_NAME = 'IP-BAN';
    var TICKS_PER_MINUTE = 2400;
    var MS_PER_MINUTE = 60000;
    var DEFAULT_TIMEOUT = 60;
    var PREFIX = new RegExp('^(!|/)');
    var CMDUNBAN = new RegExp('^unban($| )', 'i');
    var banGroup = -1;
    var bannedIPs;
    function main() {
        if (network.mode === 'server') {
            context.subscribe('action.execute', function (e) {
                if (e.type === 63) {
                    banPlayersWithGroup();
                }
                else if (banGroup === -1 && e.type === 64) {
                    banGroup = network.groups.length - 1;
                    network.groups[banGroup].name = GROUP_NAME;
                    network.groups[banGroup].permissions = [];
                }
            });
            context.subscribe('network.join', function (e) {
                var newPlayer = getPlayer(e.player);
                if (newPlayer.ipAddress in bannedIPs && !isPlayerAdmin(newPlayer)) {
                    network.kickPlayer(getPlayerIndex(newPlayer.id));
                    sendToAdmins("Kicked " + newPlayer.name + " (" + newPlayer.ipAddress + "). Time remaining: " + Math.ceil((bannedIPs[newPlayer.ipAddress] - date.ticksElapsed) / TICKS_PER_MINUTE) + " minutes.");
                }
                else {
                    sendToAdmins(newPlayer.name + "'s IP: " + newPlayer.ipAddress);
                }
            });
            context.subscribe('network.chat', function (e) {
                var msg = e.message;
                var outmsg, args, command = getCommand(msg);
                if (command !== false) {
                    if ((args = doesCommandMatch(command, [CMDUNBAN])) !== false) {
                        if (isPlayerAdmin(getPlayer(e.player))) {
                            bannedIPs = {};
                            outmsg = '{YELLOW}All bans have been undone!';
                        }
                    }
                    if (outmsg) {
                        context.setTimeout(function () { return network.sendMessage(outmsg, [e.player]); }, 100);
                    }
                }
            });
            bannedIPs = {};
            getBanGroup();
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
    function banPlayersWithGroup() {
        network.players.forEach(function (player) {
            if (player.group === banGroup) {
                player.group = network.defaultGroup;
                banPlayer(player);
            }
        });
    }
    function banPlayer(player) {
        bannedIPs[player.ipAddress] = date.ticksElapsed + (DEFAULT_TIMEOUT * TICKS_PER_MINUTE);
        context.setTimeout(function () {
            if (player.ipAddress in bannedIPs) {
                delete bannedIPs[player.ipAddress];
            }
        }, DEFAULT_TIMEOUT * MS_PER_MINUTE);
        network.kickPlayer(getPlayerIndex(player));
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
        version: '0.0.3',
        minApiVersion: 17,
        authors: ['Cory Sanin'],
        type: 'remote',
        licence: 'GPL-3.0',
        main: main
    });
})();
