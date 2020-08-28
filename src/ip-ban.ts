/// <reference path="../../../bin/openrct2.d.ts" />
// uses OPENRCT2_PLUGIN_API_VERSION = 1

const GROUP_NAME = 'IP-BAN';
const TICKS_PER_MINUTE = 2400;
const DEFAULT_TIMEOUT = 60;

var banGroup = -1;
var bannedIPs: object;

function banMain() {
    if (network.mode === 'server') {
        context.subscribe('action.execute', (e) => {
            // @ts-ignore
            if (e.type === 63) {
                banPlayersWithGroup();
            }
            // @ts-ignore
            else if (banGroup === -1 && e.type === 64) {
                banGroup = network.groups.length - 1;
                network.groups[banGroup].name = GROUP_NAME;
                network.groups[banGroup].permissions = [];
            }
        });

        context.subscribe('network.join', (e) => {
            var newPlayer = network.getPlayer(e.player);
            if(newPlayer.ipAddress in bannedIPs && bannedIPs[newPlayer.ipAddress] > date.ticksElapsed){
                network.kickPlayer(newPlayer.id);
                sendToAdmins(`Kicked ${newPlayer.name} (${newPlayer.ipAddress}). Time remaining: ${Math.ceil((bannedIPs[newPlayer.ipAddress] - date.ticksElapsed) / TICKS_PER_MINUTE)} minutes.`);
            }
            else{
                sendToAdmins(`${newPlayer.name}'s IP: ${newPlayer.ipAddress}`);
            }
        });

        context.subscribe('interval.tick', () => {
            
        });

        bannedIPs = {};
        getBanGroup();
    }
}

function sendToAdmins(message) {
    network.players.forEach(player => {
        if (isPlayerAdmin(player)) {
            network.sendMessage(message, [player.id]);
        }
    })
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
    network.kickPlayer(player.id);
}

// @ts-ignore
function isPlayerAdmin(player: Player) {
    var perms: string[] = network.getGroup(player.group).permissions;
    return perms.indexOf('kick_player') >= 0;
}

// @ts-ignore
function doNothing() {
    //Done!
}

registerPlugin({
    name: 'ffa-ip-ban',
    version: '0.0.1',
    authors: ['Cory Sanin'],
    type: 'remote',
    licence: 'GPL-3.0',
    main: banMain
});