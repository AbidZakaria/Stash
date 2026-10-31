# PocketStash

A pocket budget for your phone that works fully offline. No account, no ads, no tracking,
and nothing you enter ever leaves your phone.

- Split your money into colored stashes
- Add, spend and move money, with reasons and photos
- Keep track of items you're flipping
- See where it all goes with charts
- Echo, a small companion who comments on what you do (you can turn this off in Settings)

## Download for Android

1. On your phone, open the [latest release](https://github.com/AbidZakaria/Stash/releases/latest).
2. Tap the `PocketStash-N.apk` file to download it, then open it.
3. Android asks once to allow installs from your browser. Allow it and finish installing.

To update, do the same thing with the newest release. It installs over the old version
and keeps your data.

There's no iPhone download.

## Backups

Everything lives only on your phone, so nobody can recover it for you. **Settings → Save backup**
exports one `.json` file with your photos included. **Restore** loads it back, on the same
phone or a new one.

Uninstalling the app or clearing its data erases everything, so save a backup now and then.

## For developers

Plain HTML/CSS/JS, no build step, no dependencies.

| File | What |
|---|---|
| `index.html` | Shell + Echo's face |
| `styles.css` | Everything visual, light/dark |
| `app.js` | State, views, sheets, charts, Echo, tutorial, backup |
| `sw.js` | Offline cache |
| `manifest.webmanifest`, `icons/` | Home-screen install |

After changing any file, bump `CACHE` in `sw.js` so installed phones pick up the new version.

### Run it on a computer

```
python -m http.server 8000
```
Then open http://localhost:8000.

### Building the APK

GitHub Actions builds the APK and publishes a release on every push to `main`
([.github/workflows/build-apk.yml](.github/workflows/build-apk.yml)). Capacitor wraps the
same web files into a native app.

The workflow needs the signing key as a repository secret named `ANDROID_KEYSTORE_B64`
(**Settings → Secrets and variables → Actions → New repository secret**). Every build must use
the same key, or a new APK won't install as an update. Never commit the keystore. The repo is public.

### Hosting it as a web app

A phone only installs a web app from an `https://` address, and only needs it the first time.

1. Host this folder, either with [Netlify Drop](https://app.netlify.com/drop) or GitHub Pages
   (Settings → Pages → `main` / root).
2. Open the link on your phone.
   - Android (Chrome): menu ⋮ → **Install app** / **Add to Home screen**.
   - iPhone (Safari): Share → **Add to Home Screen**.
3. Open it from the home screen icon. It now works in airplane mode.
