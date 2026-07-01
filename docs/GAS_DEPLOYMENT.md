# Google Apps Script Deployment Guide

## Overview

The file `services/apps-script.js` is the backend for AI Coding Adventure.  
It runs as a Google Apps Script **Web App** — a serverless HTTPS endpoint backed by your Google account.

---

## Initial Deployment

### 1. Open the GAS Editor

Go to [script.google.com](https://script.google.com) → **New project**

Name the project: `AI Coding Adventure Backend`

### 2. Paste the backend code

- Delete the existing `Code.gs` content
- Copy everything from `services/apps-script.js`
- Paste into `Code.gs`
- Press **Ctrl+S** to save

### 3. Configure Script Properties

Go to **Project Settings** (⚙️ icon) → **Script Properties** → **Add script property**

| Property | Value |
|----------|-------|
| `SPREADSHEET_ID` | Your Google Sheets ID |
| `DRIVE_FOLDER_ID` | Your Google Drive folder ID |

### 4. Initialize the database

In the GAS editor:
- Click **Run** → Select function: `initializeSpreadsheet`
- Click **Run**
- **Authorize permissions** when prompted (required once):
  - View and manage your spreadsheets
  - View and manage files in Google Drive

This creates all required sheets with headers.

### 5. Add seed data

Open the Google Spreadsheet and add at least one teacher and one student manually.  
See [INSTALL.md](../INSTALL.md) for column format.

### 6. Hash existing passwords

In the GAS editor:
- Select function: `migratePasswordsToHash`
- Click **Run**

This SHA-256 hashes all plaintext passwords. **Run only once.**

### 7. Deploy as Web App

Click **Deploy** (top-right) → **New deployment**

| Setting | Value |
|---------|-------|
| Type | Web App |
| Description | `v1.0.0` |
| Execute as | **Me** |
| Who has access | **Anyone** |

Click **Deploy** → Copy the **Web App URL**

> URL format: `https://script.google.com/macros/s/{DEPLOYMENT_ID}/exec`

### 8. Update frontend config

Open `config/app-config.js`:

```javascript
ENVIRONMENT:  'production',
API_BASE_URL: 'https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec',
```

---

## Updating the Backend

After making changes to `services/apps-script.js`:

1. Paste the updated code into GAS editor → Save
2. Click **Deploy** → **Manage deployments**
3. Click the edit (pencil) icon on the existing deployment
4. Change **Version** to **New version**
5. Click **Deploy**

> The Web App URL **does not change** when you create a new version. No frontend config update needed.

---

## Testing the API

### Test ping (browser)
```
https://script.google.com/macros/s/YOUR_ID/exec?action=ping
```
Expected: `{"ok":true,"ts":"..."}`

### Test login (curl)
```bash
curl -X POST \
  -H "Content-Type: text/plain;charset=UTF-8" \
  -L \
  -d '{"action":"login","username":"STD001","password":"student123","role":"student"}' \
  "https://script.google.com/macros/s/YOUR_ID/exec"
```

Expected: `{"ok":true,"data":{...student session...}}`

### Test from browser console
```javascript
fetch('https://script.google.com/macros/s/YOUR_ID/exec?action=ping')
  .then(r => r.json())
  .then(console.log);
```

---

## Troubleshooting

### "Script function not found"
The `doGet` or `doPost` function is missing. Ensure you pasted the full contents of `apps-script.js`.

### "Authorization is required"
Re-run `initializeSpreadsheet` and grant all permissions. Each new permission scope requires re-authorization.

### CORS errors in browser
- Ensure `Content-Type: text/plain;charset=UTF-8` on POST requests (not `application/json`)
- Ensure `redirect: 'follow'` is set in fetch options
- Ensure the deployment has **Anyone** access

### "Exceeded maximum execution time"
GAS has a 6-minute timeout. For large classes (100+ students), consider:
- Adding `CacheService` for read-heavy endpoints (`getMissions`, `getBadgeDefinitions`)
- Batching writes instead of individual row updates

### Data not appearing in Sheets
Check GAS Execution Logs: **Executions** (left sidebar) → select a failed run to see the error.

---

## GAS Quota Reference

| Resource | Consumer limit |
|----------|---------------|
| Script execution time | 6 min/execution |
| Daily URL Fetch calls | 20,000 |
| Spreadsheet reads | 50,000/day |
| Spreadsheet writes | 50,000/day |
| Drive storage | Based on Google account |

For a class of 30–50 students, these limits are not a concern.

---

## Admin Functions

These functions run in the GAS editor only (not exposed via Web App):

| Function | Purpose |
|----------|---------|
| `initializeSpreadsheet()` | Create all sheets with headers |
| `migratePasswordsToHash()` | SHA-256 hash all plaintext passwords |
| `backupAllSheets()` | Export all sheets to Drive as CSV |

To run: GAS editor → select function from dropdown → Run
