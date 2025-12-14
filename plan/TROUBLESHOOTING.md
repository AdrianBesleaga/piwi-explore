# Troubleshooting Guide

## Common Issues & Solutions

### ✅ FIXED: Dexie IndexedDB Error

**Error:**
```
Uncaught TypeError: Cannot read properties of undefined (reading 'subscribe')
at PiwiDatabase.rv [as on] (dexie.js:1754:28)
```

**Cause:** Using deprecated Dexie event listeners (`db.on('error')`, `db.on('versionchange')`)

**Solution:** ✅ Fixed in commit
- Removed `.on()` event handlers
- Added `db.open().catch()` for error handling
- Database now opens correctly

---

## Development Issues

### Issue: Build Fails with Tailwind PostCSS Error

**Error:**
```
[postcss] It looks like you're trying to use `tailwindcss` directly as a PostCSS plugin
```

**Solution:**
1. Install `@tailwindcss/postcss`:
   ```bash
   npm install -D @tailwindcss/postcss
   ```

2. Update `postcss.config.js`:
   ```javascript
   export default {
     plugins: {
       '@tailwindcss/postcss': {},  // Not 'tailwindcss'
       autoprefixer: {},
     },
   }
   ```

---

### Issue: WebGPU Not Available

**Symptoms:**
- App shows "Browser Not Supported" page
- Console shows WebGPU errors

**Solutions:**
1. **Use supported browser:**
   - Chrome 113+ ✅
   - Edge 113+ ✅
   - Safari ❌ (experimental)
   - Firefox ❌ (in progress)

2. **Enable WebGPU in Chrome:**
   - Go to `chrome://flags`
   - Search "WebGPU"
   - Enable "Unsafe WebGPU"
   - Restart browser

3. **Check GPU compatibility:**
   - WebGPU requires modern GPU
   - Integrated GPUs may not be supported
   - Update GPU drivers

---

### Issue: Module Not Found Errors

**Error:**
```
Cannot find module './Component'
```

**Solutions:**
1. Check file extensions (`.js` vs `.jsx`)
2. Verify import paths are correct
3. Clear Vite cache:
   ```bash
   rm -rf node_modules/.vite
   npm run dev
   ```

---

### Issue: Redux Store Not Persisting

**Symptoms:**
- UI state resets on page reload
- Sidebar state not saved

**Check:**
1. Redux Persist configured in `store/index.js`
2. PersistGate wrapping app in `App.jsx`
3. localStorage not disabled in browser

**Debug:**
```javascript
// In browser console
localStorage.getItem('persist:root')
```

---

### Issue: IndexedDB Quota Exceeded

**Error:**
```
QuotaExceededError: The quota has been exceeded
```

**Solutions:**
1. Check storage usage:
   ```javascript
   // In browser console
   navigator.storage.estimate()
   ```

2. Clear old data:
   - Delete unused clients
   - Export data first
   - Clear browser storage

3. Request persistent storage:
   ```javascript
   navigator.storage.persist()
   ```

---

### Issue: Models Won't Download

**Symptoms:**
- Model download stuck at 0%
- Download fails silently

**Solutions:**
1. **Check internet connection**

2. **Verify sufficient storage:**
   - Phi-3-mini: ~1.6 GB
   - Llama-3-8B: ~4.7 GB
   - CommonForms: ~50 MB

3. **Clear browser cache:**
   - Chrome: Settings → Privacy → Clear browsing data
   - Select "Cached images and files"

4. **Check WebGPU is available:**
   - See "WebGPU Not Available" section above

---

### Issue: Hot Module Replacement (HMR) Not Working

**Symptoms:**
- Changes don't reflect in browser
- Need to manually refresh

**Solutions:**
1. Restart dev server:
   ```bash
   npm run dev
   ```

2. Check Vite config port (default: 3000)

3. Clear browser cache

4. Disable browser extensions

---

### Issue: Build Works but Preview Fails

**Error:**
```
Failed to resolve import
```

**Cause:** Different behavior between dev and production

**Solutions:**
1. Check for dynamic imports
2. Verify all dependencies in `package.json`
3. Rebuild:
   ```bash
   rm -rf dist
   npm run build
   ```

---

## Browser-Specific Issues

### Chrome/Edge

**Issue: WebGPU Disabled**
- Enable in `chrome://flags`
- Look for "Unsafe WebGPU"

**Issue: CORS Errors**
- Use `npm run dev` instead of opening `index.html`
- Vite dev server handles CORS

### Safari

**Not Supported:**
- WebGPU experimental only
- App will show unsupported browser page
- No workaround currently available

### Firefox

**Not Supported:**
- WebGPU in development
- App will show unsupported browser page
- Track progress: [Firefox WebGPU Status](https://wiki.mozilla.org/Platform/GFX/WebGPU)

---

## Performance Issues

### Issue: Slow AI Inference

**Symptoms:**
- Document processing takes >1 minute
- Browser freezes

**Solutions:**
1. **Use smaller model:**
   - Switch from Llama-3-8B to Phi-3-mini
   - Configure in Settings

2. **Limit document size:**
   - Split large PDFs
   - Process smaller batches

3. **Check GPU usage:**
   - Task Manager → GPU
   - Ensure GPU is being used, not CPU

### Issue: Large Bundle Size

**Current:** 124 KB gzipped (target: <500 KB)

**If bundle grows:**
1. Check for duplicate dependencies
2. Enable code splitting
3. Lazy load components:
   ```javascript
   const Component = lazy(() => import('./Component'))
   ```

---

## Database Issues

### Issue: Can't Read/Write to IndexedDB

**Solutions:**
1. Check browser doesn't block IndexedDB
2. Incognito/Private mode may limit IndexedDB
3. Check site permissions

**Debug:**
```javascript
// In browser console
import db from './services/storage/indexedDB.service'
db.clients.toArray()
```

### Issue: Database Version Mismatch

**Error:**
```
VersionError: Attempt to open a database with a lower version
```

**Solution:**
1. Clear IndexedDB:
   - DevTools → Application → IndexedDB
   - Delete `piwi_document_extraction`
2. Refresh page

---

## Redux DevTools Issues

### Issue: DevTools Not Showing

**Solutions:**
1. Install Redux DevTools extension
2. Check `store/index.js` has `devTools: true`
3. Only works in development mode

### Issue: Actions Not Logging

**Check:**
- Redux DevTools extension enabled
- Not in production build
- Store configured correctly

---

## Testing

### Run in Development

```bash
cd my-app
npm run dev
```
Open [http://localhost:3000](http://localhost:3000)

### Build and Preview

```bash
npm run build
npm run preview
```

### Check Bundle Size

```bash
npm run build
# Look for output:
# dist/assets/index-[hash].js  XXX.XX kB │ gzip: XX.XX kB
```

---

## Getting Help

### Before Asking for Help

1. ✅ Check this troubleshooting guide
2. ✅ Check browser console for errors
3. ✅ Verify browser version (Chrome/Edge 113+)
4. ✅ Try clearing cache and rebuilding

### Debug Information to Provide

```javascript
// Copy this from browser console
{
  browser: navigator.userAgent,
  webgpu: !!navigator.gpu,
  indexedDB: !!window.indexedDB,
  storage: await navigator.storage.estimate()
}
```

### Useful Commands

```bash
# Check Node version
node --version

# Check npm version
npm --version

# List installed packages
npm list --depth=0

# Clear npm cache
npm cache clean --force

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

---

## Known Limitations

1. **Safari/Firefox:** WebGPU not supported → app won't work
2. **Mobile browsers:** Limited WebGPU support
3. **Older GPUs:** May not support WebGPU features
4. **Storage limits:** Browser-dependent (usually 10-50 GB)
5. **Model size:** Large models (>5GB) may not work on all devices

---

**Last Updated:** December 14, 2025
**Status:** Active Development - Phase 1 Complete
