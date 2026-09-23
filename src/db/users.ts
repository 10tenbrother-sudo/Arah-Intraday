// src/db/users.ts
import { db } from './index.ts';
import { users } from './schema.ts';
import { eq } from 'drizzle-orm';

export async function getOrCreateUser(uid: string, email: string, name?: string) {
  try {
    const result = await db.insert(users)
      .values({
        id: uid,
        email: email.toLowerCase().trim(),
        name: name || 'Trader',
        role: 'USER',
        isVerified: true,
        plan: 'PRO',
        subscriptionStatus: 'active',
      })
      .onConflictDoUpdate({
        target: users.id,
        set: {
          email: email.toLowerCase().trim(),
          ...(name ? { name } : {}),
          updatedAt: new Date(),
        },
      })
      .returning();

    return result[0];
  } catch (error) {
    console.error('Database getOrCreateUser failed:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}

export async function getUserById(uid: string) {
  try {
    const result = await db.select().from(users).where(eq(users.id, uid)).limit(1);
    return result[0] || null;
  } catch (error) {
    console.error('Database getUserById failed:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}
