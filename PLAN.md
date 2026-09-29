# Mobile app plan: from MVP to a real, everyday app

_Written 2026-09-28. Based on the code as of commit `bad8082`._

## 1. Where we are

The Expo app (SDK 57, Expo Router) already works end to end against the Railway backend:

| Area | What exists today |
|---|---|
| Auth | Login only, session in SecureStore, auto sign-out on 401 |
| Management | Reservation list (arrivals / departures / open) with search; detail with confirm, check in/out, no-show, cancel, payments |
| Housekeeping | Day schedule, start → done, "create tasks" for departures |
| Rooms | Floor board colored by status, change status / mark cleaned |
| Guest | "My bookings" list, read-only hotel list |
| Account | Who's signed in, hotel picker, sign out |

**What stops it from being a real app:**

1. **You get signed out every hour.** The JWT lasts 60 minutes (`JwtSettings:ExpiryMinutes`) and there is no refresh token. On a phone this is the biggest usability problem.
2. **Guests can't do anything.** They can't register, search availability, book, or cancel. That's the core guest use case.
3. **Managers can't create anything.** There's no new reservation, walk-in, guest lookup or task assignment, and no "how is today going" overview.
4. **It looks like a prototype.** Plain light theme, a spinner instead of skeletons, no dark mode, no haptics, no bottom sheets, and a single `ui.tsx` for all components.
5. **Data layer.** The home-grown `useApi` has no caching, no optimistic updates and no retry. It loads *all* reservations and filters them on the device (`index.tsx`), which won't scale.
6. **No notifications.** A manager doesn't find out about a new online booking, and a housekeeper doesn't find out a task was assigned.

## 2. Scope: what the mobile app is (and isn't)

The mobile app is for **doing the day's work and booking stays**. Setup and analysis stay on the web.

| ✅ In mobile | ❌ Web only |
|---|---|
| Today dashboard, arrivals/departures, check in/out | Hotel & room creation/editing |
| New reservation + walk-in + express checkout | Staff & user management, roles |
| Payments, refunds, cancel, no-show | Subscriptions & billing |
| Guest lookup, guest profile, VIP/blacklist flag view | Full reports & exports |
| Room board + status changes | Inventory (maybe a read-only "low stock" card later) |
| Housekeeping: my tasks, create/assign (managers) | Super-admin dashboards |
| Guest: register, explore, search, book, cancel, profile | Bulk operations, settings |
| Push notifications, biometric unlock | |

## 3. Navigation per role

Maximum 4–5 tabs per role. Every role gets a different home.

**Admin / Manager / SuperAdmin**
```
[ Today ]  [ Bookings ]  [ ＋ ]  [ Rooms ]  [ More ]
```
- **Today**: KPI cards (occupancy %, arrivals, departures, in-house, revenue today), "needs attention" list (pending approvals, unpaid balances at checkout, dirty rooms with arrivals), quick actions.
- **Bookings**: segmented `Arrivals · Departures · In-house · Upcoming · All`, search, filters in a bottom sheet.
- **＋ (center action)**: a bottom sheet with *Walk-in check-in*, *New reservation*, *New housekeeping task*, *Record payment*.
- **Rooms**: the existing floor board, redesigned; long-press for quick status change.
- **More**: Housekeeping, Guests, Reports-lite (7-day revenue + occupancy chart), hotel switcher, profile, settings.

**Housekeeper**
```
[ My tasks ]  [ Rooms ]  [ Account ]
```
The task list is grouped by priority. Swipe right to start, swipe right again to complete. A banner shows when an urgent task is assigned.

**Guest**
```
[ Explore ]  [ Trips ]  [ Account ]
```
- **Explore**: search bar (city / hotel), date + guests picker, hotel cards with photo, stars and "from €X".
- **Trips**: upcoming as a big "next trip" card with check-in time and address/map link; past trips below.
- **Account**: profile, change password, notifications, sign out.

## 4. Key user flows

### Guest: book a stay (the most important new flow)
1. Explore → pick dates (range calendar) + guests → **Search**
2. Hotel list (only hotels with availability) → hotel detail (photos, amenities, check-in/out times, address)
3. Available rooms (`GET /Reservations/available-rooms`) as cards: type, capacity, price per night, total
4. Review sheet: dates, room, total, special requests → **Book**
5. Success screen ("Pending approval") → the trip appears in Trips; push when it's confirmed
6. Trip detail: status timeline (Booked → Confirmed → Checked in → Done), **Cancel** with reason and a confirmation

Also needed: **Register** (`POST /Auth/register`) and short-stay/hourly bookings via a toggle in the search sheet (`BookingType.ShortStay`).

### Manager: walk-in in under 60 seconds
1. ＋ → Walk-in → search guest by name/phone/email (`/Guests/search`) or "New guest" (minimal form)
2. Guest intelligence card (`/WalkIn/guest-intelligence/{id}`): VIP, blacklist warning, past stays
3. Available now (`/WalkIn/available-rooms/{hotelId}`) → tap a room
4. Nights / hours, price, deposit + payment method → **Check in** (`/WalkIn/quick-checkin`)
5. Haptic success + "Room 204 is now occupied" toast

### Manager: new reservation
Guest (search or create) → dates → available rooms → price/deposit → confirm. This reuses the same room picker component as the guest flow.

### Manager: check-out
Reservation → **Check out**. If there's a balance, a payment sheet opens first (amount prefilled). After check-out it offers "Create cleaning task for room 204".

### Housekeeping (manager side)
Create a task (room, type, priority, assignee from `/Hotels/{id}/staff`, time). Reassign by tapping the assignee chip.

## 5. Design system

The goal is a modern, calm "hospitality" look: lots of whitespace, soft cards and one confident accent color.

**Tokens** (`src/theme/`)
- **Color**: neutral scale (stone/zinc), one brand accent (deep teal or indigo, pick one), semantic success/warning/danger/info, plus room/reservation status colors *derived from the same palette* (today they're hard-coded hexes in `types.ts`). Full **light + dark** sets; switch `app.json` `userInterfaceStyle` to `"automatic"`.
- **Type**: one family (Inter or the system font) with a fixed scale: `display 32 / title 22 / headline 17 semibold / body 15 / caption 13`. Numbers in KPIs use tabular figures.
- **Spacing**: 4-pt scale (4, 8, 12, 16, 24, 32); screen gutter 16; card radius 16; chip radius 999.
- **Elevation**: subtle shadow on light, border + slightly lighter surface on dark.

**Components** (`src/components/`, one file each instead of `ui.tsx`)
`Screen`, `Card`, `Button` (primary / secondary / ghost / danger, loading state), `Chip` / `StatusBadge`, `ListItem`, `SectionHeader`, `KpiCard`, `SegmentedControl`, `SearchBar`, `BottomSheet`, `DateRangePicker`, `Stepper` (guests / nights), `TextField` (label, error, helper), `Avatar` (initials), `Skeleton`, `EmptyState` (icon + title + action), `Toast`, `SwipeableRow`, `ConfirmDialog`.

**Interaction rules**
- A skeleton instead of a spinner for every list and detail screen.
- Pull to refresh everywhere (already done — keep it).
- Haptics: light on tab/segment change, success on check-in/out and payment, warning on cancel.
- Destructive actions (cancel, no-show, refund) always go through a confirm sheet that names the consequence.
- Primary actions sit in a sticky bottom bar within thumb reach, not at the top.
- Minimum 44 pt touch targets, dynamic type support, screen-reader labels on icon buttons.
- Respect the safe area and the keyboard (forms scroll the focused field into view).

**Before building**: make a small Figma (or HTML) mockup of 5 screens (Today, Booking detail, Walk-in, Guest Explore, Trip detail) in light and dark, and agree on the accent color.

## 6. Technical foundation

| Concern | Choice | Why |
|---|---|---|
| Server state | **TanStack Query** (+ `persistQueryClient` with AsyncStorage) | Same as web; caching, retry, optimistic updates, offline read of last data |
| Forms | **react-hook-form + zod** | Same as web; share schemas' shape |
| Animations/gestures | `react-native-reanimated` + `react-native-gesture-handler` | Bottom sheets, swipe rows; both ship in Expo Go |
| Bottom sheet | `@gorhom/bottom-sheet` | JS on top of the two above |
| Dates | `@react-native-community/datetimepicker` + `react-native-calendars` (range) | Expo Go compatible |
| Images | `expo-image` | Caching, placeholders for hotel photos |
| Feel | `expo-haptics`, `expo-blur` (tab bar), `expo-linear-gradient` (hero) | |
| Security | `expo-local-authentication` | Face ID / fingerprint unlock |
| Push | `expo-notifications` | Needs a dev build / APK (not Expo Go) — fine, we already ship APKs |
| Styling | Keep `StyleSheet` + a `useTheme()` hook | No new build tooling; consistent with the current code |

Install everything with `npx expo install` and check each against the **SDK 57 docs** (see `AGENTS.md`).

**Code structure**
```
src/app/               routes only
  (auth)/login, register
  (manager)/...        tabs per role, or keep one (tabs) with Protected guards
  (guest)/...
src/features/<area>/   api.ts, hooks.ts (useQuery/useMutation), components/
  reservations/ rooms/ housekeeping/ guests/ walk-in/ booking/ dashboard/ auth/
src/components/        design system
src/theme/             tokens, useTheme
src/lib/               http client, storage, format, types
```
Split `lib/api.ts` by feature. Keep `types.ts` in step with the backend enums (as in the web's `types/enums.ts`).

## 7. Backend changes needed

| # | Change | Why | Size |
|---|---|---|---|
| B1 | **Refresh tokens**: `POST /Auth/refresh`, `POST /Auth/logout` (revoke); short access token + 30-day rotating refresh token stored hashed | Stop the hourly sign-out | M |
| B2 | ✅ `PUT /Guests/me` (guest edits own profile), `POST /Auth/change-password` | Guest profile screen | S |
| B3 | ✅ Hotel-scoped queries: `?hotelId=` on `today/check-ins`, `today/check-outs`, stats; paging on `GET /Reservations` | The app currently downloads everything and filters on the phone | S |
| B4 | ✅ **"Today" uses the hotel's local date**, not `DateTime.UtcNow.Date` (`ReservationsController.cs:418`) | Arrivals are wrong in the evening for hotels east/west of UTC | S–M |
| B5 | ✅ `GET /Dashboard/today?hotelId=` returning all KPI numbers in one call | One request for the Today screen instead of ~6 | S |
| B6 | ✅ Push: `DeviceToken` entity + `POST/DELETE /Notifications/devices`; a `PushService` calling Expo's push API on events (new guest booking → hotel managers; booking confirmed/cancelled → guest; task assigned/urgent → housekeeper) | Notifications | M |
| B7 | Hotel photos + amenities + "price from" on the public hotel DTO (if not already there) | A good Explore screen | S–M |
| B8 | ✅ Guest cancellation rules (e.g. only before check-in, only Pending/Confirmed) enforced server-side | Guests can cancel now; make sure it's safe | S |

Follow the usual order from the root `CLAUDE.md` (Entity → migration → DTO → mapping → validator → service → DI → controller) and add tests in `HotelManagement/Tests/`.

## 8. Phases

Each phase ends with an APK that people can actually use.

### Phase 0: Foundation (≈1.5 weeks) — done 2026-09-28
- [x] B1 refresh tokens + mobile client that refreshes silently and retries once
- [x] Theme tokens, light/dark, `useTheme`, the core components (Button, Card, Chip, TextField, Skeleton, EmptyState, Toast, BottomSheet)
- [x] Move to TanStack Query; delete `useApi`; persist the cache
- [x] Feature folder structure; split `api.ts`
- [x] Error boundary + a friendly offline banner
- [x] Restyle the existing screens with the new components (no new features yet)
**Done when**: you stay signed in for days, every existing screen uses the design system, and dark mode works.

### Phase 1: Guest app (≈2 weeks) — done 2026-09-29
- [x] Register (guest accounts). Forgot password shows a note: there's no reset flow in the API or on the web yet (the web's link goes to a page that doesn't exist)
- [x] Explore (search, date/guest picker), hotel detail
- [x] Available rooms → review → book (daily + short stay)
- [x] Trips: next-trip card, detail with status timeline, cancel (with a reason)
- [x] Profile (B2: `PUT /Guests/me`, `POST /Auth/change-password`)
- [x] B8: guests can't cancel once the check-in day has passed, or book a check-in in the past
**Done when**: a new user can install the app, register, and book a room without the web.

Notes from building it:
- The date picker is a small in-house `Calendar` component, not `react-native-calendars`; no new dependencies were needed.
- Explore asks `available-rooms` once per hotel. Fine for a handful of hotels; B7 ("price from" on the hotel DTO) or a search endpoint is needed before there are dozens.
- The API returns booking dates with a `Z` although they're hotel wall-clock times; the app reads them with `parseStayTime`, which ignores the zone.

### Phase 2: Manager daily operations (≈2.5 weeks) — done 2026-09-29
- [x] B3, B4, B5 (`GET /Reservations/search`, `?hotelId=&date=` on today/check-ins/check-outs and walk-in rooms, `GET /Dashboard/today` and `/Dashboard/trend`)
- [x] Today dashboard
- [x] Bookings redesign with segments (arriving, leaving, in-house, upcoming, to approve, all), search and paging. No filter sheet: segments plus search covered it
- [x] ＋ sheet: walk-in, new reservation, record payment, new task
- [x] Express checkout with balance sheet (and extras) → "create cleaning task"
- [x] Refunds; edit reservation (dates / guests / notes; the API can't move a booking to another room)
- [x] Guests: search, detail (stays, spend, VIP switch, blacklist badge)
- [x] Housekeeping: create / assign / reassign (managers), swipe actions (everyone, buttons stay too)
- [x] Reports-lite in More: 7/14/30-day money taken + occupancy (a small in-house bar chart, no chart library)
**Done when**: a manager can run a whole shift from the phone.

Notes from building it:
- Hotels have no time zone, so "today" is the day the phone sends (`date`, plus `utcOffsetMinutes` for payment times). Staff phones are at the hotel, so this is right in practice; a per-hotel time zone (entity + website setting) would make it exact.
- Swipe rows are built on `PanResponder` (no gesture-handler/reanimated dependency), so Expo Go keeps working.

### Phase 3: Notifications & polish (≈1.5 weeks)
- [x] B6 push + in-app notification list, per-type toggles in settings (2026-09-29)
- [x] Deep links (`hotelmgmt://reservations/123`), so a push tap opens the booking (2026-09-29)
- [x] Biometric unlock (optional, off by default) (2026-09-29)
- [x] Animations: success moments, lists and details easing in (2026-09-29). Shared list → detail transitions and the tab bar blur were left out, see the notes
- [ ] Accessibility pass (VoiceOver/TalkBack, dynamic type at 200%)
- [ ] App icon, splash and store screenshots in the new visual style

Notes from building it:
- Delivery needs the one-time Firebase setup in the README ("Push notifications"). Until then the APK builds and the in-app list works, but no pushes arrive.
- Who gets what: a guest's online booking or cancellation → the hotel's owner and its Admins/Managers; the hotel confirming or cancelling → the guest (only guests with an account; walk-ins have none); a task assigned, or raised to Urgent → the assignee. Nobody is told about their own action.
- The server saves every notification and queues the pushes; a background service sends them to Expo in batches of up to 100 and forgets tokens Expo reports as `DeviceNotRegistered`. Expo's delivery receipts aren't checked yet, so a failure after Expo accepted a push (e.g. bad FCM credentials) only shows in Expo's dashboard.
- Settings switches turn off the push only; the list keeps everything.
- A phone's token belongs to whoever signed in last, and sign-out removes it. If a session ends on its own (expired or revoked), the token stays with that user until someone signs in on the phone again.
- Deep links needed no extra code: Expo Router already maps `hotelmgmt://<route>`, and the sign-in gate covers links opened while signed out. Pushes carry ids, not URLs; the app turns them into routes (`notificationHref`).
- Hotels have no time zone yet, so the dates in push texts are the booking's wall-clock dates.
- App lock (Account → "Unlock with Fingerprint / Face ID"): asks when the app opens and after 5 minutes in the background; the phone's PIN works as a fallback, and "Sign out" is always offered. It's per phone and per user, turned on only after a successful scan, and turned off by signing out. It covers the screen only: the session and tokens are unchanged, so it's a privacy lock, not extra protection for the stored tokens. A sheet that was open when the app went to the background can show above it until closed. Face ID needs an iOS build (not Expo Go).
- Animations use React Native's own `Animated` (native driver), like the toasts and skeletons already did: no Reanimated, so no new dependency. They follow the phone's "reduce motion" setting (things fade in without moving). `src/lib/motion.ts` holds the timings; `src/components/Motion.tsx` has `FadeIn` and `SuccessMark`.
  - **Success moments**: `toast.celebrate(title, detail)` pops a check in the middle of the screen (with the success haptic) for check-in, check-out, walk-in, a new reservation and a recorded payment. Smaller things (tasks, VIP, settings) keep the top toast, so a housekeeper finishing twenty rooms isn't shown twenty celebrations. The guest's "Request sent" screen uses the same check.
  - **Lists and details**: booking, trip, hotel and task rows fade in one after another (only the first 8 are staggered), and so do the booking screen's cards. A task that moves to another section fades in there, which shows where it went.
  - **Not done**: shared-element transitions (list card morphing into the detail header) are still experimental in Reanimated 4, behind a feature flag. A tab bar blur needs every screen wrapped in a blur target on Android, where the app is used; on iOS it would also need every list to pad for a see-through tab bar. Both cost more than they give for now.

### Phase 4: Release hardening (≈1 week)
- [ ] Private upload key; Play Store internal testing track (README notes the debug-key limitation)
- [ ] `eas update` channels for over-the-air JS fixes
- [ ] Crash reporting (e.g. Sentry's Expo integration)
- [ ] Test matrix: small Android (360 dp), large Android, iPhone SE, iPhone Pro Max, tablet; light/dark; slow network; airplane mode
- [ ] Minimal E2E smoke tests (Maestro): login per role, book, walk-in, check-out

**Total: roughly 8–9 weeks for one developer.** Phases 1 and 2 can run in parallel if two people work on it.

## 9. Open decisions

1. **Accent color / brand**: match the web dashboard or give mobile its own identity?
2. **Guest payments**: keep "pay at hotel" (current behavior: guest bookings start unpaid), or add Stripe in-app later?
3. **iOS**: needs a paid Apple Developer account. Android-only for v1?
4. **Languages**: English only, or add a second language from the start (`expo-localization` + i18n)? It's cheaper to set up in Phase 0 than to retrofit.
5. **Offline writes**: read-only offline is in the plan; queued offline check-ins are much harder and probably not worth it for v1.
