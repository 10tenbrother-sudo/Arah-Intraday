/**
 * Emergency credential rotation. Dry-run by default.
 *
 * `data/market_intelligence.db.json` was committed to a public repository and
 * the live SQLite store still holds the same password hashes and salt the file
 * leaked, so every account whose hash matched is treated as compromised.
 *
 * What this does, only with --apply:
 *   1. Invalidates every still-usable verification token (marks used_at), which
 *      closes off a password-reset takeover with a token copied from the leak.
 *   2. Replaces each affected account's password with a fresh random value and
 *      issues a single-use reset link so the owner can choose their own.
 *
 * Usage:
 *   npx tsx scripts/rotate-compromised-credentials.ts              # dry run
 *   npx tsx scripts/rotate-compromised-credentials.ts --apply      # write
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { prisma } from '../server/db/prisma.js';
import { db } from '../server/db/database.js';

const APPLY = process.argv.includes('--apply');
const LEK_FILE = path.resolve(process.cwd(), 'data/market_intelligence.db.json');
const PBKDF2_ITERATIONS = 210_000;
const PBKDF2_KEYLEN = 64;
const PBKDF2_DIGEST = 'sha512';

function hashPassword(password: string, salt?: string): { hash: string; salt: string } {
  const s = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, s, PBKDF2_ITERATIONS, PBKDF2_KEYLEN, PBKDF2_DIGEST).toString('hex');
  return { hash, salt: s };
}

function baseUrl(): string {
  return (process.env.APP_BASE_URL || process.env.PUBLIC_BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
}

interface LeakedUser {
  email: string;
  password_hash: string;
  salt: string;
}

function readLeakedUsers(): LeakedUser[] {
  if (!fs.existsSync(LEK_FILE)) return [];
  const parsed = JSON.parse(fs.readFileSync(LEK_FILE, 'utf8'));
  return Array.isArray(parsed?.users) ? parsed.users : [];
}

async function main(): Promise<void> {
  console.log(`Mode: ${APPLY ? 'APPLY (menulis ke database)' : 'DRY RUN (tidak mengubah apa pun)'}\n`);

  const leaked = readLeakedUsers();
  if (leaked.length === 0) {
    console.log(`Tidak menemukan data bocor di ${LEK_FILE}.`);
    return;
  }
  console.log(`Entri bocor di file: ${leaked.length}`);

  // An account counts as compromised when the live hash/salt still equals the
  // leaked pair; a rotated account no longer matches and is left untouched.
  const liveUsers = await prisma.user.findMany();
  const compromised = liveUsers.filter((u) => {
    const hit = leaked.find((l) => l.email?.toLowerCase() === u.email.toLowerCase());
    return hit && hit.password_hash === u.password_hash && hit.salt === u.salt;
  });

  console.log(`Akun dengan kredensial bocor yang MASIH AKTIF: ${compromised.length}`);
  for (const u of compromised) console.log(`  - ${u.email} (${u.role})`);

  // Tokens are matched by value because the leaked file lists the secrets,
  // not the ids. Any token still usable is a takeover vector regardless of owner.
  const leakedTokens = new Set<string>(
    ((JSON.parse(fs.readFileSync(LEK_FILE, 'utf8')).verification_tokens || []) as any[])
      .map((t: any) => t.token)
      .filter(Boolean)
  );
  const tokens = await prisma.verificationToken.findMany();
  const liveLeakedTokens = tokens.filter((t) => leakedTokens.has(t.token) && !t.used_at);

  console.log(`Token bocor yang masih bisa dipakai: ${liveLeakedTokens.length}`);
  for (const t of liveLeakedTokens) console.log(`  - ${t.email} (${t.type || 'n/a'})`);

  if (!APPLY) {
    console.log('\nDry run selesai. Jalankan ulang dengan --apply untuk benar-benar merotasi.');
    return;
  }

  const now = new Date().toISOString();
  const result = await prisma.verificationToken.updateMany({
    where: { token: { in: [...leakedTokens] }, used_at: null },
    data: { used_at: now },
  });
  console.log(`\nToken dicabut: ${result.count}`);

  const links: string[] = [];
  for (const user of compromised) {
    const generated = crypto.randomBytes(24).toString('base64url');
    const { hash, salt } = hashPassword(generated);
    await prisma.user.update({
      where: { id: user.id },
      data: { password_hash: hash, salt, updated_at: now },
    });

    const token = await db.createPasswordResetToken(user.id, user.email, 72);
    const link = `${baseUrl()}/reset-password?token=${encodeURIComponent(token.token)}`;
    links.push(`  ${user.email}\n    ${link}`);
  }

  console.log(`Password dirotasi: ${compromised.length}`);
  console.log('\nLink reset sekali pakai (berlaku 72 jam) — kirim ke pemilik masing-masing akun:');
  for (const l of links) console.log(l);
  console.log('\nSetelah pemilik memakai link-nya, link otomatis tidak berlaku lagi.');
}

main()
  .catch((err) => {
    console.error('Gagal merotasi kredensial:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
