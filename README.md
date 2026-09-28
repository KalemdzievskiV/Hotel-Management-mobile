# Hotel Management — Mobile

Expo (React Native) app for the hotel management system. It talks to the same REST API as the
web app (`Hotel-Management-backend`), so it uses the same database, accounts and rules.

**Stack:** Expo SDK 57 · Expo Router · TypeScript

## What it does (first version)

- Sign in with any existing account; the session is kept in the device's secure storage
- **Staff** (SuperAdmin, Admin, Manager): today's arrivals and departures, plus open bookings;
  open a booking to confirm, check in, check out or cancel it
- **Guests**: their own reservations
- Hotels list; pull down to refresh any list

## Which backend it uses

`.env` points the app at the deployed backend on Railway
(`https://hotel-management-backend-production-51c3.up.railway.app/api`), so it works from any
network. To use a backend running on your computer instead, create `.env.local` (git-ignored) with
`EXPO_PUBLIC_API_URL=http://<your LAN IP>:5001/api`; the phone must then be on the same Wi-Fi.
The login screen shows which server the app is using.

## Installing the app on an Android phone (works anywhere)

Build a standalone APK with EAS. It runs without your computer:

```bash
npx eas-cli@latest login                                # once, with your Expo account
npx eas-cli@latest build -p android --profile preview   # builds in the cloud (~10-15 min)
```

When the build finishes, open the link it prints on the phone, download the APK and install it
(allow "install unknown apps" for the browser when asked). Rebuild after changing the app.
The `preview` and `production` profiles in `eas.json` bake in the Railway URL.
iPhone builds need a paid Apple Developer account.

## Developing with Expo Go

1. Install **Expo Go** from the App Store / Play Store.
2. `npm install`, then `npx expo start` and scan the QR code (iOS camera or Expo Go on Android).

The phone downloads the app's code from your computer, so it has to be on the same Wi-Fi.
From another network, try `npm run start:tunnel`, which uses Expo's ngrok tunnel. That
tunnel is often unreliable ("remote gone away"), so use the APK above instead.

## Quick test in a browser (local backend)

`EXPO_PUBLIC_API_URL=http://localhost:5001/api npx expo start --web` opens the app at
http://localhost:8081 (that origin is allowed by the backend's Development CORS settings).

## Layout

```
src/app/                 screens (Expo Router: every file is a route)
  _layout.tsx            auth gate + stack navigator
  login.tsx
  index.tsx              reservations home
  reservations/[id].tsx  reservation details and actions
  hotels.tsx
src/lib/                 API client, auth/session, types, formatting
src/components/ui.tsx    shared UI pieces and styles
```

## Checks

```bash
npx tsc --noEmit
npx expo lint
npx expo-doctor
```
