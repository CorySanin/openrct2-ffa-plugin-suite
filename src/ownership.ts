/// <reference path="../../../bin/openrct2.d.ts" />
// uses OPENRCT2_PLUGIN_API_VERSION = 1

var rideOwners: object;

function ownershipMain() {
    rideOwners = {};

    if (network.mode === 'server') {
        context.subscribe('network.join', (e) => {
            //Player joined
        });

        context.subscribe('action.query', (e) => {
            // @ts-ignore
            if (e.action !== 'ridecreate') {
                if ('ride' in e.args && e.player >= 0 && e.player < network.numPlayers) {
                    if (rideOwners[e.args['ride']] !== network.getPlayer(e.player).publicKeyHash && !isPlayerAdmin(network.getPlayer(e.player))) {
                        e.result = {
                            error: 1,
                            errorTitle: 'NOT OWNED',
                            errorMessage: 'That ride belongs to another player.'
                        }
                        network.sendMessage('ERROR: That ride/stall doesn\'t belong to you!', [e.player]);
                    }
                }
            }
        });

        context.subscribe('action.execute', (e) => {
            // @ts-ignore
            if (e.action === 'ridecreate' &&
                'ride' in e.result) {

                var setName = (name, num) => {
                    context.executeAction('ridesetname', {
                        ride: ride.id,
                        name: `${name} ${num}`
                    }, function (result) {
                        if (result.error === 1) {
                            setName(name, num + 1);
                        }
                    });
                }

                if (e.player >= 0 && e.player < network.numPlayers) {
                    var ride = map.getRide(e.result['ride']);
                    var player = network.getPlayer(e.player);
                    rideOwners[ride.id] = player.publicKeyHash;

                    setName(`${player.name} ${ride.name.replace(/[0-9]/g, '').trim()}`, 1);
                }
            }
            // @ts-ignore
            else if (e.action === 'ridedemolish' && 'ride' in e.args) {
                delete rideOwners[e.args['ride']];
            }
        });
    }
}

// @ts-ignore
function doNothing() {
    //Done!
}

// @ts-ignore
function isPlayerAdmin(player: Player) {
    var perms: string[] = network.getGroup(player.group).permissions;
    return perms.indexOf('kick_player') >= 0;
}

registerPlugin({
    name: 'ffa-ownership',
    version: '0.0.1',
    authors: ['Cory Sanin'],
    type: 'remote',
    licence: 'GPL-3.0',
    main: ownershipMain
});