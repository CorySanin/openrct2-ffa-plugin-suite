/// <reference path="../types/openrct2.d.ts" />

(function () {
    // action was renamed in API version 66 by #18826
    const SETCHEAT = (context.apiVersion > 65)? 'setcheat' : 'setcheataction';

    function enableCheats() {
        if (network.mode === 'server') {
            //disable vandalism (by the guests, anyway 🙄)
            setCheatAction(13);

            //disable plants aging
            setCheatAction(25);

            //disable all breakdowns
            setCheatAction(9);

            //rides don't decrease in value over time (useful for ffa-individual-economy)
            setCheatAction(43);

            //unlock all rides
            setCheatAction(44);

            //clear grass every 1000 ticks
            context.subscribe('interval.tick', () => {
                if (date.ticksElapsed % 10000 === 0) {
                    setCheatAction(23);
                }
            });
        }
    }

    function setCheatAction(type: number, param1: number = 1, param2: number = 0): void {
        context.executeAction(SETCHEAT, {
            type,
            param1,
            param2
        }, doNothing);
    }

    function doNothing() {
        //Done!
    }

    registerPlugin({
        name: 'ffa-cheat-toggle',
        version: '0.0.5',
        authors: ['Cory Sanin'],
        type: 'remote',
        licence: 'GPL-3.0',
        targetApiVersion: 65,
        main: enableCheats
    });
})();