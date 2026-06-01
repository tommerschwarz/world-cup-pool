# WC 2026 Pool — Setup

## 1. Firebase project

1. Create a Firebase project at https://console.firebase.google.com
2. Enable **Google sign-in** under Authentication → Sign-in method
3. Create a **Firestore** database (start in production mode)
4. Add Firestore security rules (see below)
5. Under Project settings → Service accounts → Generate a new private key (for Admin SDK)

## 2. Environment variables

```bash
cp .env.local.example .env.local
```

Fill in all values from:
- Firebase console → Project settings → Your apps → Web app config (NEXT_PUBLIC_ vars)
- The downloaded service account JSON (FIREBASE_ADMIN_ vars)
- Your admin email addresses (comma-separated)

## 3. Seed initial bracket data

```bash
npm run seed
```

This writes `bracket/config` to Firestore with all 48 teams and 104 matches.
Re-running is safe — existing match results are preserved.

**Update team/fixture data** in `src/lib/wc2026-data.ts` once the official FIFA
group draw and schedule are confirmed, then re-seed.

## 4. Run locally

```bash
npm run dev
# open http://localhost:3000
```

## 5. Deploy to Vercel

```bash
npx vercel --prod
```

Add all `.env.local` variables as Vercel environment variables (Settings → Environment Variables).

## Firestore security rules

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Bracket is public read, admin-only write (enforced server-side via Admin SDK)
    match /bracket/{doc} {
      allow read: if request.auth != null;
      allow write: if false; // writes go through API routes only
    }
    // Predictions: users can read all, write only their own
    match /predictions/{uid} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == uid;
    }
    // Scores: read-only for users, write only via API (Admin SDK bypasses rules)
    match /scores/{uid} {
      allow read: if request.auth != null;
      allow write: if false;
    }
  }
}
```

## Scoring rules

Open `src/lib/scoring.ts` and implement the `calculateScore` function.
Clear TODO comments mark every section. After implementing, run `/api/recalculate`
from the Admin panel to recompute all scores.
