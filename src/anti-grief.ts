/// <reference path="../types/openrct2.d.ts" />
// uses OPENRCT2_PLUGIN_API_VERSION = 1

const TILEWIDTH = 32;
const SLABHEIGHT = 8;

function antiGriefMain() {
    if (network.mode === 'server') {
        context.subscribe('action.query', (e) => {
            /**
             * Do not open rides without paths leading from an exit
             */
            // @ts-ignore
            if (e.action === 'ridesetstatus' && e.args['status'] === 1) {
                if (!doesRideHaveExitPath(e.args['ride'])) {
                    e.result = {
                        error: 1,
                        errorTitle: 'NO EXIT',
                        errorMessage: 'Ride has no exit path.'
                    }
                    network.sendMessage(`ERROR: ${getRide(e.args['ride']).name} has no path leading from its exit!`, [e.player]);
                }
            }
            /**
             * Only remove path if there isn't an open ride whose exit deposits to this path
             */
            // @ts-ignore
            else if (e.type === 19) {
                var rideUsesPath = doesExitUsePath(e.result.position)
                if (doesExitUsePath(e.result.position)) {
                    e.result = {
                        error: 1,
                        errorTitle: 'EXIT NEEDS PATH',
                        errorMessage: `${rideUsesPath.name} must be closed before removing that path.`,
                    }
                    network.sendMessage(e.result.errorMessage, [e.player]);
                }
            }
        });

        // context.subscribe('action.execute', (e) => {
        //     if(e.action === 'peeppickup')
        //         console.log(e);
        // });

        context.subscribe('interval.tick', (e) => {
            //needs work
            // if (date.ticksElapsed % 50 === 0) {
            //     relocateLostGuests();
            // }
        });
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
            }
            var elements = map.getTile(checkCoords.x, checkCoords.y).elements;
            bad = true;
            for (var j = 0; j < elements.length && bad; j++) {
                if (elements[j].type === 'footpath' && (elements[j].baseHeight === coords.z / SLABHEIGHT || elements[j].baseHeight + 2 === coords.z / SLABHEIGHT)) {
                    return true
                }
            }
        }
    }

    return false;
}

function doesExitUsePath(position) {
    var pathCoords = {
        x: Math.floor(position.x / TILEWIDTH),
        y: Math.floor(position.y / TILEWIDTH),
        z: position.z / SLABHEIGHT
    }
    var checkExitCoords;
    for (var i = 0; i < 4; i++) {

        checkExitCoords = {
            x: pathCoords.x + ((i > 1) ? -1 : 1) * (i % 2),
            y: pathCoords.y + ((i > 1) ? -1 : 1) * ((i + 1) % 2),
        };
        var elements = map.getTile(checkExitCoords.x, checkExitCoords.y).elements;
        for (var k = 0; k < elements.length; k++) {
            if (elements[k].type === 'entrance' && 'isQueue' in elements[k] && !elements[k]['isQueue']) {
                for (var j = 0; j < 2; j++) {
                    if (elements[k].baseHeight === pathCoords.z + (j * 2)
                        && getRide(elements[k]['ride']).status === 'open') {
                        return getRide(elements[k]['ride']);
                    }
                }
            }
        }
    }
    return false;
}

function relocateLostGuests() {
    var peeps = map.getAllEntities('peep');
    peeps.forEach(peep => {
        var elements = map.getTile(Math.floor(peep.x / TILEWIDTH), Math.floor(peep.y / TILEWIDTH)).elements;
        var pathIndex = -1;
        for (var i = 0; i < elements.length; i++) {
            if ((elements[i].type === 'footpath' || elements[i].type === 'entrance' || elements[i].type === 'track') && elements[i].baseHeight <= peep.z / SLABHEIGHT) {
                pathIndex = i;
            }
        }
        if (elements.length !== 0 && pathIndex === -1) {
            console.log(`peep ${peep.name} is lost.`);
            console.log(elements);
            // context.executeAction('peeppickup', {
            // //NO ARGS??????
            // }, doNothing);
        }
    })
}

// @ts-ignore
function isPlayerAdmin(player: Player) {
    var perms: string[] = network.getGroup(player.group).permissions;
    return perms.indexOf('kick_player') >= 0;
}

// @ts-ignore
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
    name: 'ffa-anti-grief',
    version: '0.0.1',
    authors: ['Cory Sanin'],
    type: 'remote',
    licence: 'GPL-3.0',
    main: antiGriefMain
});