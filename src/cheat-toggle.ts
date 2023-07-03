/// <reference path="../types/openrct2.d.ts" />

(function () {
    // action was renamed in API version 66 by #18826 and again in API version 74 by #19987
    const SETCHEAT = (context.apiVersion > 65) ? ((context.apiVersion >= 74) ? 'cheatset' : 'setcheat') : 'setcheataction';

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

    function setCheatAction(type: number, param1: number = 1, param2: number = 0): void {
        context.executeAction(SETCHEAT, {
            type,
            param1,
            param2
        });
    }

    registerPlugin({
        name: 'ffa-cheat-toggle',
        version: '0.0.7',
        authors: ['Cory Sanin'],
        type: 'remote',
        licence: 'GPL-3.0',
        targetApiVersion: 77,
        minApiVersion: 65,
        main: enableCheats
    });
})();