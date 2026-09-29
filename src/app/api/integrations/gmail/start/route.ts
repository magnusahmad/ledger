import { gmailOAuthClient, GMAIL_SCOPES } from "@/integrations/mail/gmail";
import { getCtx } from "@/server/ctx";
export async function GET() {
  const { config } = getCtx();
  if (!config.GOOGLE_CLIENT_ID || !config.GOOGLE_CLIENT_SECRET) return new Response("Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env first (see docs/SETUP_INTEGRATIONS.md).", { status: 400 });
  const auth = gmailOAuthClient(config.GOOGLE_CLIENT_ID, config.GOOGLE_CLIENT_SECRET, `${config.APP_URL}/api/integrations/gmail/callback`);
  return Response.redirect(auth.generateAuthUrl({ access_type: "offline", prompt: "consent", scope: [...GMAIL_SCOPES, "https://www.googleapis.com/auth/userinfo.email", "openid"] }));
}
