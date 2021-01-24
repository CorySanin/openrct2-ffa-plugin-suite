# openrct2-ffa-plugin-suite
Free for all plugin suite for OpenRCT2 multiplayer. Use all plugins or only some. The limit is in your mind.

Still a work in progress.

## ffa-ownership

Players cannot make any changes to rides that they didn't make.

## ffa-anti-grief

General anti-griefing measures. Currently only prevents opening a ride with no path connected to its exit.

## ffa-rate-limit

Kicks players for performing too many griefy actions too quickly.

## ffa-cheat-toggle

Toggles 4 cheats on launch (disable vandilism, plants don't age, disable all breakdowns, and ride value doesn't decrease), and keeps grass clear.

## ffa-individual-economy

Each player has their own funds that they use for building. Money is earned from the rides that they build.

## ffa-disable-track-designs

Prevents the construction of prefabricated track layouts. Track designs cause problems with *ffa-ownership* and *ffa-individual-economy*, so this plugin prevents them from being built in the first place. It's due to a bug where [nested actions don't report the player performing it](https://github.com/OpenRCT2/OpenRCT2/issues/12762).