# ChemQuiz — How to Run

CBSE Class 12 Chemistry quiz app (Vite + React).

---

## Open it on THIS laptop (the one it was built on)

1. Open a terminal in this folder (`...\CBSE-Chem-Quiz\chem-quiz`).
2. Start the app:
   ```
   npm run dev
   ```
3. Open the link it prints (usually http://localhost:5173/) in your browser.
4. To stop the app: press `Ctrl + C` in the terminal.

---

## Open it on ANOTHER laptop (via GitHub) — recommended

This project lives on GitHub at: https://github.com/Parin-create/chem-quiz

On the new laptop (one-time):
1. Install **Node.js** (LTS) from https://nodejs.org
2. Install **Git** from https://git-scm.com (and optionally GitHub CLI: https://cli.github.com)
3. Download the project:
   ```
   git clone https://github.com/Parin-create/chem-quiz.git
   ```
4. Go into the folder and install libraries:
   ```
   cd chem-quiz
   npm install
   ```
5. Run it:
   ```
   npm run dev
   ```

After making changes, save them to GitHub from any laptop:
   ```
   git add -A
   git commit -m "describe what you changed"
   git push
   ```

To pull the latest version onto another laptop before working:
   ```
   git pull
   ```

---

## Open it on ANOTHER laptop (via OneDrive)

The project folder lives in OneDrive, so it syncs to the cloud automatically.

### One-time setup on the new laptop
1. **Sign in to the same OneDrive account** and let the `CBSE-Chem-Quiz`
   folder finish downloading (white/green check on the folder = synced).

2. **Install Node.js** (only needed once per laptop):
   - Go to https://nodejs.org
   - Download the **LTS** version and run the installer (click Next / Finish).

3. **Open a terminal inside** `...\CBSE-Chem-Quiz\chem-quiz` and run:
   ```
   npm install
   ```
   This rebuilds the `node_modules` library folder fresh — always do this on a
   new laptop, even if OneDrive already synced a `node_modules` folder
   (synced copies can be incomplete or corrupted).

4. **Start the app:**
   ```
   npm run dev
   ```
   Open the printed link (http://localhost:5173/).

### After the first time
On that laptop you only need step 4 (`npm run dev`) from then on.

---

## Good to know

- **Your scores/history do NOT travel between laptops.** They are saved in each
  browser's local storage (this is a local-only app with no accounts/cloud — by
  design). Each device keeps its own history.
- **You can edit on either laptop.** Save a file, OneDrive syncs it, and the
  other laptop sees the change after it finishes syncing. Avoid editing the same
  file on both laptops at once, or OneDrive may create a "conflict" copy.
- **Tip:** If a sync ever acts up, the safe reset on any laptop is:
  delete the `node_modules` folder, then run `npm install` again.

---

## Tech summary (for reference)

- Build tool: **Vite** · Framework: **React (JavaScript)**
- Icons: **lucide-react**
- Question bank: `src/data/questions.js` (~300 questions)
- Data saved via browser **localStorage**
- Commands: `npm install` (set up) · `npm run dev` (run) · `npm run build` (production build)
