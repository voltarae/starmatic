// Starmatic in a real browser. Each test gets a fresh browser profile, so it starts on the example sky.
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
  await expect(page.locator(".views .tab")).toHaveText(["🌌 Sky", "🤖 Orbit", "📚 Classes", "📖 Study log", "🧭 Guide", "💾 Save"]);
  const s = await sky(page);
  expect(s.example).toBe(true);
  expect(s.galaxies.length).toBeGreaterThan(2);
  await tab(page, "orbit"); await tab(page, "classes"); await tab(page, "study"); await tab(page, "sky");
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
  await expect(page.locator("#gd-msg")).toContainText("isn't a Starmatic file or worksheet");
  const [dl] = await Promise.all([page.waitForEvent("download"), page.locator("#gd-ws-dl").click()]);
  expect(dl.suggestedFilename()).toBe("starmatic-worksheet.txt");
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
  await expect(page.locator("#x-err")).toContainText("isn't a Starmatic file");
});

test("a downloaded backup brings the whole sky back in another browser", async ({ page, browser }) => {
  await plant(page, MINE);
  await page.evaluate(() => { const q = S.courses[0].quests[0]; q.score = 45; q.done = true; q.due = "2027-01-10"; S.galaxies[1].outcomes[0].mastered = true;
    S.study.push({ id: "s-1", title: "Lighting workshop", date: "2026-11-01", kind: "workshop", hours: 3, galaxy: "g-light", outcome: "o-2", note: "" }); commit(); });
  const mine = await sky(page);
  await tab(page, "file");
  const [dl] = await Promise.all([page.waitForEvent("download"), page.locator("#x-dl").click()]);
  expect(dl.suggestedFilename()).toMatch(/^starmatic-\d{4}-\d{2}-\d{2}\.json$/);
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
  await expect(page.locator(".views .tab")).toHaveCount(6);
  expect((await sky(page)).goal).toBe("Gaffer");
  expect(await page.evaluate(() => fetch("fonts/bebas-neue-latin-400-normal.woff2").then(r => r.ok))).toBe(true);
  expect(await page.evaluate(() => fetch("manifest.webmanifest").then(r => r.json()).then(m => m.name))).toBe("Starmatic");
  expect(errs).toEqual([]);
  await ctx.close();
});

test("can be put on a home screen: manifest, icons, and everything the offline copy keeps", async ({ page }) => {
  await page.goto("./");
  const href = await page.locator('link[rel="manifest"]').getAttribute("href");
  const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, href), "utf8"));
  expect(manifest).toMatchObject({ name: "Starmatic", start_url: "./", scope: "./", display: "standalone" });
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

// ---- History and the backup reminder ----
test("History keeps a copy before the sky is added to, and brings it back", async ({ page }) => {
  const errs = errorsOf(page);
  await plant(page, MINE);
  await tab(page, "file");
  await page.locator("#x-text").fill(JSON.stringify(THEIRS));
  await page.locator("#x-add").click(); await page.locator("#x-add").click();
  expect((await sky(page)).galaxies.length).toBe(3);
  await tab(page, "file");
  await page.getByText("🕓 History").click();
  const before = page.locator(".hist-row", { hasText: "Before Add to my sky" });
  await expect(before).toContainText("Gaffer · 2 galaxies · 3 stars · 1 class");
  await before.locator("[data-back]").click();
  await expect(before.locator("[data-back]")).toHaveText("Tap again: this replaces your sky");
  await before.locator("[data-back]").click();
  await expect(page.locator("#toast")).toContainText("Brought back the copy");
  const s = await sky(page);
  expect(s.galaxies.map(g => g.name)).toEqual(["Lighting", "Grip"]);
  expect(s.classes[0].quests.map(q => q.due)).toEqual([null, null]);
  await tab(page, "file");                                                  // and the sky that was replaced is in History too
  await page.getByText("🕓 History").click();
  await expect(page.locator(".hist-row", { hasText: "Before bringing back a copy" })).toContainText("3 galaxies");
  const [dl] = await Promise.all([page.waitForEvent("download"), page.locator(".hist-row [data-save]").first().click()]);
  expect(JSON.parse(fs.readFileSync(await dl.path(), "utf8")).goalGalaxy).toBe(1);
  expect(errs).toEqual([]);
});

test("a sky that goes missing is put back from the newest safety copy", async ({ page }) => {
  await plant(page, MINE);
  await page.evaluate(() => { S.galaxies[0].outcomes[0].mastered = true; commit(); });      // the first change of a visit makes a copy
  await expect.poll(() => page.evaluate(() => safeAll().then(a => a.length))).toBe(1);
  await page.evaluate(() => localStorage.removeItem("goal-galaxy-v1"));
  await page.reload();
  await expect(page.locator("#toast")).toContainText("newest safety copy was put back");
  const s = await sky(page);
  expect(s.example).toBe(false);
  expect(s.galaxies[0].stars[0]).toBe("Light a face ✓");
});

test("a week without a backup shows a reminder, once a day, until there is one", async ({ page }) => {
  const daysAgo = n => new Date(Date.now() - n * 86400000).toISOString();
  await plant(page, MINE);
  await expect(page.locator("#note")).toBeEmpty();                           // a new sky isn't nagged
  await page.evaluate(m => localStorage.setItem("goal-galaxy-meta", JSON.stringify(m)), { since: daysAgo(10), changedAt: daysAgo(1) });
  await page.reload();
  await expect(page.locator("#note")).toContainText("never been backed up");
  await page.locator('#note [data-act="later"]').click();
  await expect(page.locator("#note")).toBeEmpty();
  await page.reload();
  await expect(page.locator("#note")).toBeEmpty();                           // not again today
  await page.evaluate(m => localStorage.setItem("goal-galaxy-meta", JSON.stringify(m)), { since: daysAgo(30), backupAt: daysAgo(8), backupHow: "downloaded file", changedAt: daysAgo(1) });
  await page.reload();
  await expect(page.locator("#note")).toContainText("Your last backup was 8 days ago");
  await page.locator('#note [data-view="file"]').click();
  await expect(page.locator("#x-last")).toContainText("Last backup:");
  await Promise.all([page.waitForEvent("download"), page.locator("#x-dl").click()]);
  await expect(page.locator("#x-last")).toContainText("(downloaded file)");
  await expect(page.locator("#note")).toBeEmpty();
});

// ---- Starmatic account (voltarae.com itself is played by the test) ----
// One pretend account shared by every browser in a test: the connect page sends the browser straight back
// with a device pass, and the saves API keeps each sky with a version number, like the real one.
function pretendAccount(){
  const a = { skies: {}, next: 1, signedOut: false, saves: 0, calls: [], devices: [] };
  const cors = { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS" };
  const json = (route, body, status = 200) => route.fulfill({ status, headers: { ...cors, "content-type": "application/json" }, body: JSON.stringify(body) });
  const sum = s => ({ id: s.id, title: s.title, rev: s.rev, updated: s.updated, device: s.device, orbit: (s.data.orbit || {}).name || "", galaxies: (s.data.galaxies || []).length, snacks: (s.data.snacks || []).length });
  a.put = (title, data, device = "") => { const id = a.next++; a.skies[id] = { id, title, rev: 1, updated: 1795800000 + a.next, device, data }; return id; };
  a.attach = async ctx => {
    await ctx.route("https://voltarae.com/**", async route => {
      const req = route.request(), url = new URL(req.url()), m = req.method();
      a.calls.push(m + " " + url.pathname);
      if (url.pathname === "/starmatic/connect/"){
        a.devices.push(url.searchParams.get("device"));
        const ret = url.searchParams.get("return"); expect(ret).toMatch(/^http:\/\/127\.0\.0\.1:\d+\/$/);
        return route.fulfill({ status: 303, headers: { location: `${ret}#stm_token=7.ab12cd34.${"f".repeat(48)}&stm_state=${url.searchParams.get("state")}&stm_name=Robin` } });
      }
      if (m === "OPTIONS") return route.fulfill({ status: 204, headers: cors });
      if (a.signedOut || req.headers()["x-starmatic-token"] !== `7.ab12cd34.${"f".repeat(48)}`) return json(route, { message: "Log in" }, 401);
      const p = url.pathname.replace("/wp-json/starmatic/v1/", ""), id = +((p.match(/^skies\/(\d+)/) || [])[1] || 0), s = a.skies[id];
      if (p === "me") return json(route, { name: "Robin", skies: Object.values(a.skies).map(sum) });
      if (p === "skies" && m === "POST"){ const b = req.postDataJSON(); const nid = a.put(b.title, b.data, "iPad"); a.saves++; return json(route, { ...sum(a.skies[nid]), data: b.data }, 201); }
      if (id && !s) return json(route, { message: "That sky isn't in your account." }, 404);
      if (id && m === "GET") return json(route, url.searchParams.get("meta") ? sum(s) : { ...sum(s), data: s.data });
      if (id && m === "PUT"){ const b = req.postDataJSON();
        if (b.base !== s.rev) return json(route, { code: "stm_clash", sky: { ...sum(s), data: s.data } }, 409);
        Object.assign(s, { rev: s.rev + 1, data: b.data, updated: s.updated + 60, device: "this device" }); a.saves++; return json(route, sum(s)); }
      return json(route, { message: "unexpected" }, 400);
    });
  };
  a.only = () => Object.values(a.skies)[0];
  return a;
}
const connect = async page => { await tab(page, "file"); await page.locator("#x-acct-box summary").click(); await page.locator('#x-acct [data-a="connect"]').click(); };

test("Starmatic account: offered in Save, and nothing goes to voltarae.com until the player connects", async ({ page }) => {
  const calls = []; page.on("request", r => { if (/voltarae\.com/.test(new URL(r.url()).hostname)) calls.push(r.url()); });
  await plant(page, MINE);
  await tab(page, "file");
  await expect(page.locator(".sheet-card")).toContainText("Starmatic account");
  await page.locator("#x-acct-box summary").click();
  await expect(page.locator("#x-acct")).toContainText("free Starmatic account on voltarae.com");
  await page.evaluate(() => { S.galaxies[0].outcomes[0].mastered = true; commit(); });
  await page.waitForTimeout(500);
  expect(calls).toEqual([]);
});

test("Starmatic account: connect, the sky goes up and saves by itself, and a signed-out device says so", async ({ context, page }) => {
  const errs = []; page.on("pageerror", e => errs.push(String(e)));
  const acct = pretendAccount(); await acct.attach(context);
  await plant(page, MINE);
  expect(acct.calls).toEqual([]);
  await connect(page);
  await expect(page.locator("#x-acct")).toContainText("Connected as Robin. This device saves to “Gaffer”");   // back from voltarae.com, Save is open, the sky has gone up
  expect(new URL(page.url()).hash).toBe("");
  expect(acct.devices[0]).toMatch(/, /);                                     // the account page will name this device
  expect(acct.only().data.goal.title).toBe("Gaffer");
  await expect(page.locator("#x-last")).toContainText("(Starmatic account)");
  await page.locator('.sheet-card [data-close]').click();
  await page.evaluate(() => { S.galaxies[0].outcomes[0].mastered = true; commit(); });      // a change is sent a few seconds later
  await expect.poll(() => acct.only().data.galaxies[0].outcomes[0].mastered, { timeout: 10000 }).toBe(true);
  acct.signedOut = true;                                                     // signed out from the account page
  await page.evaluate(() => { S.galaxies[0].outcomes[1].mastered = true; commit(); });
  await expect(page.locator("#note")).toContainText("signed out of your Starmatic account", { timeout: 10000 });
  expect(acct.only().data.galaxies[0].outcomes[1].mastered).toBe(false);
  acct.signedOut = false;
  await page.locator('#note [data-act="acct-connect"]').click();             // Connect again goes to voltarae.com and comes back
  await expect(page.locator("#x-acct")).toContainText("Connected as Robin");
  await page.locator('#x-acct [data-a="save"]').click();
  await expect.poll(() => acct.only().data.galaxies[0].outcomes[1].mastered).toBe(true);
  await page.locator('#x-acct [data-a="off"]').click(); await page.locator('#x-acct [data-a="off"]').click();
  await expect(page.locator("#x-acct")).toContainText("Connect my account");
  expect(errs).toEqual([]);
});

test("offline: changes save on the device and go to the Starmatic account when the connection is back", async ({ context, page }) => {
  const errs = []; page.on("pageerror", e => errs.push(String(e)));
  const acct = pretendAccount(); await acct.attach(context);
  await plant(page, MINE);
  await connect(page);
  await expect(page.locator("#x-acct")).toContainText("Connected as Robin");
  await page.locator('.sheet-card [data-close]').click();
  const saves = acct.saves;
  await context.setOffline(true);
  await expect(page.locator("#toast")).toContainText("Offline");
  await page.evaluate(() => { S.galaxies[0].outcomes[0].mastered = true; commit(); });
  await expect(page.locator("#note")).toContainText("You're offline. Everything is saved on this device, and your latest changes go to your Starmatic account");
  await page.waitForTimeout(4500);
  expect(acct.saves).toBe(saves);                                            // nothing tried while offline
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("goal-galaxy-v1")).galaxies[0].outcomes[0].mastered)).toBe(true);     // but it's kept on the device
  await context.setOffline(false);
  await expect.poll(() => acct.only().data.galaxies[0].outcomes[0].mastered, { timeout: 10000 }).toBe(true);
  await expect(page.locator("#note")).not.toContainText("offline");
  expect(errs).toEqual([]);
});

test("Starmatic account: a second device opens the sky, and neither device overwrites the other", async ({ browser }) => {
  const acct = pretendAccount(), base = test.info().project.use.baseURL;
  const one = await browser.newContext({ baseURL: base, viewport: { width: 390, height: 844 } }), two = await browser.newContext({ baseURL: base, viewport: { width: 390, height: 844 } });
  await acct.attach(one); await acct.attach(two);
  const p1 = await one.newPage(), p2 = await two.newPage();
  // the iPad saves its sky to the account
  await plant(p1, MINE); await connect(p1);
  await expect(p1.locator("#x-acct")).toContainText("This device saves to “Gaffer”");
  // the iMac has no sky yet: it's offered the account's skies
  await p2.goto("./"); await connect(p2);
  await expect(p2.locator("#x-acct")).toContainText("Your account has 1 sky");
  await p2.locator('#x-acct [data-a^="open:"]').click();
  await expect(p2.locator("#toast")).toContainText("Opened “Gaffer” from your account");
  expect((await sky(p2)).galaxies.map(g => g.name)).toEqual(["Lighting", "Grip"]);
  // the iMac adds a star, and it goes up
  await p2.evaluate(() => { S.galaxies[1].outcomes.push({ id: "o-new", text: "Rig a flag on a C-stand", mastered: false }); commit(); });
  await expect.poll(() => acct.only().data.galaxies[1].outcomes.length, { timeout: 10000 }).toBe(2);
  const saves = acct.saves;
  // back on the iPad, which hasn't seen that: a change there must not overwrite the iMac's work
  await p1.locator('.sheet-card [data-close]').click();
  await p1.evaluate(() => { S.galaxies[0].outcomes[0].mastered = true; commit(); });
  await expect(p1.locator("#note")).toContainText("newer copy of this sky", { timeout: 10000 });
  expect(acct.saves).toBe(saves);
  await p1.locator('#note [data-view="file"]').click();
  await expect(p1.locator("#x-acct")).toContainText("this device hasn't opened");
  await p1.locator('#x-acct [data-a="add"]').click();                         // take the iMac's star, keep the iPad's progress, send the result up
  await expect(p1.locator("#toast")).toContainText("Added 1 star");
  const s = await sky(p1);
  expect(s.galaxies[0].stars[0]).toBe("Light a face ✓");
  expect(s.galaxies[1].stars).toEqual(["Flag a light", "Rig a flag on a C-stand"]);
  await expect.poll(() => acct.only().data.galaxies[0].outcomes[0].mastered).toBe(true);
  expect(acct.only().data.galaxies[1].outcomes.length).toBe(2);
  // and the copy the iPad had before is in its History
  await tab(p1, "file"); await p1.getByText("🕓 History").click();
  await expect(p1.locator(".hist-row", { hasText: "Before adding your account's copy" })).toHaveCount(1);
  await one.close(); await two.close();
});

test("Starmatic account: Play on the account page opens that sky, connecting first if needed", async ({ context, page }) => {
  const errs = []; page.on("pageerror", e => errs.push(String(e)));
  const acct = pretendAccount(); await acct.attach(context);
  const spanish = acct.put("Spanish", { goalGalaxy: 1, goal: { title: "Speak Spanish", why: "" }, galaxies: [{ id: "g-es", name: "Verbs", emoji: "🗣️", color: "Teal", target: 40, outcomes: [] }], courses: [], study: [], snacks: [], orbit: { name: "Luna", xp: 10 } });
  await plant(page, MINE);
  await page.goto("./?stm_sky=" + spanish);                                  // not connected here: connects, then opens Spanish
  await expect(page.locator("#toast")).toContainText("Opened “Spanish” from your account");
  expect(new URL(page.url()).search).toBe("");
  expect((await sky(page)).goal).toBe("Speak Spanish");
  await expect(page.locator('.views [data-view="orbit"]')).toContainText("Luna");     // her name came along
  // the sky that was on this device is kept in History
  await tab(page, "file"); await page.getByText("🕓 History").click();
  await expect(page.locator(".hist-row", { hasText: "Before opening a sky from your account" })).toHaveCount(1);
  expect(errs).toEqual([]);
});

// ---- Orbit, the star bot ----
// MINE with a few snacks, the kind of thing a player feeds Orbit.
const TERMS = { "Key light": "The main light on a subject", "Fill light": "A softer light that fills the shadows", "Back light": "A light behind the subject that separates it",
  "Bounce": "Light reflected off a card or wall", "Flag": "A black card that blocks light", "Gel": "Colored film over a light" };
const FED = { ...MINE, snacks: Object.entries(TERMS).map(([title, body], i) => ({ id: "s-" + i, type: "term", galaxy: "g-light", title, body })) };
const tutorXp = page => page.evaluate(() => S.study.filter(e => e.kind === "tutor").reduce((n, e) => n + e.xp, 0));
// Answers whatever Orbit is asking right now, right or wrong.
async function answer(page, right = true){
  const q = (await page.locator("#orb-quiz .qq").textContent()).match(/What does (.+) mean\?/)[1];
  const opts = page.locator("#orb-quiz [data-oi]");
  const pick = right ? opts.filter({ hasText: TERMS[q] }) : opts.filter({ hasNotText: TERMS[q] }).first();
  await pick.click();
}

test("Orbit: snacks are fed from notes, filed under a galaxy, and kept in the sky", async ({ page }) => {
  const errs = errorsOf(page);
  await plant(page, MINE);
  await expect(page.locator(".orb-stage.mini")).toContainText("Feed me a snack");
  await tab(page, "orbit");
  // a term
  await page.locator("[data-otype=term]").click();
  await page.locator("#o-gal").selectOption({ label: "💡 Lighting" });
  await page.locator("#o-title").fill("Key light");
  await page.locator("#o-body").fill("The main light on a subject");
  await page.locator("#o-feed").click();
  await expect(page.locator("#o-err")).toContainText("Fed!");
  // pasted numbered notes become steps
  await page.locator("[data-otype=list]").click();
  await page.locator("#o-title").fill("Three-point lighting");
  await page.locator("#o-body").focus();
  await page.evaluate(() => { const b = document.querySelector("#o-body"); b.value = "1. Key light\n2. Fill light\n3. Back light"; b.dispatchEvent(new Event("paste")); });
  await expect(page.locator("[data-otype=steps]")).toHaveAttribute("aria-pressed", "true");
  await page.locator("#o-feed").click();
  // a picture, shrunk to fit in the sky
  await page.locator("[data-otype=picture]").click();
  await page.locator("#o-title").fill("A waveform");
  const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFElEQVR4nGNgYPj/n4GBgYGJAQoAHxcCAu5j1jUAAAAASUVORK5CYII=", "base64");
  await page.locator("#o-pic").setInputFiles({ name: "wave.png", mimeType: "image/png", buffer: png });
  await expect(page.locator("#o-prev")).toBeVisible();
  await page.locator("#o-feed").click();
  const snacks = () => page.evaluate(() => S.snacks.map(s => [s.type, (S.galaxies.find(g => g.id === s.galaxy) || {}).name, s.title, s.items || s.body || s.img.slice(0, 15)]));
  expect(await snacks()).toEqual([["term", "Lighting", "Key light", "The main light on a subject"],
    ["steps", "Lighting", "Three-point lighting", ["Key light", "Fill light", "Back light"]], ["picture", "Lighting", "A waveform", "data:image/jpeg"]]);
  await page.locator("[data-orbtab=pantry]").click();
  await expect(page.locator(".orb-snack")).toHaveCount(3);
  await page.reload();
  expect(await snacks()).toHaveLength(3);
  // they travel in the sky file: Add to my sky in another sky brings them, under the matching galaxy
  const file = await page.evaluate(() => JSON.stringify({ goalGalaxy: 1, ...S }));
  await plant(page, { ...MINE, galaxies: [{ ...MINE.galaxies[0], id: "other-id" }] });
  const n = await page.evaluate(t => { const inc = readIncoming(t).sky; return mergeSky(inc); }, file);
  expect(n.snacks).toBe(3);
  expect(await page.evaluate(() => S.snacks.every(s => s.galaxy === "other-id"))).toBe(true);
  expect(errs).toEqual([]);
});

test("Orbit's daily quiz gives Orbit Tutor XP to the galaxy, up to 50 a day", async ({ page }) => {
  const errs = errorsOf(page);
  await plant(page, FED);
  await expect(page.locator(".orb-stage.mini")).toContainText("daily quiz");
  await page.locator(".orb-stage.mini [data-orb=daily]").click();
  await expect(page.locator("#orb-qtitle")).toHaveText("Daily quiz");
  await expect(page.locator(".orb-dots i")).toHaveCount(5);
  for (let i = 0; i < 5; i++){
    await answer(page, i !== 2);                 // one wrong
    if (i === 0){                                // the page redrawn mid-quiz (an account notice, going offline) moves on, not back
      await page.evaluate(() => render());
      await expect(page.locator(".orb-dots i").nth(1)).toHaveClass("now");
      continue;
    }
    await page.locator("#orb-next").click();
  }
  await expect(page.locator(".orb-done")).toContainText("4 / 5");
  expect(await tutorXp(page)).toBe(4 * 5 + 10);   // 5 for each right answer, and the daily bonus
  expect((await sky(page)).galaxies[0].xp).toBe(30);
  expect(await page.evaluate(() => [S.orbit.daily.days, S.orbit.daily.last === todayISO()])).toEqual([1, true]);
  // the study log shows it as its own kind, not something to edit by hand
  await tab(page, "study");
  await expect(page.locator("[data-kind=tutor]")).toContainText("+30 XP");
  await page.locator(".views [data-view=study]").click();
  // more practice keeps earning until the day's 50
  await tab(page, "orbit");
  await page.locator("[data-orbtab=quiz]").click();
  for (let i = 0; i < 6; i++){ await answer(page); await page.locator("#orb-next").click(); }
  expect(await tutorXp(page)).toBe(50);
  // and the daily quiz waits for tomorrow
  await page.locator(".orb-stage [data-orb=daily]").click();
  await expect(page.locator("#orb-quiz")).toContainText("You did today's quiz already");
  await page.reload();
  expect(await tutorXp(page)).toBe(50);
  expect(errs).toEqual([]);
});

test("Orbit points out what's overdue and what's due soon", async ({ page }) => {
  const day = n => { const d = new Date(Date.now() + n * 86400000); return new Date(d.getTime() - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10); };
  const sky = JSON.parse(JSON.stringify(MINE));
  sky.courses[0].quests[0].due = day(-2); sky.courses[0].quests[1].due = day(3);
  await plant(page, sky);
  await expect(page.locator(".orb-stage.mini")).toContainText("Light one face five ways slipped past its date");
  await page.locator(".orb-stage.mini [data-orb=talk]").click();
  await expect(page.locator(".orb-stage.mini")).toContainText("Read the handbook is due");
});

test("Orbit: name your star bot, and the name stays with the sky", async ({ page }) => {
  const errs = errorsOf(page);
  await plant(page, FED);
  await tab(page, "orbit");
  await page.locator('[data-orb="name"]').click();
  await page.locator("#on-name").fill("Nova");
  await page.locator("#on-save").click();
  await expect(page.locator("#toast")).toContainText("Say hi to Nova!");
  await expect(page.locator('.views [data-view="orbit"]')).toContainText("Nova");
  await expect(page.locator(".orb-name h3")).toContainText("Nova");
  await page.reload();
  await expect(page.locator('.views [data-view="orbit"]')).toContainText("Nova");
  const file = await page.evaluate(() => JSON.parse(JSON.stringify({ goalGalaxy: 1, ...S })));
  expect(file.orbit.name).toBe("Nova");
  // an empty name is Orbit again; and "Orbit Tutor XP" keeps its name either way
  await tab(page, "orbit");
  await page.locator('[data-orb="name"]').click();
  await page.locator("#on-name").fill("");
  await page.locator("#on-save").click();
  await expect(page.locator('.views [data-view="orbit"]')).toContainText("Orbit");
  await expect(page.locator(".orb-stage")).toContainText("Orbit Tutor XP today");
  expect(errs).toEqual([]);
});
