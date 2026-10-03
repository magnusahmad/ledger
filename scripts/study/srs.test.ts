import { test } from "node:test";
import assert from "node:assert/strict";
import { emptyState, startSession, review, type Card } from "./srs.ts";

const card = (id: string, due = "2026-10-02"): Card => ({ id, topic: "research", question: `Question ${id}`, answer: "Expected reasoning", source: "crv-kb/research/index.md", sourceHash: "fixture", status: "hypothesis", interval: 0, due, reviews: 0 });
test("a daily session prioritizes overdue reviews and contains at most five questions", () => {
  const state = emptyState(); state.cards = [card("future", "2026-10-03"), ...Array.from({ length: 6 }, (_, i) => card(`${i}`, `2026-09-${25 + i}`))];
  assert.deepEqual(startSession(state, "2026-10-02"), ["0", "1", "2", "3", "4"]);
});
test("new sourced questions fill a short due queue without pulling future reviews forward", () => {
  const state = emptyState(); state.cards = [card("due"), card("future", "2026-10-03")];
  assert.deepEqual(startSession(state, "2026-10-02", [card("a"), card("b"), card("c"), card("d")]), ["due", "a", "b", "c", "d"]);
});
test("reopening a daily session preserves its questions and does not grade unanswered cards", () => {
  const state = emptyState(); const ids = startSession(state, "2026-10-02", [card("a")]);
  assert.equal(ids.length, 1);
  assert.deepEqual(startSession(state, "2026-10-02", [card("b")]), ids);
  assert.equal(state.history.length, 0);
});
test("first hard good and easy answers return after one three and seven days", () => {
  for (const [rating, interval, due] of [["hard", 1, "2026-10-03"], ["good", 3, "2026-10-05"], ["easy", 7, "2026-10-09"]] as const) {
    const state = emptyState(); startSession(state, "2026-10-02", [card("a")]);
    review(state, "2026-10-02", "a", "My free-text answer", rating, "Feedback");
    assert.equal(state.cards[0].interval, interval); assert.equal(state.cards[0].due, due);
    assert.equal(state.history[0].response, "My free-text answer");
  }
});
test("subsequent hard good and easy answers grow intervals at 1.2 2.5 and 3.25 times", () => {
  for (const [rating, interval] of [["hard", 12], ["good", 25], ["easy", 33]] as const) {
    const state = emptyState(); const c = card("a"); c.interval = 10; c.reviews = 2;
    startSession(state, "2026-10-02", [c]); review(state, "2026-10-02", "a", "Answer", rating, "Feedback");
    assert.equal(state.cards[0].interval, interval);
  }
});
test("an incorrect or forgotten answer resets the next review to tomorrow", () => {
  const state = emptyState(); const c = card("a"); c.interval = 30; c.reviews = 3;
  startSession(state, "2026-10-02", [c]); review(state, "2026-10-02", "a", "I don't know", "hard", "Explanation", true);
  assert.equal(state.cards[0].interval, 1); assert.equal(state.cards[0].due, "2026-10-03");
});
test("a repeated submission cannot consume a second review and empty answers are rejected", () => {
  const state = emptyState(); startSession(state, "2026-10-02", [card("a")]);
  assert.throws(() => review(state, "2026-10-02", "a", " ", "good", "Feedback"));
  review(state, "2026-10-02", "a", "Answer", "good", "Feedback");
  assert.throws(() => review(state, "2026-10-02", "a", "Answer", "easy", "Feedback"));
  assert.equal(state.history.length, 1);
});
test("an answer to yesterday's session schedules from the actual response day", () => {
  const state = emptyState(); startSession(state, "2026-10-02", [card("a")]);
  review(state, "2026-10-02", "a", "Answer", "good", "Feedback", false, "2026-10-04");
  assert.equal(state.cards[0].due, "2026-10-07");
  assert.equal(state.history[0].reviewedOn, "2026-10-04");
});
