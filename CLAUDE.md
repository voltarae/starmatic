# Goal Galaxy: read this first

Goal Galaxy is a learning game: set a goal, light up the galaxies of skills on the way.
It lives at voltarae.github.io/goal-galaxy. Volta works from an iPad; explain things in plain words.

## How it's built

- One page, `index.html`, holds the whole game: markup, styles and script. Keep it that way.
- `sw.js` keeps the page, fonts and icons on the device for offline use. `manifest.webmanifest`
  and `icons/` let it sit on a home screen. Add a new font or icon to `SHELL` in `sw.js`
  (a test fails if you forget).
- No server and no build step. A player's sky lives in their browser's localStorage
  (`goal-galaxy-v1`), with safety copies in IndexedDB (`goal-galaxy-safe`).
- Goals are build-your-own. Don't add preset skies to the game.
- Google Drive backup is optional and off until `GOOGLE_CLIENT_ID` is set in `index.html`.
  Nothing may be loaded from Google, or sent to it, before a player connects.

## Changing it

1. Always work through a pull request. Never push to `main`.
2. Every pull request runs the tests in `tests/` (the real page in a real browser, at phone size).
   Add or update a test with every change in behavior.
3. A pull request merges itself once its checks are green (`merge-when-green.yml`), and the site
   publishes. To hold one back, make it a draft or add the label `hold`.
4. A pull request that changes a file in `.github/workflows/` can't merge itself. Merge it by hand
   once its checks are green.

## Running the tests

```
cd tests
npm install
npx playwright install chromium
npx playwright test
```

## Saved files

A sky file is the game's own JSON: `{goalGalaxy:1, goal, galaxies, courses, study}`. Read
`normalize()`, `friendly()` and `mergeSky()` in `index.html` before changing the shape; old files
must keep opening. Ids of galaxies, stars, classes and quests are how "Add to my sky" matches
things, so never renumber them in a file someone may already have loaded.
