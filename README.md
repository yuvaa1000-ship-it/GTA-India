# GTA INDIA — GENESIS

An original open-world engineering prototype in the fictional port city of Navapur. Operation 01 only: a playable, procedural 3D blockout with real collision and streaming. **This is not a finished game or a claim of AAA visual fidelity.**

## Run

Node 20.19+ recommended.

```sh
npm ci
npm run dev
```

Open the printed localhost URL. `npm run build` creates a portable `dist/`; `npm run preview` serves that production build. All engine code is bundled; runtime needs no third-party CDN. Serve over HTTP/HTTPS, not `file://`.

## Play and inspect

Click **Enter the district**. WASD moves, Shift runs, Space jumps, left/right arrows orbit the chase camera. Walk into crates to push them. Press E near the teal doorway at (-9, -10) to enter the depot; E exits. Save/Load use this browser origin's local storage. Return to plaza recovers your position. Desktop keyboard required; mobile controls are not implemented.

**Run diagnostics** executes in-browser movement, jump, building collision, cell eviction, persistence and interior checks, then displays measured results. **Export metrics** downloads JSON. **Close report** dismisses diagnostic results. `npm test` runs headless pure-logic, Rapier and lifecycle regression tests without substituting imagery for gameplay evidence.

## Continuity

Read [system status](docs/SYSTEM_STATUS.md), [next task](docs/NEXT_TASK.md), [architecture](docs/ARCHITECTURE.md) and relevant specs before editing. Canonical source: https://github.com/yuvaa1000-ship-it/GTA-India. Do not start later operations until GENESIS has a stable canonical commit.

NPCs and vehicles are **moving instanced proxies**, without traffic intelligence or vehicle dynamics. Animation-agent count is zero. Performance is measured, and missing APIs are reported as unavailable. See [performance budget](docs/PERFORMANCE_BUDGET.md).
