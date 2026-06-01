/**
 * Seed the Firestore `bracket/config` document with World Cup 2026 data.
 *
 * Usage: npm run seed
 *
 * Safe to re-run — fully replaces teams/matches but preserves any
 * groupResults that have already been entered by the admin.
 */

import * as dotenv from 'dotenv';
import { resolve } from 'path';
dotenv.config({ path: resolve(__dirname, '../.env.local') });

import { cert, initializeApp } from 'firebase-admin/app';
import { getFirestore }        from 'firebase-admin/firestore';
import { buildInitialBracket } from '../src/lib/wc2026-data';

const app = initializeApp({
  credential: cert({
    projectId:   process.env.FIREBASE_ADMIN_PROJECT_ID,
    clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
    privateKey:  process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  }),
});

const db = getFirestore(app);

async function seed() {
  const bracket = buildInitialBracket();
  console.log(`Seeding: ${Object.keys(bracket.teams).length} teams`);

  const ref  = db.doc('bracket/config');
  const snap = await ref.get();

  // Preserve any group results already entered by the admin
  const existingGroupResults = snap.exists
    ? (snap.data()?.groupResults ?? {})
    : {};

  // Full overwrite — no merge — so stale team entries from previous seeds
  // are completely removed and replaced with the current data.
  await ref.set({
    ...bracket,
    groupResults: existingGroupResults,
  });

  console.log('✓ Bracket written (group results preserved)');
  process.exit(0);
}

seed().catch(e => { console.error(e); process.exit(1); });
