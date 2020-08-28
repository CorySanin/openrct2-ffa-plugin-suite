/// <reference path="../../../bin/openrct2.d.ts" />
// uses OPENRCT2_PLUGIN_API_VERSION = 1

function enableCheats() {
    if (network.mode === 'server') {
        //disable vandalism (by the guests, anyway 🙄)
        setCheatAction(13);

        //disable plants aging
        setCheatAction(26);

        //disable all breakdowns
        setCheatAction(9);

        //clear grass every 500 ticks
        context.subscribe('interval.tick', () => {
            if (date.ticksElapsed % 500 === 0) {
                setCheatAction(24);
            }
        });
    }
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
    name: 'ffa-cheat-toggle',
    version: '0.0.1',
    authors: ['Cory Sanin'],
    type: 'remote',
    licence: 'GPL-3.0',
    main: enableCheats
});