var TILEWIDTH = 32;
var SLABHEIGHT = 8;
(function () {
    var entrancePath;
    function antiGriefMain() {
        if (network.mode === 'server') {
            entrancePath = getEntranceCoords();
            context.subscribe('action.query', function (e) {
                if (e.action === 'ridesetstatus' && e.args['status'] === 1) {
                    if (!doesRideHaveExitPath(e.args['ride'])) {
                        e.result = {
                            error: 1,
                            errorTitle: 'NO EXIT',
                            errorMessage: 'Ride has no exit path.'
                        };
                        network.sendMessage("{RED}ERROR: {WHITE}".concat(getRide(e.args['ride']).name, " has no path leading from its exit!"), [e.player]);
                    }
                }
                else if (e.type === 19) {
                    var rideUsesPath = doesExitUsePath(e.result.position);
                    if (doesExitUsePath(e.result.position)) {
                        e.result = {
                            error: 1,
                            errorTitle: 'EXIT NEEDS PATH',
                            errorMessage: "".concat(rideUsesPath.name, " must be closed before removing that path."),
                        };
                        network.sendMessage("{RED}ERROR: {WHITE}".concat(e.result.errorMessage), [e.player]);
                    }
                }
            });
            context.subscribe('interval.day', findLostGuests);
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
    function doesRideHaveExitPath(rideId) {
        var ride = getRide(rideId);
        if (ride.classification !== 'ride') {
            return true;
        }
        var stations = ride.stations;
        var bad = false;
        for (var i = 0; i < stations.length && !bad; i++) {
            var coords = stations[i].exit;
            if (coords) {
                var checkCoords = {
                    x: coords.x / TILEWIDTH + (coords.direction + 1) % 2 * (coords.direction - 1) * -1,
                    y: coords.y / TILEWIDTH + coords.direction % 2 * (coords.direction - 2)
                };
                var elements = map.getTile(checkCoords.x, checkCoords.y).elements;
                bad = true;
                for (var j = 0; j < elements.length; j++) {
                    if (elements[j].type === 'surface') {
                        var surface = elements[j];
                        if (!surface.hasOwnership && !surface.hasConstructionRights) {
                            bad = true;
                            break;
                        }
                    }
                    else if (elements[j].type === 'footpath' && (elements[j].baseHeight === coords.z / SLABHEIGHT || elements[j].baseHeight + 2 === coords.z / SLABHEIGHT)) {
                        bad = false;
                    }
                }
            }
        }
        return !bad;
    }
    function doesExitUsePath(position) {
        var pathCoords = {
            x: Math.floor(position.x / TILEWIDTH),
            y: Math.floor(position.y / TILEWIDTH),
            z: position.z / SLABHEIGHT
        };
        var checkExitCoords;
        for (var i = 0; i < 4; i++) {
            checkExitCoords = {
                x: pathCoords.x + ((i > 1) ? -1 : 1) * (i % 2),
                y: pathCoords.y + ((i > 1) ? -1 : 1) * ((i + 1) % 2),
            };
            var elements = map.getTile(checkExitCoords.x, checkExitCoords.y).elements;
            for (var k = 0; k < elements.length; k++) {
                if (elements[k].type === 'entrance' && 'isQueue' in elements[k] && !elements[k]['isQueue']) {
                    var entrance = elements[k];
                    if (entrance.object !== 2
                        && pathCoords.x === checkExitCoords.x + (entrance.direction + 1) % 2 * (entrance.direction - 1) * -1
                        && pathCoords.y === checkExitCoords.y + entrance.direction % 2 * (entrance.direction - 2)) {
                        for (var j = 0; j < 2; j++) {
                            var ride = void 0;
                            if (elements[k].baseHeight === pathCoords.z + (j * 2)
                                && (ride = getRide(elements[k]['ride'])).status === 'open') {
                                return ride;
                            }
                        }
                    }
                }
            }
        }
        return false;
    }
    function getEntranceCoords() {
        for (var i = 0; i < map.size.x; i++) {
            for (var j = 0; j < map.size.y; j++) {
                var tile = map.getTile(i, j);
                for (var z = 0; z < tile.elements.length; z++) {
                    if (tile.elements[z].type == 'entrance' && tile.elements[z].object === 2) {
                        var entrace = tile.elements[z];
                        var direction = (entrace.direction + 2) % 4;
                        var checkCoords = {
                            x: i + (direction + 1) % 2 * (direction - 1) * -1,
                            y: j + direction % 2 * (direction - 2)
                        };
                        var elements = map.getTile(checkCoords.x, checkCoords.y).elements;
                        for (var k = 0; k < elements.length; k++) {
                            if (elements[k].type === 'footpath' && (elements[k].baseHeight === entrace.baseZ / SLABHEIGHT || elements[k].baseHeight + 2 === entrace.baseZ / SLABHEIGHT)) {
                                return {
                                    x: checkCoords.x * TILEWIDTH,
                                    y: checkCoords.y * TILEWIDTH,
                                    z: elements[k].baseHeight * SLABHEIGHT
                                };
                            }
                        }
                    }
                }
            }
        }
        console.log('Couldn\'t find entrance adjascent path to place lost guests!');
        return null;
    }
    function findLostGuests() {
        if (entrancePath != null && context.apiVersion >= 66) {
            var peeps = map.getAllEntities((date.day % 2) ? 'guest' : 'staff');
            var lostPeeps = [];
            peeps.forEach(function (peep) {
                var elements = map.getTile(Math.floor(peep.x / TILEWIDTH), Math.floor(peep.y / TILEWIDTH)).elements;
                var pathIndex = -1;
                var surface = null;
                for (var i = 0; i < elements.length; i++) {
                    if ((elements[i].type === 'footpath' || elements[i].type === 'entrance' || elements[i].type === 'track') && elements[i].baseHeight <= peep.z / SLABHEIGHT) {
                        pathIndex = i;
                    }
                    else if (elements[i].type === 'surface') {
                        surface = elements[i];
                    }
                }
                if (elements.length !== 0 && pathIndex === -1 && (surface.hasOwnership || surface.hasConstructionRights)) {
                    lostPeeps.push(peep);
                }
            });
            relocateLostGuests(lostPeeps);
        }
    }
    function relocateLostGuests(peeps) {
        if (peeps && peeps.length) {
            var peep = peeps.pop();
            context.executeAction("peeppickup", {
                type: 0,
                id: peep.id,
                x: -32768,
                y: 0,
                z: 0,
                playerId: 0
            }, function () {
                context.executeAction("peeppickup", {
                    type: 2,
                    id: peep.id,
                    x: entrancePath.x,
                    y: entrancePath.y,
                    z: entrancePath.z,
                    playerId: 0
                }, function () { return relocateLostGuests(peeps); });
            });
        }
    }
    function isPlayerAdmin(player) {
        var perms = network.getGroup(player.group).permissions;
        return perms.indexOf('kick_player') >= 0;
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
        name: 'ffa-anti-grief',
        version: '0.0.5',
        authors: ['Cory Sanin'],
        type: 'remote',
        licence: 'GPL-3.0',
        targetApiVersion: 65,
        main: antiGriefMain
    });
})();
