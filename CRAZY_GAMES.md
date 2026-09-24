# Crazy Games build

Toy Rampage (玩具大暴走) ships two static builds from the same source:

| | GitHub Pages root / AlterU catalog mirror | Crazy Games |
| --- | --- | --- |
| Command | `npm run build` | `npm run build:crazygames` |
| Output | `dist/` | `dist-crazygames/`, copied to `dist/crazygames/` on deploy |
| Hosting | `https://yinxinghuan.github.io/toy-rampage/` | Externally hosted iframe |
| Asset paths | relative (`./`) | relative (`./`), safe under `/crazygames/` |
| AlterU login | **off**. `guest-shell.js` is not loaded | **off**. Guests play immediately |
| AlterU watermark | classic skin only; the default pixel skin hides it | omitted |

## Guest play

Crazy Games requires that guests can play without an account wall. This repository already removed `https://images.aiwaves.tech/alteru/guest-shell.js` from the root page (commit `ad71732`). Root is guest-playable. The dedicated `/crazygames/` package is still published so the portal URL does not depend on the catalog mirror.

The guest build:

- Opens the workshop from the loading screen. There is no account screen and no App Store link.
- Keeps `alteru-storage-scope.js`. It only prefixes `localStorage` keys for this game UUID so saves do not collide with other games on the same host. It does not block play. If storage is unavailable, the run continues.
- Saves the run in the browser. Progress is not synced through the Crazy Games SDK. SDK wiring is not required for Basic Launch.
- Omits the AlterU watermark asset. The default skin is English when the browser language is not Chinese; the in-game control switches between English and 中文.
- Does not treat Crazy Games query parameters as a login session. `lang`, `skin`, and `look` still work.

Submit this URL after the Pages workflow on `main` finishes:

https://yinxinghuan.github.io/toy-rampage/crazygames/

Do not upload a zip. Portal metadata still needs the English title **Toy Rampage**, the Chinese title **玩具大暴走**, and the catalog UUID `03855703-d241-4f8c-90a9-ccf0bb72972e`.

## Build locally

```bash
npm ci
npm run build:crazygames
npx --yes serve dist-crazygames
```

`npm run build` is unchanged and still writes the root AlterU mirror to `dist/`.
