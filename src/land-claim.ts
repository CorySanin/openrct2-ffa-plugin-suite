/// <reference path="../../../bin/openrct2.d.ts" />
// uses OPENRCT2_PLUGIN_API_VERSION = 1

function landOwnershipMain() {
    if (typeof ui !== 'undefined') {//network.mode === 'client' && 
        console.log('testing');
        ui.registerMenuItem('Land Claim', function () {
            ui.activateTool({
                id: 'golden_spoodle',
                cursor: 'up_arrow',
                onStart: () => {

                },
                onDown: (e) => {
                    console.log(e);
                },
                onMove: (e) => {
                    
                },
                onUp: (e) => {

                },
                onFinish: () => {

                }
            });
        });
    }
}

registerPlugin({
    name: 'ffa-land-claim',
    version: '0.0.1',
    authors: ['Cory Sanin'],
    type: 'remote',
    licence: 'GPL-3.0',
    main: landOwnershipMain
});