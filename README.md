# PocketStash

A fully offline pocket budget for your phone. Colored stashes, add / spend / move,
reasons and photos, items you're flipping, charts, and Echo keeping an eye on things.

- No account, no server, no tracking. Data lives in the phone's browser storage
  (stashes in localStorage, photos in IndexedDB).
- Plain HTML/CSS/JS, no build step, no dependencies.

## Android APK (recommended)

GitHub builds the APK in the cloud every time `main` is pushed
([.github/workflows/build-apk.yml](.github/workflows/build-apk.yml)). Your PC only pushes code.
Capacitor wraps the same web files into a native app.

One-time setup: add the signing key as a repository secret named `ANDROID_KEYSTORE_B64`
(GitHub → repo **Settings → Secrets and variables → Actions → New repository secret**).
Every build is signed with this key, so each new APK installs as an **update** and keeps your data.
Never commit the keystore. The repo is public.

Installing: on the phone, open the repo's **Releases** page, tap the newest `PocketStash-N.apk`,
then open it. Android asks once to allow installs from your browser.

## Or install it as a web app

A phone only installs a web app from an `https://` address. You only need that address
the first time. After that the app runs from the phone with no internet, and nothing you
enter is ever sent anywhere.

1. Host this folder once, for free. Either:
   - **Netlify Drop**: open https://app.netlify.com/drop and drag this folder in, or
   - **GitHub Pages**: push the repo and turn on Pages (Settings → Pages → `main` / root).
2. Open the link on your phone.
   - Android (Chrome): menu ⋮ → **Install app** / **Add to Home screen**.
   - iPhone (Safari): Share → **Add to Home Screen**.
3. Open it from the home screen icon. It now works in airplane mode.

## Backups

Everything lives only on that phone. **Settings → Save backup** exports one `.json` file
(photos included). **Restore** loads it back, on the same phone or a new one.
Uninstalling the app or clearing the browser's site data erases it all, so save a
backup now and then.

## Try it on a computer

```
python -m http.server 8000
```
Then open http://localhost:8000.

## Files

| File | What |
|---|---|
| `index.html` | Shell + Echo's face |
| `styles.css` | Everything visual, light/dark |
| `app.js` | State, views, sheets, charts, Echo, tutorial, backup |
| `sw.js` | Offline cache |
| `manifest.webmanifest`, `icons/` | Home-screen install |

After changing any file, bump `CACHE` in `sw.js` so installed phones pick up the new version.
