(function () {
    function disableTrackDesigns() {
        if (network.mode === 'server') {
            context.subscribe('action.query', function (e) {
                if (e.player === -1 && e.action === 'ridecreate') {
                    e.result = {
                        error: 1,
                        errorTitle: 'NO PLAYER INDEX',
                        errorMessage: 'Player is -1'
                    };
                }
            });
        }
    }
    registerPlugin({
        name: 'ffa-disable-track-designs',
        version: '0.0.3',
        minApiVersion: 1,
        authors: ['Cory Sanin'],
        type: 'remote',
        licence: 'GPL-3.0',
        targetApiVersion: 65,
        main: disableTrackDesigns
    });
})();
