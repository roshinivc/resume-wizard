import Database from "better-sqlite3";
import type { Analysis, InsertAnalysis } from "@shared/schema";

const sqlite = new Database("data.db");

sqlite.exec(`
  CREATE TABLE IF NOT EXISTS analyses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    resume_text TEXT NOT NULL,
    job_description TEXT NOT NULL,
    overall_score INTEGER,
    score_rationale TEXT,
    feedback_json TEXT
  )
`);

export interface IStorage {
  createAnalysis(data: InsertAnalysis): Analysis;
  updateAnalysis(id: number, updates: Partial<Analysis>): Analysis | undefined;
  getAnalysis(id: number): Analysis | undefined;
}

export class Storage implements IStorage {
  createAnalysis(data: InsertAnalysis): Analysis {
    const stmt = sqlite.prepare(
      "INSERT INTO analyses (resume_text, job_description) VALUES (?, ?) RETURNING *"
    );
    return stmt.get(data.resumeText, data.jobDescription) as Analysis;
  }

  updateAnalysis(id: number, updates: Partial<Analysis>): Analysis | undefined {
    const sets: string[] = [];
    const vals: unknown[] = [];
    if (updates.overallScore !== undefined) { sets.push("overall_score = ?"); vals.push(updates.overallScore); }
    if (updates.scoreRationale !== undefined) { sets.push("score_rationale = ?"); vals.push(updates.scoreRationale); }
    if (updates.feedbackJson !== undefined) { sets.push("feedback_json = ?"); vals.push(updates.feedbackJson); }
    if (sets.length === 0) return this.getAnalysis(id);
    vals.push(id);
    const stmt = sqlite.prepare(`UPDATE analyses SET ${sets.join(", ")} WHERE id = ? RETURNING *`);
    return stmt.get(...vals) as Analysis | undefined;
  }

  getAnalysis(id: number): Analysis | undefined {
    const stmt = sqlite.prepare("SELECT * FROM analyses WHERE id = ?");
    return stmt.get(id) as Analysis | undefined;
  }
}

export const storage = new Storage();
