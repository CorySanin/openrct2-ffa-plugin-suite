(function () {
    var TILEWIDTH = 32;
    var PARK_STORAGE_KEY = 'rideOwners';
    var RELEASED = 'released';
    var rideOwners;
    var ownerNames = {};
    function fixAction(e) {
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
    function getRenameCommand(e) {
        var newName = e.args.name.toLowerCase();
        if (['!', '/'].indexOf(newName.charAt(0)) < 0) {
            return false;
        }
        var commandStr = newName.substring(1);
        switch (commandStr) {
            case "owner":
            case "release":
                return commandStr;
            default:
                return false;
        }
    }
    function ownershipMain() {
        if (network.mode === 'server') {
            var storage = context.getParkStorage();
            rideOwners = storage.get(PARK_STORAGE_KEY, {});
            storage.set(PARK_STORAGE_KEY, rideOwners);
            context.subscribe('action.query', function (e) {
                if (e.action !== 'ridecreate') {
                    fixAction(e);
                    if ('ride' in e.args && e.player >= 0) {
                        var player = getPlayer(e.player);
                        var cmd = false;
                        if (player == null) {
                            e.result = {
                                error: 1,
                                errorTitle: 'UNKNOWN USER',
                                errorMessage: "Could not find user with ID ".concat(e.player)
                            };
                        }
                        else if (e.action === 'ridesetname' && (cmd = getRenameCommand(e = e)) && cmd === 'owner') {
                            var ownerKey = rideOwners[e.args['ride']];
                            e.result = {
                                error: 1,
                                errorTitle: 'CANCEL',
                                errorMessage: 'reverting ride name'
                            };
                            if (!ownerKey) {
                                network.sendMessage('That ride belongs to the park.', [e.player]);
                                return;
                            }
                            var name = ownerNames[ownerKey];
                            network.sendMessage(name ? "That ride belongs to \"".concat(name, "\"") : "The owner of that ride is unknown.", [e.player]);
                        }
                        else if (rideOwners[e.args['ride']] !== RELEASED && rideOwners[e.args['ride']] !== player.publicKeyHash && !isPlayerAdmin(player)) {
                            e.result = {
                                error: 1,
                                errorTitle: 'NOT OWNED',
                                errorMessage: 'That ride belongs to another player.'
                            };
                            network.sendMessage('{RED}ERROR: {WHITE}That ride/stall doesn\'t belong to you!', [e.player]);
                        }
                        else if (cmd === 'release') {
                            e.result = {
                                error: 1,
                                errorTitle: 'CANCEL',
                                errorMessage: 'reverting ride name'
                            };
                            rideOwners[e.args['ride']] = RELEASED;
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
                            name: "".concat(name, " ").concat(num)
                        }, function (result) {
                            if (result.error === 1 && num < 50) {
                                setName(name, num + 1);
                            }
                        });
                    };
                    if (e.player >= 0 && e.player < network.numPlayers) {
                        var ride = getRide(e.result['ride']);
                        var player = getPlayer(e.player);
                        rideOwners[ride.id] = player.publicKeyHash;
                        ownerNames[player.publicKeyHash] = player.name;
                        setName("".concat(player.name, " ").concat(ride.name.replace(/[0-9]/g, '').trim()), 1);
                    }
                }
                else if (e.action === 'ridedemolish' && 'ride' in e.args && (!('modifyType' in e.args) || e.args['modifyType'] === 0)) {
                    delete rideOwners[e.args['ride']];
                }
            });
        }
        else if (typeof FFAPLUGINMSG === 'undefined') {
            FFAPLUGINMSG = true;
            console.log('\n' +
                '    This server uses one or more plugins from the FFA plugin suite.\n' +
                '    https://github.com/CorySanin/Openrct2-ffa-plugin-suite\n' +
                '    Found a bug? Please create an issue on GitHub with reproducible steps. Please and thank you!' +
                '\n');
        }
    }
    function isPlayerAdmin(player) {
        var perms = network.getGroup(player.group).permissions;
        return perms.indexOf('kick_player') >= 0;
    }
    function getPlayer(playerID) {
        if (playerID === -1) {
            return null;
        }
        return network.getPlayer(playerID);
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
        version: '0.0.10',
        authors: ['Cory Sanin'],
        type: 'remote',
        licence: 'GPL-3.0',
        minApiVersion: 65,
        targetApiVersion: 77,
        main: ownershipMain
    });
})();
