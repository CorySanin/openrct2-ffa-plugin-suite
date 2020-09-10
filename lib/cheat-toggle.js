function enableCheats() {
    if (network.mode === 'server') {
        setCheatAction(13);
        setCheatAction(26);
        setCheatAction(9);
        setCheatAction(44);
        context.subscribe('interval.tick', function () {
            if (date.ticksElapsed % 1000 === 0) {
                setCheatAction(24);
            }
        });
    }
}
function setCheatAction(type, param1, param2) {
    if (param1 === void 0) { param1 = 1; }
    if (param2 === void 0) { param2 = 0; }
    context.executeAction('setcheataction', {
        type: type,
        param1: param1,
        param2: param2
    }, doNothing);
}
function doNothing() {
}
registerPlugin({
    name: 'ffa-cheat-toggle',
    version: '0.0.1',
    authors: ['Cory Sanin'],
    type: 'remote',
    licence: 'GPL-3.0',
    main: enableCheats
});
