import { eq } from 'drizzle-orm';
import { db } from './db';
import { spaceMembers } from './schema';

export const spaceMemberRepository = {
  async upsertMany(spaceId: string, members: { uid: string; name: string }[]): Promise<void> {
    const now = new Date().toISOString();
    for (const m of members) {
      const id = `${spaceId}:${m.uid}`;
      const row = { id, spaceId, uid: m.uid, name: m.name || m.uid, updatedAt: now };
      await db.insert(spaceMembers).values(row).onConflictDoUpdate({ target: spaceMembers.id, set: row });
    }
  },

  async getName(uid: string): Promise<string | null> {
    const rows = await db.select({ name: spaceMembers.name }).from(spaceMembers).where(eq(spaceMembers.uid, uid)).limit(1);
    return rows[0]?.name ?? null;
  },

  async getAllNames(): Promise<Record<string, string>> {
    const rows = await db.select({ uid: spaceMembers.uid, name: spaceMembers.name }).from(spaceMembers);
    const map: Record<string, string> = {};
    for (const r of rows) map[r.uid] = r.name;
    return map;
  },
};
