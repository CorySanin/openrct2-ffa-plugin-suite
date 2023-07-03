/// <reference path="../types/openrct2.d.ts" />

(function () {
    function disableTrackDesigns() {
        if (network.mode === 'server') {
            context.subscribe('action.query', (e) => {
                if (e.player === -1 && e.action === 'ridecreate') {
                    e.result = {
                        error: 1,
                        errorTitle: 'NO PLAYER INDEX',
                        errorMessage: 'Player is -1'
                    };
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

    registerPlugin({
        name: 'ffa-disable-track-designs',
        version: '0.0.7',
        minApiVersion: 1,
        authors: ['Cory Sanin'],
        type: 'remote',
        licence: 'GPL-3.0',
        targetApiVersion: 77,
        main: disableTrackDesigns
    });
})();