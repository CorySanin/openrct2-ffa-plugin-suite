/// <reference path="../types/openrct2.d.ts" />

type Floor = FootpathElement | TrackElement | EntranceElement;

interface TileSurfaces {
    surface: null | SurfaceElement;
    floor: null | Floor;
    elementCount: number
}

(function () {
    const TILEWIDTH = 32;
    const SLABHEIGHT = 8;
    let entrancePath: null | CoordsXYZ = null;
    function antiGriefMain() {
        if (network.mode === 'server') {
            entrancePath = getEntranceCoords();
            context.subscribe('action.query', (e: GameActionEventArgs<GameActionArgs>) => {
                /**
                 * Do not open rides without paths leading from an exit
                 */
                if (e.action === 'ridesetstatus' && e.args['status'] === 1) {
                    if (!doesRideHaveExitPath(e.args['ride'])) {
                        e.result = {
                            error: 1,
                            errorTitle: 'NO EXIT',
                            errorMessage: 'Ride has no exit path.'
                        }
                        network.sendMessage(`{RED}ERROR: {WHITE}${getRide(e.args['ride']).name} has no path leading from its exit!`, [e.player]);
                    }
                }
                /**
                 * Only remove path if there isn't an open ride whose exit deposits to this path
                 */
                else if (e.type === 19) {
                    const rideUsesPath = doesExitUsePath(e.result.position)
                    if (rideUsesPath) {
                        e.result = {
                            error: 1,
                            errorTitle: 'EXIT NEEDS PATH',
                            errorMessage: `${rideUsesPath.name} must be closed before removing that path.`,
                        }
                        network.sendMessage(`{RED}ERROR: {WHITE}${e.result.errorMessage}`, [e.player]);
                    }
                }
            });

            context.subscribe('interval.day', findLostGuests);
        }
        // @ts-ignore
        else if (typeof FFAPLUGINMSG === 'undefined') {
            // @ts-ignore
            FFAPLUGINMSG = true;
            console.log(
                '\n' +
                '    This server uses one or more plugins from the FFA plugin suite.\n' +
                '    https://github.com/CorySanin/Openrct2-ffa-plugin-suite\n' +
                '    Found a bug? Please create an issue on GitHub with reproducible steps. Please and thank you!' +
                '\n');
        }
    }

    function doesRideHaveExitPath(rideId) {
        const ride = getRide(rideId);
        if (ride.classification !== 'ride') {
            return true;
        }
        const stations = ride.stations;
        let bad = false;
        for (var i = 0; i < stations.length && !bad; i++) {
            const coords = stations[i].exit;
            if (coords) {
                const checkCoords = {
                    x: coords.x / TILEWIDTH + (coords.direction + 1) % 2 * (coords.direction - 1) * -1,
                    y: coords.y / TILEWIDTH + coords.direction % 2 * (coords.direction - 2)
                }
                const elements = map.getTile(checkCoords.x, checkCoords.y).elements;
                bad = true;
                for (let j = 0; j < elements.length; j++) {
                    if (elements[j].type === 'surface') {
                        let surface = elements[j] as SurfaceElement;
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

    function doesExitUsePath(position: CoordsXYZ) {
        let pathCoords: CoordsXYZ = {
            x: Math.floor(position.x / TILEWIDTH),
            y: Math.floor(position.y / TILEWIDTH),
            z: position.z / SLABHEIGHT
        }
        let checkExitCoords: CoordsXY;
        for (let i = 0; i < 4; i++) {

            checkExitCoords = {
                x: pathCoords.x + ((i > 1) ? -1 : 1) * (i % 2),
                y: pathCoords.y + ((i > 1) ? -1 : 1) * ((i + 1) % 2),
            };
            const elements = map.getTile(checkExitCoords.x, checkExitCoords.y).elements;
            for (let k = 0; k < elements.length; k++) {
                if (elements[k].type === 'entrance' && 'isQueue' in elements[k] && !elements[k]['isQueue']) {
                    const entrance = elements[k] as EntranceElement;
                    if (entrance.object !== 2 // exclude park entrances
                        && pathCoords.x === checkExitCoords.x + (entrance.direction + 1) % 2 * (entrance.direction - 1) * -1
                        && pathCoords.y === checkExitCoords.y + entrance.direction % 2 * (entrance.direction - 2)) {
                        for (let j = 0; j < 2; j++) {
                            let ride: Ride;
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

    function getEntranceCoords(): CoordsXYZ {
        for (let i = 0; i < map.size.x; i++) {
            for (let j = 0; j < map.size.y; j++) {
                const tile: Tile = map.getTile(i, j);
                for (let z = 0; z < tile.elements.length; z++) {
                    if (tile.elements[z].type == 'entrance' && (<EntranceElement>tile.elements[z]).object === 2) {
                        const entrace = tile.elements[z] as EntranceElement;
                        const direction: number = (entrace.direction + 2) % 4
                        const checkCoords: CoordsXY = {
                            x: i + (direction + 1) % 2 * (direction - 1) * -1,
                            y: j + direction % 2 * (direction - 2)
                        };
                        const elements = map.getTile(checkCoords.x, checkCoords.y).elements;
                        for (let k = 0; k < elements.length; k++) {
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

    function pathSlopeToSurfaceSlope(slope: number | null): number {
        if (slope === null) {
            return 0;
        }
        return ([12, 9, 3, 6])[slope];
    }

    function findLostGuests() {
        if (entrancePath != null && context.apiVersion >= 66) {
            const peeps: Guest[] | Staff[] = (date.day % 2) ? map.getAllEntities('guest') : map.getAllEntities('staff');
            const lostPeeps: typeof peeps = [];
            const memoizedSurfaces: { [key: string]: TileSurfaces } = {};
            peeps.forEach((peep: Staff & Guest) => {
                const coords: CoordsXY = {
                    x: Math.floor(peep.x / TILEWIDTH),
                    y: Math.floor(peep.y / TILEWIDTH)
                };
                const coordKey = `${coords.x},${coords.y}`;
                const peepBaseHeight = peep.z / SLABHEIGHT;
                if (!(coordKey in memoizedSurfaces)) {
                    const elements = map.getTile(coords.x, coords.y).elements;
                    let floor: null | FootpathElement | TrackElement | EntranceElement = null;
                    let surface: null | SurfaceElement = null;
                    elements.forEach(el => {
                        if (el.type === 'surface') {
                            surface = el as SurfaceElement;
                        }
                    });
                    elements.forEach((el, i: number) => {
                        if (!surface.hasOwnership && el.type === 'footpath' && surface.baseHeight === el.baseHeight && surface.slope === pathSlopeToSurfaceSlope(el.slopeDirection)) {
                            return;
                        }
                        if ((el.type !== 'footpath' && el.type !== 'entrance' && el.type !== 'track')) {
                            return;
                        }
                        if (floor === null || floor.baseHeight > el.baseHeight) {
                            floor = el;
                        }
                    });
                    memoizedSurfaces[coordKey] = {
                        surface,
                        floor,
                        elementCount: elements.length
                    };
                }
                const surfaces: TileSurfaces = memoizedSurfaces[coordKey];
                if (surfaces.elementCount !== 0 && (surfaces.floor === null || surfaces.floor.baseHeight > peepBaseHeight) && (surfaces.surface.hasOwnership || surfaces.surface.hasConstructionRights)) {
                    lostPeeps.push(peep);
                }
            });
            relocateLostGuests(lostPeeps);
        }
    }

    function relocateLostGuests(peeps: Guest[] | Staff[]) {
        if (peeps && peeps.length) {
            let peep = peeps.pop();
            context.executeAction("peeppickup", {
                type: 0,
                id: peep.id,
                x: -32768,
                y: 0,
                z: 0,
                playerId: 0
            }, () => {
                context.executeAction("peeppickup", {
                    type: 2,
                    id: peep.id,
                    x: entrancePath.x,
                    y: entrancePath.y,
                    z: entrancePath.z,
                    playerId: 0
                }, () => relocateLostGuests(peeps));
            });
        }
    }

    function isPlayerAdmin(player: Player) {
        let perms: string[] = network.getGroup(player.group).permissions;
        return perms.indexOf('kick_player') >= 0;
    }

    function getRide(rideID: number): Ride {
        if (rideID === -1) {
            return null;
        }
        const rides = map.rides;
        let ride: Ride = null;
        for (const r of rides) {
            if (r.id === rideID) {
                ride = r;
            }
        }
        return ride;
    }

    registerPlugin({
        name: 'ffa-anti-grief',
        version: '0.0.8',
        authors: ['Cory Sanin'],
        type: 'remote',
        licence: 'GPL-3.0',
        minApiVersion: 65,
        targetApiVersion: 77,
        main: antiGriefMain
    });
})();