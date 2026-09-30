import { eq } from "drizzle-orm";
import type { Ctx } from "@/lib/ctx";
import { appUser, firm } from "@/db/schema";

export const DEMO_FIRM = {
  legalName: "Caine Road Corporate Services Limited",
  legalNameZh: "堅道企業服務有限公司",
  tcspLicence: "TC009999", // fictional
  address: "18/F, 88 Caine Road, Mid-Levels, Hong Kong",
  email: "desk@caineroad.example",
  phone: "+852 3000 0000",
  invoicePrefix: "CRCS-",
  settings: { businessRegistrationNumber: "70000000" }, // fictional demo firm
  signOff: {
    en: "Karen Yip\nSenior Company Secretary\nCaine Road Corporate Services Limited",
    tc: "葉嘉欣\n高級公司秘書\n堅道企業服務有限公司",
    sc: "叶嘉欣\n高级公司秘书\n坚道企业服务有限公司",
  },
};

export const DEMO_USERS = [
  { id: "user_ky", name: "Karen Yip", initials: "KY", title: "Senior Company Secretary", isDemoUser: true },
  { id: "user_mc", name: "Mary Chan", initials: "MC", title: "Company Secretarial Officer", isDemoUser: false },
  { id: "user_dh", name: "Daniel Ho", initials: "DH", title: "Assistant Company Secretary", isDemoUser: false },
];

export async function ensureFirm(ctx: Ctx) {
  const existing = await ctx.db.query.firm.findFirst({ where: eq(firm.id, ctx.firmId) });
  if (!existing) {
    await ctx.db.insert(firm).values({ id: ctx.firmId, ...DEMO_FIRM });
    for (const u of DEMO_USERS) await ctx.db.insert(appUser).values({ ...u, firmId: ctx.firmId });
  }
  return (await ctx.db.query.firm.findFirst({ where: eq(firm.id, ctx.firmId) }))!;
}

export async function getFirm(ctx: Ctx) {
  return (await ctx.db.query.firm.findFirst({ where: eq(firm.id, ctx.firmId) }))!;
}
