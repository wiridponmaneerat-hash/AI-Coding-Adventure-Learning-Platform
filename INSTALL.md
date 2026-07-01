# Installation & Deployment Guide

## Prerequisites

| Tool | Required | Purpose |
|------|----------|---------|
| Google Account | ✅ | Google Apps Script, Sheets, Drive |
| GitHub Account | ✅ | Repository + Pages hosting |
| Git | ✅ | Push code to GitHub |
| Text editor | ✅ | Edit config/app-config.js |

---

## Step 1 — Set up Google Spreadsheet

1. Go to [sheets.google.com](https://sheets.google.com) → create a new spreadsheet  
   Name it: **AI Coding Adventure DB**
2. Copy the **Spreadsheet ID** from the URL:  
   `https://docs.google.com/spreadsheets/d/`**`YOUR_SPREADSHEET_ID`**`/edit`
3. Keep this tab open — you'll need the ID in Step 2

---

## Step 2 — Deploy Google Apps Script

1. Go to [script.google.com](https://script.google.com) → **New project**
2. Name the project: **AI Coding Adventure Backend**
3. Delete the default `Code.gs` content
4. Copy the entire contents of `services/apps-script.js` and paste it
5. **Set Script Properties** (Project Settings → Script Properties):
   | Key | Value |
   |-----|-------|
   | `SPREADSHEET_ID` | *(from Step 1)* |
   | `DRIVE_FOLDER_ID` | *(from Step 3 below)* |
6. **Initialize the database**: Run → Run function → `initializeSpreadsheet`  
   (Authorize permissions when prompted)
7. **Deploy as Web App**:
   - Deploy → New deployment → Type: **Web App**
   - Description: `v1.0.0`
   - Execute as: **Me**
   - Who has access: **Anyone**
   - Click **Deploy** → copy the **Web App URL**
8. *(Optional — production security)* Run `migratePasswordsToHash` to SHA-256 hash all passwords

---

## Step 3 — Set up Google Drive folder

1. Go to [drive.google.com](https://drive.google.com) → create a new folder  
   Name it: **ACA Portfolio**
2. Right-click the folder → **Share** → change to **Anyone with the link can view**
3. Copy the **folder ID** from the URL:  
   `https://drive.google.com/drive/folders/`**`YOUR_FOLDER_ID`**
4. Go back to Apps Script Script Properties and add:  
   `DRIVE_FOLDER_ID` = *(paste folder ID)*

---

## Step 4 — Configure the frontend

Edit `config/app-config.js`:

```javascript
const AppConfig = Object.freeze({
  ENVIRONMENT:  'production',            // ← change from 'development'
  API_BASE_URL: 'https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec',
  SPREADSHEET_ID: 'YOUR_SPREADSHEET_ID', // reference only
  // ...
  DRIVE: Object.freeze({
    FOLDER_ID: 'YOUR_GOOGLE_DRIVE_FOLDER_ID',
    // ...
  }),
});
```

Also update `robots.txt` and `sitemap.xml` — replace `YOUR_GITHUB_USERNAME` with your actual username.

---

## Step 5 — Add initial student/teacher data

Open the Google Spreadsheet. Each sheet was created by `initializeSpreadsheet()`.

**Students sheet** — add one row per student:

| id | name | password | class | xp | level | badges | completedMissions | avatar | avatarColor | theme | nickname | email | bio | joinDate |
|----|------|----------|-------|----|-------|--------|-------------------|--------|-------------|-------|----------|-------|-----|----------|
| STD001 | นภัสสร สุขใจ | student123 | ป.5/1 | 0 | 1 | [] | [] | น | #2563EB | default | | | | 2026-06-30 |

**Teachers sheet** — add one row per teacher:

| id | name | password | subject | classes | avatar | avatarColor |
|----|------|----------|---------|---------|--------|-------------|
| TCH001 | ครูวิริยา สมใจ | teacher123 | วิทยาการคำนวณ | ["ป.5/1","ป.5/2"] | ว | #7C3AED |

> **Security**: Run `migratePasswordsToHash()` in GAS editor after adding all users to hash their passwords.

---

## Step 6 — Deploy to GitHub Pages

### Option A — GitHub Actions (recommended)

1. Create a GitHub repository: `AI-Coding-Adventure`
2. Push the project:
   ```bash
   git init
   git add .
   git commit -m "feat: initial production release v1.0.0"
   git remote add origin https://github.com/YOUR_USERNAME/AI-Coding-Adventure.git
   git push -u origin main
   ```
3. Go to repository **Settings → Pages → Source**: `GitHub Actions`
4. The workflow at `.github/workflows/pages.yml` will trigger automatically on push to `main`
5. Your site will be live at: `https://YOUR_USERNAME.github.io/AI-Coding-Adventure/`

### Option B — Manual branch

1. Go to repository **Settings → Pages → Source**: `Deploy from a branch` → `main` → `/ (root)`

---

## Step 7 — Verify deployment

Run through this checklist after deployment:

- [ ] `https://YOUR_USERNAME.github.io/AI-Coding-Adventure/` loads the landing page
- [ ] `https://YOUR_USERNAME.github.io/AI-Coding-Adventure/pages/login.html` loads
- [ ] Login with a student account — redirects to `home.html`
- [ ] Login with a teacher account — redirects to `dashboard/index.html`
- [ ] Complete a mission — XP and badge awarded
- [ ] Upload a portfolio item — file saved to Google Drive
- [ ] Open Chrome DevTools → Application → Service Worker is registered
- [ ] Open Chrome DevTools → Application → Manifest is valid

---

## Updating the GAS backend

After code changes to `services/apps-script.js`:

1. Paste the updated code into the GAS editor
2. Deploy → **Manage deployments** → edit the existing deployment → **New version** → Deploy
3. The Web App URL stays the same — no frontend config change needed

---

## Environment variables summary

No `.env` files. All config is in `config/app-config.js` (frontend) and GAS Script Properties (backend).

| Variable | Location | Description |
|----------|----------|-------------|
| `ENVIRONMENT` | app-config.js | `'development'` or `'production'` |
| `API_BASE_URL` | app-config.js | GAS Web App URL |
| `SPREADSHEET_ID` | GAS Script Properties | Google Sheets ID |
| `DRIVE_FOLDER_ID` | GAS Script Properties | Google Drive folder ID |
