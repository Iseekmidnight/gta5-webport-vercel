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
button after the page loads). Start screen: A = Story, X = Sandbox, B = Back.

| Control | On foot | In vehicle |
| --- | --- | --- |
| Left stick | Move (WASD) | Steer (A/D) |
| Right stick | Camera | Camera |
| RT / LT | Attack / Aim | Accelerate / Brake |
| A | Sprint | |
| B | Reload | |
| X | Jump | Exit vehicle (E) |
| Y | Enter vehicle (F) | Exit vehicle (F) |
| LB / RB | Weapon wheel (Tab) / Cover (Q) | Fire / Handbrake |
| L3 / R3 | Crouch / Look behind (C) | Horn (E) / Look behind (C) |
| D-pad | Arrow keys | Arrow keys |
| View | Tap: camera (V), hold: map (M) | same |
| Menu | Pause (Esc) | Pause (Esc) |

Y switches between the on-foot and vehicle layouts; View+Y switches without
pressing F.
