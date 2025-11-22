import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Puzzle table storing daily puzzles with their solutions and reveal information.
 */
export const puzzles = mysqlTable("puzzles", {
  id: int("id").autoincrement().primaryKey(),
  /** Date of the puzzle (YYYY-MM-DD format) */
  date: varchar("date", { length: 10 }).notNull().unique(),
  /** Puzzle question or riddle */
  question: text("question").notNull(),
  /** Puzzle type: riddle, word, logic, etc */
  type: varchar("type", { length: 50 }).notNull(),
  /** Correct answer to the puzzle */
  answer: varchar("answer", { length: 255 }).notNull(),
  /** Location to reveal when puzzle is solved */
  location: text("location").notNull(),
  /** Latitude for map display */
  latitude: varchar("latitude", { length: 20 }),
  /** Longitude for map display */
  longitude: varchar("longitude", { length: 20 }),
  /** Additional hint for the puzzle */
  hint: text("hint"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Puzzle = typeof puzzles.$inferSelect;
export type InsertPuzzle = typeof puzzles.$inferInsert;

/**
 * User progress table tracking which puzzles each user has solved.
 */
export const userProgress = mysqlTable("userProgress", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  puzzleId: int("puzzleId").notNull().references(() => puzzles.id),
  /** Whether the user has solved this puzzle */
  solved: int("solved").default(0).notNull(),
  /** Timestamp when the puzzle was solved */
  solvedAt: timestamp("solvedAt"),
  /** Number of attempts made */
  attempts: int("attempts").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type UserProgress = typeof userProgress.$inferSelect;
export type InsertUserProgress = typeof userProgress.$inferInsert;