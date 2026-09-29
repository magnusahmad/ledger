import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pg", "pdf-lib", "@pdf-lib/fontkit", "googleapis", "mailparser", "nodemailer", "agentmail", "@modelcontextprotocol/sdk"],
  experimental: { serverActions: { bodySizeLimit: "20mb" } },
};

export default nextConfig;
