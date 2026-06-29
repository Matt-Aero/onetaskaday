# Android

The Android app is a thin Capacitor shell around the same Next.js application
used by the web. It does not contain a second task engine or a separate user
database.

## Install the current test build

The debug APK is generated at:

```text
artifacts/android/one-debug.apk
```

This build points to `http://192.168.87.179:3000`. To test it:

1. Connect the phone and this computer to the same Wi-Fi network.
2. Run `npm run dev`.
3. Transfer `one-debug.apk` to the phone and open it.
4. Allow installation from the browser or file manager when Android asks.

The app will not load when the computer is asleep, the development server is
stopped, the firewall blocks port 3000, or the computer's LAN address changes.
Rebuild with the new address when necessary:

```powershell
npm run android:build -- -ServerUrl http://YOUR-LAN-IP:3000
```

The build script uses the project-local Java and Android SDK under `.tools` when
they are available.

## Build against a hosted environment

Deploy the Next.js server first, then build the shell against its HTTPS URL:

```powershell
npm run android:build -- `
  -ServerUrl https://app.onetaskaday.app `
  -Configuration Release
```

Release builds intentionally reject plain HTTP. A production APK or Play Store
bundle also needs a private release signing key; do not distribute the Android
debug certificate.

## Keeping every platform in sync

Use one deployed backend and one database as the source of truth:

- Web, Android, and future iOS shells use the same Next.js application URL.
- Authentication sessions, plans, tasks, and check-ins stay server-side.
- UI and task-logic changes deploy once and appear in every shell immediately.
- Native-only changes such as notifications, widgets, deep links, or store
  metadata require a new mobile build.

Before external testing, replace the local SQLite file with managed Postgres.
SQLite on one laptop cannot provide reliable multi-device or multi-instance
synchronization. Keep all writes behind server actions or versioned API routes,
and add `updated_at` timestamps plus conflict handling before introducing
offline editing.

Recommended progression:

1. Deploy the current Next.js server to one HTTPS staging URL.
2. Move the schema from SQLite to managed Postgres.
3. Point web and mobile builds at that same environment.
4. Add device registration and native push notifications through Capacitor.
5. Add offline storage only if testing proves it is necessary.
