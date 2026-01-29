# AegisX WAF Dashboard - Troubleshooting Guide

## 🔴 Current Issue: Blank Page at http://localhost:3000

### Symptoms
- Browser shows completely white/blank page
- No content visible
- No errors in URL bar

---

## ✅ Fixes Applied

### 1. Simplified App.tsx
- Removed complex components temporarily
- Created minimal test version
- Uses inline styles (no Tailwind dependency for testing)

### 2. Fixed vite.config.ts
- Removed `node:path` imports
- Simplified configuration
- Fixed proxy settings to use localhost instead of docker service names

### 3. Fixed Sidebar Navigation
- Changed `false-positives` to `training` to match App component
- Aligned navigation IDs across components

### 4. Killed Port Conflicts
- Terminated process on port 3000
- Restarted clean dev server

---

## 🔧 Immediate Troubleshooting Steps

### Step 1: Verify Dev Server is Running

**Check terminal output:**
```
VITE v5.4.21  ready in 302 ms

➜  Local:   http://localhost:3000/
➜  Network: http://10.54.84.234:3000/
```

✅ If you see this = Server is running correctly

### Step 2: Hard Refresh Browser

**Chrome**: `Ctrl + Shift + R`  
**Firefox**: `Ctrl + F5`  
**Edge**: `Ctrl + F5`

This clears cached JavaScript and CSS.

### Step 3: Check Browser Console

1. Press `F12` to open Developer Tools
2. Click **Console** tab
3. Look for errors (red text)

**Common errors:**
- `Failed to fetch` → Dev server not running
- `Module not found` → Missing dependency
- `Unexpected token` → Syntax error in code
- `Cannot read property of undefined` → Component error

### Step 4: Check Network Tab

1. Open Developer Tools (`F12`)
2. Click **Network** tab
3. Refresh page (`F5`)
4. Look for files loading:
   - `main.tsx` should load (status 200)
   - `index.css` should load (status 200)
   - If any show red/failed → file missing

---

## 🧪 Test if React is Working

The current `App.tsx` is a minimal test version. After refresh, you should see:

```
🛡️ AegisX WAF Dashboard

Dashboard is loading... Current view: test

[Events] [Analytics] [Rules]

─────────────────────────────
Current View: test
React is working! ✅
State management is working! ✅
Click the buttons above to test interactivity.
─────────────────────────────

✅ System Status:
• React: Running
• Vite Dev Server: Active
• Port: 3000
```

**If you see this** → React is working, we can restore full dashboard  
**If still blank** → Deeper issue (likely browser/network)

---

## 🩺 Diagnostic Commands

### Check if Server is Listening
```powershell
netstat -ano | findstr ":3000"
# Should show LISTENING on 0.0.0.0:3000
```

### Test Server Response
```powershell
curl http://localhost:3000
# Should return HTML
```

### Check Process
```powershell
Get-Process -Name node
# Should show node.exe processes
```

---

## 🔍 Common Issues & Solutions

### Issue: "This site can't be reached"
**Cause**: Dev server not running  
**Solution**:
```powershell
cd d:\REVOX_AI_WAF\dashboard
npm run dev
```

### Issue: "ERR_CONNECTION_REFUSED"
**Cause**: Wrong port or server crashed  
**Solution**: Check terminal for actual port (might be 3001 if 3000 taken)

### Issue: Blank page, no console errors
**Cause**: CSS hiding content  
**Solution**: Open Elements tab in DevTools, look for `<div id="root">` - should have content inside

### Issue: "Module not found" error
**Cause**: Missing npm package  
**Solution**:
```powershell
cd dashboard
npm install
```

### Issue: Vite shows old/cached code
**Cause**: Browser cache  
**Solution**:
1. Hard refresh: `Ctrl + Shift + R`
2. Or clear cache: DevTools → Application → Clear storage
3. Or try Incognito mode

---

## 📊 System Architecture

```
Browser (localhost:3000)
    ↓
Vite Dev Server (Port 3000)
    ↓
React App (src/App.tsx)
    ↓
Components (Sidebar, EventsLog, etc.)
    ↓
API Proxy → WAF Engine (localhost:5000)
```

---

## 🎯 Next Steps After Test Works

Once you see the test page working with buttons:

1. **Restore Full Dashboard**
   - I'll put back the complete App.tsx with:
     - Sidebar navigation
     - Events log viewer
     - Analytics charts
     - Rules manager
     - Training interface
     - Settings panel

2. **Connect to Backend**
   - Dashboard will talk to WAF Engine at localhost:5000
   - Real-time data via WebSocket
   - GeoIP visualization

3. **Test All Views**
   - Click through each section
   - Verify data loading
   - Check for errors

---

## 📞 What to Tell Me

If page is still blank, send me:

1. **Browser console screenshot** (F12 → Console tab)
2. **Network tab screenshot** (F12 → Network → refresh page)
3. **Terminal output** from `npm run dev`
4. **What you see** when you visit http://localhost:3000

---

## ⚡ Emergency Reset

If nothing works, try this nuclear option:

```powershell
# Stop dev server (Ctrl+C in terminal)

# Clear node modules and reinstall
cd d:\REVOX_AI_WAF\dashboard
Remove-Item node_modules -Recurse -Force
Remove-Item package-lock.json -Force
npm install

# Restart
npm run dev
```

---

## 🎓 Understanding the Stack

**Vite**: Build tool & dev server  
**React**: UI framework  
**TypeScript**: Type-safe JavaScript  
**Tailwind CSS**: Utility-first CSS  
**Lucide React**: Icon library  

All of these must load successfully for page to display.

---

**Current Status**: Minimal test App deployed  
**Expected Result**: Dark page with text and buttons  
**If working**: Can restore full dashboard  
**If not working**: Need browser console errors to diagnose  
