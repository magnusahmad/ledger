import { describe, expect, it, vi } from "vitest";
import { google } from "googleapis";
import { GmailMail } from "@/integrations/mail/gmail";
import { buildRaw, parseRaw } from "@/integrations/mail/mime";

// Every Google call is replaced by an in-memory stub. No OAuth token or live mailbox.
function stubGmail(metadata: () => Promise<unknown>) {
  const mail = new GmailMail("desk@fictional.example", new google.auth.OAuth2("fixture-client", "fixture-secret"));
  const send = vi.fn(async () => ({ data: { id: "accepted-fixture-42", threadId: "fixture-thread" } }));
  const get = vi.fn(metadata);
  Object.assign(mail, { gmail: { users: { messages: { send, get } } } });
  return { mail, send, get };
}

describe("Mail adapter acknowledgement boundaries", () => {
  it("the same approved delivery correlation produces a stable MIME Message-ID across retries", async () => {
    const approved = { correlationId: "approved-delivery-fixture", to: ["client@fictional.example"], subject: "Confirmed request", text: "Approved 繁體 简体", attachments: [{ filename: "approved.pdf", mime: "application/pdf", content: Buffer.from("%PDF approved financial snapshot") }] };
    const first = await parseRaw(await buildRaw("desk@fictional.example", approved), "gmail", "fixture-first");
    const retry = await parseRaw(await buildRaw("desk@fictional.example", approved), "gmail", "fixture-retry");
    expect(first.rfcMessageId).toBeTruthy();
    expect(retry.rfcMessageId).toBe(first.rfcMessageId);
    expect(retry.text).toBe(first.text);
    expect(retry.attachments[0].content).toEqual(approved.attachments[0].content);
  });

  it("a missing Gmail send response cannot be classified as a successful provider acknowledgement", async () => {
    const { mail, send, get } = stubGmail(async () => ({ data: {} }));
    send.mockRejectedValueOnce(new Error("Fixture socket closed without a send acknowledgement"));
    await expect(mail.send({ to: ["client@fictional.example"], subject: "Approved", text: "Approved bytes" })).rejects.toThrow();
    expect(send).toHaveBeenCalledTimes(1);
    expect(get).not.toHaveBeenCalled();
  });

  it("a Gmail accepted send remains accepted when the optional Message-ID metadata lookup times out", async () => {
    const { mail, send } = stubGmail(async () => { throw new Error("Fixture metadata lookup timed out after provider accepted mail"); });
    await expect(mail.send({ to: ["client@fictional.example"], subject: "Approved request", text: "Exact approved bytes 確認 简体" })).resolves.toMatchObject({ providerMessageId: "accepted-fixture-42", providerThreadId: "fixture-thread" });
    expect(send).toHaveBeenCalledTimes(1);
  });

  it("a successful Gmail acknowledgement retains provider identifiers without altering the approved body", async () => {
    const { mail, send, get } = stubGmail(async () => ({ data: { payload: { headers: [{ name: "Message-ID", value: "<fixture@fictional.example>" }] } } }));
    const result = await mail.send({ to: ["client@fictional.example"], subject: "Confirmed", text: "Exact approved EN 繁體 简体" });
    expect(result).toEqual({ providerMessageId: "accepted-fixture-42", providerThreadId: "fixture-thread", rfcMessageId: "<fixture@fictional.example>" });
    expect(send).toHaveBeenCalledTimes(1);
    expect(get).toHaveBeenCalledTimes(1);
    const argument = send.mock.calls[0] as unknown[];
    const raw = (argument[0] as { requestBody: { raw: string } }).requestBody.raw;
    const parsed = await parseRaw(Buffer.from(raw, "base64url"), "gmail", "accepted-fixture-42");
    expect(parsed.to).toEqual(["client@fictional.example"]);
    expect(parsed.text.trim()).toBe("Exact approved EN 繁體 简体");
  });
});

it("Gmail reconciliation accepts one correlated Sent result and uses the canonical bare RFC identifier", async () => {
  const { mail, send } = stubGmail(async () => ({ data: {} }));
  const list = vi.fn(async () => ({ data: { messages: [{ id: "accepted-reconciled", threadId: "accepted-thread" }] } }));
  Object.assign(mail, { gmail: { users: { messages: { list, send } } } });
  await expect(mail.reconcileDelivery("<stable-fixture@clerk.local>")).resolves.toEqual({ status: "accepted", sent: { providerMessageId: "accepted-reconciled", providerThreadId: "accepted-thread", rfcMessageId: "<stable-fixture@clerk.local>" } });
  expect(list).toHaveBeenCalledWith({ userId: "me", q: "in:sent rfc822msgid:stable-fixture@clerk.local", maxResults: 2 });
  expect(send).not.toHaveBeenCalled();
});

it.each([{ messages: [] }, { messages: [{ id: "one" }, { id: "two" }] }, { messages: [{}] }])("Gmail missing or ambiguous correlation results remain unknown without a resend: %j", async ({ messages }) => {
  const { mail, send } = stubGmail(async () => ({ data: {} }));
  const list = vi.fn(async () => ({ data: { messages } }));
  Object.assign(mail, { gmail: { users: { messages: { list, send } } } });
  await expect(mail.reconcileDelivery("<stable-fixture@clerk.local>")).resolves.toEqual({ status: "unknown" });
  expect(send).not.toHaveBeenCalled();
});

it("Gmail an acknowledgement with no provider identifier is never a successful delivery", async () => {
  const { mail, send, get } = stubGmail(async () => ({ data: {} }));
  send.mockResolvedValueOnce({ data: {} } as never);
  await expect(mail.send({ to: ["fixture@fictional.example"], subject: "Approved", text: "Approved" })).rejects.toThrow(/acknowledgement/);
  expect(get).not.toHaveBeenCalled();
});
