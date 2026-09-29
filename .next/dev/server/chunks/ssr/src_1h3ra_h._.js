module.exports = [
"[project]/src/agent/structure.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "MovementsZ",
    ()=>MovementsZ,
    "structureMovements",
    ()=>structureMovements
]);
// Turns a client's free-text share instruction into structured movements. Staff see the
// result as a register-change preview before anything is applied.
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__ = __turbopack_context__.i("[project]/node_modules/zod/v4/classic/external.js [app-rsc] (ecmascript) <export * as z>");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$agent$2f$call$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/agent/call.ts [app-rsc] (ecmascript)");
;
;
const MovementsZ = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
    items: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].array(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
        kind: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].enum([
            "allotment",
            "transfer",
            "buyback"
        ]),
        fromPersonId: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().nullable(),
        fromName: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().nullable(),
        toPersonId: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().nullable(),
        toName: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().nullable(),
        toNameZh: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().nullable(),
        className: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
        quantity: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number().int().positive(),
        pricePerShareCents: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number().nullable(),
        considerationCents: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number().nullable()
    }))
});
const SYSTEM = `You convert a Hong Kong company secretary's instruction about shares into structured share movements. Use personIds from the members list when the person is an existing member; otherwise give their name. Amounts are in cents (HK$1 = 100). Only include what the instruction states.`;
async function structureMovements(ctx, o) {
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$agent$2f$call$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["callAgent"])(ctx, {
        agent: "structure",
        system: SYSTEM,
        schema: MovementsZ,
        taskId: o.taskId,
        user: `Instruction: ${o.instruction}\nCurrent members: ${JSON.stringify(o.members)}\nShare classes: ${JSON.stringify(o.classes)}`
    });
}
}),
"[project]/src/domain/register-effects-structured.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "planStructured",
    ()=>planStructured
]);
// Register effects that need structured facts: allotments, transfers, buy-backs and the
// significant controllers register. The agent structures the client's instruction once;
// the structured plan is stored on the task so the preview and the applied change match.
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/drizzle-orm/sql/expressions/conditions.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/db/schema.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$shares$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/domain/shares.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$people$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/domain/people.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$agent$2f$structure$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/agent/structure.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$stamp$2d$duty$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/domain/stamp-duty.ts [app-rsc] (ecmascript)");
;
;
;
;
;
;
const n = (x)=>x.toLocaleString("en-US");
async function movementsFor(ctx, t, v) {
    const cached = t.params.structured;
    if (cached) return cached;
    const instruction = v.allotmentDetails ?? v.transferDetails ?? v.buybackDetails ?? v.cnEquityTransfer ?? v.moQuotaTransfer ?? "";
    const members = (await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$shares$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["membersAsAt"])(ctx, t.clientId, ctx.clock.today())).map((m)=>({
            personId: m.personId,
            name: m.name,
            className: m.className,
            quantity: m.quantity
        }));
    const classes = (await ctx.db.select().from(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["shareClass"]).where((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["shareClass"].clientId, t.clientId))).map((c)=>c.name);
    const m = instruction ? await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$agent$2f$structure$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["structureMovements"])(ctx, {
        taskId: t.id,
        instruction,
        members,
        classes
    }) : {
        items: []
    };
    await ctx.db.update(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["task"]).set({
        params: {
            ...t.params,
            structured: m
        }
    }).where((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["task"].id, t.id));
    return m;
}
async function classId(ctx, clientId, name) {
    const existing = (await ctx.db.select().from(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["shareClass"]).where((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["shareClass"].clientId, clientId))).find((c)=>c.name.toLowerCase() === name.toLowerCase());
    return existing?.id ?? (await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$shares$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createShareClass"])(ctx, {
        clientId,
        name
    })).id;
}
async function planStructured(ctx, t, e, v, eff) {
    if (e.kind === "update_controllers") return planControllers(ctx, t, eff, await movementsFor(ctx, t, v).catch(()=>({
            items: []
        })));
    if (![
        "allot_shares",
        "transfer_shares",
        "buyback_shares"
    ].includes(e.kind)) return [];
    const m = await movementsFor(ctx, t, v);
    const out = [];
    for (const it of m.items){
        if (it.kind === "allotment" && e.kind === "allot_shares") {
            out.push({
                effect: e.kind,
                description: `Allot ${n(it.quantity)} ${it.className} shares to ${it.toName} on ${eff}`,
                apply: async ()=>{
                    const p = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$people$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["resolvePerson"])(ctx, t.clientId, {
                        personId: it.toPersonId,
                        nameEn: it.toName,
                        nameZh: it.toNameZh
                    });
                    const paid = it.considerationCents ?? (it.pricePerShareCents ?? 0) * it.quantity;
                    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$shares$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["allot"])(ctx, {
                        clientId: t.clientId,
                        shareClassId: await classId(ctx, t.clientId, it.className),
                        date: eff,
                        toPersonId: p.id,
                        quantity: it.quantity,
                        amountPaidCents: paid,
                        sourceTaskId: t.id,
                        note: v.allotmentDetails
                    });
                }
            });
        }
        if (it.kind === "transfer" && e.kind === "transfer_shares") {
            const consideration = it.considerationCents ?? (it.pricePerShareCents ?? 0) * it.quantity;
            const duty = t.playbookId.startsWith("hk.") ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$stamp$2d$duty$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["stampDuty"])({
                considerationCents: consideration
            }) : {
                totalCents: 0
            };
            out.push({
                effect: e.kind,
                description: `Transfer ${n(it.quantity)} ${it.className} shares from ${it.fromName} to ${it.toName} on ${eff}${duty.totalCents ? ` (stamp duty HK$${n(duty.totalCents / 100)})` : ""}`,
                apply: async ()=>{
                    const from = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$people$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["resolvePerson"])(ctx, t.clientId, {
                        personId: it.fromPersonId,
                        nameEn: it.fromName
                    });
                    const to = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$people$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["resolvePerson"])(ctx, t.clientId, {
                        personId: it.toPersonId,
                        nameEn: it.toName,
                        nameZh: it.toNameZh
                    });
                    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$shares$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["transfer"])(ctx, {
                        clientId: t.clientId,
                        shareClassId: await classId(ctx, t.clientId, it.className),
                        date: eff,
                        fromPersonId: from.id,
                        toPersonId: to.id,
                        quantity: it.quantity,
                        considerationCents: consideration,
                        stampDutyCents: duty.totalCents || undefined,
                        sourceTaskId: t.id,
                        note: v.transferDetails ?? v.cnEquityTransfer ?? v.moQuotaTransfer
                    });
                }
            });
        }
        if (it.kind === "buyback" && e.kind === "buyback_shares") {
            out.push({
                effect: e.kind,
                description: `Buy back ${n(it.quantity)} ${it.className} shares from ${it.fromName} on ${eff}`,
                apply: async ()=>{
                    const from = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$people$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["resolvePerson"])(ctx, t.clientId, {
                        personId: it.fromPersonId,
                        nameEn: it.fromName
                    });
                    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$shares$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["buyback"])(ctx, {
                        clientId: t.clientId,
                        shareClassId: await classId(ctx, t.clientId, it.className),
                        date: eff,
                        fromPersonId: from.id,
                        quantity: it.quantity,
                        considerationCents: it.considerationCents ?? undefined,
                        sourceTaskId: t.id
                    });
                }
            });
        }
    }
    return out;
}
/** Holding over 25% of the issued shares makes someone registrable (Cap. 622 Sch. 5A, simplified to shareholding). */ async function planControllers(ctx, t, eff, m) {
    const current = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$shares$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["membersAsAt"])(ctx, t.clientId, eff);
    const hold = new Map();
    for (const x of current)hold.set(x.personId, {
        name: x.name,
        q: (hold.get(x.personId)?.q ?? 0) + x.quantity
    });
    const key = (id, name)=>id ?? `new:${name}`;
    for (const it of m.items){
        const to = key(it.toPersonId, it.toName), from = key(it.fromPersonId, it.fromName);
        if (it.kind !== "buyback") hold.set(to, {
            name: it.toName ?? to,
            q: (hold.get(to)?.q ?? 0) + it.quantity
        });
        if (it.kind !== "allotment") hold.set(from, {
            name: it.fromName ?? from,
            q: (hold.get(from)?.q ?? 0) - it.quantity
        });
    }
    const total = [
        ...hold.values()
    ].reduce((s, x)=>s + Math.max(0, x.q), 0);
    const registrable = new Set([
        ...hold.entries()
    ].filter(([, x])=>total && x.q / total > 0.25).map(([id])=>id));
    const existing = await ctx.db.select().from(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["significantController"]).where((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["and"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["significantController"].clientId, t.clientId), (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["isNull"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["significantController"].ceasedOn)));
    const out = [];
    for (const id of registrable){
        if (existing.some((s)=>s.personId === id)) continue;
        const h = hold.get(id);
        const pct = Math.round(h.q / total * 1000) / 10;
        out.push({
            effect: "update_controllers",
            description: `Enter ${h.name} in the significant controllers register (holds ${pct}% of the issued shares)`,
            apply: async ()=>{
                const p = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$people$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["resolvePerson"])(ctx, t.clientId, {
                    personId: id.startsWith("new:") ? null : id,
                    nameEn: h.name
                });
                await ctx.db.insert(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["significantController"]).values({
                    id: ctx.ids.next("scr"),
                    firmId: ctx.firmId,
                    clientId: t.clientId,
                    personId: p.id,
                    nature: `Holds more than 25% of the issued shares (${pct}%)`,
                    registrableFrom: eff,
                    sourceTaskId: t.id
                });
            }
        });
    }
    for (const s of existing){
        if (registrable.has(s.personId)) continue;
        const h = hold.get(s.personId);
        out.push({
            effect: "update_controllers",
            description: `Record that ${h?.name ?? s.personId} ceased to be a significant controller on ${eff}`,
            apply: async ()=>{
                await ctx.db.update(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["significantController"]).set({
                    ceasedOn: eff
                }).where((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["significantController"].id, s.id));
            }
        });
    }
    return out;
}
}),
"[project]/src/domain/stamp-duty.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

// Hong Kong stamp duty on transfers of Hong Kong stock (Stamp Duty Ordinance, Cap. 117,
// head 2(1)): since 17 November 2023, 0.1% on each of the bought note and the sold note,
// on the higher of consideration and value, per HK$1,000 or part thereof; plus HK$5 on
// the instrument of transfer. Verify with the company secretary before relying on it.
__turbopack_context__.s([
    "stampDuty",
    ()=>stampDuty
]);
function stampDuty(o) {
    const basisCents = Math.max(o.considerationCents, o.valueCents ?? 0);
    const perNoteCents = Math.ceil(basisCents / 100 / 1000) * 100; // HK$1 per HK$1,000 or part
    const instrumentCents = 500;
    return {
        perNoteCents,
        instrumentCents,
        totalCents: perNoteCents * 2 + instrumentCents,
        basisCents
    };
}
}),
];

//# sourceMappingURL=src_1h3ra_h._.js.map