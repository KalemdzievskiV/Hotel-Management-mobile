# Hotel Management — Mobile

Expo (React Native) app for the hotel management system. It talks to the same REST API as the
web app (`Hotel-Management-backend`), so it uses the same database, accounts and rules.

**Stack:** Expo SDK 57 · Expo Router · TypeScript

## What it does

Sign in with any existing account. The session is kept in the device's secure storage and renews
itself: the API issues a 30-day refresh token next to the 1-hour access token, and the app swaps
it for new tokens when the access token runs out (`src/lib/http.ts`). You're only signed out
after 30 days without using the app, or when an admin deactivates you or changes your role.
This needs a backend with `/api/Auth/refresh`; against an older one, sessions end after an hour
as before. The tabs depend on the role:

- **Management** (SuperAdmin, Admin, Manager)
  - **Reservations**: today's arrivals and departures, then open bookings, with search. A
    booking can be confirmed, checked in or out, marked as a no-show or cancelled, and you can
    see its payments and record new ones.
  - **Housekeeping**: the day's tasks, with a day picker. "Create tasks" adds cleaning for
    rooms with departures.
  - **Rooms**: a board of all rooms by floor, colored by status. Tap a room to mark it cleaned
    or set maintenance, out of service and so on.
- **Housekeepers**: Housekeeping (their own and unassigned tasks, Start → Mark done) and Rooms
- **Guests**: their bookings, and the hotels list
- **Account** (everyone): who's signed in, the hotel (staff with several hotels pick one here),
  the app version and build, and sign out

Pull down to refresh any list; lists also refresh when you come back to them or to the app.
What was loaded last is saved on the device for a day (cleared on sign-out), so lists appear
straight away and still show while offline. The app follows the phone's light or dark setting.

## Which backend it uses

`.env` points the app at the deployed backend on Railway
(`https://hotel-management-backend-production-51c3.up.railway.app/api`), so it works from any
network. To use a backend running on your computer instead, create `.env.local` (git-ignored) with
`EXPO_PUBLIC_API_URL=http://<your LAN IP>:5001/api`; the phone must then be on the same Wi-Fi.
The login screen shows which server the app is using.

## Installing the app on an Android phone

There are two free ways to get a standalone APK, which runs without your computer and talks to
the Railway backend. Neither needs an Expo account. Both sign the APK the same way and number
builds by time, so a new APK installs over the old one and you stay signed in.

### A. GitHub builds it (nothing to install)

Every push to `master` that changes the app builds an APK with GitHub Actions
(`.github/workflows/android-apk.yml`). This is free because the repo is public, and takes about
10 minutes. You can also start a build by hand under **Actions → Android APK → Run workflow**.
The newest build is always at the same address, so bookmark it on the phone:

https://github.com/KalemdzievskiV/Hotel-Management-mobile/releases/latest/download/hotel-management.apk

### B. Build it on your computer (needs Docker Desktop)

```bash
npm run build:apk   # builds dist/hotel-management.apk inside Docker
npm run serve:apk   # shares it on your Wi-Fi: open the printed address on the phone
```

The build runs in a container with its own JDK and Android SDK (`android-build/`), so there's
nothing else to install. The first build downloads the Android SDK, NDK and Gradle (several GB)
and takes 15–25 minutes. After that, builds reuse Docker volumes and take a few minutes.
Only arm64 is built, which is every Android phone from the last several years; set
`ANDROID_ARCHS=armeabi-v7a,arm64-v8a,x86,x86_64` for a universal APK (e.g. for an emulator).
`serve:apk` may make Windows ask to let Node through the firewall; allow it on private networks.

To start from scratch (e.g. after a strange Gradle error), delete the build volumes:
`docker volume rm hotel-mobile-apk_work hotel-mobile-apk_gradle` (add `hotel-mobile-apk_sdk`
to re-download the SDK too).

### Installing on the phone

Open the APK link, download it and install it (allow "install unknown apps" for the browser
when asked). If you installed an earlier APK built by EAS, uninstall that once first: it was
signed with a different key, so Android won't update it.

The APK is signed with React Native's standard debug key. That's fine for installing it
yourself, but the Play Store needs a private upload key. Set one up before publishing there.

EAS cloud builds (`eas.json`) still work but are slow on the free tier. iPhone builds need a
paid Apple Developer account either way.

## Developing with Expo Go

1. Install **Expo Go** from the App Store / Play Store.
2. `npm install`, then `npx expo start` and scan the QR code (iOS camera or Expo Go on Android).

The phone downloads the app's code from your computer, so it has to be on the same Wi-Fi.
From another network, try `npm run start:tunnel`, which uses Expo's ngrok tunnel. That
tunnel is often unreliable ("remote gone away"), so use the APK above instead.

Code changes show up in Expo Go straight away, with no build. That's the fastest way to work
on the app. Keep it that way by only adding libraries that Expo Go includes (the Expo SDK
modules); anything else needs a new APK to try out.

## Quick test in a browser (local backend)

Run the backend with `dotnet run` (http://localhost:5213), then
`EXPO_PUBLIC_API_URL=http://localhost:5213/api npx expo start --web --port 3001` opens the app
at http://localhost:3001. Port 3001 matters: it's one of the origins the backend's Development
CORS settings allow (`Cors:AllowedOrigins`). The seeded test accounts (admin, manager,
housekeeper, guest `@hotel.com`) are listed in the backend's `Data/DbSeeder.cs`.

## Layout

```
src/app/                 screens (Expo Router: every file is a route)
  _layout.tsx            providers (query cache, theme, toasts, auth), auth gate, error screen
  login.tsx
  (tabs)/_layout.tsx     the tab bar; which tabs each role gets
  (tabs)/index.tsx       reservations (front desk) / my bookings (guests)
  (tabs)/housekeeping.tsx
  (tabs)/rooms.tsx
  (tabs)/hotels.tsx      guests only
  (tabs)/account.tsx
  reservations/[id].tsx  reservation details, actions and payments
src/features/<area>/     api.ts (API calls) and hooks.ts (TanStack Query hooks) per area:
                         auth, hotels, reservations, rooms, housekeeping
src/lib/                 http client (token refresh), auth/session, query client, selected
                         hotel, types, formatting, haptics
src/components/          the design system: Button, Card, Badge, Chip, TextField, Sheet,
                         Toast, Skeleton, EmptyState, ... (import from '@/components')
src/theme/               design tokens (colors for light and dark, spacing, radius, type
                         scale), useTheme() and makeStyles()
android-build/           Docker image and script for local APK builds
scripts/serve-apk.mjs    shares the built APK on the local network
```

## Checks

```bash
npx tsc --noEmit
npx expo lint
npx expo-doctor
```
