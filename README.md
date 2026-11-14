# Goal Galaxy

A learning game by [Volta Rae](https://voltarae.com). Set a goal, like *Cinematographer*. Every skill on the way is a galaxy in your sky. Your classes and the hours you study earn XP that lights up its stars, and every galaxy that levels up raises your own level, the way skills level you up in Skyrim.

**Play it:** https://voltarae.github.io/goal-galaxy/

## How it plays

- **Goal**: what you're working toward. It shines at the top of your sky.
- **Galaxies**: the skills your goal needs (Camera, Lighting, Color…), each with a target level from 1 to 100. A galaxy can open only after another reaches a level, so learning in one area unlocks the next.
- **Stars**: the learning outcomes in a galaxy. They glow as XP reaches them; tap *I've got this* when you've mastered one.
- **Classes** (the old *Syllabus Quest*): paste a syllabus and every assignment, quiz and exam becomes a quest, and its learning outcomes become stars. A class at 100% earns 1,000 XP, shared by the galaxies it feeds.
- **Study log**: self-study (20 XP an hour), workshops (30 XP an hour), certificates (250 XP more).
- **Your level**: each time a galaxy levels up you earn XP equal to its new level; level L to L+1 takes (L+3) × 25, Skyrim's own formula.

## Build a sky with AI or a worksheet

Open **Guide** in the game. You don't have to type a sky in star by star:

- **Let an AI map your goal.** Copy the prompt into Claude or another AI assistant and add your goal at the end. It asks a few questions, then answers with a sky: galaxies in the order to learn them, stars you can be seen doing, and optional stages of quests. Paste its whole answer into the Guide.
- **Fill in a worksheet by hand.** Download the plain-text worksheet (or fill it in right in the Guide): your goal, a block for each galaxy with its stars, and a class if you want one. Open the filled-in page in the Guide.
- **Have a class syllabus?** Use **Classes → Add a syllabus**. It reads the pasted text, has its own AI prompt for messy syllabi, and lets you check every quest first.

If you already have a sky, **Add to my sky** (in Guide and in Save) tells you what a file would add, then adds it. Nothing you have is removed or overwritten: a galaxy or class you already have only gains the stars and quests it's missing, so adding the same file twice changes nothing. **Open this file** replaces your sky instead.

## Privacy and hosting

Goal Galaxy is one HTML page plus two fonts. It runs entirely in your browser: your sky is kept in the browser's local storage, nothing is sent anywhere, and there's no account or server. Use **Save** to download a backup file or move your sky to another device. Old Syllabus Quest files open too.

Because it's only static files, it's hosted free on GitHub Pages. To make your own copy, fork this repo and turn on Pages (Settings → Pages → Deploy from branch → `main`, `/ (root)`).

## Credits

- Bebas Neue (Dhamraj Kalaivanan) and Courier Prime (Alan Dague-Greene): SIL Open Font License 1.1.
- Code and pixel art: © 2026 Volta Rae, MIT License (see `LICENSE`).
