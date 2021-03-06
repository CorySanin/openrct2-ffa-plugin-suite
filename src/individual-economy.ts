/// <reference path="../types/openrct2.d.ts" />
// uses OPENRCT2_PLUGIN_API_VERSION = 2

(function () {
    interface PlayerProfile {
        moneySpent: number,
        name: string,
        previousTotalProfit: number
        ridesCreated: number[]
    }

    interface PlayerProfiles {
        [publicKeyHash: string]: PlayerProfile
    }

    interface RideProperty {
        authorHash: string,
        previousTotalProfit: number
    }

    interface RideProperties {
        [rideID: number]: RideProperty
    }

    const MINIMUM_STARTING_DOLLARS = 10000;
    const buildActions = [
        'bannerplace',
        'bannerremove',
        'clearscenery',
        'footpathplace',
        'footpathplacefromtrack',
        'foothpathremove',
        'footpathsceneryplace',
        'footpathsceneryremove',
        'landbuyrights',
        'landlower',
        'landraise',
        'largesceneryplace',
        'largesceneryremove',
        'mazeplacetrack',
        'mazesettrack',
        'parkmarketing',
        'parksetloan',
        'ridecreate',
        'ridedemolish',
        'smallsceneryplace',
        'smallsceneryremove',
        'surfacesetstyle',
        'tilemodify',
        'trackdesign',
        'trackplace',
        'trackremove',
        'wallplace',
        'wallremove',
        'waterlower',
        'waterraise'
    ];
    const PREFIX = new RegExp('^(!|/)');
    const CMDHELP = new RegExp('^help($| )', 'i');
    const CMDCASH = new RegExp('^cash($| )', 'i');
    const CMDTRANSFER = new RegExp('^(transfer|give|send)($| )', 'i');

    var initialDollars: number;
    var playerProfiles: PlayerProfiles;
    var rideProperties: RideProperties;

    // setTimeout polyfill
    if (typeof context.setTimeout !== 'function') {
        context.setTimeout = function (callback, delay) {
            callback();
            return -1;
        }
    }

    function getCommand(str): boolean | string {
        if (str.match(PREFIX)) {
            return str.replace(PREFIX, '').trim();
        }
        return false;
    }

    function doesCommandMatch(str, commands): boolean | string {
        for (const command of commands) {
            if (typeof command === 'string') {
                if (str.startsWith(command)) {
                    let ret = str.substring(command.length, str.length).trim();
                    return (ret) ? ret : true;
                }
            }
            else {
                if (str.match(command)) {
                    return str.replace(command, '').trim();
                }
            }
        }
        return false;
    }


    function individualEconMain() {
        if (network.mode === 'server') {
            playerProfiles = {};
            rideProperties = {};
            initialDollars = Math.max(MINIMUM_STARTING_DOLLARS, park.cash);

            context.subscribe('network.join', (e) => {
                context.setTimeout(() => network.sendMessage(`{NEWLINE}{YELLOW}This server uses ffa-individual-economy.{NEWLINE}To see your balance at any time, say \`{WHITE}!cash{YELLOW}\` in chat.`, [e.player]), 1000);
            });

            context.subscribe('action.query', (e) => {
                // check if player has the CASH MONEY
                if ('cost' in e.result && e.result.cost >= 0 && e.player !== -1) {
                    var playerCash = getPlayerCash(e.player);
                    if (buildActions.indexOf(e.action) >= 0) {
                        setCheatAction(17, playerCash);
                    }
                    if (playerCash < e.result.cost) {
                        network.sendMessage(`{RED}ERROR: Not enough cash to perform that action! It costs ${e.result.cost} and you have ${playerCash}`, [e.player]);
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
                    var player: number | string = e.player;

                    // add/remove rides from player arrays
                    if (e.action === 'ridecreate' &&
                        'ride' in e.result) {
                        addRide(e.player, e.result['ride']);
                    }
                    else if (e.action === 'ridedemolish' &&
                        'ride' in e.args) {
                        player = removeRide(e.args['ride']);
                    }

                    // deduct the money
                    if ('cost' in e.result) {
                        spendMoney(player, e.result.cost);
                        if (buildActions.indexOf(e.action) >= 0) {
                            setCheatAction(17, getPlayerCash(e.player));
                        }
                    }
                }
            });

            context.subscribe('interval.day', (e) => {
                if (park.cash <= 0) {
                    setCheatAction(17, initialDollars);
                }
                if (date.day === 1) {
                    var mostProfitableTotal = {
                        name: '',
                        profit: 0
                    };

                    var mostProfitableAverage = {
                        name: '',
                        profit: 0
                    };

                    var mostProfitableRide = {
                        name: '',
                        author: '',
                        profit: 0
                    };

                    for (const playerHash in playerProfiles) {
                        var profit = getProfitDifference(playerHash);
                        var aveProfit = Math.floor(profit / playerProfiles[playerHash].ridesCreated.length);
                        if (profit > mostProfitableTotal.profit) {
                            mostProfitableTotal = {
                                name: playerProfiles[playerHash].name,
                                profit
                            };
                        }
                        if (aveProfit > mostProfitableAverage.profit) {
                            mostProfitableAverage = {
                                name: playerProfiles[playerHash].name,
                                profit: aveProfit
                            };
                        }
                    }

                    for (var ride of map.rides) {
                        if (ride.id in rideProperties) {
                            var profit = getRideProfitDifference(ride.id);
                            if (profit > mostProfitableRide.profit) {
                                mostProfitableRide = {
                                    name: ride.name,
                                    author: playerProfiles[rideProperties[ride.id].authorHash].name,
                                    profit
                                };
                            }
                        }
                    }
                    let sendmsg = '';
                    if (mostProfitableTotal.profit > 0) {
                        sendmsg += `{NEWLINE}{YELLOW}This month's tycoon is {WHITE}${mostProfitableTotal.name}{YELLOW}! They made a total of ${mostProfitableTotal.profit}.`;
                    }
                    if (mostProfitableAverage.profit > 0) {
                        sendmsg += `{NEWLINE}{YELLOW}This month's quality ride expert is {WHITE}${mostProfitableAverage.name}{YELLOW}! Their average profit per ride was ${mostProfitableAverage.profit}.`;
                    }
                    if (mostProfitableRide.profit > 0) {
                        sendmsg += `{NEWLINE}{YELLOW}This month's most profitable ride is {WHITE}${mostProfitableRide.name}{YELLOW} by {WHITE}${mostProfitableRide.author}{YELLOW}!`;
                    }
                    if (sendmsg != '') {
                        network.sendMessage(sendmsg);
                    }
                }
            });

            context.subscribe('network.chat', (e) => {
                let msg = e.message;
                let outmsg: string, args: any, command = getCommand(msg);
                if (command !== false) {

                    if ((args = doesCommandMatch(command, [CMDCASH])) !== false) {
                        outmsg = `{TOPAZ}Your current balance is {WHITE}${getPlayerCash(e.player)}`;
                    }
                    else if ((args = doesCommandMatch(command, [CMDTRANSFER])) !== false) {
                        args = args.split(' ');
                        if (args.length === 2) {
                            let recipient: number = null;
                            network.players.every(p => {
                                if (p.name === args[0]) {
                                    recipient = p.id;
                                    return false;
                                }
                                else {
                                    return true
                                }
                            });
                            if (recipient === null || !sendMoney(e.player, recipient, Math.max(0, Math.floor(parseInt(args[1]))))) {
                                outmsg = `{RED}ERROR: {WHITE}could not transfer money. Make sure the recipient is online and the amount is less than ${Math.max(0, getPlayerCash(e.player) - initialDollars)}`;
                            }
                        }
                        else {
                            command = 'help transfer';
                        }
                    }
                    if ((args = doesCommandMatch(command, [CMDHELP])) !== false) {
                        console.log(args);
                        let subargs;
                        if ((subargs = doesCommandMatch(args, [CMDHELP])) !== false) {
                            outmsg = '{NEWLINE}{YELLOW}help{NEWLINE}{WHITE}!help displays a list of commands that can be used.'
                                + '{NEWLINE}{YELLOW}help [command]{NEWLINE}{WHITE}Specifying a command will display a help message for that command.';
                        }
                        else if ((subargs = doesCommandMatch(args, [CMDCASH])) !== false) {
                            outmsg = '{NEWLINE}{YELLOW}cash{NEWLINE}{WHITE}!cash displays how much money you have.';
                        }
                        else if ((subargs = doesCommandMatch(args, [CMDTRANSFER])) !== false) {
                            outmsg = `{NEWLINE}{YELLOW}transfer [player] [amount]{NEWLINE}{WHITE}!transfer transfers money from your own balance to another player. You must have more than ${initialDollars} (the starting cash) to transfer any amount.`;
                        }
                        else {
                            outmsg = '{NEWLINE}{YELLOW}The following commands are available:{NEWLINE}{WHITE}help{NEWLINE}cash{NEWLINE}transfer';
                        }
                    }

                    if (outmsg) {
                        context.setTimeout(() => network.sendMessage(outmsg, [e.player]), 100);
                    }
                }
            });
        }
    }

    function getPlayer(playerID: number): Player {
        if (playerID === -1) {
            return null;
        }
        let match: Player = null;
        network.players.every(p => {
            if (p.id === playerID) {
                match = p;
            }
            return match == null;
        });
        if (match && !(match.publicKeyHash in playerProfiles)) {
            playerProfiles[match.publicKeyHash] = {
                moneySpent: 0,
                name: match.name,
                previousTotalProfit: 0,
                ridesCreated: []
            }
            network.sendMessage(`{NEWLINE}{YELLOW}This server uses ffa-individual-economy. You currently have a balance of {WHITE}${initialDollars}{YELLOW} to build with.{NEWLINE}To see your balance at any time, say \`{WHITE}!cash{YELLOW}\` in chat.`, [playerID]);
        }
        else if (match) {
            playerProfiles[match.publicKeyHash].name = match.name;
        }
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

    function sendMoney(sender: number, recipient: number, amount: number): boolean {
        if (getPlayerCash(sender) - initialDollars >= amount) {
            spendMoney(sender, amount);
            spendMoney(recipient, amount * -1);
            return true;
        }
        return false
    }

    function spendMoney(player: number | string, cost: number) {
        playerProfiles[(typeof player === 'number') ? getPlayer(player).publicKeyHash : player].moneySpent += cost;
    }

    function getPlayerCash(playerID: number): number {
        var player = getPlayer(playerID);
        return initialDollars - playerProfiles[player.publicKeyHash].moneySpent + getPlayerProfit(player.publicKeyHash);
    }

    function getPlayerProfit(playerHash: string): number {
        var profit = 0;
        for (const rideID of playerProfiles[playerHash].ridesCreated) {
            var ride = getRide(rideID);
            profit += Math.max(ride.totalProfit, (ride.type === 36) ? 0 : ride.totalProfit);
            // Don't subtract funds if it's a bathroom 🚽
        }
        return profit;
    }

    function getProfitDifference(playerHash: string): number {
        var profit = getPlayerProfit(playerHash);
        var previous = playerProfiles[playerHash].previousTotalProfit;
        playerProfiles[playerHash].previousTotalProfit = profit;
        return profit - previous;
    }

    function getRideProfitDifference(rideID: number): number {
        var profit = getRide(rideID).totalProfit;
        var previous = rideProperties[rideID].previousTotalProfit;
        rideProperties[rideID].previousTotalProfit = profit;
        return profit - previous;
    }

    function addRide(playerID: number, rideID: number) {
        var player = getPlayer(playerID);
        if (playerProfiles[player.publicKeyHash].ridesCreated.indexOf(rideID) === -1) {
            playerProfiles[player.publicKeyHash].ridesCreated.push(rideID);
        }
        rideProperties[rideID] = {
            authorHash: player.publicKeyHash,
            previousTotalProfit: 0
        };
    }

    function removeRide(rideID: number): string {
        var playerHash = rideProperties[rideID].authorHash;
        var index = playerProfiles[playerHash].ridesCreated.indexOf(rideID);
        if (index !== -1) {
            playerProfiles[playerHash].ridesCreated.splice(index, 1);
        }
        delete rideProperties[rideID];
        return playerHash;
    }

    function setCheatAction(type: number, param1: number = 1, param2: number = 0): void {
        context.executeAction('setcheataction', {
            type,
            param1,
            param2
        }, doNothing);
    }

    function doNothing() {
        //Done!
    }

    registerPlugin({
        name: 'ffa-individual-economy',
        version: '0.0.2',
        minApiVersion: 2,
        authors: ['Cory Sanin'],
        type: 'remote',
        licence: 'GPL-3.0',
        main: individualEconMain
    });
})();