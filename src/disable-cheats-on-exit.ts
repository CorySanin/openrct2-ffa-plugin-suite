// For my friends at Mozar's
/// <reference path="../types/openrct2.d.ts" />

(function () {
    function canToggleCheats(player: Player): boolean {
        return network.getGroup(player.group).permissions.indexOf('cheat') >= 0
    }

    function main() {
        const MANAGED_CHEATS: (keyof Cheats)[] = context.sharedStorage.get('disable-cheats-on-exit.cheats', ['disableClearanceChecks', 'sandboxMode']);

        context.subscribe('network.leave', _ => {
            if (network.players.filter(p => canToggleCheats(p)).length <= 1) {
                cheats.disableClearanceChecks = false
                MANAGED_CHEATS.forEach(cheat => {
                    if (!(cheat in cheats)) {
                        console.log(`'${cheat}' is not a valid cheat.`);
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
        minApiVersion: 500, //77
        targetApiVersion: 500,
        main
    });
})();
