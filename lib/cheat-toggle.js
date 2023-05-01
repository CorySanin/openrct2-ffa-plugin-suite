(function () {
    var SETCHEAT = (context.apiVersion > 65) ? ((context.apiVersion >= 74) ? 'cheatset' : 'setcheat') : 'setcheataction';
    function enableCheats() {
        if (network.mode === 'server') {
            setCheatAction(13);
            setCheatAction(25);
            setCheatAction(9);
            setCheatAction(43);
            setCheatAction(44);
            context.subscribe('interval.tick', function () {
                if (date.ticksElapsed % 10000 === 0) {
                    setCheatAction(23);
                }
            });
        }
        else if (typeof FFAPLUGINMSG === 'undefined') {
            FFAPLUGINMSG = true;
            console.log('\n' +
                '    This server uses one or more plugins from the FFA plugin suite.\n' +
                '    https://github.com/CorySanin/Openrct2-ffa-plugin-suite\n' +
                '    Found a bug? Please create an issue on GitHub with reproducible steps. Please and thank you!' +
                '\n');
        }
    }
    function setCheatAction(type, param1, param2) {
        if (param1 === void 0) { param1 = 1; }
        if (param2 === void 0) { param2 = 0; }
        context.executeAction(SETCHEAT, {
            type: type,
            param1: param1,
            param2: param2
        });
    }
    registerPlugin({
        name: 'ffa-cheat-toggle',
        version: '0.0.6',
        authors: ['Cory Sanin'],
        type: 'remote',
        licence: 'GPL-3.0',
        targetApiVersion: 65,
        main: enableCheats
    });
})();
