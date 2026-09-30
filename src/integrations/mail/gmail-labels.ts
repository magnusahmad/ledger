// Which Gmail messages Harbourline reads: received mail in the inbox, and the firm's own
// replies in Sent (including ones typed in Gmail rather than Harbourline).
export function gmailDirection(labelIds: string[]): "in" | "out" | null {
  if (labelIds.includes("DRAFT") || labelIds.includes("SPAM") || labelIds.includes("TRASH")) return null;
  if (labelIds.includes("SENT")) return "out";
  if (labelIds.includes("INBOX")) return "in";
  return null;
}
