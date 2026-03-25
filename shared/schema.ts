import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const analyses = sqliteTable("analyses", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  resumeText: text("resume_text").notNull(),
  jobDescription: text("job_description").notNull(),
  overallScore: integer("overall_score"),
  scoreRationale: text("score_rationale"),
  feedbackJson: text("feedback_json"), // JSON array of feedback sections
});

export const insertAnalysisSchema = createInsertSchema(analyses).omit({ id: true, overallScore: true, scoreRationale: true, feedbackJson: true });
export type InsertAnalysis = z.infer<typeof insertAnalysisSchema>;
export type Analysis = typeof analyses.$inferSelect;
