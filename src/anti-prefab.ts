/// <reference path="../types/openrct2.d.ts" />
// uses OPENRCT2_PLUGIN_API_VERSION = 1

function main() {
    if (network.mode === 'server') {
        context.subscribe('action.execute', (e) => {
            // @ts-ignore
            if(e.player === -1){
                console.log(`Player -1 did action: ${e.type}`);
                network.sendMessage(`Player -1 did action: ${e.type}`);
            }
        });
    }
}

registerPlugin({
    name: 'prefab-player-index',
    version: '0.0.1',
    authors: ['Cory Sanin'],
    type: 'remote',
    licence: 'GPL-3.0',
    main
});