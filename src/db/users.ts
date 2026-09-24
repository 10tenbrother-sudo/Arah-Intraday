// src/db/users.ts
import { db } from '../../server/db/database.js';

/**
 * Cloud SQL is configured via PostgreSQL/Prisma in server/db/database.ts.
 */
export function isCloudSqlConfigured(): boolean {
  return true;
}

export async function getOrCreateUser(uid: string, email: string, name?: string) {
  try {
    const cleanEmail = email.toLowerCase().trim();
    let user = await db.getUserByEmail(cleanEmail);
    if (!user) {
      user = {
        id: uid,
        email: cleanEmail,
        password_hash: '',
        salt: '',
        name: name || cleanEmail.split('@')[0] || 'Trader',
        role: 'USER',
        is_verified: true,
        verification_status: 'verified',
        plan: 'PRO',
        subscription_status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      await db.insertUser(user);
    } else {
      user = (await db.updateUser(user.id, {
        is_verified: true,
        verification_status: 'verified',
        ...(name ? { name } : {}),
        updated_at: new Date().toISOString(),
      })) || user;
    }

    return user;
  } catch (error) {
    console.warn('[Database] getOrCreateUser notice:', error);
    return null;
  }
}

export async function getUserById(uid: string) {
  try {
    return await db.getUserById(uid);
  } catch (error) {
    console.warn('[Database] getUserById notice:', error);
    return null;
  }
}
