import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, protectedProcedure } from "./_core/trpc";
import {
  getPuzzleByDate,
  getAllPuzzles,
  getUserProgress,
  getUserProgressByMonth,
  updateUserProgress,
  getDb,
} from "./db";
import { puzzles } from "../drizzle/schema";
import { eq } from "drizzle-orm";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  puzzle: router({
    getByDate: publicProcedure
      .input((val: unknown) => {
        if (typeof val === "string") return val;
        throw new Error("Expected string");
      })
      .query(async ({ input }) => {
        return getPuzzleByDate(input);
      }),

    getAllForMonth: publicProcedure
      .input((val: unknown) => {
        if (
          typeof val === "object" &&
          val !== null &&
          "year" in val &&
          "month" in val
        ) {
          return val as { year: number; month: number };
        }
        throw new Error("Expected object with year and month");
      })
      .query(async ({ input }) => {
        const allPuzzles = await getAllPuzzles();
        const monthStr = String(input.month).padStart(2, "0");
        return allPuzzles.filter((p) =>
          p.date.startsWith(`${input.year}-${monthStr}`)
        );
      }),

    submit: protectedProcedure
      .input((val: unknown) => {
        if (
          typeof val === "object" &&
          val !== null &&
          "puzzleId" in val &&
          "answer" in val
        ) {
          return val as { puzzleId: number; answer: string };
        }
        throw new Error("Expected object with puzzleId and answer");
      })
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const result = await db
          .select()
          .from(puzzles)
          .where(eq(puzzles.id, input.puzzleId))
          .limit(1);

        if (!result || result.length === 0) {
          throw new Error("Puzzle not found");
        }

        const puzzle = result[0];
        const isCorrect =
          input.answer.toLowerCase().trim() ===
          puzzle.answer.toLowerCase().trim();

        if (isCorrect) {
          await updateUserProgress(ctx.user.id, input.puzzleId, true);
        } else {
          await updateUserProgress(ctx.user.id, input.puzzleId, false);
        }

        return {
          correct: isCorrect,
          location: isCorrect ? puzzle.location : null,
          latitude: isCorrect ? puzzle.latitude : null,
          longitude: isCorrect ? puzzle.longitude : null,
        };
      }),

    getUserProgress: protectedProcedure
      .input((val: unknown) => {
        if (
          typeof val === "object" &&
          val !== null &&
          "year" in val &&
          "month" in val
        ) {
          return val as { year: number; month: number };
        }
        throw new Error("Expected object with year and month");
      })
      .query(async ({ input, ctx }) => {
        return getUserProgressByMonth(ctx.user.id, input.year, input.month);
      }),
  }),
});

export type AppRouter = typeof appRouter;
