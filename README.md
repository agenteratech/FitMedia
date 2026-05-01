# FitMedia

A fitness RPG tracking app built with Expo. Log workouts, diet, and sleep to earn a daily Body Score (0–100). Track progress over time, build workout routines, and see per-muscle-group breakdowns.

---

## Tech Stack

- **Expo 54** (React Native 0.81, React 19)
- **Expo Router v4** — file-based navigation
- **Supabase** — Postgres database + Auth
- **Zustand v5** — client state management
- **React Native MMKV** — local caching
- **@gorhom/bottom-sheet v5** — gesture-driven sheets
- **react-native-svg** — charts and animated rings
- **FatSecret API** — food/nutrition database

---

## Prerequisites

- **Node.js** 18 or later
- **npm** 10+ (comes with Node 18)
- **Expo CLI** — install once: `npm install -g expo@latest`
- **Expo Go** app on your phone (iOS or Android) — search "Expo Go" in the App Store / Play Store
- A **Supabase** project (free tier is fine)
- **FatSecret API** credentials (free developer account at fatsecret.com)

---

## Setup

### 1. Clone and install

```bash
git clone <repo-url>
cd fitmedia
npm install
```

### 2. Create your environment file

Copy the template and fill in your credentials:

```bash
cp .env.example .env
```

Open `.env` and set:

```
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
FATSECRET_CLIENT_ID=your-fatsecret-client-id
FATSECRET_CLIENT_SECRET=your-fatsecret-client-secret
```

**Getting Supabase credentials:** Go to your Supabase project → Settings → API → copy "Project URL" and "anon public" key.

**Getting FatSecret credentials:** Register at [platform.fatsecret.com](https://platform.fatsecret.com), create an app, copy the Client ID and Secret.

### 3. Set up the Supabase database

In your Supabase project, open the SQL Editor and run the migrations from the `supabase/migrations/` folder (if present) or apply the schema manually. The app expects these tables:

`users`, `workouts`, `workout_exercises`, `workout_sets`, `exercises`, `user_routines`, `user_routine_exercises`, `daily_scores`, `diet_logs`, `sleep_logs`, `personal_records`

See `CLAUDE.md` → Section 10 for the full schema.

### 4. Run the app

```bash
npx expo start
```

This opens the Expo dev tools in your terminal. Then:

- **On your phone:** Open Expo Go, scan the QR code shown in the terminal.
- **On iOS Simulator:** Press `i` in the terminal (requires Xcode on Mac).
- **On Android Emulator:** Press `a` in the terminal (requires Android Studio).

---

## Screens

| Screen | What it does |
|---|---|
| **Home** | Dashboard with Body Score ring, today's sub-scores, quick actions, Up Next routine, recent activity |
| **Logs** | Log and view workouts, food/diet, and sleep. Segmented by type. |
| **Routines** | Create and manage workout routines. Start a routine to begin a workout. |
| **Progress** | Score history charts, period stats (sessions, volume, PRs), sleep summary |
| **Profile** | Edit your name, height, weight, fitness level, goal, and lifestyle settings |

---

## Project Structure

```
app/           Screens (Expo Router file-based routing)
  (tabs)/      The 5 main tab screens
  (modals)/    Full-screen modals (active workout, create routine, etc.)
  auth/        Login and sign-up screens
  onboarding/  First-run setup flow
hooks/         Data-fetching hooks (Supabase queries)
stores/        Zustand state stores
src/
  components/
    primitives/  Reusable UI components (Button, Card, Sheet, etc.)
lib/           External service clients (Supabase, FatSecret, MMKV)
constants/     Color palette
theme/         Spacing, radius, typography tokens
types/         TypeScript types including Supabase schema types
```

For full technical details — architecture, design system, all hooks and their return types, Supabase schema, coding conventions — see [CLAUDE.md](CLAUDE.md).

---

## Common Issues

**"Unable to resolve module" errors after install**

```bash
npx expo install --fix
```

**App shows blank screen / font not loading**

Make sure you have a working internet connection on first launch (fonts are loaded from Google Fonts via expo-google-fonts).

**Supabase auth errors**

Double-check your `.env` values match the Supabase project settings exactly (no trailing spaces or quotes around values).

**Food search not working**

Verify your FatSecret credentials in `.env`. The FatSecret API requires OAuth 2.0 client credentials — make sure you're using the correct Client ID and Secret from the Platform dashboard.
