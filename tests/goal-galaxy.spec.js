// Goal Galaxy in a real browser. Each test gets a fresh browser profile, so it starts on the example sky.
const { test, expect } = require("@playwright/test");
const fs = require("fs"), path = require("path");
const { serve, ROOT } = require("./serve.js");

// ---- helpers ----
const errorsOf = page => { const errs = []; page.on("pageerror", e => errs.push(String(e))); page.on("console", m => { if (m.type() === "error") errs.push(m.text()); }); return errs; };
// A banner ("Level 2!") covers the tabs for a moment after progress; wait it out, then tap the tab.
const tab = async (page, name) => { await page.locator("#banner").waitFor({ state: "hidden" }); await page.locator(`.views [data-view="${name}"]`).click(); };
// What the game holds, with ids turned into names so the tests read plainly.
const sky = page => page.evaluate(() => {
  const gname = id => (S.galaxies.find(g => g.id === id) || {}).name, r = compute();
  return { example: S.example, goal: S.goal.title,
    galaxies: S.galaxies.map(g => ({ name: g.name, target: g.target, after: g.after ? `${gname(g.after.id)} ${g.after.level}` : null,
      stars: g.outcomes.map(o => o.text + (o.mastered ? " ✓" : "")), xp: Math.round(r.gx[g.id].xp) })),
    classes: S.courses.map(c => ({ name: c.name, feeds: (c.galaxies || []).map(gname),
      quests: c.quests.map(q => ({ title: q.title, score: q.score, due: q.due, points: q.max, star: q.outcome ? (outcomeById(q.outcome)[1] || {}).text : null })) })),
    study: S.study.length };
});
// Put a sky straight into the browser's storage, as if it had been played there before.
const plant = async (page, data) => { await page.goto("./"); await page.evaluate(d => localStorage.setItem("goal-galaxy-v1", JSON.stringify(d)), data); await page.reload(); };

const MINE = { goalGalaxy: 1, v: 1, goal: { title: "Gaffer", why: "Light features" },
  galaxies: [
    { id: "g-light", name: "Lighting", emoji: "💡", color: "Orange", target: 45, after: null, outcomes: [{ id: "o-1", text: "Light a face", mastered: false }, { id: "o-2", text: "Do power math", mastered: false }] },
    { id: "g-grip", name: "Grip", emoji: "🧰", color: "Teal", target: 30, after: { id: "g-light", level: 8 }, outcomes: [{ id: "o-3", text: "Flag a light", mastered: false }] }],
  courses: [{ id: "c-1", name: "Stage 1", code: "S1", galaxies: ["g-light"], categories: [],
    quests: [{ id: "q-1", title: "Light one face five ways", category: "", due: null, points: 50, outcome: "o-1" }, { id: "q-2", title: "Read the handbook", category: "", due: null, points: 50, outcome: null }] }],
  study: [] };
// A newer copy of the same sky from somewhere else: one more star, one more quest, due dates, and a new galaxy.
const THEIRS = { goalGalaxy: 1, v: 1, goal: { title: "Someone else's goal", why: "" },
  galaxies: [
    { id: "g-light", name: "Lighting", emoji: "💡", color: "Orange", target: 99, after: null, outcomes: [{ id: "o-1", text: "Light a face" }, { id: "o-2", text: "Do power math" }, { id: "o-9", text: "Rig a book light" }] },
    { id: "g-color", name: "Color", emoji: "🎨", color: "Pink", target: 40, after: { id: "g-light", level: 5 }, outcomes: [{ id: "o-10", text: "Read a waveform" }] }],
  courses: [{ id: "c-1", name: "Stage 1", code: "S1", galaxies: ["g-light", "g-color"], categories: [],
    quests: [{ id: "q-1", title: "Light one face five ways", category: "", due: "2027-02-01", points: 50, outcome: "o-1" },
             { id: "q-2", title: "Read the handbook", category: "", due: "2027-03-01", points: 50, outcome: null },
             { id: "q-3", title: "Grade a chart", category: "", due: "2027-04-01", points: 50, outcome: "o-10" }] }],
  study: [] };

const WORKSHEET = `GOAL GALAXY WORKSHEET
GOAL: Gaffer
WHY: I want to light features
# a note line, skipped
GALAXY: Lighting
EMOJI: 💡
TARGET: 45
OPENS AFTER:
STARS:
- Light a subject with three-point lighting
- Do power math safely
1. Rig a book light

GALAXY: Grip
TARGET: 30
OPENS AFTER: lighting 8
STARS:
Flag a light without spill
-

CLASS: Stage 1
CODE: G1
FEEDS: Lighting, Grip
QUESTS:
- Light one face five ways | 20 | 2027-01-15 | do power math safely
- Read the handbook
`;

// ---- the game ----
test("opens on the example sky with nothing broken", async ({ page }) => {
  const errs = errorsOf(page);
  await page.goto("./");
  await expect(page.locator(".views .tab")).toHaveText(["🌌 Sky", "📚 Classes", "📖 Study log", "🧭 Guide", "💾 Save"]);
  const s = await sky(page);
  expect(s.example).toBe(true);
  expect(s.galaxies.length).toBeGreaterThan(2);
  await tab(page, "classes"); await tab(page, "study"); await tab(page, "sky");
  await page.locator("g[data-g]").first().click();
  await expect(page.locator(".sheet-card")).toContainText("Stars: learning outcomes", { ignoreCase: true });
  expect(errs).toEqual([]);
});

test("a scored quest lights its star's galaxy, and a full class is worth 1,000 XP", async ({ page }) => {
  await plant(page, MINE);
  expect((await sky(page)).galaxies.map(g => g.xp)).toEqual([0, 0]);
  await page.evaluate(() => { const q = S.courses[0].quests[0]; q.score = q.max; q.done = true; commit(); });
  expect((await sky(page)).galaxies.map(g => g.xp)).toEqual([500, 0]);       // half the class's points, sent to its star in Lighting
  await page.evaluate(() => { const q = S.courses[0].quests[1]; q.score = q.max; q.done = true; commit(); });
  expect((await sky(page)).galaxies.map(g => g.xp)).toEqual([1000, 0]);
});

test("the sky is still there after a reload", async ({ page }) => {
  await plant(page, MINE);
  await page.evaluate(() => { S.courses[0].quests[0].score = 40; S.galaxies[0].outcomes[1].mastered = true; commit(); });
  const before = await sky(page);
  await page.reload();
  expect(await sky(page)).toEqual(before);
  expect(before.classes[0].quests[0].score).toBe(40);
});

// ---- Guide: AI answers and worksheets ----
test("Guide shows the AI prompt and a worksheet to fill in", async ({ page }) => {
  await page.goto("./");
  await tab(page, "guide");
  await expect(page.locator("#gd-prompt")).toContainText("MY GOAL:");
  await expect(page.locator("#gd-go")).toHaveText("Open in my sky");
  await page.getByText("Fill in a worksheet by hand").click();
  await page.locator("#gd-ws-here").click();
  await expect(page.locator("#gd-text")).toHaveValue(/^GOAL GALAXY WORKSHEET/);
  await page.locator("#gd-go").click();                                     // a blank worksheet has nothing in it
  await expect(page.locator("#gd-msg")).toContainText("isn't a Goal Galaxy file or worksheet");
  const [dl] = await Promise.all([page.waitForEvent("download"), page.locator("#gd-ws-dl").click()]);
  expect(dl.suggestedFilename()).toBe("goal-galaxy-worksheet.txt");
});

test("a filled-in worksheet becomes a sky", async ({ page }) => {
  const errs = errorsOf(page);
  await page.goto("./");
  await tab(page, "guide");
  await page.locator("#gd-text").fill(WORKSHEET);
  await page.locator("#gd-go").click();
  await expect(page.locator("#toast")).toHaveText("🌌 Sky opened");
  const s = await sky(page);
  expect(s.example).toBe(false);
  expect(s.goal).toBe("Gaffer");
  expect(s.galaxies.map(g => [g.name, g.target, g.after, g.stars])).toEqual([
    ["Lighting", 45, null, ["Light a subject with three-point lighting", "Do power math safely", "Rig a book light"]],
    ["Grip", 30, "Lighting 8", ["Flag a light without spill"]]]);
  expect(s.classes).toEqual([{ name: "Stage 1", feeds: ["Lighting", "Grip"], quests: [
    { title: "Light one face five ways", score: null, due: "2027-01-15", points: 20, star: "Do power math safely" },
    { title: "Read the handbook", score: null, due: null, points: 100, star: null }] }]);
  expect(errs).toEqual([]);
});

test("an AI's answer is read even with chatter and a code fence around it", async ({ page }) => {
  await plant(page, MINE);
  const answer = "Here is your sky!\n```json\n" + JSON.stringify({ goalGalaxy: 1, goal: "Editor", galaxies: [
    { name: "Cutting", emoji: "✂️", color: "Blue", target: 50, after: null, stars: ["Cut a dialogue scene"] },
    { name: "Sound", emoji: "🔊", color: "Pink", target: 30, after: { galaxy: "Cutting", level: 7 }, stars: ["Build a track from silence"] }],
    classes: [{ name: "Stage A", code: "A", galaxies: ["Sound"], categories: [{ name: "Drills", weight: 100 }],
      quests: [{ title: "Rebuild a scene's sound", category: "Drills", due: null, points: 30, star: "build a track from silence" }] }] }, null, 1) + "\n```\nGood luck!";
  await tab(page, "guide");
  await expect(page.locator("#gd-go")).toHaveText("Add to my sky");
  await page.locator("#gd-text").fill(answer);
  await page.locator("#gd-go").click();
  await expect(page.locator("#gd-msg")).toContainText("This adds 2 galaxies, 2 stars, 1 class, 1 quest to your sky");
  await page.locator("#gd-text").pressSequentially(" ");                    // editing the box takes back the first tap
  await expect(page.locator("#gd-go")).toHaveText("Add to my sky");
  await page.locator("#gd-go").click(); await page.locator("#gd-go").click();
  const s = await sky(page);
  expect(s.goal).toBe("Gaffer");                                            // my goal stays mine
  expect(s.galaxies.map(g => [g.name, g.after])).toEqual([["Lighting", null], ["Grip", "Lighting 8"], ["Cutting", null], ["Sound", "Cutting 7"]]);
  expect(s.classes[1]).toEqual({ name: "Stage A", feeds: ["Sound"], quests: [{ title: "Rebuild a scene's sound", score: null, due: null, points: 30, star: "Build a track from silence" }] });
});

// ---- Save: add, open, back up ----
test("Add to my sky adds only what's missing and keeps my progress", async ({ page }) => {
  const errs = errorsOf(page);
  await plant(page, MINE);
  await page.evaluate(() => { const q = S.courses[0].quests[0]; q.score = 45; q.done = true; S.galaxies[0].outcomes[0].mastered = true; commit(); });
  await tab(page, "file");
  await page.locator("#x-add").click();                                     // the box holds my own sky: nothing to add
  await expect(page.locator("#x-err")).toContainText("already has everything");
  await page.locator("#x-text").fill(JSON.stringify(THEIRS));
  await page.locator("#x-add").click();
  await expect(page.locator("#x-err")).toHaveText("This adds 1 galaxy, 2 stars, 1 quest, 2 due dates to your sky. Nothing you have is removed or overwritten.");
  await expect(page.locator("#x-add")).toHaveText("Tap again to add");
  expect((await sky(page)).galaxies.length).toBe(2);                         // nothing yet
  await page.locator("#x-add").click();
  await expect(page.locator("#toast")).toContainText("Added 1 galaxy, 2 stars, 1 quest, 2 due dates");
  const s = await sky(page);
  expect(s.goal).toBe("Gaffer");
  expect(s.galaxies.map(g => [g.name, g.target, g.after, g.stars])).toEqual([
    ["Lighting", 45, null, ["Light a face ✓", "Do power math", "Rig a book light"]],
    ["Grip", 30, "Lighting 8", ["Flag a light"]],
    ["Color", 40, "Lighting 5", ["Read a waveform"]]]);
  expect(s.classes[0].feeds).toEqual(["Lighting", "Color"]);
  expect(s.classes[0].quests).toEqual([
    { title: "Light one face five ways", score: 45, due: "2027-02-01", points: 50, star: "Light a face" },
    { title: "Read the handbook", score: null, due: "2027-03-01", points: 50, star: null },
    { title: "Grade a chart", score: null, due: "2027-04-01", points: 50, star: "Read a waveform" }]);
  // a second time, the same file has nothing left to give
  await tab(page, "file");
  await page.locator("#x-text").fill(JSON.stringify(THEIRS));
  await page.locator("#x-add").click();
  await expect(page.locator("#x-err")).toContainText("already has everything");
  expect(errs).toEqual([]);
});

test("a due date I set is never changed by Add to my sky", async ({ page }) => {
  await plant(page, MINE);
  await page.evaluate(() => { S.courses[0].quests[0].due = "2026-12-25"; commit(); });
  await tab(page, "file");
  await page.locator("#x-text").fill(JSON.stringify(THEIRS));
  await page.locator("#x-add").click(); await page.locator("#x-add").click();
  expect((await sky(page)).classes[0].quests.map(q => q.due)).toEqual(["2026-12-25", "2027-03-01", "2027-04-01"]);
});

test("Open this file replaces my sky only after a second tap; a class file just adds a class", async ({ page }) => {
  await plant(page, MINE);
  await tab(page, "file");
  await page.locator("#x-text").fill(JSON.stringify({ name: "Camera 1", code: "CIN 1", quests: [{ title: "Quiz 1", points: 20 }] }));
  await page.locator("#x-open").click();
  let s = await sky(page);
  expect(s.classes.map(c => c.name)).toEqual(["Stage 1", "Camera 1"]);
  expect(s.galaxies.length).toBe(2);
  await tab(page, "file");
  await page.locator("#x-text").fill(JSON.stringify(THEIRS));
  await page.locator("#x-open").click();
  await expect(page.locator("#x-open")).toHaveText("Tap again: this replaces your sky");
  expect((await sky(page)).goal).toBe("Gaffer");
  await page.locator("#x-open").click();
  s = await sky(page);
  expect(s.goal).toBe("Someone else's goal");
  expect(s.galaxies.map(g => g.name)).toEqual(["Lighting", "Color"]);
  await tab(page, "file");
  await page.locator("#x-text").fill("hello");
  await page.locator("#x-open").click();
  await expect(page.locator("#x-err")).toContainText("isn't a Goal Galaxy file");
});

test("a downloaded backup brings the whole sky back in another browser", async ({ page, browser }) => {
  await plant(page, MINE);
  await page.evaluate(() => { const q = S.courses[0].quests[0]; q.score = 45; q.done = true; q.due = "2027-01-10"; S.galaxies[1].outcomes[0].mastered = true;
    S.study.push({ id: "s-1", title: "Lighting workshop", date: "2026-11-01", kind: "workshop", hours: 3, galaxy: "g-light", outcome: "o-2", note: "" }); commit(); });
  const mine = await sky(page);
  await tab(page, "file");
  const [dl] = await Promise.all([page.waitForEvent("download"), page.locator("#x-dl").click()]);
  expect(dl.suggestedFilename()).toMatch(/^goal-galaxy-\d{4}-\d{2}-\d{2}\.json$/);
  const file = fs.readFileSync(await dl.path(), "utf8");
  expect(JSON.parse(file).goalGalaxy).toBe(1);

  const other = await browser.newContext({ baseURL: test.info().project.use.baseURL }), page2 = await other.newPage();
  await page2.goto("./");
  await tab(page2, "file");
  await page2.locator("#x-file").setInputFiles({ name: "backup.json", mimeType: "application/json", buffer: Buffer.from(file) });
  await expect(page2.locator("#x-text")).toHaveValue(file);
  await page2.locator("#x-open").click();
  await expect(page2.locator("#toast")).toHaveText("🌌 Sky opened");
  expect(await sky(page2)).toEqual(mine);
  await page2.reload();                                                     // and it's kept in that browser too
  expect(await sky(page2)).toEqual(mine);
  await other.close();
});

// ---- offline and home screen ----
test("opens with no connection after the first visit, sky and all", async ({ browser }) => {
  const server = await serve(0), url = `http://127.0.0.1:${server.address().port}/`;
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } }), page = await ctx.newPage();
  const errs = []; page.on("pageerror", e => errs.push(String(e)));
  await page.goto(url);
  await page.evaluate(d => localStorage.setItem("goal-galaxy-v1", JSON.stringify(d)), MINE);
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);
  await new Promise(done => { server.closeAllConnections(); server.close(done); });   // the site is gone
  await page.reload();
  await expect(page.locator(".views .tab")).toHaveCount(5);
  expect((await sky(page)).goal).toBe("Gaffer");
  expect(await page.evaluate(() => fetch("fonts/bebas-neue-latin-400-normal.woff2").then(r => r.ok))).toBe(true);
  expect(await page.evaluate(() => fetch("manifest.webmanifest").then(r => r.json()).then(m => m.name))).toBe("Goal Galaxy");
  expect(errs).toEqual([]);
  await ctx.close();
});

test("can be put on a home screen: manifest, icons, and everything the offline copy keeps", async ({ page }) => {
  await page.goto("./");
  const href = await page.locator('link[rel="manifest"]').getAttribute("href");
  const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, href), "utf8"));
  expect(manifest).toMatchObject({ name: "Goal Galaxy", start_url: "./", scope: "./", display: "standalone" });
  const size = file => { const b = fs.readFileSync(path.join(ROOT, file)); expect(b.subarray(1, 4).toString()).toBe("PNG"); return `${b.readUInt32BE(16)}x${b.readUInt32BE(20)}`; };
  for (const icon of manifest.icons) expect(size(icon.src)).toBe(icon.sizes);
  expect(manifest.icons.map(i => i.sizes)).toEqual(expect.arrayContaining(["192x192", "512x512"]));
  expect(manifest.icons.some(i => i.purpose === "maskable")).toBe(true);
  expect(size(await page.locator('link[rel="apple-touch-icon"]').getAttribute("href"))).toBe("180x180");
  // every file sw.js promises to keep exists, and every font and icon in the repo is on its list
  const shell = JSON.parse(fs.readFileSync(path.join(ROOT, "sw.js"), "utf8").match(/const SHELL = (\[[\s\S]*?\]);/)[1]);
  for (const f of shell) expect(fs.existsSync(path.join(ROOT, f === "./" ? "index.html" : f)), f).toBe(true);
  for (const dir of ["fonts", "icons"]) for (const f of fs.readdirSync(path.join(ROOT, dir))) expect(shell, `${dir}/${f} is missing from SHELL in sw.js`).toContain(`${dir}/${f}`);
});

test("Save explains the backup and how to install", async ({ page }) => {
  await plant(page, MINE);
  await tab(page, "file");
  await expect(page.locator("#x-keep")).toContainText(/downloaded file/);
  await page.getByText("Use it offline, like an app").click();
  await expect(page.locator(".sheet-card")).toContainText("Add to Home Screen");
});
