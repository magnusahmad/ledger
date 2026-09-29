// Stores the Gmail refresh token encrypted in the secrets table (never displayed).
import { google } from "googleapis";
import { gmailOAuthClient } from "@/integrations/mail/gmail";
import { getCtx } from "@/server/ctx";
import { setSecret } from "@/domain/secrets";
import { kvSet } from "@/domain/kv";
export async function GET(req: Request) {
  const ctx = getCtx();
  const code = new URL(req.url).searchParams.get("code");
  if (!code) return new Response("Missing code", { status: 400 });
  const auth = gmailOAuthClient(ctx.config.GOOGLE_CLIENT_ID!, ctx.config.GOOGLE_CLIENT_SECRET!, `${ctx.config.APP_URL}/api/integrations/gmail/callback`);
  const { tokens } = await auth.getToken(code);
  if (!tokens.refresh_token) return new Response("Google didn't return a refresh token. Remove the app's access in your Google account and connect again.", { status: 400 });
  auth.setCredentials(tokens);
  const me = await google.oauth2({ version: "v2", auth }).userinfo.get();
  await setSecret(ctx, "gmail.refresh_token", tokens.refresh_token);
  await kvSet(ctx, "gmail.address", me.data.email ?? "");
  await kvSet(ctx, "mail.cursor.gmail", null);
  return Response.redirect(`${ctx.config.APP_URL}/settings?connected=gmail`);
}
