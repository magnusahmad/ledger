import { readFile } from "node:fs/promises";
import { expect, it } from "vitest";
import { sql } from "drizzle-orm";
import type { Ctx } from "@/lib/ctx";
import { registerPersonAsAt } from "@/domain/register-person";
import { makeCtx } from "./helpers";

it("company history migration retains known encrypted particulars for existing references before future profile changes", async () => {
  const ctx=makeCtx(), name=`audit_person_history_${Date.now()}`;
  const migration=await readFile("src/db/migrations/0008_company_person_history.sql","utf8");
  const idCipher=ctx.crypto.encrypt("F123456(7)"), addressCipher=ctx.crypto.encrypt("Fictional protected old address");
  await ctx.db.transaction(async db=>{
    await db.execute(sql.raw(`create schema "${name}"`));
    try {
      await db.execute(sql.raw(`set local search_path to "${name}", public`));
      for(const table of ["client","person","appointment","significant_controller","share_movement"])
        await db.execute(sql.raw(`create table "${table}" (like public."${table}" including defaults)`));
      await db.execute(sql`insert into client (id,firm_id,name_en) values ('mig_a',${ctx.firmId},'Fictional A'),('mig_b',${ctx.firmId},'Fictional B')`);
      await db.execute(sql`insert into person (id,firm_id,name_en,id_number_enc,residential_address_enc) values ('mig_shared',${ctx.firmId},'Known original name',${idCipher},${addressCipher})`);
      await db.execute(sql`insert into appointment (id,firm_id,client_id,person_id,role,from_date) values ('mig_apt',${ctx.firmId},'mig_a','mig_shared','director','2020-01-01')`);
      await db.execute(sql`insert into significant_controller (id,firm_id,client_id,person_id,nature,registrable_from) values ('mig_scr',${ctx.firmId},'mig_b','mig_shared','Confirmed control','2020-01-01')`);
      await db.execute(sql.raw(migration));
      await db.execute(sql`update person set name_en='Later working profile' where id='mig_shared'`);
      const txCtx={...ctx,db:db as unknown as Ctx["db"]};
      for(const clientId of ["mig_a","mig_b"]){
        const p=await registerPersonAsAt(txCtx,clientId,"mig_shared","2026-10-02");
        expect(p.nameEn).toBe("Known original name");
        expect(p.idNumberEnc).toBe(idCipher); expect(p.residentialAddressEnc).toBe(addressCipher);
      }
      const result=await db.execute(sql`select patch from register_person_change`);
      expect(result.rows).toHaveLength(2);
      expect(JSON.stringify(result.rows)).not.toContain("F123456(7)");
      expect(JSON.stringify(result.rows)).not.toContain("Fictional protected old address");
    } finally {
      await db.execute(sql.raw("set local search_path to public"));
      await db.execute(sql.raw(`drop schema "${name}" cascade`));
    }
  });
});
