import { and, eq, gte, lte } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, puzzles, userProgress } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function getPuzzleByDate(date: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get puzzle: database not available");
    return undefined;
  }

  const result = await db.select().from(puzzles).where(eq(puzzles.date, date)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getAllPuzzles() {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get puzzles: database not available");
    return [];
  }

  return await db.select().from(puzzles).orderBy(puzzles.date);
}

export async function getUserProgress(userId: number, puzzleId: number) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get progress: database not available");
    return undefined;
  }

  const result = await db
    .select()
    .from(userProgress)
    .where(
      and(
        eq(userProgress.userId, userId),
        eq(userProgress.puzzleId, puzzleId)
      )
    )
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function getUserProgressByMonth(userId: number, year: number, month: number) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get progress: database not available");
    return [];
  }

  const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const endDate = `${year}-${String(month).padStart(2, "0")}-31`;

  return await db
    .select()
    .from(userProgress)
    .innerJoin(puzzles, eq(userProgress.puzzleId, puzzles.id))
    .where(
      and(
        eq(userProgress.userId, userId),
        gte(puzzles.date, startDate),
        lte(puzzles.date, endDate)
      )
    )
    .then((results) => results.map((r) => r.userProgress));
}

export async function updateUserProgress(
  userId: number,
  puzzleId: number,
  solved: boolean
) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot update progress: database not available");
    return;
  }

  const existing = await getUserProgress(userId, puzzleId);

  if (existing) {
    await db
      .update(userProgress)
      .set({
        solved: solved ? 1 : 0,
        solvedAt: solved ? new Date() : null,
        attempts: existing.attempts + 1,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(userProgress.userId, userId),
          eq(userProgress.puzzleId, puzzleId)
        )
      );
  } else {
    await db.insert(userProgress).values({
      userId,
      puzzleId,
      solved: solved ? 1 : 0,
      solvedAt: solved ? new Date() : null,
      attempts: 1,
    });
  }
}
