import { describe, expect, it, beforeAll } from "vitest";
import { appRouter } from "./routers";
import { getDb, upsertUser } from "./db";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

let testUserIds: number[] = [];

beforeAll(async () => {
  // Create test users in the database
  const testUsers = [
    { openId: "test-user-1", name: "Test User 1", email: "test1@example.com" },
    { openId: "test-user-2", name: "Test User 2", email: "test2@example.com" },
    { openId: "test-user-3", name: "Test User 3", email: "test3@example.com" },
    { openId: "test-user-4", name: "Test User 4", email: "test4@example.com" },
    { openId: "test-user-5", name: "Test User 5", email: "test5@example.com" },
  ];

  for (const user of testUsers) {
    await upsertUser({
      openId: user.openId,
      name: user.name,
      email: user.email,
      loginMethod: "test",
    });
  }

  // Fetch the created users to get their IDs
  const db = await getDb();
  if (db) {
    const { users } = await import("../drizzle/schema");
    const { eq } = await import("drizzle-orm");
    
    for (const user of testUsers) {
      const result = await db
        .select()
        .from(users)
        .where(eq(users.openId, user.openId))
        .limit(1);
      if (result.length > 0) {
        testUserIds.push(result[0].id);
      }
    }
  }
});

function createAuthContext(userIndex: number = 0): TrpcContext {
  const userId = testUserIds[userIndex] || 1;
  const user: AuthenticatedUser = {
    id: userId,
    openId: `test-user-${userIndex + 1}`,
    email: `test${userIndex + 1}@example.com`,
    name: `Test User ${userIndex + 1}`,
    loginMethod: "test",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };

  return ctx;
}

describe("puzzle router", () => {
  describe("getByDate", () => {
    it("should retrieve a puzzle by date", async () => {
      const caller = appRouter.createCaller({
        user: null,
        req: { protocol: "https", headers: {} } as TrpcContext["req"],
        res: {} as TrpcContext["res"],
      });

      const puzzle = await caller.puzzle.getByDate("2025-11-01");

      expect(puzzle).toBeDefined();
      expect(puzzle?.date).toBe("2025-11-01");
      expect(puzzle?.question).toBeDefined();
      expect(puzzle?.answer).toBeDefined();
    });

    it("should return undefined for non-existent date", async () => {
      const caller = appRouter.createCaller({
        user: null,
        req: { protocol: "https", headers: {} } as TrpcContext["req"],
        res: {} as TrpcContext["res"],
      });

      const puzzle = await caller.puzzle.getByDate("2099-12-31");

      expect(puzzle).toBeUndefined();
    });
  });

  describe("getAllForMonth", () => {
    it("should retrieve all puzzles for a month", async () => {
      const caller = appRouter.createCaller({
        user: null,
        req: { protocol: "https", headers: {} } as TrpcContext["req"],
        res: {} as TrpcContext["res"],
      });

      const puzzles = await caller.puzzle.getAllForMonth({
        year: 2025,
        month: 11,
      });

      expect(Array.isArray(puzzles)).toBe(true);
      expect(puzzles.length).toBeGreaterThan(0);
      expect(puzzles.every((p) => p.date.startsWith("2025-11"))).toBe(true);
    });

    it("should return empty array for month with no puzzles", async () => {
      const caller = appRouter.createCaller({
        user: null,
        req: { protocol: "https", headers: {} } as TrpcContext["req"],
        res: {} as TrpcContext["res"],
      });

      const puzzles = await caller.puzzle.getAllForMonth({
        year: 2099,
        month: 12,
      });

      expect(Array.isArray(puzzles)).toBe(true);
      expect(puzzles.length).toBe(0);
    });
  });

  describe("submit", () => {
    it("should accept correct answer", async () => {
      const ctx = createAuthContext(0);
      const caller = appRouter.createCaller(ctx);

      // First get a puzzle to know the correct answer
      const puzzle = await caller.puzzle.getByDate("2025-11-01");
      expect(puzzle).toBeDefined();

      if (puzzle) {
        const result = await caller.puzzle.submit({
          puzzleId: puzzle.id,
          answer: puzzle.answer,
        });

        expect(result.correct).toBe(true);
        expect(result.location).toBeDefined();
        expect(result.latitude).toBeDefined();
        expect(result.longitude).toBeDefined();
      }
    });

    it("should reject incorrect answer", async () => {
      const ctx = createAuthContext(1);
      const caller = appRouter.createCaller(ctx);

      // First get a puzzle
      const puzzle = await caller.puzzle.getByDate("2025-11-02");
      expect(puzzle).toBeDefined();

      if (puzzle) {
        const result = await caller.puzzle.submit({
          puzzleId: puzzle.id,
          answer: "wrong_answer",
        });

        expect(result.correct).toBe(false);
        expect(result.location).toBeNull();
      }
    });

    it("should be case-insensitive", async () => {
      const ctx = createAuthContext(2);
      const caller = appRouter.createCaller(ctx);

      // First get a puzzle
      const puzzle = await caller.puzzle.getByDate("2025-11-03");
      expect(puzzle).toBeDefined();

      if (puzzle) {
        const result = await caller.puzzle.submit({
          puzzleId: puzzle.id,
          answer: puzzle.answer.toUpperCase(),
        });

        expect(result.correct).toBe(true);
      }
    });

    it("should trim whitespace from answers", async () => {
      const ctx = createAuthContext(3);
      const caller = appRouter.createCaller(ctx);

      // First get a puzzle
      const puzzle = await caller.puzzle.getByDate("2025-11-04");
      expect(puzzle).toBeDefined();

      if (puzzle) {
        const result = await caller.puzzle.submit({
          puzzleId: puzzle.id,
          answer: `  ${puzzle.answer}  `,
        });

        expect(result.correct).toBe(true);
      }
    });
  });

  describe("getUserProgress", () => {
    it("should retrieve user progress for a month", async () => {
      const ctx = createAuthContext(4);
      const caller = appRouter.createCaller(ctx);

      // Submit an answer first
      const puzzle = await caller.puzzle.getByDate("2025-11-05");
      if (puzzle) {
        await caller.puzzle.submit({
          puzzleId: puzzle.id,
          answer: puzzle.answer,
        });
      }

      // Get progress
      const progress = await caller.puzzle.getUserProgress({
        year: 2025,
        month: 11,
      });

      expect(Array.isArray(progress)).toBe(true);
      // Should have at least one entry from the submission above
      expect(progress.length).toBeGreaterThanOrEqual(1);
    });
  });
});
