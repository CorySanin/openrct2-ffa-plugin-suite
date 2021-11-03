/// <reference path="../types/openrct2.d.ts" />
// uses OPENRCT2_PLUGIN_API_VERSION = 17

(function () {

    const GROUP_NAME = 'IP-BAN';
    const TICKS_PER_MINUTE = 2400;
    const MS_PER_MINUTE = 60000;
    const DEFAULT_TIMEOUT = 60;

    const PREFIX = new RegExp('^(!|/)');
    const CMDUNBAN = new RegExp('^unban($| )', 'i');

    var banGroup = -1;
    var bannedIPs: object;

    function main() {
        if (network.mode === 'server') {
            context.subscribe('action.execute', (e) => {
                if (e.type === 63) {
                    banPlayersWithGroup();
                }
                else if (banGroup === -1 && e.type === 64) {
                    banGroup = network.groups.length - 1;
                    network.groups[banGroup].name = GROUP_NAME;
                    network.groups[banGroup].permissions = [];
                }
            });

            context.subscribe('network.join', (e) => {
                let newPlayer = getPlayer(e.player);
                if (newPlayer.ipAddress in bannedIPs && !isPlayerAdmin(newPlayer)) {
                    network.kickPlayer(getPlayerIndex(newPlayer.id));
                    sendToAdmins(`Kicked ${newPlayer.name} (${newPlayer.ipAddress}). Time remaining: ${Math.ceil((bannedIPs[newPlayer.ipAddress] - date.ticksElapsed) / TICKS_PER_MINUTE)} minutes.`);
                }
                else {
                    sendToAdmins(`${newPlayer.name}'s IP: ${newPlayer.ipAddress}`);
                }
            });

            context.subscribe('network.chat', (e) => {
                let msg = e.message;
                let outmsg: string, args: any, command = getCommand(msg);
                if (command !== false) {
                    if ((args = doesCommandMatch(command, [CMDUNBAN])) !== false) {
                        if (isPlayerAdmin(getPlayer(e.player))) {
                            bannedIPs = {};
                            outmsg = '{YELLOW}All bans have been undone!';
                        }
                    }
                    if (outmsg) {
                        context.setTimeout(() => network.sendMessage(outmsg, [e.player]), 100);
                    }
                }
            });

            bannedIPs = {};
            getBanGroup();
        }
    }

    function getPlayer(playerID: number): Player {
        let match: Player = null;
        network.players.every(p => {
            if(p.id === playerID){
                match = p;
            }
            return match == null;
        });
        return match;
    }

    function getPlayerIndex(player: Player|number): number {
        let playerID: number = (typeof player === 'number') ? player : player.id;
        let match: number = -1;
        network.players.every((p, index) => {
            if (p.id === playerID) {
                match = index;
            }
            return match === -1;
        });
        return match;
    }

    function sendToAdmins(message) {
        network.players.forEach(player => {
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
        network.players.forEach(player => {
            if (player.group === banGroup) {
                player.group = network.defaultGroup;
                banPlayer(player);
            }
        });
    }

    function banPlayer(player: Player) {
        bannedIPs[player.ipAddress] = date.ticksElapsed + (DEFAULT_TIMEOUT * TICKS_PER_MINUTE);
        context.setTimeout(() => {
            if (player.ipAddress in bannedIPs) {
                delete bannedIPs[player.ipAddress];
            }
        }, DEFAULT_TIMEOUT * MS_PER_MINUTE);
        network.kickPlayer(getPlayerIndex(player));
    }

    function isPlayerAdmin(player: Player) {
        let perms: string[] = network.getGroup(player.group).permissions;
        return perms.indexOf('kick_player') >= 0;
    }

    function getCommand(str): boolean | string {
        if (str.match(PREFIX)) {
            return str.replace(PREFIX, '').trim();
        }
        return false;
    }

    function doesCommandMatch(str, commands): boolean | string {
        for (const command of commands) {
            if (typeof command === 'string') {
                if (str.startsWith(command)) {
                    let ret = str.substring(command.length, str.length).trim();
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
        main
    });
})();