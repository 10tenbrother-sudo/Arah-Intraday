/**
 * Promotes or demotes an account's role from the command line.
 *
 * Needed because granting ADMIN is otherwise locked behind the admin panel
 * itself: if no account has the role, there is no way in to create the first
 * one. Run against the configured database:
 *
 *   npx tsx scripts/set-role.ts someone@example.com ADMIN
 *   npx tsx scripts/set-role.ts someone@example.com USER
 *
 * Refuses to remove the last remaining ADMIN so the panel cannot be orphaned.
 */
import { db } from '../server/db/database.js';

const ADMIN_PLAN = 'INSTITUTIONAL';

async function main() {
  const email = process.argv[2]?.toLowerCase().trim();
  const role = (process.argv[3] || 'ADMIN').toUpperCase();

  if (!email) {
    console.error('usage: tsx scripts/set-role.ts <email> [ADMIN|USER]');
    process.exit(1);
  }
  if (role !== 'ADMIN' && role !== 'USER') {
    console.error(`invalid role "${role}" — expected ADMIN or USER`);
    process.exit(1);
  }

  const user = await db.getUserByEmail(email);
  if (!user) {
    console.error(`No account found for ${email}.`);
    process.exit(1);
  }

  if (role === 'USER' && user.role === 'ADMIN') {
    const remaining = (await db.getAllUsers()).filter(
      u => u.role === 'ADMIN' && u.id !== user.id
    ).length;
    if (remaining === 0) {
      console.error('Refusing to demote the only remaining ADMIN account.');
      process.exit(1);
    }
  }

  const updated = await db.updateUser(user.id, {
    role,
    plan: role === 'ADMIN' ? ADMIN_PLAN : user.plan,
    updated_at: new Date().toISOString(),
  });

  console.log(`${updated?.email} -> role=${updated?.role} plan=${updated?.plan}`);
  if (updated?.role === 'ADMIN') {
    console.log('Sign out and back in for the admin navigation to appear.');
  }
}

main();
