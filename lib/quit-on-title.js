(function () {
    function main() {
        if (context.mode === 'title' && typeof ui === 'undefined') {
            console.log('ffa-quit-on-title: title screen detected. Aborting.');
            console.executeLegacy('abort');
        }
    }
    registerPlugin({
        name: 'ffa-quit-on-title',
        version: '0.0.7',
        authors: ['Cory Sanin'],
        type: 'intransient',
        licence: 'GPL-3.0',
        minApiVersion: 50,
        targetApiVersion: 65,
        main: main
    });
})();
