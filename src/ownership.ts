/// <reference path="../types/openrct2.d.ts" />
// uses OPENRCT2_PLUGIN_API_VERSION = 1

(function () {
    const TILEWIDTH = 32;
    var rideOwners: object;

    function fixAction(e: GameActionEventArgs) {
        if (e.action === 'trackremove') {
            var tile = map.getTile(e.args['x'] / TILEWIDTH, e.args['y'] / TILEWIDTH);

            for (var i = 0; i < tile.numElements; i++) {
                var element = tile.getElement(i);
                if (element.type === 'track' && element.baseZ === e.args['z']) {
                    e.args['ride'] = element.ride;
                    break;
                }
            }
        }
    }

    function ownershipMain() {
        rideOwners = {};

        if (network.mode === 'server') {

            context.subscribe('action.query', (e) => {
                if (e.action !== 'ridecreate') {
                    fixAction(e);
                    if ('ride' in e.args && e.player >= 0) {
                        let player = getPlayer(e.player);
                        if (player == null) {
                            e.result = {
                                error: 1,
                                errorTitle: 'UNKNOWN USER',
                                errorMessage: `Could not find user with ID ${e.player}`
                            };
                        }
                        else if (rideOwners[<number>e.args['ride']] !== player.publicKeyHash && !isPlayerAdmin(player)) {
                            e.result = {
                                error: 1,
                                errorTitle: 'NOT OWNED',
                                errorMessage: 'That ride belongs to another player.'
                            }
                            network.sendMessage('{RED}ERROR: {WHITE}That ride/stall doesn\'t belong to you!', [e.player]);
                        }
                    }
                }
            });

            context.subscribe('action.execute', (e) => {
                if (e.action === 'ridecreate' &&
                    'ride' in e.result) {

                    var setName = (name, num) => {
                        context.executeAction('ridesetname', {
                            ride: ride.id,
                            name: `${name} ${num}`
                        }, function (result) {
                            if (result.error === 1 && num < 50) {
                                setName(name, num + 1);
                            }
                        });
                    }

                    if (e.player >= 0 && e.player < network.numPlayers) {
                        var ride = getRide(<number>e.result['ride']);
                        var player = getPlayer(e.player);
                        rideOwners[ride.id] = player.publicKeyHash;

                        setName(`${player.name} ${ride.name.replace(/[0-9]/g, '').trim()}`, 1);
                    }
                }
                else if (e.action === 'ridedemolish' && 'ride' in e.args && (!('modifyType' in e.args) || e.args['modifyType'] === 0)) {
                    delete rideOwners[<number>e.args['ride']];
                }
            });
        }
    }

    function doNothing() {
        //Done!
    }

    function isPlayerAdmin(player: Player) {
        var perms: string[] = network.getGroup(player.group).permissions;
        return perms.indexOf('kick_player') >= 0;
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

    function getRide(rideID: number): Ride {
        if (rideID === -1) {
            return null;
        }
        var ride: Ride = null;
        var rides = map.rides;
        for (const r of rides) {
            if (r.id === rideID) {
                ride = r;
            }
        }
        return ride;
    }

    registerPlugin({
        name: 'ffa-ownership',
        version: '0.0.3',
        authors: ['Cory Sanin'],
        type: 'remote',
        licence: 'GPL-3.0',
        targetApiVersion: 65,
        main: ownershipMain
    });
})();