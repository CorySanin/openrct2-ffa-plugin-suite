/// <reference path="../types/openrct2.d.ts" />
// uses OPENRCT2_PLUGIN_API_VERSION = 17
interface StatArgs {
    stat: string
}

(function () {

    const GROUP_NAME = 'IP-BAN';
    const TICKS_PER_MINUTE = 2400;
    const MS_PER_MINUTE = 60000;
    const DEFAULT_TIMEOUT = 60;

    const PREFIX = new RegExp('^(!|/)');
    const CMDBAN = new RegExp('^ban ', 'i');
    const CMDUNBAN = new RegExp('^unban($| )', 'i');
    const GUID = new RegExp(/\S{8}(-\S{4}){3}-\S{12}/);
    const ACTION_NAME = 'statget';
    const STORAGE_KEY = 'objectStore.PrivateReadonly.objectId';
    const SUCCESSRESULT: GameActionResult = { error: 0 };
    const ERRRESULT: GameActionResult = { error: 1 };
    const PLAYER_OBJECTS = {};

    let timeout: number, bannedIPs: object, bannedObjects: object, banGroup = -1;

    function main() {
        timeout = context.sharedStorage.get('ip-ban.timeout', DEFAULT_TIMEOUT);
        if (network.mode === 'server') {
            const LOG_IN_CHAT = context.sharedStorage.get('ip-ban.log-in-chat', true);
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

            context.subscribe('network.join', e => {
                if (LOG_IN_CHAT) {
                    let newPlayer = getPlayer(e.player);
                    let ip = newPlayer.ipAddress;
                    if (!(ip in bannedIPs) || isPlayerAdmin(newPlayer)) {
                        sendToAdmins(`${newPlayer.name}'s IP: ${ip}`);
                    }
                }
            });

            context.subscribe('network.leave', e => {
                let player = getPlayer(e.player);
                delete PLAYER_OBJECTS[`${e.player}|${player.name}`];
            });

            context.subscribe('network.chat', (e) => {
                let msg = e.message;
                let outmsg: string, args: any, command = getCommand(msg);
                if (command !== false) {
                    if ((args = doesCommandMatch(command, [CMDUNBAN])) !== false) {
                        if (isPlayerAdmin(getPlayer(e.player))) {
                            if (args) {
                                let match: RegExpExecArray;
                                args = args.split(' ')[0];
                                if (match = GUID.exec(args[0] as string)) {
                                    args = bannedObjects[match[0]];
                                    delete bannedObjects[match[0]];
                                }
                                else {
                                    for (const b in bannedObjects) {
                                        if (b === args) {
                                            delete bannedObjects[b];
                                        }
                                    }
                                }
                                delete bannedIPs[args];
                                outmsg = `{YELLOW}Unbanned ${args}!`;
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
                        if (isPlayerAdmin(getPlayer(e.player)) && (args as string).length > 0) {
                            let t: number;
                            let match: RegExpExecArray;
                            args = args.split(' ');
                            if ((args as string[]).length > 1) {
                                t = parseFloat(args[1]);
                            }
                            if (!t) {
                                t = timeout;
                            }
                            if (match = GUID.exec(args[0] as string)) {
                                banKey(match[0], t);
                            }
                            else {
                                banIP(args[0], t);
                            }
                            outmsg = `{YELLOW}Banned ${match ? match[0] : args[0]} for ${t} minutes!`;
                        }
                    }
                    if (outmsg) {
                        context.setTimeout(() => network.sendMessage(outmsg, [e.player]), 100);
                    }
                }
            });

            initializeBannedIps();
            bannedObjects = {};
            context.setInterval(cleanHashes, DEFAULT_TIMEOUT * MS_PER_MINUTE);
            getBanGroup();

            context.sharedStorage.get('ip-ban.banned', []).forEach(ip => {
                banIP(ip, -1);
            });
            context.sharedStorage.get('ip-ban.bannedKeys', []).forEach(key => {
                banKey(key, -1);
            });

            context.registerAction<StatArgs>(ACTION_NAME,
                (arg: GameActionEventArgs<StatArgs>) => {
                    let player = getPlayer(arg.player);
                    let ip = player.ipAddress;
                    let rawStat = arg.args.stat;
                    let stat = rawStat.replace('n-', '');
                    if (bannedObjects[stat] in bannedIPs && !(ip in bannedIPs)) {
                        sendToAdmins(`${player.name} connected from a new location. New IP is banned.`);
                        banPlayer(player, Math.ceil((bannedIPs[bannedObjects[stat]] - date.ticksElapsed) / TICKS_PER_MINUTE));
                    }
                    else if (ip in bannedIPs && !isPlayerAdmin(player)) {
                        let timeout = bannedIPs[ip] || -1;
                        let ipStr = LOG_IN_CHAT ? `(${ip})` : '..';
                        bannedObjects[stat] = ip;
                        network.kickPlayer(player.id);
                        if (timeout > 0) {
                            sendToAdmins(`Kicked ${player.name} ${ipStr}. Time remaining: ${Math.ceil((timeout - date.ticksElapsed) / TICKS_PER_MINUTE)} minutes.`);
                        }
                        else {
                            sendToAdmins(`Kicked ${player.name} ${ipStr}.`);
                        }
                    }
                    else {
                        if (LOG_IN_CHAT) {
                            sendToAdmins(`${player.name}'s key: ${rawStat}`);
                        }
                        PLAYER_OBJECTS[getPlayerGuidKey(player)] = stat;
                    }
                    return ERRRESULT
                },
                () => ERRRESULT);
        }
        else {
            function generateUUID() { // https://stackoverflow.com/a/8809472/11210376
                let s: string;
                var d = new Date().getTime();//Timestamp
                var d2 = date.ticksElapsed; //Time in microseconds since page-load or 0 if unsupported
                s = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
                    var r = Math.random() * 16;//random number between 0 and 16
                    if (d > 0) {//Use timestamp until depleted
                        r = (d + r) % 16 | 0;
                        d = Math.floor(d / 16);
                    } else {//Use microseconds since page-load if supported
                        r = (d2 + r) % 16 | 0;
                        d2 = Math.floor(d2 / 16);
                    }
                    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
                });
                context.sharedStorage.set(STORAGE_KEY, s);
                return `n-${s}`;
            }

            // @ts-ignore
            if (typeof FFAPLUGINMSG === 'undefined') {
                // @ts-ignore
                FFAPLUGINMSG = true;
                console.log(
                    '\n' +
                    '    This server uses one or more plugins from the FFA plugin suite.\n' +
                    '    https://github.com/CorySanin/Openrct2-ffa-plugin-suite\n' +
                    '    Found a bug? Please create an issue on GitHub with reproducible steps. Please and thank you!' +
                    '\n');
            }

            let statid = context.sharedStorage.get(STORAGE_KEY, false) || generateUUID();

            context.registerAction<StatArgs>(ACTION_NAME,
                () => SUCCESSRESULT,
                () => SUCCESSRESULT);

            context.executeAction(ACTION_NAME, {
                stat: statid
            } as StatArgs);
        }
    }

    function getPlayer(playerID: number): Player {
        if (playerID === -1) {
            return null;
        }
        return network.getPlayer(playerID);
    }

    function initializeBannedIps() {
        bannedIPs = {
            null: -1
        };
    }

    function getPlayerGuidKey(player: Player) {
        return `${player.id}|${player.name}`;
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
        let stat = PLAYER_OBJECTS[getPlayerGuidKey(player)];
        if (stat && !(stat in bannedObjects)) {
            bannedObjects[stat] = ip;
        }
        banIP(ip, time);
        network.kickPlayer(player.id);
    }

    function banIP(ip: string, time?: number) {
        if (!time) {
            time = timeout;
        }
        bannedIPs[ip] = -1;
        if (time > 0) {
            bannedIPs[ip] = date.ticksElapsed + (time * TICKS_PER_MINUTE);
            context.setTimeout(() => {
                if (ip in bannedIPs) {
                    delete bannedIPs[ip];
                }
                cleanHashes(false);
            }, time * MS_PER_MINUTE);
        }
    }

    function banKey(key: string, time?: number) {
        if (!time) {
            time = timeout;
        }
        let val = -1;
        if (time > 0) {
            val = date.ticksElapsed + (time * TICKS_PER_MINUTE);
            context.setTimeout(() => {
                if (val in bannedIPs) {
                    delete bannedIPs[val];
                }
                cleanHashes(false);
            }, time * MS_PER_MINUTE);
        }
        bannedObjects[key] = bannedIPs[val] = val;
    }

    function cleanHashes(reduceBlocking = true) {
        for (let h in bannedObjects) {
            if (!(bannedObjects[h] in bannedIPs)) {
                delete bannedObjects[h];
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
        version: '0.2.4',
        authors: ['Cory Sanin'],
        type: 'remote',
        licence: 'GPL-3.0',
        minApiVersion: 17,
        targetApiVersion: 77,
        main
    });
})();