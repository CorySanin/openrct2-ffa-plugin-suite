var rideOwners;
function ownershipMain() {
    rideOwners = {};
    if (network.mode === 'server') {
        context.subscribe('network.join', function (e) {
        });
        context.subscribe('action.query', function (e) {
            if (e.action !== 'ridecreate') {
                if ('ride' in e.args && e.player >= 0 && e.player < network.numPlayers) {
                    if (rideOwners[e.args['ride']] !== getPlayer(e.player).publicKeyHash && !isPlayerAdmin(getPlayer(e.player))) {
                        e.result = {
                            error: 1,
                            errorTitle: 'NOT OWNED',
                            errorMessage: 'That ride belongs to another player.'
                        };
                        network.sendMessage('{RED}ERROR: {WHITE}That ride/stall doesn\'t belong to you!', [e.player]);
                    }
                }
            }
        });
        context.subscribe('action.execute', function (e) {
            if (e.action === 'ridecreate' &&
                'ride' in e.result) {
                var setName = function (name, num) {
                    context.executeAction('ridesetname', {
                        ride: ride.id,
                        name: name + " " + num
                    }, function (result) {
                        if (result.error === 1) {
                            setName(name, num + 1);
                        }
                    });
                };
                if (e.player >= 0 && e.player < network.numPlayers) {
                    var ride = getRide(e.result['ride']);
                    var player = getPlayer(e.player);
                    rideOwners[ride.id] = player.publicKeyHash;
                    setName(player.name + " " + ride.name.replace(/[0-9]/g, '').trim(), 1);
                }
            }
            else if (e.action === 'ridedemolish' && 'ride' in e.args && (!('modifyType' in e.args) || e.args['modifyType'] === 0)) {
                delete rideOwners[e.args['ride']];
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
    if (playerID === -1) {
        return null;
    }
    var player = null;
    var players = network.players;
    for (var _i = 0, players_1 = players; _i < players_1.length; _i++) {
        var p = players_1[_i];
        if (p.id === playerID) {
            player = p;
        }
    }
    return player;
}
function getRide(rideID) {
    if (rideID === -1) {
        return null;
    }
    var ride = null;
    var rides = map.rides;
    for (var _i = 0, rides_1 = rides; _i < rides_1.length; _i++) {
        var r = rides_1[_i];
        if (r.id === rideID) {
            ride = r;
        }
    }
    return ride;
}
registerPlugin({
    name: 'ffa-ownership',
    version: '0.0.1',
    authors: ['Cory Sanin'],
    type: 'remote',
    licence: 'GPL-3.0',
    main: ownershipMain
});
