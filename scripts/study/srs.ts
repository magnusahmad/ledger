export type Rating = "hard" | "good" | "easy";
export type Card = {
  id: string; topic: "research" | "financials"; question: string;
  answer: string; source: string; sourceHash: string;
  status: "finding" | "hypothesis" | "illustrative" | "indicative";
  interval: number; due: string; reviews: number;
};
export type State = {
  version: 1; timezone: "Asia/Hong_Kong"; cards: Card[];
  sessions: Record<string, string[]>;
  history: { date: string; reviewedOn: string; cardId: string; response: string; rating: Rating; feedback: string; interval: number; due: string }[];
};
export const emptyState = (): State => ({ version: 1, timezone: "Asia/Hong_Kong", cards: [], sessions: {}, history: [] });
export function startSession(state: State, date: string, candidates: Card[] = []): string[] {
  if (state.sessions[date]) return state.sessions[date];
  const ids = state.cards.filter(c => c.due <= date).sort((a, b) => a.due.localeCompare(b.due)).slice(0, 5).map(c => c.id);
  for (const candidate of candidates) {
    if (ids.length === 5) break;
    if (state.cards.some(c => c.id === candidate.id || c.question === candidate.question)) continue;
    if (!candidate.source || !candidate.sourceHash || !candidate.answer || !candidate.question) throw new Error("A new question needs a source, fingerprint and expected answer");
    state.cards.push({ ...candidate, due: date });
    ids.push(candidate.id);
  }
  // Let the agent supply more sourced questions before saving a short session.
  if (ids.length) state.sessions[date] = ids;
  return ids;
}
export function review(state: State, date: string, cardId: string, response: string, rating: Rating, feedback: string, forgotten = false, reviewedOn = date): void {
  if (!response.trim()) throw new Error("A free-text answer is required");
  if (!["hard", "good", "easy"].includes(rating)) throw new Error("Invalid rating");
  if (!state.sessions[date]?.includes(cardId)) throw new Error("Question is not in this day's session");
  if (state.history.some(h => h.date === date && h.cardId === cardId)) throw new Error("Already reviewed today");
  const card = state.cards.find(c => c.id === cardId)!;
  const interval = forgotten ? 1 : card.reviews === 0
    ? { hard: 1, good: 3, easy: 7 }[rating]
    : Math.max(card.interval + 1, Math.round(card.interval * { hard: 1.2, good: 2.5, easy: 3.25 }[rating]));
  const next = new Date(`${reviewedOn}T00:00:00Z`);
  next.setUTCDate(next.getUTCDate() + interval);
  const due = next.toISOString().slice(0, 10);
  Object.assign(card, { interval, due, reviews: card.reviews + 1 });
  state.history.push({ date, reviewedOn, cardId, response, rating: forgotten ? "hard" : rating, feedback, interval, due });
}
