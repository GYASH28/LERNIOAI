# Lernio AI — Vercel Deployment Checklist

Follow this file top-to-bottom on production setup day.
Total time: **~10 minutes**.

> **Privacy note:** This file is committed to GitHub. **Do not put real keys in it.**
> All real values are pasted by you directly into Vercel's UI.

---

## Step 1 — Push code to GitHub

> **Before your first push:** Emergent's preview environment auto-commits some internal files (`memory/`, `test_reports/`) that don't belong in the public repo. They're now in `.gitignore` for future commits, but you need to untrack the existing tracked copies once:
>
> ```bash
> git rm --cached -r memory/ test_reports/ 2>/dev/null
> git add .gitignore
> git commit -m "chore: untrack Emergent platform internals"
> ```

```bash
git add .
git commit -m "feat: production upgrade (PWA, themes, AI tutor, filter chips, Today's Goal)"
git push origin main
```

Vercel auto-deploys on push.

---

## Step 2 — Vercel Project Settings

Go to: **Vercel Dashboard → your Lernio project → Settings → General**.

| Field | Required Value |
| --- | --- |
| Framework Preset | `Other` |
| Root Directory | `./` (or `LERNIO-main` if the repo has a wrapper folder) |
| Build Command | `npm run build` |
| Output Directory | `dist` |
| Install Command | `npm install` |
| Node.js Version | `18.x` or `20.x` |

Save changes.

---

## Step 3 — Add the 12 Environment Variables

Go to: **Settings → Environment Variables**.

Paste the values from the JSON files / notes you keep privately. Tick all three environments (Production, Preview, Development) for each. Click **Save**.

### A. AI Tutor (n8n)

| Key | Source |
| --- | --- |
| `N8N_CHAT_WEBHOOK_URL` | Your n8n chat webhook URL (production). |
| `N8N_HINT_WEBHOOK_URL` | Your n8n quiz-hint webhook URL (production). |

### B. Gemini fallback (used only if `/api/ai` is hit)

| Key | Source |
| --- | --- |
| `GEMINI_API_KEY` | Your key from <https://aistudio.google.com/app/apikey>. |
| `GEMINI_MODEL` | `gemini-2.5-flash` (default) |

### C. Firebase Admin (server-side)

> Source file: `lernio-backend-firebase-adminsdk-fbsvc-*.json` (Firebase service account JSON).

**Easiest:** paste the full JSON.

| Key | Value |
| --- | --- |
| `FIREBASE_SERVICE_ACCOUNT_KEY` | The complete contents of the Firebase service-account JSON, pasted as-is. Vercel accepts multiline values. |

**Or split into 3** (use this if pasting JSON is awkward):

| Key | Value source |
| --- | --- |
| `FIREBASE_PROJECT_ID` | `project_id` field of the JSON. |
| `FIREBASE_CLIENT_EMAIL` | `client_email` field of the JSON. |
| `FIREBASE_PRIVATE_KEY` | `private_key` field of the JSON. **Keep the literal `\n`** — do NOT replace them with real newlines. |

> Use **only one** of the two approaches (full JSON OR split-3). The code accepts both.

### D. Google Drive (server-side)

> Source file: `lernio-b4c65-*.json` (Google Cloud service-account JSON for Drive).

| Key | Source |
| --- | --- |
| `GOOGLE_DRIVE_FOLDER_ID` | The ID after `/folders/` in your Drive folder URL. |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | `client_email` field of the Drive JSON. |
| `GOOGLE_PROJECT_ID` | `project_id` field of the Drive JSON. |
| `GOOGLE_PRIVATE_KEY` | `private_key` field of the Drive JSON. **Keep the literal `\n`**. |

After all 12 are saved, click **Deployments → ⋯ on the latest → Redeploy** to apply.

---

## Step 4 — One-time external setup

These cannot be automated — you must do them once.

### Firebase Console

1. **Authentication → Sign-in method**: enable `Email/Password` and `Google`.
2. **Authentication → Settings → Authorized Domains**: add your Vercel production domain (e.g. `lernioai.vercel.app`) and any custom domain. `localhost` is already allowed.
3. **Deploy security rules** (from your local machine, in the repo root):
   ```bash
   firebase login
   firebase use <your-project-id>
   firebase deploy --only firestore:rules,storage:rules
   ```

### Google Drive

1. Open the Drive folder you want Lernio to read.
2. Click **Share** → add the Drive service-account email (from `client_email` of your Drive JSON) → role **Viewer** → **Send**.

### Google Cloud (one-time)

1. Open <https://console.cloud.google.com/apis/library/drive.googleapis.com> with your project selected.
2. Click **Enable** if Drive API isn't on already.

### n8n Cloud

1. Open both workflows (chat + quiz-hint) in your n8n instance.
2. Toggle each to **Active** (top-right switch).
3. Confirm each Webhook node's **Production URL** matches the env var value you pasted in Vercel.

---

## Step 5 — Production verification (5 minutes)

After redeploy, open your live URL and verify:

| Test | Expected outcome |
| --- | --- |
| Open the live site root | Dashboard loads with stats, Today's Goal card, semester cards. |
| Open DevTools Console | No red errors. (Yellow warnings are OK.) |
| Resize to mobile (iPhone in DevTools) | Bottom nav shows 5 buttons. Tap **More** → slide-up sheet with Analytics / Settings / Login. |
| Click **Login** → register a test email | Auth modal opens with floating labels. Sign-up succeeds. Welcome card greets you by name. |
| Open AI Tutor → tap a chip → Send | Typing indicator appears, n8n returns a response. Hover a bot bubble → Copy/Retry buttons appear. Click 🗑️ in the header → confirm clear. |
| Open Quiz → answer a question | Feedback shows + **Ask AI to explain** button appears alongside Next. |
| Finish a quiz with wrong answers | Result page shows **Ask AI on weak topics** button. |
| Open Notes for any subject | Filter chips render under the tabs (Type + Source) with counts. Empty types are dimmed. |
| Settings → Theme = Light | Whole site flips to a light glassmorphism palette. Reload page → light persists. |
| Settings → Theme = System | Site follows OS color scheme. Toggle OS theme → site auto-flips without reload. |
| `/api/config` | Returns `{ "AI_CHAT_API": "/api/chat", "AI_HINT_API": "/api/ai-hint" }`. |
| `/api/drive-notes` | Returns `{ "notes": [...] }` with your Drive PDFs (or a clear config error if Drive setup isn't complete). |
| DevTools → Application → Manifest | Shows "Lernio AI" with icons. |
| DevTools → Application → Service Workers | `service-worker.js` is **activated and running**. |
| Android Chrome → menu → "Add to Home screen" | Installs as a standalone PWA. |

If any test fails, check **Vercel → Deployments → latest → Functions** for the failing API's logs.

---

## Common Issues

| Symptom | Fix |
| --- | --- |
| `/api/chat` returns 502/500 with "AI service is currently unavailable" | n8n workflow not Active, or the URL is wrong. Re-toggle the workflow and copy the Production URL again. |
| `/api/progress` returns 401 "missing token" | The browser couldn't reach Firebase Auth. Confirm your Vercel domain is in Firebase → Authentication → Authorized Domains. |
| `/api/drive-notes` returns "Google Drive credentials are not configured" | One of the 4 Google env vars is missing or has stripped `\n`. Re-paste with literal `\n`. |
| Login modal opens but Google sign-in fails | Add the production domain to Firebase → Authentication → Settings → Authorized Domains. |
| Service worker is shown but the site doesn't update | DevTools → Application → Service Workers → click **Unregister**, then hard reload. Bumping `CACHE_VERSION` inside `service-worker.js` forces a refresh on the next deploy. |

---

## After everything is green

You're done. Future content updates only need:

- **New PDFs** → drop them into the shared Drive folder. Live within ~5 minutes (serverless cache TTL).
- **New quiz subjects** → edit `data/semesters.config.js` + `data/<subject>-questions.js`, then push.
- **New static assets** → drop into `assets/notes/...` or `assets/mcqs/...`, update `data/subject-mapping.js`, push.
