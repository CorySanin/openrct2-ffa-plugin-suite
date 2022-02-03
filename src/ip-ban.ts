/// <reference path="../types/openrct2.d.ts" />
// uses OPENRCT2_PLUGIN_API_VERSION = 17

(function () {

    const GROUP_NAME = 'IP-BAN';
    const TICKS_PER_MINUTE = 2400;
    const MS_PER_MINUTE = 60000;
    const DEFAULT_TIMEOUT = 60;

    const PREFIX = new RegExp('^(!|/)');
    const CMDBAN = new RegExp('^ban ', 'i');
    const CMDUNBAN = new RegExp('^unban($| )', 'i');

    let timeout: number, bannedIPs: object, bannedHashes: object, banGroup = -1;

    function main() {
        timeout = context.sharedStorage.get('ip-ban.timeout', DEFAULT_TIMEOUT);
        if (network.mode === 'server') {
            context.subscribe('action.execute', (e) => {
                if (e.type === 63) {
                    banPlayersWithGroup(e);
                }
                else if (banGroup === -1 && e.type === 64) {
                    banGroup = network.groups.length - 1;
                    network.groups[banGroup].name = GROUP_NAME;
                    network.groups[banGroup].permissions = [];
                }
            });

            context.subscribe('network.join', (e) => {
                let newPlayer = getPlayer(e.player);
                let ip = newPlayer.ipAddress;
                let hash = newPlayer.publicKeyHash;
                if (bannedHashes[hash] in bannedIPs && !(ip in bannedIPs)) {
                    sendToAdmins(`${newPlayer.name} connected from a new location. New IP is banned.`);
                    banPlayer(newPlayer);
                }
                if (ip in bannedIPs && !isPlayerAdmin(newPlayer)) {
                    bannedHashes[hash] = ip;
                    network.kickPlayer(getPlayerIndex(newPlayer.id));
                    if (timeout > 0) {
                        sendToAdmins(`Kicked ${newPlayer.name} (${ip}). Time remaining: ${Math.ceil((bannedIPs[ip] - date.ticksElapsed) / TICKS_PER_MINUTE)} minutes.`);
                    }
                    else {
                        sendToAdmins(`Kicked ${newPlayer.name} (${ip}).`);
                    }
                }
                else {
                    sendToAdmins(`${newPlayer.name}'s IP: ${ip}`);
                }
            });

            context.subscribe('network.chat', (e) => {
                let msg = e.message;
                let outmsg: string, args: any, command = getCommand(msg);
                if (command !== false) {
                    if ((args = doesCommandMatch(command, [CMDUNBAN])) !== false) {
                        if (isPlayerAdmin(getPlayer(e.player))) {
                            if (args) {
                                args = args.split(' ')[0];
                                delete bannedIPs[args];
                                outmsg = `{YELLOW}Unbanned ${args}!`;
                            }
                            else {
                                bannedIPs = {};
                                bannedHashes = {};
                                outmsg = '{YELLOW}All bans have been undone!';
                            }
                        }
                    }
                    else if ((args = doesCommandMatch(command, [CMDBAN])) !== false) {
                        if (isPlayerAdmin(getPlayer(e.player)) && (args as string).length > 0) {
                            let t: number;
                            args = args.split(' ');
                            if ((args as string[]).length > 1) {
                                t = parseFloat(args[1]);
                            }
                            if (!t) {
                                t = timeout;
                            }
                            banIP(args[0], t);
                            outmsg = `{YELLOW}Banned ${args[0]} for ${t} minutes!`;
                        }
                    }
                    if (outmsg) {
                        context.setTimeout(() => network.sendMessage(outmsg, [e.player]), 100);
                    }
                }
            });

            bannedIPs = {};
            bannedHashes = {};
            context.setInterval(cleanHashes, DEFAULT_TIMEOUT * MS_PER_MINUTE);
            getBanGroup();
        }
    }

    function getPlayer(playerID: number): Player {
        let match: Player = null;
        network.players.every(p => {
            if (p.id === playerID) {
                match = p;
            }
            return match == null;
        });
        return match;
    }

    function getPlayerIndex(player: Player | number): number {
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

    function banPlayersWithGroup(e: GameActionEventArgs) {
        network.players.forEach(player => {
            if (player.group === banGroup) {
                player.group = network.defaultGroup;
                banPlayer(player);
                sendToAdmins(`{YELLOW}Banned ${player.ipAddress} for ${timeout} minutes!`);
            }
        });
    }

    function banPlayer(player: Player, time?: number) {
        if (!time) {
            time = timeout;
        }
        let ip = player.ipAddress;
        let hash = player.publicKeyHash;
        bannedHashes[hash] = ip;
        banIP(ip, time);
        network.kickPlayer(getPlayerIndex(player));
    }

    function banIP(ip: string, time?: number) {
        if (!time) {
            time = timeout;
        }
        bannedIPs[ip] = date.ticksElapsed + (time * TICKS_PER_MINUTE);
        if (time > 0) {
            context.setTimeout(() => {
                if (ip in bannedIPs) {
                    delete bannedIPs[ip];
                }
                cleanHashes(false);
            }, time * MS_PER_MINUTE);
        }
    }

    function cleanHashes(reduceBlocking = true) {
        for (let h in bannedHashes) {
            if (!(bannedHashes[h] in bannedIPs)) {
                delete bannedHashes[h];
            }
            if (reduceBlocking) {
                break;
            }
        }
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
        version: '0.0.5',
        minApiVersion: 17,
        authors: ['Cory Sanin'],
        type: 'remote',
        licence: 'GPL-3.0',
        main
    });
})();