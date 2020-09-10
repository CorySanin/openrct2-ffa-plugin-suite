/// <reference path="../../../bin/openrct2.d.ts" />
// uses OPENRCT2_PLUGIN_API_VERSION = 2

interface PlayerProfile {
    moneySpent: number,
    ridesCreated: number[]
}

interface PlayerProfiles {
    [publicKeyHash: string]: PlayerProfile
}

const MINIMUM_STARTING_DOLLARS = 10000;
var initialDollars: number;
var playerProfiles: PlayerProfiles;
var rideCreators: object;

function individualEconMain() {
    if (network.mode === 'server') {
        playerProfiles = {};
        rideCreators = {};
        initialDollars = Math.max(MINIMUM_STARTING_DOLLARS, park.cash);
        context.subscribe('action.query', (e) => {
            // check if player has the CASH MONEY
            if ('cost' in e.result && e.result.cost >= 0 && e.player !== -1) {
                var playerCash = getPlayerCash(e.player);
                if (playerCash < e.result.cost) {
                    network.sendMessage(`ERROR: Not enough cash to perform that action! It costs ${e.result.cost} and you have ${playerCash}`, [e.player]);
                    e.result = {
                        error: 1,
                        errorTitle: 'NOT ENOUGH CASH MONEY',
                        errorMessage: 'Can\'t afford to perform action'
                    }
                }
            }
        });

        context.subscribe('action.execute', (e) => {
            if (e.player !== -1) {
                var player = e.player;

                // add/remove rides from player arrays
                // @ts-ignore
                if (e.action === 'ridecreate' &&
                    'ride' in e.result) {
                    addRide(e.player, e.result['ride']);
                }
                // @ts-ignore
                else if (e.action === 'ridedemolish' &&
                    'ride' in e.args) {
                    player = getPlayerFromHash(removeRide(e.args['ride']));
                }

                // deduct the money
                if ('cost' in e.result) {
                    spendMoney(player, e.result.cost);
                }
            }
        });

        context.subscribe('network.chat', (e) => {
            if (e.message.toLowerCase() === '!cash') {
                network.sendMessage(`Your current balance is ${getPlayerCash(e.player)}`, [e.player]);
            }
        })
    }
}

function getPlayer(playerID: number): Player {
    if (playerID === -1) {
        return null;
    }
    var player = null; //network.getPlayer(playerID);
    var players = network.players;
    for (var i = 0; i < players.length; i++) {
        if (players[i].id === playerID) {
            player = players[i];
        }
    }
    if (player && !(player.publicKeyHash in playerProfiles)) {
        playerProfiles[player.publicKeyHash] = {
            moneySpent: 0,
            ridesCreated: []
        }
        setCheatAction(16, initialDollars);
        network.sendMessage(`This server uses ffa-individual-economy. You currently have a balance of ${initialDollars} to build with.`, [playerID]);
        network.sendMessage(`To see your balance at any time, say \`!cash\` in chat.`, [playerID]);
    }
    return player;
}

function spendMoney(playerID: number, cost: number) {
    var player = getPlayer(playerID);
    playerProfiles[player.publicKeyHash].moneySpent += cost;
}

function getPlayerCash(playerID: number): number {
    var player = getPlayer(playerID);
    var cash = initialDollars - playerProfiles[player.publicKeyHash].moneySpent;
    for (var i = 0; i < playerProfiles[player.publicKeyHash].ridesCreated.length; i++) {
        var ride = map.getRide(playerProfiles[player.publicKeyHash].ridesCreated[i]);
        // @ts-ignore
        cash += Math.max(ride.totalProfit, (ride.type === 36) ? 0 : ride.totalProfit);
        // Don't subtract funds if it's a bathroom 🚽
    }
    return cash;
}

function addRide(playerID: number, rideID: number) {
    var player = getPlayer(playerID);
    if (playerProfiles[player.publicKeyHash].ridesCreated.indexOf(rideID) === -1) {
        playerProfiles[player.publicKeyHash].ridesCreated.push(rideID);
    }
    rideCreators[rideID] = player.publicKeyHash;
}

function removeRide(rideID: number): string {
    var playerHash = rideCreators[rideID];
    var index = playerProfiles[playerHash].ridesCreated.indexOf(rideID);
    if (index !== -1) {
        playerProfiles[playerHash].ridesCreated.splice(index, 1);
    }
    delete rideCreators[rideID];
    return playerHash;
}

function getPlayerFromHash(hash: string): number {
    var players = network.players;
    for (var i = 0; i < players.length; i++) {
        if (players[i].publicKeyHash === hash) {
            return players[i].id;
        }
    }
    return -1;
}

// @ts-ignore
function setCheatAction(type: number, param1: number = 1, param2: number = 0): void {
    context.executeAction('setcheataction', {
        type,
        param1,
        param2
    }, doNothing);
}

// @ts-ignore
function doNothing() {
    //Done!
}

registerPlugin({
    name: 'ffa-individual-economy',
    version: '0.0.1',
    minApiVersion: 2,
    authors: ['Cory Sanin'],
    type: 'remote',
    licence: 'GPL-3.0',
    main: individualEconMain
});