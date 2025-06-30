(function () {
    function canToggleCheats(player) {
        return network.getGroup(player.group).permissions.indexOf('cheat') >= 0;
    }
    function main() {
        var MANAGED_CHEATS = context.sharedStorage.get('disable-cheats-on-exit.cheats', ['disableClearanceChecks', 'sandboxMode']);
        context.subscribe('network.leave', function (_) {
            if (network.players.filter(function (p) { return canToggleCheats(p); }).length <= 1) {
                cheats.disableClearanceChecks = false;
                MANAGED_CHEATS.forEach(function (cheat) {
                    if (!(cheat in cheats)) {
                        console.log("'".concat(cheat, "' is not a valid cheat."));
                        return;
                    }
                    cheats[cheat] = false;
                });
            }
        });
    }
    registerPlugin({
        name: 'disable-cheats-on-exit',
        version: '0.1.0',
        authors: ['Cory Sanin'],
        type: 'remote',
        licence: 'MIT',
        minApiVersion: 500,
        targetApiVersion: 500,
        main: main
    });
})();
