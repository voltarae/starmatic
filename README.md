# Starmatic

A learning game by [Volta Rae](https://voltarae.com). Set a goal, like *Cinematographer*. Every skill on the way is a galaxy in your sky. Your classes and the hours you study earn XP that lights up its stars, and every galaxy that levels up raises your own level, the way skills level you up in Skyrim.

Starmatic was called Goal Galaxy. Goal Galaxy (and Syllabus Quest) files open in it as they are.

**Play it:** https://voltarae.github.io/goal-galaxy/

## How it plays

- **Goal**: what you're working toward. It shines at the top of your sky.
- **Galaxies**: the skills your goal needs (Camera, Lighting, Color…), each with a target level from 1 to 100. A galaxy can open only after another reaches a level, so learning in one area unlocks the next.
- **Stars**: the learning outcomes in a galaxy. They glow as XP reaches them; tap *I've got this* when you've mastered one.
- **Classes** (the old *Syllabus Quest*): paste a syllabus and every assignment, quiz and exam becomes a quest, and its learning outcomes become stars. A class at 100% earns 1,000 XP, shared by the galaxies it feeds.
- **Study log**: self-study (20 XP an hour), workshops (30 XP an hour), certificates (250 XP more).
- **Your level**: each time a galaxy levels up you earn XP equal to its new level; level L to L+1 takes (L+3) × 25, Skyrim's own formula.

## Orbit, your star bot

Orbit is a little pixel-art space robot who lives in your sky. She tells you the one thing worth doing next (an overdue quest, what's due this week and how much it's worth, a galaxy that's close to leveling up), and she helps you remember what you learn.

- **Feed her snacks.** A snack is a short note of something you learned, filed under a galaxy: a fact, a term, a list of key points, steps in order, a picture, a formula, an important person, or a date. Paste bulleted or numbered notes and she picks the right kind.
- **She quizzes you.** Pick the answer, name the picture or the person, fill in a missing point, tap steps or dates into order. She brings back what you miss sooner.
- **Daily quiz.** Five questions a day, from what you know least, with a day streak.
- **Orbit Tutor XP.** Each right answer gives 5 XP to the snack's galaxy, up to 50 a day including a 10 XP bonus for the daily quiz. It shows in the study log as its own kind, next to self-study and workshops.
- **Just for fun:** star fuel, her own level, and gear she earns (a comet scarf, a bubble helmet, a turbo flame, a golden star).

Snacks and Orbit are saved in your sky, so they're in your backups and your Starmatic account. You can give her another name: tap ✏️ beside her name on the Orbit tab. Pictures are shrunk to keep the file small. Orbit only talks while the game is open; she can't send notifications.

## Build a sky with AI or a worksheet

Open **Guide** in the game. You don't have to type a sky in star by star:

- **Let an AI map your goal.** Copy the prompt into Claude or another AI assistant and add your goal at the end. It asks a few questions, then answers with a sky: galaxies in the order to learn them, stars you can be seen doing, and optional stages of quests. Paste its whole answer into the Guide.
- **Fill in a worksheet by hand.** Download the plain-text worksheet (or fill it in right in the Guide): your goal, a block for each galaxy with its stars, and a class if you want one. Open the filled-in page in the Guide.
- **Have a class syllabus?** Use **Classes → Add a syllabus**. It reads the pasted text, has its own AI prompt for messy syllabi, and lets you check every quest first.

If you already have a sky, **Add to my sky** (in Guide and in Save) tells you what a file would add, then adds it. Nothing you have is removed or overwritten: a galaxy or class you already have only gains the stars and quests it's missing, and due dates for quests that have none, so adding the same file twice changes nothing. **Open this file** replaces your sky instead.

## Offline, and on your home screen

After one visit, Starmatic opens with no connection: a small service worker (`sw.js`) keeps the page, fonts and icons on the device. When there is a connection it fetches the page fresh, so updates arrive the next time you open it. Everything you do offline is saved on the device, and with a Starmatic account connected, those changes go up to the account as soon as the connection is back.

To use it like an app: on iPhone or iPad, open it in Safari, tap Share, then **Add to Home Screen**. On Android or a computer, use the browser's **Install** or **Add to Home screen** (there's also a button under **Save**). On iPhone and iPad the home-screen app keeps a sky of its own, separate from Safari's: download your file from **Save** first, then open it in the app.

## How safe is my sky?

Your sky lives in one browser on one device. Nothing backs it up for you.

- It survives closing the tab, restarting and updates to the game.
- It does not follow you to another browser or device, and private windows forget it.
- Clearing browsing data deletes it. Browsers can also clear a site they think is unused; Safari does this after about a week of browsing without a visit. The home-screen app is not under that timer.
- **Save → Download** is the real backup. Do it after anything you'd hate to redo, and keep the file somewhere else (Files, iCloud, an email to yourself). **Save** shows when your last backup was, and whether this browser has agreed to keep your sky, with a link to ask it.
- After a week without a backup, a note at the top of the page reminds you, once a day at most.
- **Save → History** keeps the last 30 copies of your sky in this browser: one before anything is opened or added, and one about every ten minutes while you play. Bring one back, or save it as a file. History lives in the same browser as your sky, so it undoes mistakes; it is not a backup.

## Starmatic account (optional)

**Save → Starmatic account** keeps your skies in a free account on voltarae.com, so they open on any device. Tap **Connect my account**: voltarae.com asks you to log in, or to make an account (your name and email, a quiet robot check, then a 6-digit code sent to your email and a password). Say yes to connecting this device, and you're back in the game.

- Every change is still saved on the device first, and works offline. While connected, it's sent to your account a few seconds later, or when the connection comes back.
- If another device saved the same sky since, nothing is overwritten: you choose to open the account's copy, add it to your sky, or keep this device's.
- Your account page, **voltarae.com/starmatic/account/**, lists your skies. There you can play one, rename it, name your star bot, download a backup, bring back one of the last 15 versions, start a sky over, delete it, start a new sky, bring in a backup file, sign a device out, download everything, or delete your account.
- The game and the account are on different sites, so the game doesn't use the site's log-in. Connecting gives this device a pass of its own (kept in this browser) that only works for Starmatic saves.

The account side lives in the voltarae.com repo (`themes/volta/starmatic/`). The game talks to `https://voltarae.com` unless `window.STARMATIC_ACCOUNT` names another site. Nothing is sent there unless a player connects.

## Privacy and hosting

Starmatic is one HTML page plus two fonts, with a manifest, icons and a service worker for offline use. It runs entirely in your browser: your sky is kept in the browser's local storage, and the game needs no server. Nothing is sent anywhere unless you choose to connect a Starmatic account, and then only to voltarae.com. Use **Save** to download a backup file or move your sky to another device. Old Syllabus Quest files open too.

Because it's only static files, it's hosted free on GitHub Pages. To make your own copy, fork this repo and turn on Pages (Settings → Pages → Deploy from branch → `main`, `/ (root)`).

## Tests

Every pull request runs the game in a real browser at phone size (`.github/workflows/tests.yml`): scoring, worksheets and AI answers, **Add to my sky**, backup and restore, and opening with no connection. The Starmatic account is tested with the test playing voltarae.com's part. To run them yourself:

```
cd tests
npm install
npx playwright install chromium
npx playwright test
```

## Pull requests merge themselves

`.github/workflows/merge-when-green.yml` merges a pull request once every other check on it has passed, then asks GitHub Pages to publish.

- Only pull requests from branches of this repo, never from forks.
- To stop one: make it a draft, or add the label `hold`.
- A pull request that changes a workflow file is left for a person to merge; GitHub doesn't let a workflow merge those.

## Credits

- Bebas Neue (Dhamraj Kalaivanan) and Courier Prime (Alan Dague-Greene): SIL Open Font License 1.1.
- Code and pixel art: © 2026 Volta Rae, MIT License (see `LICENSE`).
