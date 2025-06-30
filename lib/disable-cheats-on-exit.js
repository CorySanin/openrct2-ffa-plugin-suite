(function () {
    function canToggleCheats(player) {
        return network.getGroup(player.group).permissions.indexOf('cheat') >= 0;
    }
    function setCheatAction(type, param1, param2) {
        if (param1 === void 0) { param1 = 0; }
        if (param2 === void 0) { param2 = 0; }
        context.executeAction('cheatset', {
            type: type,
            param1: param1,
            param2: param2
        });
    }
    function disableCheat(cheat) {
        if (cheat === 'noMoney') {
            return setCheatAction(15);
        }
        else if (!(cheat in cheats)) {
            console.log("'".concat(cheat, "' is not a valid cheat."));
            return;
        }
        switch (cheat) {
            case 'allowArbitraryRideTypeChanges':
                return setCheatAction(41);
            case 'allowRegularPathAsQueue':
                return setCheatAction(50);
            case 'allowTrackPlaceInvalidHeights':
                return setCheatAction(48);
            case 'buildInPauseMode':
                return setCheatAction(11);
            case 'disableAllBreakdowns':
                return setCheatAction(9);
            case 'disableBrakesFailure':
                return setCheatAction(8);
            case 'disableClearanceChecks':
                return setCheatAction(1);
            case 'disableLittering':
                return setCheatAction(14);
            case 'disablePlantAging':
                return setCheatAction(25);
            case 'disableRideValueAging':
                return setCheatAction(43);
            case 'disableSupportLimits':
                return setCheatAction(2);
            case 'disableTrainLengthLimit':
                return setCheatAction(5);
            case 'disableVandalism':
                return setCheatAction(13);
            case 'enableAllDrawableTrackPieces':
                return setCheatAction(45);
            case 'enableChainLiftOnAllTrack':
                return setCheatAction(6);
            case 'fastLiftHill':
                return setCheatAction(7);
            case 'freezeWeather':
                return setCheatAction(36);
            case 'ignoreResearchStatus':
                return setCheatAction(44);
            case 'ignoreRideIntensity':
                return setCheatAction(12);
            case 'neverendingMarketing':
                return setCheatAction(40);
            case 'sandboxMode':
                return setCheatAction(0);
            case 'showAllOperatingModes':
                return setCheatAction(3);
            case 'showVehiclesFromOtherTrackTypes':
                return setCheatAction(4);
            default:
                console.log("'".concat(cheat, "' is not currently supported by disable-cheats-on-exit"));
        }
    }
    function main() {
        if (network.mode !== 'server') {
            return;
        }
        var MANAGED_CHEATS = context.sharedStorage.get('disable-cheats-on-exit.cheats', ['disableClearanceChecks', 'sandboxMode']);
        context.subscribe('network.leave', function (_) {
            context.setTimeout(function () {
                if (network.players.filter(function (p) { return canToggleCheats(p); }).length <= 1) {
                    MANAGED_CHEATS.forEach(disableCheat);
                }
            }, 200);
        });
        context.subscribe('action.execute', function (action) {
            if (action.action === 'cheatset') {
                console.log(action);
            }
        });
    }
    registerPlugin({
        name: 'disable-cheats-on-exit',
        version: '0.1.0',
        authors: ['Cory Sanin'],
        type: 'remote',
        licence: 'MIT',
        minApiVersion: 77,
        targetApiVersion: 108,
        main: main
    });
})();
