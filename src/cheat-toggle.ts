/// <reference path="../types/openrct2.d.ts" />
// uses OPENRCT2_PLUGIN_API_VERSION = 1

(function () {
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
        name: 'ffa-cheat-toggle',
        version: '0.0.3',
        authors: ['Cory Sanin'],
        type: 'remote',
        licence: 'GPL-3.0',
        main: enableCheats
    });
})();