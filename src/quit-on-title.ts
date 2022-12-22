/// <reference path="../types/openrct2.d.ts" />
// uses OPENRCT2_PLUGIN_API_VERSION = 50

// for use with headless servers only

(function () {
    function main() {
        if (context.mode === 'title' && typeof ui === 'undefined') {
            console.log('ffa-quit-on-title: title screen detected. Aborting.')
            console.executeLegacy('abort');
        }
    }

    registerPlugin({
        name: 'ffa-quit-on-title',
        version: '0.0.1',
        authors: ['Cory Sanin'],
        type: 'intransient',
        licence: 'GPL-3.0',
        minApiVersion: 50,
        targetApiVersion: 65,
        main
    });
})();