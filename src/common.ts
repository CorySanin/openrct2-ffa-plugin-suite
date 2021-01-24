/// <reference path="../types/openrct2.d.ts" />

function isPlayerAdmin(player : Player){
    var perms : string[] = network.getGroup(player.group).permissions;
    return perms.indexOf('kick_player') >= 0;
}