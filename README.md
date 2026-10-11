# GTA V browser deployment

Vercel serves the browser engine, shaders, metadata and prebuilt startup batches.
An Edge function serves game-file ranges and ordered batches from fixed,
range-addressable release packs. The game keeps its existing browser cache.

The source snapshot is build `8b0b5899ed` from `playgta5.com`, supplied through
the offline archive. A WebGPU-capable desktop browser is required.

Run `npm test` to check range translation, batch ordering, validation and
upstream failures. Run `npm run build` to create Vercel Build Output API files.

The release must contain every pack in `asset-index.json` before the site can
load the world. Pack files are prepared locally outside this source project.
Game data is published in the `game-data-v2` GitHub release for this deployment.

`public/deployment-status.json` prevents the engine from starting while the
initial release is uploading. Set `ready` to `true` only after all indexed
packs have been uploaded and live byte-range and batch checks pass. An open
preparation screen checks again every 30 seconds and starts automatically.

## Windows .exe

Run `npm run exe` (needs [Bun](https://bun.sh)) to build `dist/GTA5-Webport.exe`.
The exe contains everything in `public/` and runs a small local server on
`127.0.0.1:8127` that streams game data from the `game-data-v2` release, then
opens the game in Microsoft Edge (or Chrome) as an app window. Closing the game
window stops the server.

## Controller

Xbox and PlayStation controllers work through the browser Gamepad API (press any
button after the page loads). The game only reads keyboard and mouse here, so
each button presses the PC key of the matching console control. Start screen:
A = Story, X = Sandbox, B = Back.

The page cannot see whether you are on foot, driving or in the pause menu, so
there are three layouts. Y (enter/exit vehicle) switches between on foot and
vehicle, View + Y switches without pressing F, and Menu switches to the menu
layout and back (B at the top of the menu also leaves it). A message at the
top of the screen shows the current layout.

| Control | On foot | In vehicle | Pause menu |
| --- | --- | --- | --- |
| Left stick | Move | Steer, lean / pitch (aircraft roll) | Move map |
| Right stick | Camera / aim | Camera | Cursor |
| RT | Attack, open parachute | Accelerate / throttle up | Next tab group (Page Up) |
| LT | Aim | Brake, reverse / throttle down | Previous tab group (Page Down) |
| RB | Cover | Handbrake | Next tab (E) |
| LB | Weapon wheel (hold) | Vehicle aim | Previous tab (Q) |
| A | Sprint, accept | Duck | Accept |
| B | Reload, light melee, cancel | Cinematic camera, cancel | Back |
| X | Jump, heavy melee | Next vehicle weapon | Space option |
| Y | Enter vehicle, parachute | Exit vehicle | Tab option |
| L3 | Duck / stealth | Horn | |
| R3 | Look behind | Look behind | |
| L3 + R3 | Special ability | Special ability | |
| D-pad up | Phone | Phone | Up |
| D-pad down | Tap: radar, hold: character wheel | same | Down |
| D-pad left | Detonate / throw | Tap: next radio station, hold: radio wheel | Left |
| D-pad right | Talk / pick up / context | Headlights | Right |
| View | Tap: camera, hold: interaction menu | same | |
| Menu | Pause | Pause | Leave menu |

On foot, D-pad left / right scroll through the weapon wheel while LB is held,
and D-pad up / down zoom the scope while LT is held.

Extras, holding View: View + LB drop weapon, View + RB drop ammo, View + LEFT /
UP / RIGHT switch to Michael / Franklin / Trevor, View + X cheat console,
View + B cinematic slow motion, View + A headlights, View + DOWN multiplayer
info, View + LT / RT sniper zoom out / in.
