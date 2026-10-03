import { readFileSync, writeFileSync, renameSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { emptyState, startSession, review, type Card, type State } from "./srs.ts";

const directory = resolve(import.meta.dirname, "../../.study");
const file = resolve(directory, "review-history.json");
mkdirSync(directory, { recursive: true });
let state: State;
try { state = JSON.parse(readFileSync(file, "utf8")); }
catch (error) {
  if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  state = emptyState();
}
const date = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Hong_Kong", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
const command = process.argv[2];
if (command === "status") {
  console.log(JSON.stringify({ date, due: state.cards.filter(c => c.due <= date).length, session: state.sessions[date] ?? [], reviewed: state.history.filter(h => h.date === date).map(h => h.cardId) }, null, 2));
} else if (command === "start") {
  const candidates: Card[] = process.argv[3] ? JSON.parse(readFileSync(process.argv[3], "utf8")) : [];
  const ids = startSession(state, date, candidates);
  console.log(JSON.stringify({ date, missing: 5 - ids.length, questions: ids.filter(id => !state.history.some(h => h.date === date && h.cardId === id)).map(id => {
    const card = state.cards.find(c => c.id === id)!;
    return { id, topic: card.topic, question: card.question };
  }) }, null, 2));
} else if (command === "review") {
  // Read responses from a file, avoiding shell interpolation of personal text.
  const input = JSON.parse(readFileSync(process.argv[3], "utf8"));
  review(state, input.date ?? date, input.cardId, input.response, input.rating, input.feedback, input.forgotten ?? false, date);
  console.log(JSON.stringify(state.history.at(-1), null, 2));
} else throw new Error("Usage: npx tsx scripts/study/cli.ts status | start [candidates.json] | review response.json");
if (command !== "status") {
  writeFileSync(`${file}.tmp`, JSON.stringify(state, null, 2) + "\n", { mode: 0o600 });
  renameSync(`${file}.tmp`, file);
}
