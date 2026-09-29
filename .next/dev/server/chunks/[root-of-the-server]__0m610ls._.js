module.exports = [
"[externals]/next/dist/compiled/@opentelemetry/api [external] (next/dist/compiled/@opentelemetry/api, cjs)", ((__turbopack_context__, module, exports) => {

var mod = __turbopack_context__.x("next/dist/compiled/@opentelemetry/api", () => require("next/dist/compiled/@opentelemetry/api"));

module.exports = mod;
}),
"[externals]/next/dist/compiled/next-server/app-page-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-page-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

var mod = __turbopack_context__.x("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[externals]/next/dist/compiled/next-server/app-route-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-route-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

var mod = __turbopack_context__.x("next/dist/compiled/next-server/app-route-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-route-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/work-async-storage.external.js [external] (next/dist/server/app-render/work-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

var mod = __turbopack_context__.x("next/dist/server/app-render/work-async-storage.external.js", () => require("next/dist/server/app-render/work-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/work-unit-async-storage.external.js [external] (next/dist/server/app-render/work-unit-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

var mod = __turbopack_context__.x("next/dist/server/app-render/work-unit-async-storage.external.js", () => require("next/dist/server/app-render/work-unit-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/runtime-reacts.external.js [external] (next/dist/server/runtime-reacts.external.js, cjs)", ((__turbopack_context__, module, exports) => {

var mod = __turbopack_context__.x("next/dist/server/runtime-reacts.external.js", () => require("next/dist/server/runtime-reacts.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/shared/lib/no-fallback-error.external.js [external] (next/dist/shared/lib/no-fallback-error.external.js, cjs)", ((__turbopack_context__, module, exports) => {

var mod = __turbopack_context__.x("next/dist/shared/lib/no-fallback-error.external.js", () => require("next/dist/shared/lib/no-fallback-error.external.js"));

module.exports = mod;
}),
"[externals]/node:crypto [external] (node:crypto, cjs)", ((__turbopack_context__, module, exports) => {

var mod = __turbopack_context__.x("node:crypto", () => require("node:crypto"));

module.exports = mod;
}),
"[externals]/node:fs [external] (node:fs, cjs)", ((__turbopack_context__, module, exports) => {

var mod = __turbopack_context__.x("node:fs", () => require("node:fs"));

module.exports = mod;
}),
"[externals]/node:fs/promises [external] (node:fs/promises, cjs)", ((__turbopack_context__, module, exports) => {

var mod = __turbopack_context__.x("node:fs/promises", () => require("node:fs/promises"));

module.exports = mod;
}),
"[externals]/node:path [external] (node:path, cjs)", ((__turbopack_context__, module, exports) => {

var mod = __turbopack_context__.x("node:path", () => require("node:path"));

module.exports = mod;
}),
"[externals]/node:readline [external] (node:readline, cjs)", ((__turbopack_context__, module, exports) => {

var mod = __turbopack_context__.x("node:readline", () => require("node:readline"));

module.exports = mod;
}),
"[externals]/node:stream [external] (node:stream, cjs)", ((__turbopack_context__, module, exports) => {

var mod = __turbopack_context__.x("node:stream", () => require("node:stream"));

module.exports = mod;
}),
"[project]/src/agent/call.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "AgentError",
    ()=>AgentError,
    "callAgent",
    ()=>callAgent,
    "jsonSchemaOf",
    ()=>jsonSchemaOf
]);
// Every product LLM call goes through here: structured output, zod validation,
// one repair retry, and a row in llm_call for the task timeline and audit.
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__ = __turbopack_context__.i("[project]/node_modules/zod/v4/classic/external.js [app-route] (ecmascript) <export * as z>");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/db/schema.ts [app-route] (ecmascript)");
;
;
class AgentError extends Error {
    agent;
    raw;
    constructor(message, agent, raw){
        super(message), this.agent = agent, this.raw = raw;
    }
}
function jsonSchemaOf(schema) {
    const js = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].toJSONSchema(schema, {
        target: "draft-7",
        unrepresentable: "any"
    });
    delete js.$schema;
    return js;
}
async function callAgent(ctx, opts) {
    const messages = [
        {
            role: "system",
            content: opts.system
        },
        {
            role: "user",
            content: opts.user
        }
    ];
    const jsonSchema = jsonSchemaOf(opts.schema);
    let lastError = "";
    for(let attempt = 0; attempt < 2; attempt++){
        const started = Date.now();
        let raw = null;
        try {
            const res = await ctx.llm.complete({
                agent: opts.agent,
                messages,
                schema: jsonSchema,
                schemaName: opts.agent.replace(/\W/g, "_"),
                temperature: opts.temperature
            });
            raw = res.json;
            const parsed = opts.schema.safeParse(res.json);
            await ctx.db.insert(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["llmCall"]).values({
                id: ctx.ids.next("llm"),
                firmId: ctx.firmId,
                agent: opts.agent,
                model: res.model,
                input: {
                    messages: messages.map((m)=>({
                            role: m.role,
                            content: typeof m.content === "string" ? m.content.slice(0, 20000) : "[multimodal]"
                        }))
                },
                output: res.json,
                error: parsed.success ? null : parsed.error.message.slice(0, 2000),
                latencyMs: Date.now() - started,
                tokensIn: res.tokensIn ?? null,
                tokensOut: res.tokensOut ?? null,
                taskId: opts.taskId ?? null,
                messageId: opts.messageId ?? null,
                at: ctx.clock.now()
            });
            if (parsed.success) return parsed.data;
            lastError = parsed.error.message;
            messages.push({
                role: "assistant",
                content: res.raw || JSON.stringify(res.json)
            });
            messages.push({
                role: "user",
                content: `Your JSON did not match the required schema. Errors:\n${lastError.slice(0, 3000)}\nReturn corrected JSON only.`
            });
        } catch (e) {
            lastError = e.message;
            await ctx.db.insert(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["llmCall"]).values({
                id: ctx.ids.next("llm"),
                firmId: ctx.firmId,
                agent: opts.agent,
                model: ctx.config.LLM_MODEL,
                input: null,
                output: raw,
                error: lastError.slice(0, 2000),
                latencyMs: Date.now() - started,
                taskId: opts.taskId ?? null,
                messageId: opts.messageId ?? null,
                at: ctx.clock.now()
            });
            if (attempt === 1) break;
        }
    }
    throw new AgentError(`Agent ${opts.agent} failed: ${lastError.slice(0, 500)}`, opts.agent);
}
}),
"[project]/src/agent/context.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "clientSnapshot",
    ()=>clientSnapshot,
    "langName",
    ()=>langName,
    "playbookCatalogue",
    ()=>playbookCatalogue,
    "playbookFor",
    ()=>playbookFor
]);
// What the agents see about a client. Protected information (full ID numbers,
// residential addresses) is never included; the agent sees that it is on file.
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/drizzle-orm/sql/expressions/conditions.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$select$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/drizzle-orm/sql/expressions/select.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/db/schema.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$records$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/domain/records.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$shares$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/domain/shares.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$engine$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/domain/engine.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$playbooks$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/domain/playbooks.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$labels$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/domain/labels.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$deadlines$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/domain/deadlines.ts [app-route] (ecmascript)");
;
;
;
;
;
;
;
;
;
async function clientSnapshot(ctx, clientId) {
    const c = await ctx.db.query.client.findFirst({
        where: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["client"].id, clientId)
    });
    if (!c) return null;
    const today = ctx.clock.today();
    const officers = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$records$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["officersAsAt"])(ctx, clientId, today);
    const members = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$shares$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["membersAsAt"])(ctx, clientId, today).catch(()=>[]);
    const capital = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$shares$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["issuedAsAt"])(ctx, clientId, today).catch(()=>[]);
    const scs = await ctx.db.select().from(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["significantController"]).where((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["and"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["significantController"].clientId, clientId)));
    const contacts = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$records$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["contactsFor"])(ctx, clientId);
    const tasks = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$engine$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["openTasksForClient"])(ctx, clientId);
    const docs = await ctx.db.select({
        title: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["document"].title,
        kind: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["document"].kind,
        createdAt: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["document"].createdAt
    }).from(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["document"]).where((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["document"].clientId, clientId)).orderBy((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$select$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["desc"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["document"].createdAt)).limit(20);
    const invoices = await ctx.db.select().from(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["invoice"]).where((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["invoice"].clientId, clientId)).orderBy((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$select$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["desc"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["invoice"].createdAt)).limit(6);
    const convs = await ctx.db.select({
        id: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["conversation"].id
    }).from(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["conversation"]).where((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["conversation"].clientId, clientId));
    const msgs = convs.length ? await ctx.db.select().from(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["message"]).where((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["and"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["inArray"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["message"].conversationId, convs.map((x)=>x.id)), (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["inArray"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["message"].status, [
        "received",
        "sent"
    ]))).orderBy((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$select$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["desc"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["message"].at)).limit(8) : [];
    const personIds = [
        ...new Set([
            ...officers.map((o)=>o.personId),
            ...members.map((m)=>m.personId)
        ])
    ];
    const cdd = {};
    for (const pid of personIds)cdd[pid] = (await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$engine$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["hasCurrentCdd"])(ctx, pid))?.reviewDueOn ?? null;
    const openTasks = [];
    for (const t0 of tasks){
        const t = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$engine$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getTask"])(ctx, t0.id);
        openTasks.push({
            taskId: t.id,
            playbookId: t.playbookId,
            title: t.title,
            personId: t.personId,
            currentStep: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$engine$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["currentStep"])(t)?.label ?? null,
            effectiveDate: t.effectiveDate,
            dueDate: t.dueDate,
            checklist: t.checklist.map((e)=>({
                    key: e.key,
                    label: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$labels$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["itemLabel"])(e.key, "en", t.params),
                    personId: e.personId ?? null,
                    status: e.status,
                    value: e.value && __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$labels$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["PROTECTED_KEYS"].has(e.key) ? "(provided)" : e.value ?? null
                }))
        });
    }
    let deadlines = [];
    try {
        deadlines = (await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$deadlines$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["upcomingDeadlines"])(ctx, {
            clientId,
            withinDays: 120
        })).map((d)=>({
                what: d.label,
                due: d.dueDate
            }));
    } catch  {}
    return {
        clientId: c.id,
        lifecycle: c.lifecycle,
        jurisdiction: c.jurisdiction,
        names: {
            en: c.nameEn,
            tc: c.nameTc,
            sc: c.nameSc
        },
        companyNumber: c.companyNumber,
        companyType: c.companyType,
        operatingStatus: c.operatingStatus,
        incorporatedOn: c.incorporatedOn,
        financialYearEnd: c.fyeMonth ? `${c.fyeDay}/${c.fyeMonth}` : null,
        registeredOffice: c.regOfficeEn,
        messageLanguage: c.messageLang,
        paymentTerms: c.paymentTermsDays ? `${c.paymentTermsDays} days credit` : "upfront",
        officers: officers.map((o)=>({
                personId: o.personId,
                name: o.person.nameEn,
                nameZh: o.person.nameZh,
                role: o.role,
                since: o.fromDate,
                email: o.person.email,
                kycOnFileUntil: cdd[o.personId] ?? null
            })),
        members: members.map((m)=>({
                personId: m.personId,
                name: m.name,
                class: m.className,
                shares: m.quantity,
                percent: m.percent
            })),
        shareCapital: capital.map((x)=>({
                class: x.name,
                issued: x.issued,
                paidUp: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$labels$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["money"])(x.paidUpCents, x.currency)
            })),
        significantControllers: scs.filter((s)=>!s.ceasedOn).map((s)=>({
                personId: s.personId,
                nature: s.nature
            })),
        contacts: contacts.map((x)=>({
                name: x.name,
                role: x.role,
                email: x.email,
                language: x.language,
                billing: x.isBilling
            })),
        openTasks,
        documentsOnFile: docs.map((d)=>d.title),
        recentInvoices: invoices.map((i)=>({
                number: i.number,
                status: i.status,
                total: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$labels$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["money"])(i.totalCents, i.currency)
            })),
        upcomingDeadlines: deadlines,
        recentMessages: msgs.reverse().map((m)=>({
                direction: m.direction,
                at: m.at.toISOString().slice(0, 10),
                text: (m.text ?? "").slice(0, 600)
            }))
    };
}
async function playbookCatalogue(ctx, jurisdictions) {
    const lib = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$playbooks$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["requirementLibrary"])();
    const pbs = (await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$playbooks$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["listPlaybooks"])(ctx)).filter((p)=>jurisdictions.includes(p.jurisdiction));
    return pbs.map((p)=>({
            playbookId: p.id,
            jurisdiction: p.jurisdiction,
            name: p.name.en,
            whenToUse: p.whenToUse,
            person: p.personSelection ?? "none",
            fields: p.requirements.map((r)=>({
                    key: r.key,
                    label: lib[r.key]?.label.en ?? r.key,
                    hint: lib[r.key]?.extractionHint ?? null,
                    aboutPerson: r.scope === "person"
                }))
        }));
}
async function playbookFor(ctx, id) {
    try {
        return await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$playbooks$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getPlaybook"])(ctx, id);
    } catch  {
        return null;
    }
}
function langName(l) {
    return l === "tc" ? "Traditional Chinese (Hong Kong written style)" : l === "sc" ? "Simplified Chinese" : "English";
}
}),
"[project]/src/agent/draft.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

// Drafting agent with deterministic checks: the email must carry the invoice number and
// upload link exactly. One regeneration, then a template fallback so staff always get a draft.
__turbopack_context__.s([
    "draftEmail",
    ()=>draftEmail,
    "draftProblems",
    ()=>draftProblems,
    "templateEmail",
    ()=>templateEmail
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$agent$2f$call$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/agent/call.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$agent$2f$schemas$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/agent/schemas.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$agent$2f$prompts$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/agent/prompts.ts [app-route] (ecmascript)");
;
;
;
function draftProblems(f, body) {
    const p = [];
    if (f.invoice && !body.includes(f.invoice.number)) p.push(`The body must include the invoice number ${f.invoice.number} exactly.`);
    if (f.invoice && !body.includes(f.invoice.totalFormatted.replace(/^HK\$/, "").split(".")[0])) p.push(`The body must state the invoice total ${f.invoice.totalFormatted}.`);
    if (f.uploadUrl && !body.includes(f.uploadUrl)) p.push(`The body must include the upload link ${f.uploadUrl} exactly.`);
    if (!body.trim()) p.push("The body is empty.");
    return p;
}
async function draftEmail(ctx, facts, opts = {}) {
    let extra = "";
    for(let attempt = 0; attempt < 2; attempt++){
        try {
            const d = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$agent$2f$call$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["callAgent"])(ctx, {
                agent: "draft",
                system: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$agent$2f$prompts$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["DRAFT_SYSTEM"],
                messageId: opts.messageId,
                taskId: opts.taskId,
                user: `${opts.purpose ? `Purpose: ${opts.purpose}\n\n` : ""}FACTS:\n\`\`\`json\n${JSON.stringify(facts, null, 1)}\n\`\`\`${extra}`,
                schema: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$agent$2f$schemas$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["DraftZ"]
            });
            const problems = draftProblems(facts, d.body);
            if (problems.length === 0) return {
                ...d,
                source: "agent"
            };
            extra = `\n\nYour previous draft had problems:\n- ${problems.join("\n- ")}\nFix them.`;
        } catch (e) {
            if (!(e instanceof __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$agent$2f$call$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["AgentError"])) throw e;
            break;
        }
    }
    return {
        ...templateEmail(facts),
        source: "template"
    };
}
const T = {
    en: {
        hi: (n)=>`Dear ${n},`,
        thanks: "Thank you for your message.",
        newReq: (t)=>`${t}:`,
        need: "To get this done, please send us:",
        onFile: "We already hold on file (no need to send again):",
        got: "Already received with your message:",
        due: (d)=>`Statutory deadline: ${d}.`,
        upd: (t)=>`${t}: thank you, we have received`,
        still: "Still outstanding:",
        allIn: "We now have everything we need for this and will proceed.",
        chg: (t, c)=>`${t}: noted, ${c}.`,
        cancel: (t)=>`${t}: we will cancel this as requested.`,
        q: "On your question:",
        ask: "Could you also help us with the following?",
        inv: (n, a)=>`Our invoice ${n} for ${a} is attached.`,
        terms: (t)=>`Payment terms: ${t}.`,
        pay: "Payment details (please quote the invoice number as the reference):",
        link: "You can upload documents securely here:",
        subject: (c)=>`${c}: your request`
    },
    tc: {
        hi: (n)=>`${n}您好：`,
        thanks: "多謝您的訊息。",
        newReq: (t)=>`${t}：`,
        need: "為辦理此事，請提供：",
        onFile: "我們已存檔以下資料（毋須再次提供）：",
        got: "已從您的訊息中收到：",
        due: (d)=>`法定期限：${d}。`,
        upd: (t)=>`${t}：多謝，我們已收到`,
        still: "尚欠：",
        allIn: "我們已收齊所需資料，會隨即跟進。",
        chg: (t, c)=>`${t}：已知悉，${c}。`,
        cancel: (t)=>`${t}：我們會按您的指示取消。`,
        q: "關於您的查詢：",
        ask: "另請協助提供以下資料：",
        inv: (n, a)=>`隨函附上發票 ${n}，金額 ${a}。`,
        terms: (t)=>`付款條款：${t}。`,
        pay: "付款資料（請以發票號碼作為付款參考）：",
        link: "您可透過以下安全連結上載文件：",
        subject: (c)=>`${c}：您的要求`
    },
    sc: {
        hi: (n)=>`${n}您好：`,
        thanks: "感谢您的信息。",
        newReq: (t)=>`${t}：`,
        need: "为办理此事，请提供：",
        onFile: "我们已存档以下资料（无须再次提供）：",
        got: "已从您的信息中收到：",
        due: (d)=>`法定期限：${d}。`,
        upd: (t)=>`${t}：谢谢，我们已收到`,
        still: "尚欠：",
        allIn: "我们已收齐所需资料，会随即跟进。",
        chg: (t, c)=>`${t}：已知悉，${c}。`,
        cancel: (t)=>`${t}：我们会按您的指示取消。`,
        q: "关于您的查询：",
        ask: "另请协助提供以下资料：",
        inv: (n, a)=>`随函附上发票 ${n}，金额 ${a}。`,
        terms: (t)=>`付款条款：${t}。`,
        pay: "付款资料（请以发票号码作为付款参考）：",
        link: "您可通过以下安全链接上传文件：",
        subject: (c)=>`${c}：您的要求`
    }
};
function templateEmail(f) {
    const t = T[f.language] ?? T.en;
    const out = [
        t.hi(f.recipientName),
        t.thanks
    ];
    const list = (xs)=>xs.map((x)=>`- ${x}`).join("\n");
    for (const r of f.newRequests){
        const block = [
            t.newReq(r.title)
        ];
        if (r.needed.length) block.push(`${t.need}\n${list(r.needed)}`);
        if (r.alreadyReceived.length) block.push(`${t.got}\n${list(r.alreadyReceived)}`);
        if (r.onFile.length) block.push(`${t.onFile}\n${list(r.onFile)}`);
        if (r.deadline) block.push(t.due(r.deadline));
        out.push(block.join("\n"));
    }
    for (const u of f.updates)out.push(`${t.upd(u.title)}${u.received.length ? `:\n${list(u.received)}` : "."}${u.stillNeeded.length ? `\n${t.still}\n${list(u.stillNeeded)}` : `\n${t.allIn}`}`);
    for (const c of f.changes)out.push(t.chg(c.title, c.change) + (c.nowNeeded.length ? `\n${t.need}\n${list(c.nowNeeded)}` : ""));
    for (const c of f.cancellations)out.push(t.cancel(c.title));
    for (const q of f.questions)out.push(`${t.q} ${q.question}\n${q.facts}`);
    if (f.clarifications.length) out.push(`${t.ask}\n${list(f.clarifications)}`);
    if (f.invoice) {
        out.push([
            t.inv(f.invoice.number, f.invoice.totalFormatted),
            t.terms(f.invoice.terms),
            f.invoice.paymentInstructions ? `${t.pay}\n${f.invoice.paymentInstructions}` : ""
        ].filter(Boolean).join("\n"));
    }
    if (f.uploadUrl) out.push(`${t.link}\n${f.uploadUrl}`);
    out.push(f.signOff);
    return {
        subject: t.subject(f.clientName),
        body: out.join("\n\n")
    };
}
}),
"[project]/src/agent/intake.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "runIntake",
    ()=>runIntake
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$agent$2f$call$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/agent/call.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$agent$2f$schemas$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/agent/schemas.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$agent$2f$prompts$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/agent/prompts.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$agent$2f$context$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/agent/context.ts [app-route] (ecmascript)");
;
;
;
;
async function runIntake(ctx, input) {
    const snapshots = (await Promise.all(input.candidateClientIds.map((id)=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$agent$2f$context$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["clientSnapshot"])(ctx, id)))).filter((s)=>!!s);
    const jurisdictions = [
        ...new Set([
            "HK",
            ...snapshots.map((s)=>s.jurisdiction)
        ])
    ];
    const catalogue = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$agent$2f$context$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["playbookCatalogue"])(ctx, jurisdictions);
    const user = [
        `Today's date in Hong Kong: ${ctx.clock.today()}.`,
        `Sender: ${input.from.name ?? ""} <${input.from.email ?? "unknown"}>`,
        snapshots.length ? `The sender is linked to ${snapshots.length} client(s). Client snapshots:\n${JSON.stringify(snapshots, null, 1)}` : "The sender is not linked to any existing client.",
        `Playbook catalogue:\n${JSON.stringify(catalogue)}`,
        input.threadHistory?.length ? `Earlier messages in this thread (oldest first):\n${input.threadHistory.map((m)=>`[${m.direction}] ${m.text.slice(0, 800)}`).join("\n---\n")}` : "",
        `NEW MESSAGE\nSubject: ${input.subject ?? ""}\n\n${input.text}`,
        input.attachments.length ? `Attachments:\n${input.attachments.map((a)=>`- ${a.filename} (${a.mime ?? "unknown"})${a.textPreview ? `: ${a.textPreview.slice(0, 500)}` : ""}`).join("\n")}` : "No attachments."
    ].filter(Boolean).join("\n\n");
    const intake = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$agent$2f$call$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["callAgent"])(ctx, {
        agent: "intake",
        system: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$agent$2f$prompts$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["INTAKE_SYSTEM"],
        user,
        schema: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$agent$2f$schemas$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["IntakeZ"],
        messageId: input.messageId
    });
    return {
        intake,
        snapshots
    };
}
}),
"[project]/src/agent/planner.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "planCustomTask",
    ()=>planCustomTask
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$agent$2f$call$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/agent/call.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$agent$2f$schemas$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/agent/schemas.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$agent$2f$prompts$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/agent/prompts.ts [app-route] (ecmascript)");
;
;
;
async function planCustomTask(ctx, opts) {
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$agent$2f$call$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["callAgent"])(ctx, {
        agent: "plan",
        system: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$agent$2f$prompts$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["PLAN_SYSTEM"],
        messageId: opts.messageId,
        user: `Client: ${opts.clientName}\nRequest: ${opts.description}`,
        schema: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$agent$2f$schemas$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["PlanZ"]
    });
}
}),
"[project]/src/agent/prompts.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

// System prompts for the product agents.
__turbopack_context__.s([
    "DRAFT_SYSTEM",
    ()=>DRAFT_SYSTEM,
    "EXTRACT_SYSTEM",
    ()=>EXTRACT_SYSTEM,
    "INTAKE_SYSTEM",
    ()=>INTAKE_SYSTEM,
    "MAIL_SYSTEM",
    ()=>MAIL_SYSTEM,
    "PLAN_SYSTEM",
    ()=>PLAN_SYSTEM,
    "REVIEW_SYSTEM",
    ()=>REVIEW_SYSTEM,
    "SCREEN_SYSTEM",
    ()=>SCREEN_SYSTEM
]);
const INTAKE_SYSTEM = `You are the intake agent in Harbourline Desk, the work system of a Hong Kong company secretarial firm (a licensed trust or company service provider). Staff approve everything you suggest before it reaches a client, a register or a regulator.

Read the new inbound message and decide what the sender wants, in the context of the client's records and OPEN TASKS. Clients are not neat: they change their minds, send details for one task inside a message about another, cancel, correct themselves, ask questions, or write in Cantonese, Mandarin, English or a mix. Route every part of the message.

Action types:
- start_request: a new piece of work that matches a playbook in the catalogue. Choose playbookId only from the catalogue. For playbooks about a person, fill "person" (existing person by personId from the snapshot, or a new person by name). Put every requirement the message already answers into "fields", using ONLY the field keys listed for that playbook, with normalised values (dates as YYYY-MM-DD resolved against today's date; full addresses). One action per distinct piece of work (e.g. "replace director A with B" is a resignation of A AND an appointment of B).
- provide_information: the message gives details or documents for an OPEN task. Use that task's taskId and its checklist keys. Map attachments to checklist keys by what the file obviously is (e.g. an ID card photo -> idCopy for that person).
- change_request: the client changes something about an open task (different person, different date, different address, extra scope). Describe the change precisely in "description"; set "person" if the person changes.
- cancel_request: the client no longer wants an open task done.
- ask_question: the client asks a question (status, deadline, fee, what is needed). Put the question in "description".
- unsupported_request: work no playbook covers. Describe it.
- general_correspondence: thanks, pleasantries, or anything needing no action.

Client identification: "existing" when the sender is linked to a client in the snapshots and writes about that company (set clientId). "new_prospect" when the sender or the company they write about is not a client yet, including someone asking us to incorporate a new company (give companyName if stated). "unclear" if you can't tell.

Language: reply language is the language the sender wrote in: "tc" for Traditional Chinese or Cantonese, "sc" for Simplified Chinese, "en" for English. For mixed messages, the language of most of the sentences.

Confidence: 0.9+ when the message states it plainly; 0.7-0.9 when implied; below 0.7 when you are guessing (these go to a human to triage). Never invent facts: if the message doesn't give a value, leave it out. Evidence: quote the words you relied on.`;
const REVIEW_SYSTEM = `You are the requirement-review agent in Harbourline Desk (Hong Kong company secretarial firm). A task is running from a playbook. Something new has arrived: information, documents, or a change from the client. Re-check the task's requirements against the latest facts and the playbook's rules.

Return the checklist items that CHANGE status or value (you may omit unchanged items):
- mark items "received" with the value when the new information satisfies them;
- mark items "not_needed" when the facts show they no longer apply (with the reason), e.g. premises proof is not needed when the new registered office is our own address;
- mark items "needed" when something previously satisfied no longer is, or a new requirement now applies because of the change.
Only use keys from the playbook requirement list or the task's current checklist.

If the task is now about a different person (e.g. the client wants a different appointee), set switchPerson. If the effective date changed, set effectiveDate (YYYY-MM-DD). If the work is now a different kind of job, set playbookFit to "swap" (or "add" if an extra job is needed as well) with suggestedPlaybookId from the catalogue. Set invoiceChange.needed if the fee should change.

If new information contradicts what is already on file (e.g. a different ID number, a different name spelling for the same person, a date that conflicts with an earlier message), list it under conflicts with a short polite question to ask the client. Do not overwrite on-file facts yourself.

List questionsForClient only for things we genuinely need to ask. Be precise and conservative: staff review your output.`;
const DRAFT_SYSTEM = `You write client emails for a Hong Kong company secretarial firm. You get FACTS as JSON. Write one email in the language given ("en" English, "tc" Traditional Chinese in natural Hong Kong written style, "sc" Simplified Chinese).

Rules:
- Warm, brief and professional; plain text; short paragraphs and simple bulleted lists with "- ".
- Greet the recipient by the salutation given. Sign off with the signOff text exactly.
- Cover every item in FACTS: new requests (what we will do, what we need from them, what we already hold on file so they need not send it again), updates on information received and what is still outstanding, acknowledged changes, cancellations, and answers to questions (answer only from the facts; if the facts don't answer it, say we will check and revert).
- If an invoice is in the facts, state its number and total exactly as given, say it is attached, and give the payment terms and payment instructions exactly as given (bank details verbatim, and ask them to quote the invoice number as the payment reference).
- If an upload link is given, include it exactly, on its own line.
- If a statutory deadline is given, mention it plainly.
- Never promise anything not in the facts. Never include internal notes, confidence scores or ids.
Return JSON with subject and body.`;
const PLAN_SYSTEM = `You plan a one-off task for a Hong Kong company secretarial firm when no playbook covers a client's request. Propose: a short title; the information and documents to collect from the client (checklist items with short camelCase keys and labels in English, Traditional Chinese and Simplified Chinese; kind "data" or "file"); the internal steps; a reasonable fee in HKD for a small Hong Kong firm; and caveats (e.g. third parties decide, licensing limits). Staff will review and edit.`;
const EXTRACT_SYSTEM = `You extract details from documents and messages for a Hong Kong company secretarial firm. For each requested checklist key, return the value found (normalised; dates YYYY-MM-DD) and quote where it came from. Identify what each attached document is and which checklist key it satisfies. Report conflicts with the on-file values given. Never guess: omit anything not clearly present.`;
const SCREEN_SYSTEM = `You adjudicate sanctions and PEP screening hits for a Hong Kong trust or company service provider. For each candidate hit, compare it with the screened person's details (name including Chinese name, date of birth, nationality). Classify each: likely_match (strong identifiers agree), possible (name agrees, identifiers missing), false_positive (identifiers disagree, or only a partial/common name overlap). Overall: match if any likely_match, potential if any possible, else clear. Explain briefly. A human compliance officer makes the final decision.`;
const MAIL_SYSTEM = `You log letters received at a Hong Kong company secretarial firm's registered-office address. From the scanned text, identify the addressee company (match it to a client id from the list if possible), the sender, a one-sentence English summary, whether it is urgent (government demand notes, court documents, deadlines within 14 days), and what action the client may need to take.`;
}),
"[project]/src/agent/review.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "applyReview",
    ()=>applyReview,
    "runReview",
    ()=>runReview
]);
// Requirement review: whenever a task's facts change, the agent re-checks what still
// applies. Its output is applied with deterministic guardrails: person-scoped KYC is
// rebuilt by the engine, on-file facts are never overwritten, and anything
// client-facing or invoice-affecting becomes a proposal.
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/drizzle-orm/sql/expressions/conditions.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/db/schema.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$agent$2f$call$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/agent/call.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$agent$2f$schemas$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/agent/schemas.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$agent$2f$prompts$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/agent/prompts.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$agent$2f$context$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/agent/context.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$engine$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/domain/engine.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$playbooks$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/domain/playbooks.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$labels$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/domain/labels.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$proposals$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/domain/proposals.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$people$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/domain/people.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$dates$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/domain/dates.ts [app-route] (ecmascript)");
;
;
;
;
;
;
;
;
;
;
;
;
async function runReview(ctx, taskId, change) {
    const t = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$engine$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getTask"])(ctx, taskId);
    const pb = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$playbooks$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getPlaybook"])(ctx, t.playbookId, t.playbookVersion);
    const catalogue = (await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$agent$2f$context$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["playbookCatalogue"])(ctx, [
        pb.jurisdiction
    ])).map((p)=>({
            playbookId: p.playbookId,
            name: p.name,
            whenToUse: p.whenToUse
        }));
    const person = t.personId ? await ctx.db.query.person.findFirst({
        where: (p, { eq })=>eq(p.id, t.personId)
    }) : null;
    const user = [
        `Today's date: ${ctx.clock.today()}`,
        `Playbook: ${JSON.stringify({
            id: pb.id,
            name: pb.name.en,
            requirements: pb.requirements.map((r)=>({
                    key: r.key,
                    label: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$labels$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["itemLabel"])(r.key, "en"),
                    aboutPerson: r.scope === "person",
                    optional: !!r.optional,
                    note: r.appliesWhenNote ?? null
                })),
            complianceNotes: pb.complianceNotes
        })}`,
        `Task: ${JSON.stringify({
            taskId: t.id,
            title: t.title,
            person: person ? {
                personId: person.id,
                name: person.nameEn,
                nameZh: person.nameZh
            } : null,
            effectiveDate: t.effectiveDate,
            checklist: t.checklist.map((e)=>({
                    key: e.key,
                    personId: e.personId ?? null,
                    status: e.status,
                    value: e.value && __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$labels$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["PROTECTED_KEYS"].has(e.key) ? "(on file)" : e.value ?? null
                })),
            plan: t.params.plan ?? null
        })}`,
        `On-file facts for the task's person: ${person ? JSON.stringify({
            name: person.nameEn,
            nameZh: person.nameZh,
            correspondenceAddress: person.correspondenceAddress,
            email: person.email,
            idNumberOnFile: !!person.idNumberEnc
        }) : "none"}`,
        `Other playbooks: ${JSON.stringify(catalogue)}`,
        `WHAT ARRIVED (${change.kind}): ${change.description}`,
        change.newFields?.length ? `New field values: ${JSON.stringify(change.newFields.map((f)=>({
                key: f.key,
                value: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$labels$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["PROTECTED_KEYS"].has(f.key) ? f.value : f.value
            })))}` : ""
    ].filter(Boolean).join("\n\n");
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$agent$2f$call$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["callAgent"])(ctx, {
        agent: "review",
        system: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$agent$2f$prompts$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["REVIEW_SYSTEM"],
        user,
        schema: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$agent$2f$schemas$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["ReviewZ"],
        taskId,
        messageId: change.messageId
    });
}
async function applyReview(ctx, taskId, r, opts) {
    let t = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$engine$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getTask"])(ctx, taskId);
    const pb = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$playbooks$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getPlaybook"])(ctx, t.playbookId, t.playbookVersion);
    const out = {
        questions: [
            ...r.questionsForClient
        ],
        proposals: [],
        personChanged: false
    };
    const personRefKeys = new Set(pb.requirements.filter((x)=>x.scope === "person").map((x)=>x.key));
    // 1. Switch person: the engine rebuilds every person-scoped item for the new person.
    const sp = r.switchPerson ?? (opts.newPersonHint?.nameEn ? {
        nameEn: opts.newPersonHint.nameEn,
        nameZh: opts.newPersonHint.nameZh,
        personId: opts.newPersonHint.personId
    } : null);
    if (sp && sp.nameEn) {
        const newPerson = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$people$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["resolvePerson"])(ctx, opts.clientId, {
            personId: sp.personId,
            nameEn: sp.nameEn,
            nameZh: sp.nameZh,
            email: opts.newPersonHint?.email ?? null
        });
        if (newPerson.id !== t.personId) {
            const personChecklist = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$engine$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["buildChecklist"])(ctx, {
                ...pb,
                requirements: pb.requirements.filter((x)=>x.scope === "person")
            }, {
                clientId: opts.clientId,
                personId: newPerson.id
            });
            const kept = t.checklist.filter((e)=>!personRefKeys.has(e.key));
            await ctx.db.update(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["task"]).set({
                personId: newPerson.id,
                title: `${pb.name.en}: ${newPerson.nameEn}`
            }).where((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["task"].id, taskId));
            await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$engine$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["setChecklist"])(ctx, taskId, [
                ...kept,
                ...personChecklist
            ], `Now for ${newPerson.nameEn}`, opts.actor ?? "agent");
            await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$engine$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["logEvent"])(ctx, taskId, "task.person_changed", `Person changed to ${newPerson.nameEn}`, {
                from: t.personId,
                to: newPerson.id
            }, opts.actor ?? "agent");
            out.personChanged = true;
            t = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$engine$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getTask"])(ctx, taskId);
        }
    }
    // 2. Item changes (non-person items; person items only for the current person and never "on_file").
    const allowed = new Set([
        ...pb.requirements.map((x)=>x.key),
        ...t.checklist.map((e)=>e.key)
    ]);
    const next = t.checklist.map((e)=>({
            ...e
        }));
    let changed = false;
    for (const it of r.items){
        if (!allowed.has(it.key)) continue;
        const isPerson = personRefKeys.has(it.key);
        const idx = next.findIndex((e)=>e.key === it.key && (!isPerson || (e.personId ?? null) === (t.personId ?? null)));
        if (idx < 0) {
            if (it.status === "needed" && !isPerson) {
                next.push({
                    key: it.key,
                    personId: null,
                    status: "needed",
                    reason: it.reason
                });
                changed = true;
            }
            continue;
        }
        const cur = next[idx];
        if (it.status === "on_file" && cur.status !== "on_file") continue; // only the engine decides what is on file
        if (it.status === "received" && !it.value && !cur.documentId && !cur.value) continue;
        if (cur.status === "on_file" && isPerson && it.status === "received") continue; // conflicts go through proposals
        if (cur.status !== it.status || it.value && it.value !== cur.value) {
            next[idx] = {
                ...cur,
                status: it.status,
                value: it.value ?? cur.value ?? null,
                reason: it.reason ?? cur.reason ?? null
            };
            changed = true;
        }
    }
    if (changed) await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$engine$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["setChecklist"])(ctx, taskId, next, r.summary, opts.actor ?? "agent");
    // 3. Effective date.
    if (r.effectiveDate && (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$dates$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["isIsoDate"])(r.effectiveDate) && r.effectiveDate !== t.effectiveDate) {
        await ctx.db.update(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["task"]).set({
            effectiveDate: r.effectiveDate,
            dueDate: await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$engine$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["computeDueDate"])(ctx, pb, opts.clientId, r.effectiveDate)
        }).where((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["task"].id, taskId));
        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$engine$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["logEvent"])(ctx, taskId, "task.effective_date", `Effective date now ${r.effectiveDate}`, {}, opts.actor ?? "agent");
    }
    // 4. Conflicts, playbook fit and invoice changes need a human.
    const existingConflicts = new Set((await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$proposals$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["pendingProposals"])(ctx, {
        taskId,
        kind: "conflict"
    })).map((p)=>p.payload.key));
    for (const c of r.conflicts.filter((x)=>!existingConflicts.has(x.key))){
        const p = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$proposals$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["createProposal"])(ctx, {
            kind: "conflict",
            title: `Conflicting ${(0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$labels$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["itemLabel"])(c.key)}`,
            summary: `On file: ${c.onFile}. Client now says: ${c.incoming}.`,
            clientId: opts.clientId,
            taskId,
            payload: {
                taskId,
                key: c.key,
                onFile: c.onFile,
                incoming: c.incoming,
                question: c.question,
                personId: t.personId
            }
        });
        out.proposals.push(p.id);
        out.questions.push(c.question);
    }
    if (r.playbookFit !== "ok" && r.suggestedPlaybookId) {
        const p = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$proposals$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["createProposal"])(ctx, {
            kind: "change_request",
            title: r.playbookFit === "swap" ? `Switch to ${r.suggestedPlaybookId}` : `Add ${r.suggestedPlaybookId}`,
            summary: r.summary,
            clientId: opts.clientId,
            taskId,
            requestId: t.requestId,
            payload: {
                taskId,
                mode: r.playbookFit,
                playbookId: r.suggestedPlaybookId
            }
        });
        out.proposals.push(p.id);
    }
    if (r.invoiceChange.needed && t.requestId) {
        const req = await ctx.db.query.request.findFirst({
            where: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["request"].id, t.requestId)
        });
        const inv = req?.invoiceId ? await ctx.db.query.invoice.findFirst({
            where: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["invoice"].id, req.invoiceId)
        }) : null;
        if (inv && inv.status !== "draft") {
            const p = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$proposals$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["createProposal"])(ctx, {
                kind: "revise_invoice",
                title: `Revise invoice ${inv.number}`,
                summary: r.invoiceChange.reason,
                clientId: opts.clientId,
                taskId,
                requestId: t.requestId,
                payload: {
                    invoiceId: inv.id,
                    reason: r.invoiceChange.reason
                }
            });
            out.proposals.push(p.id);
        }
    }
    return out;
}
}),
"[project]/src/agent/schemas.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "ActionZ",
    ()=>ActionZ,
    "AdjudicationZ",
    ()=>AdjudicationZ,
    "DraftZ",
    ()=>DraftZ,
    "ExtractionZ",
    ()=>ExtractionZ,
    "FieldZ",
    ()=>FieldZ,
    "IntakeZ",
    ()=>IntakeZ,
    "LangZ",
    ()=>LangZ,
    "MailItemZ",
    ()=>MailItemZ,
    "PersonRefZ",
    ()=>PersonRefZ,
    "PlanZ",
    ()=>PlanZ,
    "ReviewZ",
    ()=>ReviewZ
]);
// Structured outputs for each agent. All fields required-but-nullable so strict JSON
// schema mode works across providers.
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__ = __turbopack_context__.i("[project]/node_modules/zod/v4/classic/external.js [app-route] (ecmascript) <export * as z>");
;
const LangZ = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].enum([
    "en",
    "tc",
    "sc"
]);
const FieldZ = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
    key: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().describe("Requirement item key from the playbook's list"),
    value: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().describe("The value, normalised: ISO dates as YYYY-MM-DD, addresses in full"),
    quote: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().nullable().describe("Exact words from the message this came from")
});
const PersonRefZ = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
    mode: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].enum([
        "existing",
        "new",
        "none"
    ]),
    personId: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().nullable().describe("For existing: id from the client snapshot"),
    nameEn: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().nullable(),
    nameZh: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().nullable(),
    email: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().nullable()
});
const ActionZ = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
    type: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].enum([
        "start_request",
        "provide_information",
        "change_request",
        "cancel_request",
        "ask_question",
        "unsupported_request",
        "general_correspondence"
    ]),
    taskId: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().nullable().describe("For provide_information / change_request / cancel_request: the open task id"),
    playbookId: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().nullable().describe("For start_request: playbook id from the catalogue"),
    person: PersonRefZ.nullable(),
    fields: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].array(FieldZ),
    attachments: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].array(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
        filename: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
        key: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().nullable(),
        personId: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().nullable()
    })),
    effectiveDate: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().nullable(),
    description: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().nullable().describe("What the client asked, changed, or asked about, in English"),
    confidence: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number().min(0).max(1),
    evidence: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().nullable().describe("Quote supporting this action")
});
const IntakeZ = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
    language: LangZ.describe("Language to reply in: en, tc (Traditional Chinese, incl. Cantonese), sc (Simplified Chinese)"),
    client: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
        kind: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].enum([
            "existing",
            "new_prospect",
            "unclear"
        ]),
        clientId: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().nullable(),
        companyName: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().nullable().describe("Company the sender writes about, if named"),
        companyNumber: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().nullable(),
        senderName: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().nullable(),
        reason: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string()
    }),
    summary: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().describe("One sentence in English: what the sender wants"),
    actions: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].array(ActionZ)
});
const ReviewZ = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
    items: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].array(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
        key: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
        personId: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().nullable(),
        status: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].enum([
            "needed",
            "received",
            "not_needed",
            "on_file"
        ]),
        value: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().nullable(),
        reason: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().nullable()
    })).describe("Full list of requirement items that should be on the checklist after this change"),
    switchPerson: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
        nameEn: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
        nameZh: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().nullable(),
        personId: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().nullable()
    }).nullable().describe("Set when the task is now about a different person (e.g. a different appointee)"),
    effectiveDate: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().nullable(),
    playbookFit: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].enum([
        "ok",
        "swap",
        "add"
    ]),
    suggestedPlaybookId: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().nullable(),
    invoiceChange: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
        needed: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].boolean(),
        reason: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().nullable()
    }),
    conflicts: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].array(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
        key: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
        onFile: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
        incoming: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
        question: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string()
    })),
    questionsForClient: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].array(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string()),
    summary: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string()
});
const DraftZ = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
    subject: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
    body: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().describe("Plain-text email body in the requested language, with greeting and sign-off")
});
const PlanZ = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
    title: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
    items: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].array(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
        key: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
        labelEn: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
        labelTc: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
        labelSc: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
        kind: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].enum([
            "data",
            "file"
        ])
    })),
    steps: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].array(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string()),
    feeHkd: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number(),
    caveats: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].array(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string())
});
const ExtractionZ = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
    fields: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].array(FieldZ),
    documents: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].array(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
        filename: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
        key: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().nullable(),
        personName: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().nullable(),
        description: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string()
    })),
    conflicts: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].array(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
        key: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
        onFile: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
        incoming: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string()
    }))
});
const AdjudicationZ = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
    hits: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].array(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
        id: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
        verdict: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].enum([
            "likely_match",
            "possible",
            "false_positive"
        ]),
        reason: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string()
    })),
    overall: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].enum([
        "clear",
        "potential",
        "match"
    ])
});
const MailItemZ = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
    clientId: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().nullable(),
    addressee: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
    sender: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
    summaryEn: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
    urgency: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].enum([
        "normal",
        "urgent"
    ]),
    actionNeeded: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().nullable()
});
}),
"[project]/src/app/api/live/route.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

return __turbopack_context__.a(async (__turbopack_handle_async_dependencies__, __turbopack_async_result__) => { try {
__turbopack_context__.s([
    "GET",
    ()=>GET,
    "dynamic",
    ()=>dynamic
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$server$2f$ctx$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/server/ctx.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$server$2f$queries$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/server/queries.ts [app-route] (ecmascript)");
var __turbopack_async_dependencies__ = __turbopack_handle_async_dependencies__([
    __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$server$2f$ctx$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__
]);
[__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$server$2f$ctx$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__] = __turbopack_async_dependencies__.then ? (await __turbopack_async_dependencies__)() : __turbopack_async_dependencies__;
;
;
const dynamic = "force-dynamic";
async function GET() {
    return Response.json({
        v: await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$server$2f$queries$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["liveVersion"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$server$2f$ctx$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getCtx"])())
    }, {
        headers: {
            "Cache-Control": "no-store"
        }
    });
}
__turbopack_async_result__();
} catch(e) { __turbopack_async_result__(e); } }, false);}),
"[project]/src/db/client.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

return __turbopack_context__.a(async (__turbopack_handle_async_dependencies__, __turbopack_async_result__) => { try {
__turbopack_context__.s([
    "closePools",
    ()=>closePools,
    "getDb",
    ()=>getDb,
    "getPool",
    ()=>getPool
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$node$2d$postgres$2f$driver$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/drizzle-orm/node-postgres/driver.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$externals$5d2f$pg__$5b$external$5d$__$28$pg$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f$pg$29$__ = __turbopack_context__.i("[externals]/pg [external] (pg, esm_import, [project]/node_modules/pg)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/db/schema.ts [app-route] (ecmascript)");
var __turbopack_async_dependencies__ = __turbopack_handle_async_dependencies__([
    __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$node$2d$postgres$2f$driver$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__,
    __TURBOPACK__imported__module__$5b$externals$5d2f$pg__$5b$external$5d$__$28$pg$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f$pg$29$__
]);
[__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$node$2d$postgres$2f$driver$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__, __TURBOPACK__imported__module__$5b$externals$5d2f$pg__$5b$external$5d$__$28$pg$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f$pg$29$__] = __turbopack_async_dependencies__.then ? (await __turbopack_async_dependencies__)() : __turbopack_async_dependencies__;
;
;
;
const g = globalThis;
g.__hlPools ??= new Map();
function getPool(url) {
    let pool = g.__hlPools.get(url);
    if (!pool) {
        pool = new __TURBOPACK__imported__module__$5b$externals$5d2f$pg__$5b$external$5d$__$28$pg$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f$pg$29$__["Pool"]({
            connectionString: url,
            max: 10
        });
        g.__hlPools.set(url, pool);
    }
    return pool;
}
function getDb(url) {
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$node$2d$postgres$2f$driver$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["drizzle"])(getPool(url), {
        schema: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__
    });
}
async function closePools() {
    for (const p of g.__hlPools.values())await p.end();
    g.__hlPools.clear();
}
__turbopack_async_result__();
} catch(e) { __turbopack_async_result__(e); } }, false);}),
"[project]/src/db/schema.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "appUser",
    ()=>appUser,
    "appointment",
    ()=>appointment,
    "attachment",
    ()=>attachment,
    "auditLog",
    ()=>auditLog,
    "bankAccount",
    ()=>bankAccount,
    "bankTransaction",
    ()=>bankTransaction,
    "businessRegistration",
    ()=>businessRegistration,
    "cddRecord",
    ()=>cddRecord,
    "charge",
    ()=>charge,
    "client",
    ()=>client,
    "contact",
    ()=>contact,
    "conversation",
    ()=>conversation,
    "document",
    ()=>document,
    "filing",
    ()=>filing,
    "firm",
    ()=>firm,
    "invoice",
    ()=>invoice,
    "invoiceLine",
    ()=>invoiceLine,
    "job",
    ()=>job,
    "kv",
    ()=>kv,
    "llmCall",
    ()=>llmCall,
    "mailItem",
    ()=>mailItem,
    "message",
    ()=>message,
    "payment",
    ()=>payment,
    "person",
    ()=>person,
    "playbook",
    ()=>playbook,
    "proposal",
    ()=>proposal,
    "reminder",
    ()=>reminder,
    "request",
    ()=>request,
    "requirementItem",
    ()=>requirementItem,
    "screeningResult",
    ()=>screeningResult,
    "secret",
    ()=>secret,
    "shareClass",
    ()=>shareClass,
    "shareMovement",
    ()=>shareMovement,
    "signEnvelope",
    ()=>signEnvelope,
    "signer",
    ()=>signer,
    "significantController",
    ()=>significantController,
    "stepTiming",
    ()=>stepTiming,
    "task",
    ()=>task,
    "taskEvent",
    ()=>taskEvent
]);
// Database schema. Every table carries firm_id (DECISIONS.md #20, #24): RLS is deferred
// for the single-tenant build but the column is here from the first migration.
// Statutory dates are `date` columns (string YYYY-MM-DD); events are timestamptz.
// Money is integer cents in the invoice currency.
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$table$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/drizzle-orm/pg-core/table.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/drizzle-orm/pg-core/columns/text.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$integer$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/drizzle-orm/pg-core/columns/integer.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$boolean$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/drizzle-orm/pg-core/columns/boolean.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$date$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/drizzle-orm/pg-core/columns/date.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$timestamp$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/drizzle-orm/pg-core/columns/timestamp.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$jsonb$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/drizzle-orm/pg-core/columns/jsonb.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$bigint$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/drizzle-orm/pg-core/columns/bigint.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/drizzle-orm/pg-core/indexes.js [app-route] (ecmascript)");
;
const firmId = ()=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("firm_id").notNull();
const createdAt = ()=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$timestamp$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["timestamp"])("created_at", {
        withTimezone: true
    }).notNull().defaultNow();
const firm = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$table$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["pgTable"])("firm", {
    id: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("id").primaryKey(),
    legalName: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("legal_name").notNull(),
    legalNameZh: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("legal_name_zh"),
    tcspLicence: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("tcsp_licence"),
    address: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("address"),
    email: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("email"),
    phone: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("phone"),
    invoicePrefix: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("invoice_prefix").notNull(),
    invoiceSeq: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$integer$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["integer"])("invoice_seq").notNull().default(0),
    signOff: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$jsonb$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["jsonb"])("sign_off").$type(),
    bankDetails: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$jsonb$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["jsonb"])("bank_details").$type(),
    settings: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$jsonb$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["jsonb"])("settings").$type().notNull().default({}),
    createdAt: createdAt()
});
const appUser = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$table$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["pgTable"])("app_user", {
    id: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("id").primaryKey(),
    firmId: firmId(),
    name: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("name").notNull(),
    initials: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("initials").notNull(),
    title: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("title"),
    email: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("email"),
    isDemoUser: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$boolean$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["boolean"])("is_demo_user").notNull().default(false)
});
const client = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$table$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["pgTable"])("client", {
    id: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("id").primaryKey(),
    firmId: firmId(),
    code: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("code"),
    jurisdiction: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("jurisdiction").$type().notNull().default("HK"),
    companyType: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("company_type"),
    nameEn: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("name_en").notNull(),
    nameTc: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("name_tc"),
    nameSc: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("name_sc"),
    companyNumber: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("company_number"),
    lifecycle: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("lifecycle").$type().notNull().default("active"),
    operatingStatus: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("operating_status").$type().notNull().default("operating"),
    clientGroup: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("client_group"),
    listedSubsidiary: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$boolean$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["boolean"])("listed_subsidiary").notNull().default(false),
    staffId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("staff_id"),
    messageLang: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("message_lang").$type().notNull().default("en"),
    docLang: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("doc_lang").$type().notNull().default("en"),
    riskRating: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("risk_rating").$type(),
    paymentTermsDays: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$integer$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["integer"])("payment_terms_days").notNull().default(0),
    regOfficeEn: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("reg_office_en"),
    regOfficeZh: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("reg_office_zh"),
    businessNatureEn: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("business_nature_en"),
    businessNatureZh: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("business_nature_zh"),
    incorporatedOn: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$date$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["date"])("incorporated_on"),
    fyeMonth: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$integer$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["integer"])("fye_month"),
    fyeDay: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$integer$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["integer"])("fye_day"),
    accountsLastMadeUpTo: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$date$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["date"])("accounts_last_made_up_to"),
    auditor: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("auditor"),
    registersKeptAt: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("registers_kept_at"),
    scrKeptAt: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("scr_kept_at"),
    designatedRep: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("designated_rep"),
    jurisdictionData: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$jsonb$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["jsonb"])("jurisdiction_data").$type().notNull().default({}),
    notes: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("notes"),
    createdAt: createdAt()
});
const businessRegistration = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$table$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["pgTable"])("business_registration", {
    id: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("id").primaryKey(),
    firmId: firmId(),
    clientId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("client_id").notNull(),
    brNumber: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("br_number").notNull(),
    termYears: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$integer$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["integer"])("term_years").notNull().default(1),
    expiresOn: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$date$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["date"])("expires_on"),
    branches: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$jsonb$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["jsonb"])("branches").$type().notNull().default([])
});
const person = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$table$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["pgTable"])("person", {
    id: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("id").primaryKey(),
    firmId: firmId(),
    kind: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("kind").$type().notNull().default("individual"),
    nameEn: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("name_en").notNull(),
    nameZh: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("name_zh"),
    idType: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("id_type"),
    idNumberEnc: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("id_number_enc"),
    idCountry: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("id_country"),
    dateOfBirth: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$date$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["date"])("date_of_birth"),
    nationality: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("nationality"),
    residentialAddressEnc: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("residential_address_enc"),
    correspondenceAddress: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("correspondence_address"),
    email: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("email"),
    phone: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("phone"),
    createdAt: createdAt()
});
const cddRecord = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$table$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["pgTable"])("cdd_record", {
    id: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("id").primaryKey(),
    firmId: firmId(),
    personId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("person_id").notNull(),
    riskRating: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("risk_rating").$type().notNull().default("medium"),
    idDocumentId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("id_document_id"),
    addressProofDocumentId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("address_proof_document_id"),
    livenessCheckedOn: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$date$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["date"])("liveness_checked_on"),
    screeningId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("screening_id"),
    verifiedOn: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$date$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["date"])("verified_on").notNull(),
    reviewDueOn: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$date$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["date"])("review_due_on").notNull(),
    sourceTaskId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("source_task_id"),
    createdAt: createdAt()
});
const appointment = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$table$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["pgTable"])("appointment", {
    id: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("id").primaryKey(),
    firmId: firmId(),
    clientId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("client_id").notNull(),
    personId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("person_id").notNull(),
    role: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("role").$type().notNull(),
    fromDate: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$date$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["date"])("from_date").notNull(),
    toDate: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$date$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["date"])("to_date"),
    sourceTaskId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("source_task_id"),
    extra: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$jsonb$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["jsonb"])("extra").$type().notNull().default({})
}, (t)=>[
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["index"])("appointment_client_idx").on(t.clientId)
    ]);
const shareClass = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$table$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["pgTable"])("share_class", {
    id: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("id").primaryKey(),
    firmId: firmId(),
    clientId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("client_id").notNull(),
    name: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("name").notNull(),
    nameZh: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("name_zh"),
    currency: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("currency").notNull().default("HKD"),
    votingRights: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$boolean$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["boolean"])("voting_rights").notNull().default(true),
    unit: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("unit").$type().notNull().default("shares")
});
const shareMovement = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$table$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["pgTable"])("share_movement", {
    id: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("id").primaryKey(),
    firmId: firmId(),
    clientId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("client_id").notNull(),
    shareClassId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("share_class_id").notNull(),
    date: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$date$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["date"])("date").notNull(),
    kind: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("kind").$type().notNull(),
    fromPersonId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("from_person_id"),
    toPersonId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("to_person_id"),
    quantity: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$bigint$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["bigint"])("quantity", {
        mode: "number"
    }).notNull(),
    amountPaidCents: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$bigint$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["bigint"])("amount_paid_cents", {
        mode: "number"
    }).notNull().default(0),
    considerationCents: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$bigint$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["bigint"])("consideration_cents", {
        mode: "number"
    }),
    stampDutyCents: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$bigint$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["bigint"])("stamp_duty_cents", {
        mode: "number"
    }),
    reference: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("reference"),
    note: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("note"),
    sourceTaskId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("source_task_id"),
    createdAt: createdAt()
}, (t)=>[
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["index"])("share_movement_client_idx").on(t.clientId)
    ]);
const significantController = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$table$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["pgTable"])("significant_controller", {
    id: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("id").primaryKey(),
    firmId: firmId(),
    clientId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("client_id").notNull(),
    personId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("person_id").notNull(),
    nature: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("nature").notNull(),
    registrableFrom: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$date$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["date"])("registrable_from").notNull(),
    ceasedOn: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$date$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["date"])("ceased_on"),
    sourceTaskId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("source_task_id")
});
const charge = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$table$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["pgTable"])("charge", {
    id: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("id").primaryKey(),
    firmId: firmId(),
    clientId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("client_id").notNull(),
    description: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("description").notNull(),
    chargee: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("chargee"),
    createdOn: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$date$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["date"])("created_on").notNull(),
    amount: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("amount"),
    satisfiedOn: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$date$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["date"])("satisfied_on")
});
const bankAccount = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$table$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["pgTable"])("bank_account", {
    id: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("id").primaryKey(),
    firmId: firmId(),
    clientId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("client_id").notNull(),
    bank: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("bank").notNull(),
    accountMasked: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("account_masked"),
    signatories: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("signatories")
});
const contact = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$table$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["pgTable"])("contact", {
    id: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("id").primaryKey(),
    firmId: firmId(),
    clientId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("client_id").notNull(),
    personId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("person_id"),
    name: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("name").notNull(),
    role: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("role"),
    email: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("email"),
    phone: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("phone"),
    channel: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("channel").$type().notNull().default("email"),
    language: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("language").$type().notNull().default("en"),
    isBilling: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$boolean$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["boolean"])("is_billing").notNull().default(false),
    isInstructing: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$boolean$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["boolean"])("is_instructing").notNull().default(false),
    salutation: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$jsonb$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["jsonb"])("salutation").$type()
}, (t)=>[
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["index"])("contact_email_idx").on(t.email)
    ]);
const filing = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$table$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["pgTable"])("filing", {
    id: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("id").primaryKey(),
    firmId: firmId(),
    clientId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("client_id").notNull(),
    form: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("form").notNull(),
    description: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("description").notNull(),
    filedOn: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$date$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["date"])("filed_on").notNull(),
    reference: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("reference"),
    periodKey: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("period_key"),
    sourceTaskId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("source_task_id")
});
const document = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$table$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["pgTable"])("document", {
    id: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("id").primaryKey(),
    firmId: firmId(),
    clientId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("client_id"),
    personId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("person_id"),
    taskId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("task_id"),
    kind: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("kind").notNull(),
    title: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("title").notNull(),
    storageKey: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("storage_key"),
    mime: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("mime"),
    sha256: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("sha256"),
    language: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("language"),
    source: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("source").$type().notNull(),
    requirementKey: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("requirement_key"),
    extractedText: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("extracted_text"),
    createdAt: createdAt()
});
const secret = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$table$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["pgTable"])("secret", {
    id: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("id").primaryKey(),
    firmId: firmId(),
    name: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("name").notNull(),
    ciphertext: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("ciphertext").notNull(),
    updatedAt: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$timestamp$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["timestamp"])("updated_at", {
        withTimezone: true
    }).notNull().defaultNow()
}, (t)=>[
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["uniqueIndex"])("secret_name_uq").on(t.firmId, t.name)
    ]);
const auditLog = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$table$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["pgTable"])("audit_log", {
    id: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("id").primaryKey(),
    firmId: firmId(),
    actor: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("actor").notNull(),
    action: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("action").notNull(),
    entity: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("entity").notNull(),
    entityId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("entity_id"),
    data: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$jsonb$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["jsonb"])("data").$type().notNull().default({}),
    at: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$timestamp$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["timestamp"])("at", {
        withTimezone: true
    }).notNull().defaultNow()
});
const playbook = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$table$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["pgTable"])("playbook", {
    id: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("id").notNull(),
    firmId: firmId(),
    version: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$integer$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["integer"])("version").notNull(),
    jurisdiction: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("jurisdiction").$type().notNull(),
    def: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$jsonb$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["jsonb"])("def").$type().notNull(),
    active: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$boolean$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["boolean"])("active").notNull().default(true),
    createdAt: createdAt()
}, (t)=>[
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["uniqueIndex"])("playbook_pk").on(t.firmId, t.id, t.version)
    ]);
const requirementItem = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$table$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["pgTable"])("requirement_item", {
    key: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("key").notNull(),
    firmId: firmId(),
    def: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$jsonb$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["jsonb"])("def").$type().notNull()
}, (t)=>[
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["uniqueIndex"])("requirement_item_pk").on(t.firmId, t.key)
    ]);
const request = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$table$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["pgTable"])("request", {
    id: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("id").primaryKey(),
    firmId: firmId(),
    clientId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("client_id").notNull(),
    conversationId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("conversation_id"),
    sourceMessageId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("source_message_id"),
    summary: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("summary"),
    status: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("status").$type().notNull().default("open"),
    invoiceId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("invoice_id"),
    uploadToken: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("upload_token").notNull(),
    createdAt: createdAt()
}, (t)=>[
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["uniqueIndex"])("request_upload_token_uq").on(t.uploadToken)
    ]);
const task = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$table$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["pgTable"])("task", {
    id: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("id").primaryKey(),
    firmId: firmId(),
    requestId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("request_id"),
    clientId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("client_id").notNull(),
    playbookId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("playbook_id").notNull(),
    playbookVersion: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$integer$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["integer"])("playbook_version").notNull(),
    title: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("title").notNull(),
    personId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("person_id"),
    assigneeId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("assignee_id"),
    status: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("status").$type().notNull().default("open"),
    stepIndex: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$integer$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["integer"])("step_index").notNull().default(0),
    stepState: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$jsonb$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["jsonb"])("step_state").$type().notNull().default({}),
    checklist: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$jsonb$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["jsonb"])("checklist").$type().notNull().default([]),
    extracted: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$jsonb$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["jsonb"])("extracted").$type().notNull().default({}),
    params: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$jsonb$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["jsonb"])("params").$type().notNull().default({}),
    effectiveDate: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$date$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["date"])("effective_date"),
    dueDate: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$date$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["date"])("due_date"),
    onCredit: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$boolean$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["boolean"])("on_credit").notNull().default(false),
    periodKey: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("period_key"),
    createdAt: createdAt(),
    completedAt: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$timestamp$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["timestamp"])("completed_at", {
        withTimezone: true
    })
}, (t)=>[
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["index"])("task_client_idx").on(t.clientId)
    ]);
const taskEvent = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$table$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["pgTable"])("task_event", {
    id: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("id").primaryKey(),
    firmId: firmId(),
    taskId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("task_id").notNull(),
    at: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$timestamp$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["timestamp"])("at", {
        withTimezone: true
    }).notNull().defaultNow(),
    actor: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("actor").notNull(),
    kind: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("kind").notNull(),
    summary: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("summary").notNull(),
    data: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$jsonb$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["jsonb"])("data").$type().notNull().default({})
}, (t)=>[
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["index"])("task_event_task_idx").on(t.taskId)
    ]);
const proposal = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$table$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["pgTable"])("proposal", {
    id: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("id").primaryKey(),
    firmId: firmId(),
    kind: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("kind").$type().notNull(),
    status: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("status").$type().notNull().default("pending"),
    clientId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("client_id"),
    taskId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("task_id"),
    requestId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("request_id"),
    title: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("title").notNull(),
    summary: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("summary"),
    payload: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$jsonb$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["jsonb"])("payload").$type().notNull().default({}),
    createdAt: createdAt(),
    decidedAt: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$timestamp$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["timestamp"])("decided_at", {
        withTimezone: true
    }),
    decidedBy: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("decided_by")
});
const conversation = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$table$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["pgTable"])("conversation", {
    id: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("id").primaryKey(),
    firmId: firmId(),
    clientId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("client_id"),
    channel: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("channel").$type().notNull(),
    providerThreadId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("provider_thread_id"),
    subject: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("subject"),
    counterpartyEmail: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("counterparty_email"),
    lastMessageAt: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$timestamp$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["timestamp"])("last_message_at", {
        withTimezone: true
    }),
    createdAt: createdAt()
});
const message = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$table$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["pgTable"])("message", {
    id: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("id").primaryKey(),
    firmId: firmId(),
    conversationId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("conversation_id").notNull(),
    direction: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("direction").$type().notNull(),
    provider: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("provider"),
    providerMessageId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("provider_message_id"),
    rfcMessageId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("rfc_message_id"),
    inReplyTo: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("in_reply_to"),
    fromAddr: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("from_addr"),
    fromName: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("from_name"),
    toAddrs: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$jsonb$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["jsonb"])("to_addrs").$type().notNull().default([]),
    ccAddrs: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$jsonb$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["jsonb"])("cc_addrs").$type().notNull().default([]),
    subject: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("subject"),
    text: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("text"),
    html: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("html"),
    language: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("language"),
    status: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("status").$type().notNull(),
    proposalId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("proposal_id"),
    at: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$timestamp$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["timestamp"])("at", {
        withTimezone: true
    }).notNull().defaultNow(),
    processedAt: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$timestamp$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["timestamp"])("processed_at", {
        withTimezone: true
    }),
    intake: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$jsonb$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["jsonb"])("intake").$type(),
    error: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("error")
}, (t)=>[
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["uniqueIndex"])("message_provider_uq").on(t.provider, t.providerMessageId)
    ]);
const attachment = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$table$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["pgTable"])("attachment", {
    id: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("id").primaryKey(),
    firmId: firmId(),
    messageId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("message_id").notNull(),
    documentId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("document_id"),
    filename: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("filename").notNull(),
    mime: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("mime"),
    size: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$integer$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["integer"])("size")
});
const invoice = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$table$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["pgTable"])("invoice", {
    id: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("id").primaryKey(),
    firmId: firmId(),
    clientId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("client_id").notNull(),
    requestId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("request_id"),
    number: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("number").notNull(),
    numberIsCustom: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$boolean$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["boolean"])("number_is_custom").notNull().default(false),
    status: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("status").$type().notNull().default("draft"),
    issuedOn: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$date$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["date"])("issued_on"),
    dueOn: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$date$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["date"])("due_on"),
    termsDays: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$integer$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["integer"])("terms_days").notNull().default(0),
    currency: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("currency").notNull().default("HKD"),
    totalCents: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$bigint$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["bigint"])("total_cents", {
        mode: "number"
    }).notNull().default(0),
    paidCents: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$bigint$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["bigint"])("paid_cents", {
        mode: "number"
    }).notNull().default(0),
    billingContactId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("billing_contact_id"),
    version: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$integer$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["integer"])("version").notNull().default(1),
    supersedesId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("supersedes_id"),
    xeroInvoiceId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("xero_invoice_id"),
    xeroStatus: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("xero_status").$type().notNull().default("not_synced"),
    xeroError: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("xero_error"),
    documentId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("document_id"),
    createdAt: createdAt()
}, (t)=>[
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["uniqueIndex"])("invoice_number_uq").on(t.firmId, t.number)
    ]);
const invoiceLine = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$table$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["pgTable"])("invoice_line", {
    id: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("id").primaryKey(),
    firmId: firmId(),
    invoiceId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("invoice_id").notNull(),
    taskId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("task_id"),
    description: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("description").notNull(),
    descriptionZh: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("description_zh"),
    amountCents: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$bigint$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["bigint"])("amount_cents", {
        mode: "number"
    }).notNull(),
    kind: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("kind").$type().notNull().default("fee"),
    sort: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$integer$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["integer"])("sort").notNull().default(0)
});
const bankTransaction = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$table$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["pgTable"])("bank_transaction", {
    id: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("id").primaryKey(),
    firmId: firmId(),
    provider: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("provider").notNull(),
    providerTxId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("provider_tx_id").notNull(),
    amountCents: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$bigint$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["bigint"])("amount_cents", {
        mode: "number"
    }).notNull(),
    currency: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("currency").notNull(),
    reference: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("reference"),
    payerName: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("payer_name"),
    receivedAt: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$timestamp$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["timestamp"])("received_at", {
        withTimezone: true
    }).notNull(),
    status: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("status").$type().notNull().default("unmatched"),
    matchNote: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("match_note"),
    raw: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$jsonb$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["jsonb"])("raw").$type()
}, (t)=>[
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["uniqueIndex"])("bank_tx_uq").on(t.provider, t.providerTxId)
    ]);
const payment = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$table$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["pgTable"])("payment", {
    id: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("id").primaryKey(),
    firmId: firmId(),
    invoiceId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("invoice_id").notNull(),
    bankTransactionId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("bank_transaction_id"),
    amountCents: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$bigint$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["bigint"])("amount_cents", {
        mode: "number"
    }).notNull(),
    receivedOn: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$date$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["date"])("received_on").notNull(),
    method: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("method").$type().notNull(),
    xeroPaymentId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("xero_payment_id"),
    xeroStatus: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("xero_status").$type().notNull().default("not_synced"),
    createdAt: createdAt()
});
const reminder = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$table$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["pgTable"])("reminder", {
    id: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("id").primaryKey(),
    firmId: firmId(),
    invoiceId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("invoice_id").notNull(),
    level: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$integer$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["integer"])("level").notNull(),
    proposalId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("proposal_id"),
    messageId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("message_id"),
    createdAt: createdAt()
});
const signEnvelope = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$table$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["pgTable"])("sign_envelope", {
    id: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("id").primaryKey(),
    firmId: firmId(),
    taskId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("task_id").notNull(),
    status: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("status").$type().notNull().default("draft"),
    documentIds: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$jsonb$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["jsonb"])("document_ids").$type().notNull().default([]),
    signedDocumentIds: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$jsonb$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["jsonb"])("signed_document_ids").$type().notNull().default([]),
    createdAt: createdAt(),
    completedAt: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$timestamp$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["timestamp"])("completed_at", {
        withTimezone: true
    })
});
const signer = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$table$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["pgTable"])("signer", {
    id: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("id").primaryKey(),
    firmId: firmId(),
    envelopeId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("envelope_id").notNull(),
    personId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("person_id"),
    name: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("name").notNull(),
    email: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("email").notNull(),
    role: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("role"),
    tokenHash: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("token_hash").notNull(),
    otpHash: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("otp_hash"),
    otpExpiresAt: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$timestamp$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["timestamp"])("otp_expires_at", {
        withTimezone: true
    }),
    otpAttempts: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$integer$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["integer"])("otp_attempts").notNull().default(0),
    otpVerifiedAt: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$timestamp$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["timestamp"])("otp_verified_at", {
        withTimezone: true
    }),
    signedAt: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$timestamp$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["timestamp"])("signed_at", {
        withTimezone: true
    }),
    signatureKind: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("signature_kind").$type(),
    signatureData: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("signature_data"),
    ip: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("ip"),
    userAgent: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("user_agent")
}, (t)=>[
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["uniqueIndex"])("signer_token_uq").on(t.tokenHash)
    ]);
const screeningResult = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$table$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["pgTable"])("screening_result", {
    id: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("id").primaryKey(),
    firmId: firmId(),
    personId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("person_id").notNull(),
    taskId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("task_id"),
    provider: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("provider").notNull(),
    datasetVersion: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("dataset_version"),
    query: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$jsonb$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["jsonb"])("query").$type().notNull(),
    hits: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$jsonb$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["jsonb"])("hits").$type().notNull().default([]),
    adjudication: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$jsonb$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["jsonb"])("adjudication").$type().notNull().default([]),
    status: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("status").$type().notNull(),
    reviewedBy: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("reviewed_by"),
    createdAt: createdAt()
});
const mailItem = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$table$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["pgTable"])("mail_item", {
    id: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("id").primaryKey(),
    firmId: firmId(),
    clientId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("client_id"),
    documentId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("document_id"),
    receivedOn: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$date$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["date"])("received_on").notNull(),
    sender: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("sender"),
    summary: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("summary"),
    urgency: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("urgency").$type().notNull().default("normal"),
    status: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("status").$type().notNull().default("logged"),
    proposalId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("proposal_id"),
    createdAt: createdAt()
});
const stepTiming = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$table$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["pgTable"])("step_timing", {
    id: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("id").primaryKey(),
    firmId: firmId(),
    taskId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("task_id"),
    proposalId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("proposal_id"),
    activity: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("activity").notNull(),
    shownAt: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$timestamp$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["timestamp"])("shown_at", {
        withTimezone: true
    }).notNull(),
    actedAt: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$timestamp$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["timestamp"])("acted_at", {
        withTimezone: true
    }).notNull(),
    seconds: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$integer$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["integer"])("seconds").notNull(),
    editChars: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$integer$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["integer"])("edit_chars").notNull().default(0)
});
const llmCall = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$table$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["pgTable"])("llm_call", {
    id: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("id").primaryKey(),
    firmId: firmId(),
    agent: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("agent").notNull(),
    model: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("model").notNull(),
    input: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$jsonb$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["jsonb"])("input").$type(),
    output: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$jsonb$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["jsonb"])("output").$type(),
    error: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("error"),
    latencyMs: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$integer$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["integer"])("latency_ms"),
    tokensIn: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$integer$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["integer"])("tokens_in"),
    tokensOut: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$integer$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["integer"])("tokens_out"),
    taskId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("task_id"),
    messageId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("message_id"),
    at: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$timestamp$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["timestamp"])("at", {
        withTimezone: true
    }).notNull().defaultNow()
});
const job = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$table$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["pgTable"])("job", {
    id: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("id").primaryKey(),
    firmId: firmId(),
    kind: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("kind").notNull(),
    payload: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$jsonb$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["jsonb"])("payload").$type().notNull().default({}),
    dedupeKey: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("dedupe_key"),
    status: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("status").$type().notNull().default("queued"),
    attempts: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$integer$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["integer"])("attempts").notNull().default(0),
    runAfter: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$timestamp$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["timestamp"])("run_after", {
        withTimezone: true
    }).notNull().defaultNow(),
    lastError: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("last_error"),
    createdAt: createdAt()
}, (t)=>[
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["uniqueIndex"])("job_dedupe_uq").on(t.firmId, t.dedupeKey)
    ]);
const kv = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$table$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["pgTable"])("kv", {
    firmId: firmId(),
    key: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("key").notNull(),
    value: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$jsonb$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["jsonb"])("value").$type()
}, (t)=>[
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["uniqueIndex"])("kv_pk").on(t.firmId, t.key)
    ]);
}),
"[project]/src/documents/builder.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "buildPdf",
    ()=>buildPdf
]);
// A small document builder on pdf-lib: headings, wrapped paragraphs (CJK-aware), tables and
// signature blocks. Deterministic and dependency-light (no headless browser in the worker).
var __TURBOPACK__imported__module__$5b$externals$5d2f$pdf$2d$lib__$5b$external$5d$__$28$pdf$2d$lib$2c$__cjs$2c$__$5b$project$5d2f$node_modules$2f$pdf$2d$lib$29$__ = __turbopack_context__.i("[externals]/pdf-lib [external] (pdf-lib, cjs, [project]/node_modules/pdf-lib)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$documents$2f$fonts$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/documents/fonts.ts [app-route] (ecmascript)");
;
;
const W = 595, H = 842, M = 64;
const INK = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$pdf$2d$lib__$5b$external$5d$__$28$pdf$2d$lib$2c$__cjs$2c$__$5b$project$5d2f$node_modules$2f$pdf$2d$lib$29$__["rgb"])(0.086, 0.094, 0.114), MUTED = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$pdf$2d$lib__$5b$external$5d$__$28$pdf$2d$lib$2c$__cjs$2c$__$5b$project$5d2f$node_modules$2f$pdf$2d$lib$29$__["rgb"])(0.42, 0.45, 0.5), LINE = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$pdf$2d$lib__$5b$external$5d$__$28$pdf$2d$lib$2c$__cjs$2c$__$5b$project$5d2f$node_modules$2f$pdf$2d$lib$29$__["rgb"])(0.83, 0.84, 0.87);
function wrap(text, font, size, width) {
    const out = [];
    for (const para of text.split("\n")){
        let line = "";
        // Break on spaces for Latin text, anywhere for CJK characters.
        const tokens = para.match(/[⺀-鿿＀-￯]|[^\s⺀-鿿＀-￯]+|\s+/g) ?? [
            ""
        ];
        for (const tok of tokens){
            const next = line + tok;
            if (font.widthOfTextAtSize(next, size) <= width || !line) line = next;
            else {
                out.push(line.trimEnd());
                line = tok.trimStart();
            }
        }
        out.push(line.trimEnd());
    }
    return out;
}
async function buildPdf(blocks, opts = {}) {
    const doc = await __TURBOPACK__imported__module__$5b$externals$5d2f$pdf$2d$lib__$5b$external$5d$__$28$pdf$2d$lib$2c$__cjs$2c$__$5b$project$5d2f$node_modules$2f$pdf$2d$lib$29$__["PDFDocument"].create();
    const fonts = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$documents$2f$fonts$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["embedFonts"])(doc, opts.lang ?? "tc");
    let page = doc.addPage([
        W,
        H
    ]);
    let y = H - M;
    const text = [];
    const signatureFields = [];
    const newPage = ()=>{
        page = doc.addPage([
            W,
            H
        ]);
        y = H - M;
        if (opts.header) drawHeader();
    };
    const need = (h)=>{
        if (y - h < M + 20) newPage();
    };
    const draw = (s, x, size, bold = false, color = INK)=>{
        page.drawText(s, {
            x,
            y,
            size,
            font: fonts.pick(s, bold),
            color
        });
    };
    const drawHeader = ()=>{
        if (!opts.header) return;
        page.drawText(opts.header, {
            x: M,
            y: H - 36,
            size: 8,
            font: fonts.pick(opts.header),
            color: MUTED
        });
    };
    drawHeader();
    for (const b of blocks){
        switch(b.t){
            case "title":
                {
                    const lines = wrap(b.text, fonts.bold, 15, W - 2 * M);
                    need(lines.length * 20 + 6);
                    for (const l of lines){
                        draw(l, M, 15, true);
                        y -= 20;
                    }
                    y -= 6;
                    text.push(b.text);
                    break;
                }
            case "subtitle":
                {
                    const lines = wrap(b.text, fonts.regular, 11, W - 2 * M);
                    need(lines.length * 15);
                    for (const l of lines){
                        draw(l, M, 11, false, MUTED);
                        y -= 15;
                    }
                    y -= 8;
                    text.push(b.text);
                    break;
                }
            case "h":
                {
                    need(24);
                    y -= 4;
                    draw(b.text, M, 11.5, true);
                    y -= 18;
                    text.push(b.text);
                    break;
                }
            case "p":
            case "small":
                {
                    const size = b.t === "small" ? 8.5 : 10.5, lh = b.t === "small" ? 12 : 15, indent = b.t === "p" ? b.indent ?? 0 : 0;
                    const lines = wrap(b.text, fonts.pick(b.text), size, W - 2 * M - indent);
                    for (const l of lines){
                        need(lh);
                        draw(l, M + indent, size, false, b.t === "small" ? MUTED : INK);
                        y -= lh;
                    }
                    y -= 6;
                    text.push(b.text);
                    break;
                }
            case "list":
                b.items.forEach((it, i)=>{
                    const lines = wrap(it, fonts.pick(it), 10.5, W - 2 * M - 22);
                    lines.forEach((l, j)=>{
                        need(15);
                        if (j === 0) draw(b.numbered ? `${i + 1}.` : "•", M + 4, 10.5);
                        draw(l, M + 22, 10.5);
                        y -= 15;
                    });
                    y -= 3;
                    text.push(it);
                });
                y -= 4;
                break;
            case "table":
                {
                    const cols = b.head.length, widths = b.widths ?? Array(cols).fill((W - 2 * M) / cols);
                    const row = (cells, bold)=>{
                        const wrapped = cells.map((c, i)=>wrap(c ?? "", fonts.pick(c ?? "", bold), 9.5, widths[i] - 8));
                        const h = Math.max(...wrapped.map((w)=>w.length)) * 13 + 6;
                        need(h);
                        let x = M;
                        wrapped.forEach((lines, i)=>{
                            lines.forEach((l, j)=>page.drawText(l, {
                                    x: x + 4,
                                    y: y - 11 - j * 13,
                                    size: 9.5,
                                    font: fonts.pick(l, bold),
                                    color: INK
                                }));
                            x += widths[i];
                        });
                        y -= h;
                        page.drawLine({
                            start: {
                                x: M,
                                y
                            },
                            end: {
                                x: W - M,
                                y
                            },
                            thickness: 0.5,
                            color: LINE
                        });
                        text.push(cells.join(" | "));
                    };
                    page.drawLine({
                        start: {
                            x: M,
                            y
                        },
                        end: {
                            x: W - M,
                            y
                        },
                        thickness: 0.5,
                        color: LINE
                    });
                    row(b.head, true);
                    for (const r of b.rows)row(r, false);
                    y -= 10;
                    break;
                }
            case "sign":
                {
                    for (const s of b.names){
                        need(70);
                        y -= 34;
                        page.drawLine({
                            start: {
                                x: M,
                                y
                            },
                            end: {
                                x: M + 220,
                                y
                            },
                            thickness: 0.8,
                            color: INK
                        });
                        if (s.field) signatureFields.push({
                            field: s.field,
                            page: doc.getPageCount() - 1,
                            x: M,
                            y: y + 2,
                            w: 220,
                            h: 30
                        });
                        y -= 14;
                        draw(s.name, M, 10, true);
                        y -= 13;
                        draw(s.caption, M, 9, false, MUTED);
                        y -= 8;
                        text.push(`${s.name} ${s.caption}`);
                    }
                    break;
                }
            case "space":
                y -= b.h ?? 12;
                break;
            case "pagebreak":
                newPage();
                break;
        }
    }
    if (opts.footer) doc.getPages().forEach((p, i, all)=>p.drawText(`${opts.footer}  ·  ${i + 1}/${all.length}`, {
            x: M,
            y: 30,
            size: 7.5,
            font: fonts.pick(opts.footer),
            color: MUTED
        }));
    return {
        pdf: Buffer.from(await doc.save()),
        text: text.join("\n"),
        signatureFields
    };
}
}),
"[project]/src/documents/context.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "loadDocContext",
    ()=>loadDocContext
]);
// Everything a document template or form mapping needs, loaded once per generation.
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/drizzle-orm/sql/expressions/conditions.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/db/schema.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$firm$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/domain/firm.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$records$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/domain/records.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$shares$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/domain/shares.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$engine$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/domain/engine.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$playbooks$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/domain/playbooks.ts [app-route] (ecmascript)");
;
;
;
;
;
;
;
async function loadDocContext(ctx, taskId) {
    const task = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$engine$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getTask"])(ctx, taskId);
    const pb = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$playbooks$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getPlaybook"])(ctx, task.playbookId, task.playbookVersion);
    const client = await ctx.db.query.client.findFirst({
        where: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["client"].id, task.clientId)
    });
    const firm = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$firm$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getFirm"])(ctx);
    const today = ctx.clock.today();
    const asAt = task.effectiveDate && task.effectiveDate > today ? task.effectiveDate : today;
    const officers = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$records$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["officersAsAt"])(ctx, client.id, today);
    const directors = await Promise.all(officers.filter((o)=>o.role === "director").map(async (o)=>({
            ...o,
            protected: await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$records$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getPersonProtected"])(ctx, o.personId)
        })));
    const secretary = officers.find((o)=>o.role === "secretary") ?? null;
    const members = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$shares$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["membersAsAt"])(ctx, client.id, today);
    const capital = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$shares$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["issuedAsAt"])(ctx, client.id, today);
    const br = await ctx.db.query.businessRegistration.findFirst({
        where: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["businessRegistration"].clientId, client.id)
    });
    const scs = await ctx.db.select().from(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["significantController"]).where((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["significantController"].clientId, client.id));
    const person = task.personId ? await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$records$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getPersonProtected"])(ctx, task.personId) : null;
    const values = {};
    for (const e of task.checklist)if (e.value && (!e.personId || e.personId === task.personId)) values[e.key] = e.value;
    for (const [k, v] of Object.entries(task.extracted))if (!values[k] && typeof v?.value === "string") values[k] = v.value;
    const lang = client.docLang ?? "en";
    return {
        task,
        pb,
        client,
        firm,
        today,
        asAt,
        officers,
        directors,
        secretary,
        members,
        capital,
        br,
        scs,
        person,
        values,
        lang
    };
}
}),
"[project]/src/documents/cr-forms.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "FORMS_DIR",
    ()=>FORMS_DIR,
    "dateParts",
    ()=>dateParts,
    "fillForm",
    ()=>fillForm,
    "hkidParts",
    ()=>hkidParts,
    "isHkid",
    ()=>isHkid,
    "listFieldNames",
    ()=>listFieldNames,
    "mapNAR1",
    ()=>mapNAR1,
    "mapND2A",
    ()=>mapND2A,
    "mapND2B",
    ()=>mapND2B,
    "mapND4",
    ()=>mapND4,
    "mapNDR1",
    ()=>mapNDR1,
    "mapNNC1",
    ()=>mapNNC1,
    "mapNNC2",
    ()=>mapNNC2,
    "mapNR1",
    ()=>mapNR1,
    "mapNSC1",
    ()=>mapNSC1,
    "nameParts",
    ()=>nameParts,
    "partialId",
    ()=>partialId,
    "readFormValues",
    ()=>readFormValues,
    "splitAddress",
    ()=>splitAddress
]);
// Fills the official Companies Registry fillable PDFs (forms/hk-cr, see manifest.json for
// source, hash and specification number). Field names are the Registry's own; each mapping
// was made against the current specification and is guarded by a test that every mapped
// field exists, so a Registry revision breaks the build instead of producing a wrong form.
var __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$fs__$5b$external$5d$__$28$node$3a$fs$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/node:fs [external] (node:fs, cjs)");
var __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$path__$5b$external$5d$__$28$node$3a$path$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/node:path [external] (node:path, cjs)");
var __TURBOPACK__imported__module__$5b$externals$5d2f$pdf$2d$lib__$5b$external$5d$__$28$pdf$2d$lib$2c$__cjs$2c$__$5b$project$5d2f$node_modules$2f$pdf$2d$lib$29$__ = __turbopack_context__.i("[externals]/pdf-lib [external] (pdf-lib, cjs, [project]/node_modules/pdf-lib)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$documents$2f$fonts$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/documents/fonts.ts [app-route] (ecmascript)");
;
;
;
;
const FORMS_DIR = __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$path__$5b$external$5d$__$28$node$3a$path$2c$__cjs$29$__["default"].join(process.cwd(), "forms/hk-cr");
const BUILDING = /(building|centre|center|tower|house|plaza|court|mansion|garden|place|commercial|industrial|square|estate|block|大廈|中心|大樓|廣場|花園|閣)/i;
const STREET = /(road|street|lane|avenue|drive|terrace|path|way|circuit|rise|道|街|路|里|徑)/i;
const FLAT = /^(flat|unit|room|rm|suite|shop|\d+\/f|\d+(st|nd|rd|th)? floor|g\/f|\d+樓|[a-z]?\d+室)/i;
function splitAddress(addr) {
    const out = {
        flat: "",
        building: "",
        street: "",
        district: "",
        country: ""
    };
    if (!addr) return out;
    const parts = addr.split(/,\s*/).map((s)=>s.trim()).filter(Boolean);
    const rest = [];
    for (const p of parts){
        if (/^hong kong$|^香港$|^hk$/i.test(p)) {
            out.country = "Hong Kong";
            continue;
        }
        if (FLAT.test(p) && !out.building && !out.street) out.flat = [
            out.flat,
            p
        ].filter(Boolean).join(", ");
        else if (STREET.test(p) && !out.street) out.street = p;
        else if (BUILDING.test(p) && !out.building && !out.street) out.building = p;
        else rest.push(p);
    }
    out.district = rest.join(", ");
    if (!out.country) out.country = "Hong Kong";
    return out;
}
function dateParts(d) {
    if (!d) return [
        "",
        "",
        ""
    ];
    const [y, m, day] = d.split("-");
    return [
        day,
        m,
        y
    ];
}
function nameParts(full) {
    const t = full.trim().split(/\s+/);
    if (t.length === 1) return {
        surname: t[0].toUpperCase(),
        other: ""
    };
    const capsFirst = t[0] === t[0].toUpperCase();
    if (capsFirst) return {
        surname: t[0],
        other: t.slice(1).join(" ")
    };
    return {
        surname: t[t.length - 1].toUpperCase(),
        other: t.slice(0, -1).join(" ")
    };
}
function partialId(id) {
    return (id ?? "").replace(/[^A-Za-z0-9]/g, "").slice(0, 4).toUpperCase();
}
function hkidParts(id) {
    const m = (id ?? "").toUpperCase().match(/([A-Z]{1,2}\d{6})\s*\(?([0-9A])\)?/);
    return m ? [
        m[1],
        m[2]
    ] : [
        (id ?? "").toUpperCase(),
        ""
    ];
}
function isHkid(id) {
    return /[A-Z]{1,2}\d{6}\s*\(?[0-9A]\)?/i.test(id ?? "");
}
const addrFields = (a, f)=>Object.fromEntries(f.map((k, i)=>[
            k,
            [
                a.flat,
                a.building,
                a.street,
                a.district,
                a.country
            ][i]
        ]).filter(([k])=>k));
const cap = (c, boxes)=>({
        [boxes[0]]: c === "secretary",
        [boxes[1]]: c === "director",
        [boxes[2]]: c === "alternate"
    });
function presentor(p, names) {
    return {
        [names[0]]: p.name,
        [names[1]]: p.address,
        [names[2]]: p.tel,
        [names[3]]: "",
        [names[4]]: p.email,
        [names[5]]: p.reference
    };
}
function mapND2A(d) {
    const v = {};
    for(let p = 1; p <= 7; p++)v[`fill_1_P.${p}`] = d.brNumber;
    v["fill_2_P.1"] = d.companyName;
    Object.assign(v, presentor(d.presentor, [
        "fill_14_P.1",
        "fill_15_P.1",
        "fill_16_P.1",
        "fill_17_P.1",
        "fill_18_P.1",
        "fill_19_P.1"
    ]));
    if (d.cessation) {
        const c = d.cessation, n = nameParts(c.nameEn), [dd, mm, yy] = dateParts(c.date);
        Object.assign(v, cap(c.capacity, [
            "cb_1_P.1",
            "cb_2_P.1",
            "cb_3_P.1"
        ]), {
            "fill_4_P.1": c.nameZh ?? "",
            "fill_5_P.1": n.surname,
            "fill_6_P.1": n.other,
            [isHkid(c.idNumber) ? "fill_7_P.1" : "fill_8_P.1"]: partialId(c.idNumber),
            "cb_4_P.1": c.reason === "resignation",
            "cb_5_P.1": c.reason === "deceased",
            "fill_11_P.1": dd,
            "fill_12_P.1": mm,
            "fill_13_P.1": yy,
            ...c.capacity !== "secretary" ? {
                "cb_6_P.1": !!c.continues,
                "cb_7_P.1": !c.continues
            } : {}
        });
    }
    if (d.appointment) {
        const a = d.appointment, n = nameParts(a.nameEn), addr = splitAddress(a.correspondenceAddress), [dd, mm, yy] = dateParts(a.date);
        Object.assign(v, cap(a.capacity, [
            "cb_1_P.2",
            "cb_2_P.2",
            "cb_3_P.2"
        ]), {
            "fill_3_P.2": a.nameZh ?? "",
            "fill_4_P.2": n.surname,
            "fill_5_P.2": n.other,
            ...addrFields(addr, [
                "fill_10_P.2",
                "fill_11_P.2",
                "fill_12_P.2",
                "fill_13_P.2",
                "fill_14_P.2"
            ]),
            "fill_15_P.2": a.email ?? "",
            ...isHkid(a.idNumber) ? {
                "fill_16_P.2": partialId(a.idNumber)
            } : {
                "fill_17_P.2": a.passportCountry ?? "",
                "fill_18_P.2": partialId(a.idNumber)
            },
            "fill_21_P.2": dd,
            "fill_22_P.2": mm,
            "fill_23_P.2": yy,
            ...a.capacity !== "secretary" ? {
                "cb_5_P.2": !!a.alreadyOfficer,
                "cb_6_P.2": !a.alreadyOfficer
            } : {}
        });
        // PI-ND2A: protected information (full ID number, residential address), not shown publicly.
        const [idMain, idCheck] = hkidParts(a.idNumber);
        const res = splitAddress(a.residentialAddress);
        Object.assign(v, cap(a.capacity, [
            "cb_1_P.7",
            "cb_2_P.7",
            "cb_3_P.7"
        ]), {
            "fill_2_P.7": a.nameZh ?? "",
            "fill_3_P.7": n.surname,
            "fill_4_P.7": n.other,
            ...isHkid(a.idNumber) ? {
                "fill_5_P.7": idMain,
                "fill_6_P.7": idCheck
            } : {
                "fill_7_P.7": a.passportCountry ?? "",
                "fill_8_P.7": a.idNumber ?? ""
            },
            ...a.capacity !== "secretary" ? addrFields(res, [
                "fill_9_P.7",
                "fill_10_P.7",
                "fill_11_P.7",
                "fill_12_P.7",
                "fill_13_P.7"
            ]) : {}
        });
    }
    if (d.corporateSecretary) {
        const s = d.corporateSecretary, addr = splitAddress(s.address), [dd, mm, yy] = dateParts(s.date);
        Object.assign(v, {
            "cb_1_P.3": true,
            "fill_3_P.3": s.nameZh ?? "",
            "fill_4_P.3": s.nameEn,
            ...addrFields(addr, [
                "fill_5_P.3",
                "fill_6_P.3",
                "fill_7_P.3",
                "fill_8_P.3",
                "fill_9_P.3"
            ]),
            "fill_10_P.3": s.email,
            "fill_11_P.3": s.brNumber ?? "",
            "fill_12_P.3": s.tcspLicence ?? "",
            "fill_14_P.3": dd,
            "fill_15_P.3": mm,
            "fill_16_P.3": yy,
            "fill_17_P.3": s.signatory
        });
    }
    v["fill_22_P.3"] = d.signer.name;
    v["fill_23_P.3"] = dateParts(d.signDate).join("/");
    return v;
}
function mapNR1(d) {
    const a = splitAddress(d.newAddress), [dd, mm, yy] = dateParts(d.effectiveDate);
    return {
        "fill_1_P.1": d.brNumber,
        "fill_2_P.1": d.companyName,
        "fill_3_P.1": a.flat,
        "fill_4_P.1": a.building,
        "fill_5_P.1": a.street,
        "fill_6_P.1": a.district,
        "fill_7_P.1": dd,
        "fill_8_P.1": mm,
        "fill_9_P.1": yy,
        "fill_18_P.1": d.signer.name,
        "fill_19_P.1": dateParts(d.signDate).join("/"),
        ...presentor(d.presentor, [
            "fill_20_P.1",
            "fill_21_P.1",
            "fill_22_P.1",
            "fill_23_P.1",
            "fill_24_P.1",
            "fill_25_P.1"
        ])
    };
}
function mapNNC2(d) {
    const [dd, mm, yy] = dateParts(d.resolutionDate);
    return {
        "fill_1_P.1": d.brNumber,
        "fill_2_P.1": d.existingEn,
        "fill_3_P.1": d.existingZh ?? "",
        "fill_4_P.1": dd,
        "fill_5_P.1": mm,
        "fill_6_P.1": yy,
        "fill_7_P.1": d.newEn ?? "",
        "fill_8_P.1": d.newZh ?? "",
        "fill_9_P.1": d.signer.name,
        "fill_10_P.1": dateParts(d.signDate).join("/"),
        "fill_11_P.1": "",
        "fill_12_P.1": d.presentor.name,
        "fill_13_P.1": d.presentor.address,
        "fill_14_P.1": d.presentor.tel,
        "fill_16_P.1": d.presentor.email,
        "fill_17_P.1": d.presentor.reference
    };
}
function mapND2B(d) {
    const o = d.officer, n = nameParts(o.nameEn), [dd, mm, yy] = dateParts(d.effectiveDate), c = d.changes;
    const v = {
        "fill_1_P.1": d.brNumber,
        "fill_2_P.1": d.companyName,
        ...cap(o.capacity, [
            "cb_1_P.1",
            "cb_2_P.1",
            "cb_3_P.1"
        ]),
        "fill_3_P.1": o.nameZh ?? "",
        "fill_4_P.1": n.surname,
        "fill_5_P.1": n.other,
        [isHkid(o.idNumber) ? "fill_6_P.1" : "fill_7_P.1"]: partialId(o.idNumber),
        ...presentor(d.presentor, [
            "fill_8_P.1",
            "fill_9_P.1",
            "fill_10_P.1",
            "fill_11_P.1",
            "fill_12_P.1",
            "fill_13_P.1"
        ])
    };
    for(let p = 2; p <= 3; p++)v[`fill_1_P.${p}`] = d.brNumber;
    if (c.nameZh) Object.assign(v, {
        "fill_2_P.2": c.nameZh,
        "fill_3_P.2": dd,
        "fill_4_P.2": mm,
        "fill_5_P.2": yy
    });
    if (c.nameEn) {
        const nn = nameParts(c.nameEn);
        Object.assign(v, {
            "fill_6_P.2": nn.surname,
            "fill_7_P.2": nn.other,
            "fill_8_P.2": dd,
            "fill_9_P.2": mm,
            "fill_10_P.2": yy
        });
    }
    if (c.residentialAddress) Object.assign(v, {
        "fill_16_P.2": dd,
        "fill_17_P.2": mm,
        "fill_18_P.2": yy
    });
    if (c.correspondenceAddress) {
        const a = splitAddress(c.correspondenceAddress);
        Object.assign(v, addrFields(a, [
            "fill_19_P.2",
            "fill_20_P.2",
            "fill_21_P.2",
            "fill_22_P.2",
            "fill_23_P.2"
        ]), {
            "fill_24_P.2": dd,
            "fill_25_P.2": mm,
            "fill_26_P.2": yy
        });
    }
    if (c.email) Object.assign(v, {
        "fill_27_P.2": c.email,
        "fill_28_P.2": dd,
        "fill_29_P.2": mm,
        "fill_30_P.2": yy
    });
    if (c.idNumber && isHkid(c.idNumber)) Object.assign(v, {
        "fill_31_P.2": partialId(c.idNumber),
        "fill_32_P.2": dd,
        "fill_33_P.2": mm,
        "fill_34_P.2": yy
    });
    else if (c.idNumber) Object.assign(v, {
        "fill_35_P.2": c.passportCountry ?? "",
        "fill_36_P.2": partialId(c.idNumber),
        "fill_37_P.2": dd,
        "fill_38_P.2": mm,
        "fill_39_P.2": yy
    });
    v["fill_30_P.3"] = d.signer.name;
    v["fill_31_P.3"] = dateParts(d.signDate).join("/");
    return v;
}
function mapND4(d) {
    const o = d.officer, n = nameParts(o.nameEn), [dd, mm, yy] = dateParts(d.date);
    return {
        "fill_1_P.1": d.brNumber,
        "fill_2_P.1": d.companyName,
        ...cap(o.capacity, [
            "cb_1_P.1",
            "cb_2_P.1",
            "cb_3_P.1"
        ]),
        "fill_4_P.1": o.nameZh ?? "",
        "fill_5_P.1": n.surname,
        "fill_6_P.1": n.other,
        [isHkid(o.idNumber) ? "fill_7_P.1" : "fill_8_P.1"]: partialId(o.idNumber),
        "fill_11_P.1": dd,
        "fill_12_P.1": mm,
        "fill_13_P.1": yy,
        ...presentor(d.presentor, [
            "fill_14_P.1",
            "fill_15_P.1",
            "fill_16_P.1",
            "fill_17_P.1",
            "fill_18_P.1",
            "fill_19_P.1"
        ])
    };
}
function mapNDR1(d) {
    return {
        "fill_1_P.1": d.brNumber,
        "fill_2_P.1": d.companyName,
        "cb_1_P.1": d.applicant === "company",
        "cb_2_P.1": d.applicant === "director",
        "cb_3_P.1": d.applicant === "member",
        "fill_4_P.1": d.presentor.name,
        "fill_5_P.1": d.presentor.address,
        "fill_8_P.1": d.presentor.tel,
        "fill_10_P.1": d.presentor.email,
        "fill_11_P.1": d.presentor.reference
    };
}
function mapNSC1(d) {
    const [fd, fm, fy] = dateParts(d.from), [td, tm, ty] = dateParts(d.to);
    const v = {
        "fill_2_P.1": d.companyName,
        "fill_3_P.1": fd,
        "fill_4_P.1": fm,
        "fill_5_P.1": fy,
        "fill_6_P.1": td,
        "fill_7_P.1": tm,
        "fill_8_P.1": ty,
        "cb_1_P.1": d.increase > 0,
        "cb_2_P.1": d.increase <= 0,
        "fill_9_P.1": d.currency,
        "fill_10_P.1": d.increase.toLocaleString("en-US"),
        ...presentor(d.presentor, [
            "fill_30_P.1",
            "fill_31_P.1",
            "fill_32_P.1",
            "fill_33_P.1",
            "fill_34_P.1",
            "fill_35_P.1"
        ])
    };
    for (const p of [
        1,
        2,
        3,
        7
    ])v[`fill_1_P.${p}`] = d.brNumber;
    d.cashRows.slice(0, 3).forEach((r, i)=>{
        const b = 15 + i * 5;
        Object.assign(v, {
            [`fill_${b}_P.1`]: r.className,
            [`fill_${b + 1}_P.1`]: r.currency,
            [`fill_${b + 2}_P.1`]: r.number.toLocaleString("en-US"),
            [`fill_${b + 3}_P.1`]: String(r.paidEach),
            [`fill_${b + 4}_P.1`]: String(r.unpaidEach)
        });
    });
    v["cb_1_P.3"] = true;
    d.capital.slice(0, 3).forEach((r, i)=>{
        const b = 2 + i * 6;
        Object.assign(v, {
            [`fill_${b}_P.3`]: r.className,
            [`fill_${b + 1}_P.3`]: r.currency,
            [`fill_${b + 2}_P.3`]: r.totalNumber.toLocaleString("en-US"),
            [`fill_${b + 3}_P.3`]: r.totalAmount.toLocaleString("en-US"),
            [`fill_${b + 4}_P.3`]: r.paidUp.toLocaleString("en-US"),
            [`fill_${b + 5}_P.3`]: (r.totalAmount - r.paidUp).toLocaleString("en-US")
        });
    });
    v["fill_27_P.3"] = d.signer.name;
    v["fill_28_P.3"] = dateParts(d.signDate).join("/");
    const cls = d.allottees[0]?.className ?? "";
    v["fill_2_P.7"] = cls;
    v["fill_3_P.7"] = d.allottees.filter((a)=>a.className === cls).reduce((s, a)=>s + a.shares, 0).toLocaleString("en-US");
    d.allottees.slice(0, 2).forEach((a, i)=>{
        const n = nameParts(a.nameEn), addr = splitAddress(a.address);
        const f = i === 0 ? {
            zh: 4,
            sur: 5,
            oth: 6,
            corp: 7,
            addr: [
                8,
                9,
                10,
                11,
                12
            ],
            n: 13
        } : {
            zh: 15,
            sur: 16,
            oth: 17,
            corp: 18,
            addr: [
                19,
                20,
                21,
                22,
                23
            ],
            n: 24
        };
        Object.assign(v, {
            [`fill_${f.zh}_P.7`]: a.nameZh ?? "",
            ...a.corporate ? {
                [`fill_${f.corp}_P.7`]: a.nameEn
            } : {
                [`fill_${f.sur}_P.7`]: n.surname,
                [`fill_${f.oth}_P.7`]: n.other
            },
            ...addrFields(addr, f.addr.map((x)=>`fill_${x}_P.7`)),
            [`fill_${f.n}_P.7`]: a.shares.toLocaleString("en-US")
        });
    });
    return v;
}
function mapNAR1(d) {
    const [dd, mm, yy] = dateParts(d.madeUpTo), ro = splitAddress(d.registeredOffice);
    const v = {
        "fill_2_P.1": d.companyName,
        "fill_3_P.1": d.businessName ?? "",
        "cb_1_P.1": d.type === "private",
        "cb_2_P.1": d.type === "public",
        "cb_3_P.1": d.type === "guarantee",
        "fill_4_P.1": d.natureCode ?? "",
        "fill_5_P.1": d.natureDescription ?? "",
        "fill_6_P.1": dd,
        "fill_7_P.1": mm,
        "fill_8_P.1": yy,
        "fill_15_P.1": ro.flat,
        "fill_16_P.1": ro.building,
        "fill_17_P.1": ro.street,
        "fill_18_P.1": ro.district,
        ...presentor(d.presentor, [
            "fill_19_P.1",
            "fill_20_P.1",
            "fill_21_P.1",
            "fill_22_P.1",
            "fill_23_P.1",
            "fill_24_P.1"
        ]),
        "fill_2_P.2": d.email,
        "fill_3_P.2": (d.phone ?? "").replace(/^\+852\s*/, ""),
        "fill_4_P.2": d.charges
    };
    for (const p of [
        1,
        2,
        3,
        4,
        5,
        6,
        7,
        8
    ])v[`fill_1_P.${p}`] = d.brNumber;
    d.capital.slice(0, 4).forEach((r, i)=>{
        const b = 6 + i * 5;
        Object.assign(v, {
            [`fill_${b}_P.2`]: r.className,
            [`fill_${b + 1}_P.2`]: r.currency,
            [`fill_${b + 2}_P.2`]: r.totalNumber.toLocaleString("en-US"),
            [`fill_${b + 3}_P.2`]: r.totalAmount.toLocaleString("en-US"),
            [`fill_${b + 4}_P.2`]: r.paidUp.toLocaleString("en-US")
        });
    });
    const cur = d.capital[0]?.currency ?? "HKD";
    Object.assign(v, {
        "fill_27_P.2": cur,
        "fill_28_P.2": d.capital.reduce((s, r)=>s + r.totalAmount, 0).toLocaleString("en-US"),
        "fill_29_P.2": d.capital.reduce((s, r)=>s + r.paidUp, 0).toLocaleString("en-US")
    });
    const s = d.secretary;
    if (s && !s.corporate) {
        const n = nameParts(s.nameEn), a = splitAddress(s.address);
        Object.assign(v, {
            "fill_2_P.3": s.nameZh ?? "",
            "fill_3_P.3": n.surname,
            "fill_4_P.3": n.other,
            "fill_9_P.3": a.flat,
            "fill_10_P.3": a.building,
            "fill_11_P.3": a.street,
            "fill_12_P.3": a.district,
            "fill_13_P.3": s.email ?? "",
            "fill_14_P.3": partialId(s.idNumber),
            "fill_17_P.3": s.tcspLicence ?? ""
        });
    } else if (s) {
        const a = splitAddress(s.address);
        Object.assign(v, {
            "fill_2_P.4": s.nameZh ?? "",
            "fill_3_P.4": s.nameEn,
            "fill_4_P.4": a.flat,
            "fill_5_P.4": a.building,
            "fill_6_P.4": a.street,
            "fill_7_P.4": a.district,
            "fill_8_P.4": s.email ?? "",
            "fill_9_P.4": s.brNumber ?? "",
            "fill_10_P.4": s.tcspLicence ?? ""
        });
    }
    const dir = d.directors.find((x)=>x.capacity !== "secretary");
    if (dir) {
        const n = nameParts(dir.nameEn), a = splitAddress(dir.correspondenceAddress);
        Object.assign(v, {
            "cb_1_P.5": dir.capacity === "director",
            "cb_2_P.5": dir.capacity === "alternate",
            "fill_3_P.5": dir.nameZh ?? "",
            "fill_4_P.5": n.surname,
            "fill_5_P.5": n.other,
            ...addrFields(a, [
                "fill_10_P.5",
                "fill_11_P.5",
                "fill_12_P.5",
                "fill_13_P.5",
                "fill_14_P.5"
            ]),
            "fill_15_P.5": dir.email ?? "",
            ...isHkid(dir.idNumber) ? {
                "fill_16_P.5": partialId(dir.idNumber)
            } : {
                "fill_17_P.5": dir.passportCountry ?? "",
                "fill_18_P.5": partialId(dir.idNumber)
            }
        });
    }
    v["cb_1_P.8"] = true; // members listed in Schedule 1
    v["cb_4_P.8"] = d.type === "private";
    v["fill_11_P.8"] = d.signer.name;
    v["fill_12_P.8"] = dateParts(d.signDate).join("/");
    const m = d.members[0];
    if (m) {
        Object.assign(v, {
            "fill_1_P.9": dd,
            "fill_2_P.9": mm,
            "fill_3_P.9": yy,
            "fill_4_P.9": d.brNumber,
            "fill_5_P.9": m.className,
            "fill_6_P.9": m.totalInClass.toLocaleString("en-US")
        });
        m.rows.slice(0, 2).forEach((r, i)=>{
            const n = nameParts(r.nameEn), a = splitAddress(r.address);
            const f = i === 0 ? {
                zh: 7,
                sur: 8,
                oth: 9,
                corp: 10,
                addr: [
                    11,
                    12,
                    13,
                    14,
                    15
                ],
                rem: 17,
                n: 16
            } : {
                zh: 18,
                sur: 19,
                oth: 20,
                corp: 21,
                addr: [
                    22,
                    23,
                    24,
                    25,
                    26
                ],
                rem: 28,
                n: 27
            };
            Object.assign(v, {
                [`fill_${f.zh}_P.9`]: r.nameZh ?? "",
                ...r.corporate ? {
                    [`fill_${f.corp}_P.9`]: r.nameEn
                } : {
                    [`fill_${f.sur}_P.9`]: n.surname,
                    [`fill_${f.oth}_P.9`]: n.other
                },
                ...addrFields(a, f.addr.map((x)=>`fill_${x}_P.9`)),
                [`fill_${f.n}_P.9`]: r.shares.toLocaleString("en-US"),
                [`fill_${f.rem}_P.9`]: r.remarks ?? ""
            });
        });
        v["fill_29_P.9"] = "1";
        v["fill_30_P.9"] = "1";
    }
    return v;
}
function mapNNC1(d) {
    const a = splitAddress(d.registeredOffice);
    const v = {
        "fill_1_P.1": d.nameEn,
        "fill_2_P.1": d.nameZh ?? "",
        "cb_1_P.1": d.type === "private",
        "cb_2_P.1": d.type === "public",
        "fill_3_P.1": d.natureCode ?? "",
        "fill_4_P.1": d.natureDescription,
        "fill_5_P.1": a.flat,
        "fill_6_P.1": a.building,
        "fill_7_P.1": a.street,
        "fill_8_P.1": a.district,
        "fill_9_P.1": "",
        "fill_10_P.1": d.presentor.name,
        "fill_11_P.1": d.presentor.address,
        "fill_12_P.1": d.presentor.tel,
        "fill_14_P.1": d.presentor.email,
        "fill_15_P.1": d.presentor.reference,
        "fill_1_P.2": d.email,
        "fill_2_P.2": d.phone.replace(/^\+852\s*/, "")
    };
    d.capital.slice(0, 2).forEach((r, i)=>{
        const b = 3 + i * 6;
        Object.assign(v, {
            [`fill_${b}_P.2`]: r.className,
            [`fill_${b + 1}_P.2`]: r.number.toLocaleString("en-US"),
            [`fill_${b + 2}_P.2`]: r.currency,
            [`fill_${b + 3}_P.2`]: r.subscribed.toLocaleString("en-US"),
            [`fill_${b + 4}_P.2`]: r.paidUp.toLocaleString("en-US"),
            [`fill_${b + 5}_P.2`]: (r.subscribed - r.paidUp).toLocaleString("en-US")
        });
    });
    Object.assign(v, {
        "fill_15_P.2": d.capital.reduce((s, r)=>s + r.number, 0).toLocaleString("en-US"),
        "fill_16_P.2": d.capital[0]?.currency ?? "HKD",
        "fill_17_P.2": d.capital.reduce((s, r)=>s + r.subscribed, 0).toLocaleString("en-US"),
        "fill_18_P.2": d.capital.reduce((s, r)=>s + r.paidUp, 0).toLocaleString("en-US"),
        "fill_19_P.2": d.capital.reduce((s, r)=>s + r.subscribed - r.paidUp, 0).toLocaleString("en-US")
    });
    return v;
}
async function listFieldNames(form) {
    const doc = await __TURBOPACK__imported__module__$5b$externals$5d2f$pdf$2d$lib__$5b$external$5d$__$28$pdf$2d$lib$2c$__cjs$2c$__$5b$project$5d2f$node_modules$2f$pdf$2d$lib$29$__["PDFDocument"].load((0, __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$fs__$5b$external$5d$__$28$node$3a$fs$2c$__cjs$29$__["readFileSync"])(__TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$path__$5b$external$5d$__$28$node$3a$path$2c$__cjs$29$__["default"].join(FORMS_DIR, `${form}.pdf`)), {
        ignoreEncryption: true
    });
    return new Set(doc.getForm().getFields().map((f)=>f.getName()));
}
async function fillForm(form, values, opts = {}) {
    const doc = await __TURBOPACK__imported__module__$5b$externals$5d2f$pdf$2d$lib__$5b$external$5d$__$28$pdf$2d$lib$2c$__cjs$2c$__$5b$project$5d2f$node_modules$2f$pdf$2d$lib$29$__["PDFDocument"].load((0, __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$fs__$5b$external$5d$__$28$node$3a$fs$2c$__cjs$29$__["readFileSync"])(__TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$path__$5b$external$5d$__$28$node$3a$path$2c$__cjs$29$__["default"].join(FORMS_DIR, `${form}.pdf`)), {
        ignoreEncryption: true
    });
    const pdfForm = doc.getForm();
    const fonts = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$documents$2f$fonts$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["embedFonts"])(doc, "tc");
    const unknown = [];
    for (const [name, val] of Object.entries(values)){
        if (val === undefined || val === null) continue;
        let field;
        try {
            field = pdfForm.getField(name);
        } catch  {
            unknown.push(name);
            continue;
        }
        if (field instanceof __TURBOPACK__imported__module__$5b$externals$5d2f$pdf$2d$lib__$5b$external$5d$__$28$pdf$2d$lib$2c$__cjs$2c$__$5b$project$5d2f$node_modules$2f$pdf$2d$lib$29$__["PDFCheckBox"]) {
            if (val === true) field.check();
            else field.uncheck();
        } else if (field instanceof __TURBOPACK__imported__module__$5b$externals$5d2f$pdf$2d$lib__$5b$external$5d$__$28$pdf$2d$lib$2c$__cjs$2c$__$5b$project$5d2f$node_modules$2f$pdf$2d$lib$29$__["PDFTextField"]) {
            const text = String(val);
            field.setText(text);
            field.updateAppearances(fonts.pick(text || "A"));
        }
    }
    if (unknown.length) throw new Error(`${form}: unknown fields ${unknown.join(", ")}`);
    if (opts.flatten) pdfForm.flatten();
    return Buffer.from(await doc.save());
}
async function readFormValues(pdf) {
    const doc = await __TURBOPACK__imported__module__$5b$externals$5d2f$pdf$2d$lib__$5b$external$5d$__$28$pdf$2d$lib$2c$__cjs$2c$__$5b$project$5d2f$node_modules$2f$pdf$2d$lib$29$__["PDFDocument"].load(pdf, {
        ignoreEncryption: true
    });
    const out = {};
    for (const f of doc.getForm().getFields()){
        if (f instanceof __TURBOPACK__imported__module__$5b$externals$5d2f$pdf$2d$lib__$5b$external$5d$__$28$pdf$2d$lib$2c$__cjs$2c$__$5b$project$5d2f$node_modules$2f$pdf$2d$lib$29$__["PDFTextField"]) {
            const t = f.getText();
            if (t) out[f.getName()] = t;
        } else if (f instanceof __TURBOPACK__imported__module__$5b$externals$5d2f$pdf$2d$lib__$5b$external$5d$__$28$pdf$2d$lib$2c$__cjs$2c$__$5b$project$5d2f$node_modules$2f$pdf$2d$lib$29$__["PDFCheckBox"] && f.isChecked()) out[f.getName()] = true;
    }
    return out;
}
}),
"[project]/src/documents/fonts.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "embedFonts",
    ()=>embedFonts
]);
// Fonts with CJK coverage for generated PDFs. Noto Sans TC (Hong Kong glyph shapes) is the
// default; text containing characters TC lacks (some Simplified forms) falls back to Noto Sans SC.
var __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$fs__$5b$external$5d$__$28$node$3a$fs$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/node:fs [external] (node:fs, cjs)");
var __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$path__$5b$external$5d$__$28$node$3a$path$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/node:path [external] (node:path, cjs)");
var __TURBOPACK__imported__module__$5b$externals$5d2f40$pdf$2d$lib$2f$fontkit__$5b$external$5d$__$2840$pdf$2d$lib$2f$fontkit$2c$__cjs$2c$__$5b$project$5d2f$node_modules$2f40$pdf$2d$lib$2f$fontkit$29$__ = __turbopack_context__.i("[externals]/@pdf-lib/fontkit [external] (@pdf-lib/fontkit, cjs, [project]/node_modules/@pdf-lib/fontkit)");
;
;
;
const DIR = __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$path__$5b$external$5d$__$28$node$3a$path$2c$__cjs$29$__["default"].join(process.cwd(), "assets/fonts");
const cache = new Map();
const file = (n)=>{
    if (!cache.has(n)) cache.set(n, (0, __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$fs__$5b$external$5d$__$28$node$3a$fs$2c$__cjs$29$__["readFileSync"])(__TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$path__$5b$external$5d$__$28$node$3a$path$2c$__cjs$29$__["default"].join(DIR, n)));
    return cache.get(n);
};
async function embedFonts(doc, lang = "tc") {
    doc.registerFontkit(__TURBOPACK__imported__module__$5b$externals$5d2f40$pdf$2d$lib$2f$fontkit__$5b$external$5d$__$2840$pdf$2d$lib$2f$fontkit$2c$__cjs$2c$__$5b$project$5d2f$node_modules$2f40$pdf$2d$lib$2f$fontkit$29$__["default"]);
    const primary = lang === "sc" ? "SC" : "TC";
    const other = primary === "TC" ? "SC" : "TC";
    const regular = await doc.embedFont(file(`NotoSans${primary}-Regular.ttf`), {
        subset: true
    });
    const bold = await doc.embedFont(file(`NotoSans${primary}-Bold.ttf`), {
        subset: true
    });
    let fbR = null, fbB = null;
    const primarySet = new Set(regular.getCharacterSet());
    const fallback = async ()=>{
        fbR ??= await doc.embedFont(file(`NotoSans${other}-Regular.ttf`), {
            subset: true
        });
        fbB ??= await doc.embedFont(file(`NotoSans${other}-Bold.ttf`), {
            subset: true
        });
    };
    await fallback();
    return {
        regular,
        bold,
        pick: (text, b = false)=>{
            for (const ch of text)if (ch.charCodeAt(0) > 0x2e7f && !primarySet.has(ch.codePointAt(0))) return b ? fbB : fbR;
            return b ? bold : regular;
        }
    };
}
}),
"[project]/src/documents/generate.ts [app-route] (ecmascript) <locals>", ((__turbopack_context__) => {
"use strict";

// Generates a task's documents: official CR forms (filled PDFs) and templated resolutions,
// in the client's document language, filed on the task and the client.
__turbopack_context__.s([
    "formValues",
    ()=>formValues,
    "generateForTask",
    ()=>generateForTask,
    "presentorOf",
    ()=>presentorOf,
    "signerOf",
    ()=>signerOf
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/db/schema.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$crypto$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/crypto.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$documents$2f$context$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/documents/context.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$documents$2f$builder$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/documents/builder.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$documents$2f$templates$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/documents/templates.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$documents$2f$cr$2d$forms$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/documents/cr-forms.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$dates$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/domain/dates.ts [app-route] (ecmascript)");
;
;
;
;
;
;
;
function presentorOf(c) {
    return {
        name: c.firm.legalName,
        address: c.firm.address ?? "",
        tel: c.firm.phone ?? "",
        email: c.firm.email ?? "",
        reference: c.task.id
    };
}
function signerOf(c) {
    if (c.secretary?.personId === "per_firm") return {
        name: `Karen Yip for ${c.firm.legalName}`,
        capacity: "secretary"
    };
    const d = c.directors[0];
    return {
        name: d?.person.nameEn ?? "",
        capacity: "director"
    };
}
const eff = (c)=>c.task.effectiveDate ?? c.values.effDate ?? c.today;
const sameAsRO = (s)=>!s || /same as|registered office|註冊辦事處|注册办事处/i.test(s);
function officerFromPerson(c, capacity) {
    const p = c.person;
    const corr = sameAsRO(c.values.corrAddr ?? p.correspondenceAddress) ? c.client.regOfficeEn : c.values.corrAddr ?? p.correspondenceAddress;
    return {
        capacity,
        nameEn: p.nameEn,
        nameZh: p.nameZh,
        correspondenceAddress: corr,
        email: p.email,
        idNumber: p.idNumber,
        passportCountry: p.idCountry,
        residentialAddress: p.residentialAddress
    };
}
function splitName(s) {
    if (!s) return {
        en: null,
        zh: null
    };
    const zh = s.match(/[㐀-鿿][㐀-鿿（）()\s]*有限公司/)?.[0] ?? s.match(/[㐀-鿿]{2,}/)?.[0] ?? null;
    const en = s.match(/[A-Za-z][A-Za-z0-9&.,'()\- ]*Limited/i)?.[0] ?? (zh ? null : s.trim());
    return {
        en: en?.trim() ?? null,
        zh
    };
}
function formValues(form, c) {
    const base = {
        brNumber: c.br?.brNumber ?? "",
        companyName: c.client.nameEn + (c.client.nameTc ? `\n${c.client.nameTc}` : ""),
        presentor: presentorOf(c),
        signer: signerOf(c),
        signDate: c.today
    };
    const firmSecretary = {
        nameEn: c.firm.legalName,
        nameZh: c.firm.legalNameZh,
        address: c.firm.address ?? "",
        email: c.firm.email ?? "",
        tcspLicence: c.firm.tcspLicence ?? "",
        date: eff(c),
        signatory: "Karen Yip"
    };
    const capital = c.capital.map((x)=>({
            className: x.name,
            currency: x.currency,
            totalNumber: x.issued,
            totalAmount: x.paidUpCents / 100,
            paidUp: x.paidUpCents / 100
        }));
    switch(form){
        case "ND2A":
            if (c.pb.id === "hk.appointDirector") return (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$documents$2f$cr$2d$forms$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["mapND2A"])({
                ...base,
                appointment: {
                    ...officerFromPerson(c, "director"),
                    date: eff(c),
                    alreadyOfficer: false
                }
            });
            if (c.pb.id === "hk.resignDirector") return (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$documents$2f$cr$2d$forms$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["mapND2A"])({
                ...base,
                cessation: {
                    ...officerFromPerson(c, "director"),
                    date: c.values.lastDay ?? eff(c),
                    reason: "resignation",
                    continues: false
                }
            });
            return (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$documents$2f$cr$2d$forms$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["mapND2A"])({
                ...base,
                corporateSecretary: firmSecretary
            });
        case "NR1":
            return (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$documents$2f$cr$2d$forms$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["mapNR1"])({
                ...base,
                newAddress: c.pb.id === "hk.transferIn" ? c.firm.address ?? "" : c.values.newAddr ?? "",
                effectiveDate: eff(c)
            });
        case "NNC2":
            {
                const n = splitName(c.values.newName);
                return (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$documents$2f$cr$2d$forms$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["mapNNC2"])({
                    ...base,
                    existingEn: c.client.nameEn,
                    existingZh: c.client.nameTc,
                    resolutionDate: c.today,
                    newEn: n.en,
                    newZh: n.zh
                });
            }
        case "ND2B":
            return (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$documents$2f$cr$2d$forms$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["mapND2B"])({
                ...base,
                officer: officerFromPerson(c, "director"),
                effectiveDate: eff(c),
                changes: {
                    correspondenceAddress: c.values.corrAddr,
                    idNumber: c.values.idNo && c.values.idNo !== "On file" ? c.values.idNo : undefined
                }
            });
        case "ND4":
            return (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$documents$2f$cr$2d$forms$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["mapND4"])({
                ...base,
                officer: officerFromPerson(c, "director"),
                date: c.values.lastDay ?? eff(c)
            });
        case "NDR1":
            return (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$documents$2f$cr$2d$forms$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["mapNDR1"])({
                ...base,
                applicant: "company"
            });
        case "NSC1":
            return (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$documents$2f$cr$2d$forms$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["mapNSC1"])({
                ...base,
                from: eff(c),
                to: eff(c),
                currency: "HKD",
                increase: 0,
                cashRows: [],
                capital,
                allottees: []
            });
        case "NAR1":
            {
                const year = Number(c.today.slice(0, 4));
                const madeUpTo = c.client.incorporatedOn ? `${year}${c.client.incorporatedOn.slice(4)}` : c.today;
                const byClass = new Map();
                for (const m of c.members)byClass.set(m.className, [
                    ...byClass.get(m.className) ?? [],
                    m
                ]);
                return (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$documents$2f$cr$2d$forms$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["mapNAR1"])({
                    ...base,
                    businessName: null,
                    type: "private",
                    natureDescription: c.client.businessNatureEn,
                    madeUpTo,
                    registeredOffice: c.client.regOfficeEn ?? "",
                    email: c.firm.email ?? "",
                    phone: c.firm.phone,
                    charges: "0",
                    capital,
                    secretary: c.secretary?.personId === "per_firm" ? {
                        corporate: true,
                        nameEn: c.firm.legalName,
                        nameZh: c.firm.legalNameZh,
                        address: c.firm.address ?? "",
                        email: c.firm.email,
                        tcspLicence: c.firm.tcspLicence
                    } : undefined,
                    directors: c.directors.map((x)=>({
                            capacity: "director",
                            nameEn: x.person.nameEn,
                            nameZh: x.person.nameZh,
                            correspondenceAddress: x.person.correspondenceAddress ?? c.client.regOfficeEn,
                            email: x.person.email,
                            idNumber: x.protected.idNumber
                        })),
                    members: [
                        ...byClass.entries()
                    ].map(([cls, ms])=>({
                            className: cls,
                            totalInClass: ms.reduce((s, m)=>s + m.quantity, 0),
                            rows: ms.map((m)=>({
                                    nameEn: m.name,
                                    nameZh: m.nameZh,
                                    address: c.client.regOfficeEn ?? "",
                                    shares: m.quantity
                                }))
                        }))
                });
            }
        case "NNC1":
            {
                const n = splitName(c.values.propName);
                return (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$documents$2f$cr$2d$forms$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["mapNNC1"])({
                    nameEn: n.en ?? c.client.nameEn,
                    nameZh: n.zh,
                    type: "private",
                    natureDescription: c.values.business ?? "",
                    registeredOffice: c.firm.address ?? "",
                    email: c.firm.email ?? "",
                    phone: c.firm.phone ?? "",
                    capital: [],
                    presentor: presentorOf(c)
                });
            }
        default:
            throw new Error(`No mapping for form ${form}`);
    }
}
async function generateForTask(ctx, taskId) {
    const c = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$documents$2f$context$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["loadDocContext"])(ctx, taskId);
    const out = [];
    for (const ref of c.pb.documents){
        let pdf, text = "", signatureFields = [];
        if (ref.template.startsWith("cr:")) {
            const form = ref.template.slice(3);
            pdf = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$documents$2f$cr$2d$forms$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["fillForm"])(form, formValues(form, c));
            text = `${ref.name} (official Companies Registry form ${form}, pre-filled)`;
        } else {
            const tpl = __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$documents$2f$templates$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["TEMPLATES"][ref.template];
            if (!tpl) continue;
            const built = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$documents$2f$builder$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["buildPdf"])(tpl(c), {
                lang: c.lang,
                header: `${c.client.nameEn} · ${ref.name}`,
                footer: `Prepared by ${c.firm.legalName} · ${c.task.id}`
            });
            pdf = built.pdf;
            text = built.text;
            signatureFields = built.signatureFields;
        }
        const id = ctx.ids.next("doc");
        const key = `documents/${c.client.id}/${id}.pdf`;
        await ctx.storage.put(key, pdf);
        await ctx.db.insert(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["document"]).values({
            id,
            firmId: ctx.firmId,
            clientId: c.client.id,
            taskId,
            personId: c.person?.id ?? null,
            kind: ref.template.startsWith("cr:") ? "form" : ref.template.includes("resolution") ? "resolution" : ref.template.includes("certificate") ? "certificate" : "letter",
            title: ref.name,
            storageKey: key,
            mime: "application/pdf",
            sha256: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$crypto$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["Crypto"].sha256(pdf),
            language: c.lang,
            source: "generated",
            extractedText: text,
            createdAt: ctx.clock.now()
        });
        out.push({
            id,
            title: ref.name,
            template: ref.template,
            signers: ref.signers,
            signatureFields
        });
    }
    return out;
}
;
}),
"[project]/src/documents/invoice-pdf.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "renderInvoicePdf",
    ()=>renderInvoicePdf
]);
// Invoice PDF on the firm's letterhead with bilingual headings and payment instructions.
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/drizzle-orm/sql/expressions/conditions.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$select$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/drizzle-orm/sql/expressions/select.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$externals$5d2f$pdf$2d$lib__$5b$external$5d$__$28$pdf$2d$lib$2c$__cjs$2c$__$5b$project$5d2f$node_modules$2f$pdf$2d$lib$29$__ = __turbopack_context__.i("[externals]/pdf-lib [external] (pdf-lib, cjs, [project]/node_modules/pdf-lib)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/db/schema.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$firm$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/domain/firm.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$labels$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/domain/labels.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$dates$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/domain/dates.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$documents$2f$fonts$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/documents/fonts.ts [app-route] (ecmascript)");
;
;
;
;
;
;
;
async function renderInvoicePdf(ctx, invoiceId) {
    const inv = await ctx.db.query.invoice.findFirst({
        where: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["invoice"].id, invoiceId)
    });
    const lines = await ctx.db.select().from(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["invoiceLine"]).where((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["invoiceLine"].invoiceId, invoiceId)).orderBy((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$select$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["asc"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["invoiceLine"].sort));
    const cl = await ctx.db.query.client.findFirst({
        where: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["client"].id, inv.clientId)
    });
    const firm = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$firm$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getFirm"])(ctx);
    const bank = await ctx.bank.accountDetails();
    const doc = await __TURBOPACK__imported__module__$5b$externals$5d2f$pdf$2d$lib__$5b$external$5d$__$28$pdf$2d$lib$2c$__cjs$2c$__$5b$project$5d2f$node_modules$2f$pdf$2d$lib$29$__["PDFDocument"].create();
    const fonts = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$documents$2f$fonts$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["embedFonts"])(doc, "tc");
    const { regular, bold } = fonts;
    const page = doc.addPage([
        595,
        842
    ]);
    const ink = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$pdf$2d$lib__$5b$external$5d$__$28$pdf$2d$lib$2c$__cjs$2c$__$5b$project$5d2f$node_modules$2f$pdf$2d$lib$29$__["rgb"])(0.086, 0.094, 0.114), muted = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$pdf$2d$lib__$5b$external$5d$__$28$pdf$2d$lib$2c$__cjs$2c$__$5b$project$5d2f$node_modules$2f$pdf$2d$lib$29$__["rgb"])(0.42, 0.45, 0.5), line = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$pdf$2d$lib__$5b$external$5d$__$28$pdf$2d$lib$2c$__cjs$2c$__$5b$project$5d2f$node_modules$2f$pdf$2d$lib$29$__["rgb"])(0.9, 0.91, 0.925);
    const text = (s, x, y, size = 10, font = regular, color = ink)=>page.drawText(s, {
            x,
            y,
            size,
            font: fonts.pick(s, font === bold),
            color
        });
    text(firm.legalName, 56, 790, 14, bold);
    if (firm.legalNameZh) text(firm.legalNameZh, 56, 772, 11);
    text(firm.address ?? "", 56, 756, 9, regular, muted);
    text(`TCSP licence ${firm.tcspLicence ?? ""}`, 56, 744, 9, regular, muted);
    text("INVOICE 發票", 400, 790, 16, bold);
    text(`No. ${inv.number}`, 400, 770, 10);
    const issued = inv.issuedOn ?? ctx.clock.today();
    text(`Date 日期: ${(0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$dates$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["fmtDate"])(issued)}`, 400, 756, 9);
    text(`Terms 付款條款: ${inv.termsDays ? `${inv.termsDays} days` : "On receipt"}`, 400, 744, 9);
    text("Bill to 客戶", 56, 700, 9, bold, muted);
    text(cl.nameEn, 56, 686, 11, bold);
    if (cl.nameTc) text(cl.nameTc, 56, 671, 10);
    let y = 630;
    page.drawLine({
        start: {
            x: 56,
            y: y + 14
        },
        end: {
            x: 539,
            y: y + 14
        },
        color: line,
        thickness: 1
    });
    text("Description 項目", 56, y, 9, bold, muted);
    text("Amount 金額", 470, y, 9, bold, muted);
    y -= 22;
    for (const l of lines){
        text(l.description.slice(0, 80), 56, y, 10);
        if (l.kind === "disbursement") text("Disbursement 代支費用", 56, y - 12, 8, regular, muted);
        text((0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$labels$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["money"])(l.amountCents, inv.currency), 470, y, 10);
        y -= l.kind === "disbursement" ? 30 : 22;
    }
    page.drawLine({
        start: {
            x: 56,
            y: y + 8
        },
        end: {
            x: 539,
            y: y + 8
        },
        color: line,
        thickness: 1
    });
    text("Total 總額", 380, y - 10, 11, bold);
    text((0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$labels$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["money"])(inv.totalCents, inv.currency), 470, y - 10, 11, bold);
    y -= 60;
    text("Payment 付款方法", 56, y, 10, bold);
    y -= 16;
    text("Please quote the invoice number as the payment reference. 請以發票號碼作為付款參考。", 56, y, 9, regular, muted);
    y -= 16;
    for (const [k, v] of Object.entries(bank)){
        text(`${k}: ${v}`, 56, y, 9);
        y -= 13;
    }
    return Buffer.from(await doc.save());
}
}),
"[project]/src/documents/templates.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

// Trilingual document templates (English, Traditional Chinese, Simplified Chinese, or
// bilingual English/Traditional). Wording is standard Hong Kong company secretarial
// boilerplate and is marked for company secretary review in the playbook library.
__turbopack_context__.s([
    "TEMPLATES",
    ()=>TEMPLATES,
    "boardResolution",
    ()=>boardResolution,
    "cnResolution",
    ()=>cnResolution,
    "consentToAct",
    ()=>consentToAct,
    "contractNotes",
    ()=>contractNotes,
    "engagementLetter",
    ()=>engagementLetter,
    "instrumentOfTransfer",
    ()=>instrumentOfTransfer,
    "membersResolution",
    ()=>membersResolution,
    "moActa",
    ()=>moActa,
    "registerOfDirectors",
    ()=>registerOfDirectors,
    "registerOfMembers",
    ()=>registerOfMembers,
    "resolutionClauses",
    ()=>resolutionClauses,
    "scrNotice",
    ()=>scrNotice,
    "shareCertificate",
    ()=>shareCertificate,
    "twResolution",
    ()=>twResolution
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$dates$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/domain/dates.ts [app-route] (ecmascript)");
;
const t = (en, tc, sc)=>({
        en,
        tc,
        sc
    });
function langs(c) {
    return c.lang === "bilingual" ? [
        "en",
        "tc"
    ] : [
        c.lang
    ];
}
function nm(c, l) {
    return (l === "en" ? c.client.nameEn : l === "tc" ? c.client.nameTc : c.client.nameSc) ?? c.client.nameEn;
}
function pname(p, l) {
    if (!p) return "";
    return l === "en" || !p.nameZh ? p.nameEn : `${p.nameZh}（${p.nameEn}）`;
}
function d(date, l) {
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$dates$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["fmtDate"])(date ?? "", l);
}
const eff = (c)=>c.task.effectiveDate ?? c.values.effDate ?? c.today;
function resolutionClauses(c, l) {
    const v = c.values, p = c.person, co = nm(c, l);
    switch(c.pb.id){
        case "hk.appointDirector":
            return [
                {
                    en: `THAT ${pname(p, l)} be and is hereby appointed as a director of the Company with effect from ${d(eff(c), l)}.`,
                    tc: `議決委任${pname(p, l)}為本公司董事，自${d(eff(c), l)}起生效。`,
                    sc: `议决委任${pname(p, l)}为本公司董事，自${d(eff(c), l)}起生效。`
                }[l],
                t("THAT any one director or the company secretary be authorised to sign and file Form ND2A and to update the register of directors.", "議決授權任何一名董事或公司秘書簽署及提交表格ND2A，並更新董事登記冊。", "议决授权任何一名董事或公司秘书签署及提交表格ND2A，并更新董事登记册。")[l]
            ];
        case "hk.resignDirector":
            return [
                {
                    en: `THAT the resignation of ${pname(p, l)} as a director of the Company with effect from ${d(v.lastDay ?? eff(c), l)} be and is hereby accepted.`,
                    tc: `議決接納${pname(p, l)}辭任本公司董事，自${d(v.lastDay ?? eff(c), l)}起生效。`,
                    sc: `议决接纳${pname(p, l)}辞任本公司董事，自${d(v.lastDay ?? eff(c), l)}起生效。`
                }[l],
                t("THAT the company secretary be instructed to file Form ND2A and update the register of directors, and the Company's bankers be notified.", "議決指示公司秘書提交表格ND2A及更新董事登記冊，並通知本公司往來銀行。", "议决指示公司秘书提交表格ND2A及更新董事登记册，并通知本公司往来银行。")[l]
            ];
        case "hk.changeSecretary":
        case "hk.transferIn":
            return [
                {
                    en: `THAT ${c.firm.legalName} be and is hereby appointed as company secretary of the Company with effect from ${d(eff(c), l)}.`,
                    tc: `議決委任${c.firm.legalNameZh ?? c.firm.legalName}為本公司之公司秘書，自${d(eff(c), l)}起生效。`,
                    sc: `议决委任${c.firm.legalNameZh ?? c.firm.legalName}为本公司之公司秘书，自${d(eff(c), l)}起生效。`
                }[l],
                ...c.pb.id === "hk.transferIn" ? [
                    {
                        en: `THAT the registered office of the Company be changed to ${c.firm.address} with effect from ${d(eff(c), l)}.`,
                        tc: `議決將本公司註冊辦事處更改為${c.firm.address}，自${d(eff(c), l)}起生效。`,
                        sc: `议决将本公司注册办事处更改为${c.firm.address}，自${d(eff(c), l)}起生效。`
                    }[l]
                ] : []
            ];
        case "hk.changeOffice":
            return [
                {
                    en: `THAT the registered office of the Company be changed to ${v.newAddr ?? ""} with effect from ${d(eff(c), l)}.`,
                    tc: `議決將本公司註冊辦事處更改為${v.newAddr ?? ""}，自${d(eff(c), l)}起生效。`,
                    sc: `议决将本公司注册办事处更改为${v.newAddr ?? ""}，自${d(eff(c), l)}起生效。`
                }[l],
                t("THAT the company secretary be authorised to file Form NR1 with the Companies Registry.", "議決授權公司秘書向公司註冊處提交表格NR1。", "议决授权公司秘书向公司注册处提交表格NR1。")[l]
            ];
        case "hk.changeName":
            return [
                {
                    en: `THAT the name of the Company be changed from "${co}" to "${v.newName ?? ""}".`,
                    tc: `議決將本公司名稱由「${co}」更改為「${v.newName ?? ""}」。`,
                    sc: `议决将本公司名称由「${co}」更改为「${v.newName ?? ""}」。`
                }[l]
            ];
        case "hk.allotShares":
            return [
                {
                    en: `THAT the directors be authorised to allot shares as follows: ${v.allotmentDetails ?? ""}, credited as fully paid, and that share certificates be issued.`,
                    tc: `議決授權董事按以下方式配發股份：${v.allotmentDetails ?? ""}，入賬列為繳足，並發出股票。`,
                    sc: `议决授权董事按以下方式配发股份：${v.allotmentDetails ?? ""}，入账列为缴足，并发出股票。`
                }[l]
            ];
        case "hk.transferShares":
            return [
                {
                    en: `THAT the transfer of shares described as follows be approved and registered upon due stamping: ${v.transferDetails ?? ""}.`,
                    tc: `議決批准並於妥為加蓋印花後登記以下股份轉讓：${v.transferDetails ?? ""}。`,
                    sc: `议决批准并于妥为加盖印花后登记以下股份转让：${v.transferDetails ?? ""}。`
                }[l],
                t("THAT the existing share certificate be cancelled and a new certificate be issued to the transferee.", "議決註銷原有股票，並向承讓人發出新股票。", "议决注销原有股票，并向承让人发出新股票。")[l]
            ];
        case "hk.agm":
            return [
                {
                    en: `THAT the audited financial statements and the directors' report for the period ended ${d(c.client.accountsLastMadeUpTo, l)} be received and approved.`,
                    tc: `議決省覽及批准截至${d(c.client.accountsLastMadeUpTo, l)}止期間之經審核財務報表及董事報告。`,
                    sc: `议决省览及批准截至${d(c.client.accountsLastMadeUpTo, l)}止期间之经审核财务报表及董事报告。`
                }[l],
                {
                    en: `THAT ${v.auditor ?? c.client.auditor ?? "the auditor"} be re-appointed as auditor of the Company and the directors be authorised to fix its remuneration.`,
                    tc: `議決續聘${v.auditor ?? c.client.auditor ?? "核數師"}為本公司核數師，並授權董事釐定其酬金。`,
                    sc: `议决续聘${v.auditor ?? c.client.auditor ?? "审计师"}为本公司审计师，并授权董事厘定其酬金。`
                }[l]
            ];
        case "hk.changeFye":
            return [
                {
                    en: `THAT the accounting reference date of the Company be changed to ${v.newFye ?? ""}.`,
                    tc: `議決將本公司的會計參照日期更改為${v.newFye ?? ""}。`,
                    sc: `议决将本公司的会计参照日期更改为${v.newFye ?? ""}。`
                }[l]
            ];
        case "hk.changeAuditor":
            return [
                {
                    en: `THAT ${v.newAuditor ?? ""} be appointed as auditor of the Company to hold office until the conclusion of the next general meeting.`,
                    tc: `議決委任${v.newAuditor ?? ""}為本公司核數師，任期至下屆成員大會結束為止。`,
                    sc: `议决委任${v.newAuditor ?? ""}为本公司审计师，任期至下届成员大会结束为止。`
                }[l]
            ];
        case "hk.amendArticles":
            return [
                {
                    en: `THAT the articles of association of the Company be amended as follows: ${v.articlesChange ?? ""}.`,
                    tc: `議決按以下方式修訂本公司組織章程細則：${v.articlesChange ?? ""}。`,
                    sc: `议决按以下方式修订本公司组织章程细则：${v.articlesChange ?? ""}。`
                }[l]
            ];
        case "hk.buyback":
            return [
                {
                    en: `THAT the Company buy back shares on the following terms: ${v.buybackDetails ?? ""}.`,
                    tc: `議決本公司按以下條款回購股份：${v.buybackDetails ?? ""}。`,
                    sc: `议决本公司按以下条款回购股份：${v.buybackDetails ?? ""}。`
                }[l]
            ];
        case "hk.bankSignatory":
            return [
                {
                    en: `THAT the bank mandate be amended as follows: ${v.bankMandate ?? ""}.`,
                    tc: `議決按以下方式修訂銀行授權：${v.bankMandate ?? ""}。`,
                    sc: `议决按以下方式修订银行授权：${v.bankMandate ?? ""}。`
                }[l]
            ];
        case "hk.dormant":
            return [
                t("THAT the Company be declared dormant under section 447 of the Companies Ordinance (Cap. 622).", "議決根據《公司條例》（第622章）第447條宣佈本公司為不活動公司。", "议决根据《公司条例》（第622章）第447条宣布本公司为不活动公司。")[l]
            ];
        case "hk.deregistration":
            return [
                t("THAT an application be made to the Registrar of Companies for the deregistration of the Company, all members having agreed.", "議決在全體成員同意下，向公司註冊處處長申請撤銷本公司註冊。", "议决在全体成员同意下，向公司注册处处长申请撤销本公司注册。")[l]
            ];
        case "hk.reserveDirector":
            return [
                {
                    en: `THAT ${pname(p, l)} be nominated as reserve director of the Company.`,
                    tc: `議決提名${pname(p, l)}為本公司後備董事。`,
                    sc: `议决提名${pname(p, l)}为本公司后备董事。`
                }[l]
            ];
        case "hk.incorporation":
            return [
                t("THAT the first directors, company secretary and registered office be as stated in the incorporation form; THAT share certificates be issued to the founder members; THAT a bank account be opened.", "議決首任董事、公司秘書及註冊辦事處以法團成立表格所載為準；議決向創辦成員發出股票；議決開立銀行賬戶。", "议决首任董事、公司秘书及注册办事处以法团成立表格所载为准；议决向创办成员发出股票；议决开立银行账户。")[l]
            ];
        default:
            return [
                `THAT ${c.task.title}.`
            ];
    }
}
const LBL = {
    boardRes: t("Written Resolutions of the Board of Directors", "董事會書面決議", "董事会书面决议"),
    membersRes: t("Written Resolutions of the Members", "成員書面決議", "成员书面决议"),
    specialRes: t("Special Resolution of the Members (passed as a written resolution)", "成員特別決議（以書面決議方式通過）", "成员特别决议（以书面决议方式通过）"),
    boardIntro: t("We, being all the directors of the Company, pass the following resolutions in writing under the articles of association of the Company:", "我們，即本公司全體董事，根據本公司組織章程細則以書面方式通過以下決議：", "我们，即本公司全体董事，根据本公司组织章程细则以书面方式通过以下决议："),
    membersIntro: t("We, being all the members of the Company entitled to vote, pass the following resolutions in writing under sections 548 to 564 of the Companies Ordinance (Cap. 622):", "我們，即本公司全體有權投票的成員，根據《公司條例》（第622章）第548至564條以書面方式通過以下決議：", "我们，即本公司全体有权投票的成员，根据《公司条例》（第622章）第548至564条以书面方式通过以下决议："),
    director: t("Director", "董事", "董事"),
    member: t("Member", "成員", "成员"),
    companyNo: t("Company number", "公司編號", "公司编号"),
    dated: t("Dated", "日期", "日期"),
    consent: t("Consent to Act as Director", "出任董事同意書", "出任董事同意书"),
    certificate: t("Share Certificate", "股票", "股票")
};
function header(c, title) {
    const out = [];
    for (const l of langs(c)){
        out.push({
            t: "title",
            text: nm(c, l)
        });
        out.push({
            t: "subtitle",
            text: `${LBL.companyNo[l]}: ${c.client.companyNumber ?? "—"}  ·  ${title[l]}`
        });
    }
    return out;
}
function boardResolution(c) {
    const blocks = header(c, LBL.boardRes);
    for (const l of langs(c)){
        blocks.push({
            t: "p",
            text: LBL.boardIntro[l]
        });
        blocks.push({
            t: "list",
            items: resolutionClauses(c, l),
            numbered: true
        });
    }
    blocks.push({
        t: "p",
        text: `${LBL.dated.en}: ${(0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$dates$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["fmtDate"])(c.today)}`
    });
    blocks.push({
        t: "sign",
        names: c.directors.map((x)=>({
                name: x.person.nameEn,
                caption: langs(c).map((l)=>LBL.director[l]).join(" / "),
                field: `sign:${x.personId}`
            }))
    });
    return blocks;
}
function membersResolution(c, special) {
    const blocks = header(c, special ? LBL.specialRes : LBL.membersRes);
    for (const l of langs(c)){
        blocks.push({
            t: "p",
            text: LBL.membersIntro[l]
        });
        blocks.push({
            t: "list",
            items: resolutionClauses(c, l),
            numbered: true
        });
    }
    const seen = new Set();
    blocks.push({
        t: "sign",
        names: c.members.filter((m)=>seen.has(m.personId) ? false : (seen.add(m.personId), true)).map((m)=>({
                name: m.name,
                caption: `${langs(c).map((l)=>LBL.member[l]).join(" / ")} (${m.quantity.toLocaleString("en-US")} ${m.className})`,
                field: `sign:${m.personId}`
            }))
    });
    return blocks;
}
function consentToAct(c) {
    const p = c.person;
    const blocks = header(c, LBL.consent);
    for (const l of langs(c)){
        blocks.push({
            t: "p",
            text: {
                en: `I, ${pname(p, "en")}, consent to act as a director of ${nm(c, "en")} with effect from ${d(eff(c), "en")}, and confirm that I have attained the age of 18 years.`,
                tc: `本人${pname(p, "tc")}同意出任${nm(c, "tc")}董事，自${d(eff(c), "tc")}起生效，並確認本人已年滿18歲。`,
                sc: `本人${pname(p, "sc")}同意出任${nm(c, "sc")}董事，自${d(eff(c), "sc")}起生效，并确认本人已年满18岁。`
            }[l]
        });
    }
    blocks.push({
        t: "sign",
        names: [
            {
                name: p?.nameEn ?? "",
                caption: "Director / 董事",
                field: p ? `sign:${p.id}` : undefined
            }
        ]
    });
    return blocks;
}
function shareCertificate(c) {
    const blocks = [];
    const holders = c.members.length ? c.members : [];
    holders.forEach((m, i)=>{
        if (i > 0) blocks.push({
            t: "pagebreak"
        });
        blocks.push(...header(c, LBL.certificate));
        blocks.push({
            t: "p",
            text: `Certificate No. ${String(i + 1).padStart(3, "0")}`
        });
        blocks.push({
            t: "p",
            text: `This is to certify that ${m.name}${m.nameZh ? ` (${m.nameZh})` : ""} is the registered holder of ${m.quantity.toLocaleString("en-US")} ${m.className} shares in the above-named company, subject to its articles of association.`
        });
        blocks.push({
            t: "p",
            text: `茲證明${m.nameZh ?? m.name}為上述公司${m.quantity.toLocaleString("en-US")}股${m.className === "Ordinary" ? "普通股" : m.className}的登記持有人，受公司組織章程細則規限。`
        });
        blocks.push({
            t: "sign",
            names: c.directors.slice(0, 2).map((x)=>({
                    name: x.person.nameEn,
                    caption: "Director / 董事",
                    field: `sign:${x.personId}`
                }))
        });
    });
    return blocks;
}
function instrumentOfTransfer(c) {
    const v = c.values;
    return [
        ...header(c, t("Instrument of Transfer", "轉讓文書", "转让文书")),
        {
            t: "p",
            text: `Transfer details: ${v.transferDetails ?? ""}`
        },
        {
            t: "p",
            text: "The transferor, in consideration of the sum stated above paid by the transferee, transfers to the transferee the shares described, to hold unto the transferee, subject to the conditions on which the transferor held them; and the transferee agrees to take the shares subject to the same conditions."
        },
        {
            t: "p",
            text: "轉讓人在承讓人支付上述代價後，將上述股份轉讓予承讓人，承讓人按轉讓人持有該等股份時的相同條件接受該等股份。"
        },
        {
            t: "small",
            text: "Stamp duty: 0.1% of the higher of consideration and value on each of the bought and sold notes (0.2% in total), plus HK$5 on this instrument. Stamp within 30 days (2 days for contract notes executed in Hong Kong). Verify with the company secretary."
        },
        {
            t: "sign",
            names: [
                {
                    name: "Transferor",
                    caption: "Transferor / 轉讓人",
                    field: "sign:transferor"
                },
                {
                    name: "Transferee",
                    caption: "Transferee / 承讓人",
                    field: "sign:transferee"
                }
            ]
        }
    ];
}
function contractNotes(c) {
    return [
        ...header(c, t("Bought and Sold Notes", "買賣單據", "买卖单据")),
        {
            t: "p",
            text: `Shares: ${c.values.transferDetails ?? ""}`
        },
        {
            t: "h",
            text: "Bought Note / 買入單據"
        },
        {
            t: "sign",
            names: [
                {
                    name: "Transferee",
                    caption: "Buyer / 買方",
                    field: "sign:transferee"
                }
            ]
        },
        {
            t: "h",
            text: "Sold Note / 賣出單據"
        },
        {
            t: "sign",
            names: [
                {
                    name: "Transferor",
                    caption: "Seller / 賣方",
                    field: "sign:transferor"
                }
            ]
        }
    ];
}
function engagementLetter(c) {
    return [
        {
            t: "title",
            text: c.firm.legalName
        },
        {
            t: "subtitle",
            text: `${c.firm.address} · TCSP licence ${c.firm.tcspLicence}`
        },
        {
            t: "h",
            text: `Engagement letter: ${c.client.nameEn}`
        },
        {
            t: "p",
            text: `We are pleased to act as company secretary and to provide a registered office address for ${c.client.nameEn}${c.client.companyNumber ? ` (company number ${c.client.companyNumber})` : ""} from the date of this letter, on the terms below.`
        },
        {
            t: "list",
            items: [
                "Services: company secretary, registered office, statutory registers, annual return and statutory filings, and other work you instruct us on, each quoted before we start.",
                "Customer due diligence: as a licensed trust or company service provider we must identify and verify the company, its directors and significant controllers before acting, and keep records for at least 5 years after the relationship ends (AMLO Cap. 615).",
                "Fees: as quoted per task; invoices are issued with each request, payable as stated on the invoice.",
                "Your responsibilities: to give us complete and accurate information promptly and to tell us of changes in directors, shareholders, controllers and addresses.",
                "Data: we handle personal data under the Personal Data (Privacy) Ordinance (Cap. 486).",
                "Termination: either side may end this engagement by 30 days' written notice."
            ]
        },
        {
            t: "sign",
            names: [
                {
                    name: c.firm.legalName,
                    caption: "For and on behalf of the firm"
                },
                ...c.directors.slice(0, 1).map((x)=>({
                        name: x.person.nameEn,
                        caption: `For and on behalf of ${c.client.nameEn}`,
                        field: `sign:${x.personId}`
                    }))
            ]
        }
    ];
}
function scrNotice(c) {
    return [
        ...header(c, t("Notice to Registrable Person", "致須登記人士通知", "致须登记人士通知")),
        {
            t: "p",
            text: `Under Part 12, Division 2 of the Companies Ordinance (Cap. 622), the Company records the following particulars in its significant controllers register: ${c.values.controllerDetails ?? ""}. Please confirm they are correct within 7 days.`
        }
    ];
}
function registerOfDirectors(c) {
    return [
        ...header(c, t("Register of Directors", "董事登記冊", "董事登记册")),
        {
            t: "table",
            head: [
                "Name",
                "Chinese name",
                "Correspondence address",
                "Appointed"
            ],
            rows: c.directors.map((x)=>[
                    x.person.nameEn,
                    x.person.nameZh ?? "",
                    x.person.correspondenceAddress ?? c.client.regOfficeEn ?? "",
                    x.fromDate
                ]),
            widths: [
                130,
                80,
                190,
                67
            ]
        }
    ];
}
function registerOfMembers(c) {
    return [
        ...header(c, t("Register of Members", "成員登記冊", "成员登记册")),
        {
            t: "table",
            head: [
                "Member",
                "Class",
                "Shares",
                "%"
            ],
            rows: c.members.map((m)=>[
                    m.name + (m.nameZh ? ` ${m.nameZh}` : ""),
                    m.className,
                    m.quantity.toLocaleString("en-US"),
                    `${m.percent}%`
                ]),
            widths: [
                220,
                90,
                90,
                67
            ]
        }
    ];
}
const TEMPLATES = {
    "tpl:board-resolution": boardResolution,
    "tpl:first-board-resolution": boardResolution,
    "tpl:members-written-resolution": (c)=>membersResolution(c, false),
    "tpl:members-special-resolution": (c)=>membersResolution(c, true),
    "tpl:consent-to-act": consentToAct,
    "tpl:share-certificate": shareCertificate,
    "tpl:instrument-of-transfer": instrumentOfTransfer,
    "tpl:contract-notes": contractNotes,
    "tpl:engagement-letter": engagementLetter,
    "tpl:scr-notice": scrNotice,
    "tpl:register-directors": registerOfDirectors,
    "tpl:register-members": registerOfMembers
};
// ---------- Mainland China, Macau, Taiwan ----------
const eff2 = (c)=>c.task.effectiveDate ?? c.values.effDate ?? c.today;
function cnClauses(c) {
    const v = c.values, p = c.person, d0 = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$dates$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["fmtDate"])(eff2(c), "sc"), name = p ? p.nameZh ? `${p.nameZh}（${p.nameEn}）` : p.nameEn : "";
    switch(c.pb.id){
        case "cn.changeLegalRep":
            return [
                `同意变更公司法定代表人为${name}，自${d0}起生效。`,
                "授权公司办理相关变更登记手续，并更换营业执照。"
            ];
        case "cn.changeOfficers":
            return [
                `同意委任${name}为公司董事，自${d0}起生效。`,
                "授权公司于三十日内向登记机关办理备案。"
            ];
        case "cn.changeAddress":
            return [
                `同意将公司住所变更为${v.cnNewAddress ?? ""}，自${d0}起生效。`,
                "同意相应修改公司章程，并办理变更登记。"
            ];
        case "cn.changeCapital":
            return [
                `同意变更公司注册资本及出资安排：${v.cnCapitalChange ?? ""}。`,
                "同意相应修改公司章程；如属减资，依法通知债权人并公告。"
            ];
        case "cn.equityTransfer":
            return [
                `同意以下股权转让：${v.cnEquityTransfer ?? ""}。`,
                "其他股东放弃优先购买权（如适用），并同意修改公司章程及办理变更登记。"
            ];
        default:
            return [
                c.task.title
            ];
    }
}
function cnResolution(c) {
    const nameSc = c.client.nameSc ?? c.client.nameEn;
    const uscc = c.client.jurisdictionData.uscc ?? c.client.companyNumber ?? "";
    const single = new Set(c.members.map((m)=>m.personId)).size <= 1;
    return [
        {
            t: "title",
            text: nameSc
        },
        {
            t: "subtitle",
            text: `统一社会信用代码：${uscc}  ·  ${single ? "股东决定" : "股东会决议"}`
        },
        {
            t: "p",
            text: `${single ? "本公司唯一股东" : "本公司股东会"}依据《中华人民共和国公司法》及公司章程，作出如下${single ? "决定" : "决议"}：`
        },
        {
            t: "list",
            items: cnClauses(c),
            numbered: true
        },
        {
            t: "p",
            text: `日期：${(0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$dates$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["fmtDate"])(c.today, "sc")}`
        },
        {
            t: "sign",
            names: [
                ...new Map(c.members.map((m)=>[
                        m.personId,
                        m
                    ])).values()
            ].map((m)=>({
                    name: m.name,
                    caption: "股东（签字/盖章）",
                    field: `sign:${m.personId}`
                }))
        },
        {
            t: "small",
            text: "The English translation is for reference; the Chinese text prevails for filing with the market regulator."
        }
    ];
}
function moClauses(c) {
    const v = c.values, p = c.person;
    switch(c.pb.id){
        case "mo.changeAdministrators":
            return [
                [
                    `Deliberado nomear ${p?.nameEn ?? ""} como administrador da sociedade.`,
                    `議決委任${p?.nameZh ?? p?.nameEn ?? ""}為公司行政管理機關成員。`
                ]
            ];
        case "mo.quotaTransfer":
            return [
                [
                    `Deliberado consentir na cessão de quota: ${v.moQuotaTransfer ?? ""}.`,
                    `議決同意以下股的轉讓：${v.moQuotaTransfer ?? ""}。`
                ]
            ];
        case "mo.changeOffice":
            return [
                [
                    `Deliberado transferir a sede da sociedade para ${v.newAddr ?? ""}.`,
                    `議決將公司住所遷往${v.newAddr ?? ""}。`
                ]
            ];
        case "mo.amendArticles":
            return [
                [
                    `Deliberado alterar os estatutos: ${v.articlesChange ?? ""}.`,
                    `議決修改公司章程：${v.articlesChange ?? ""}。`
                ]
            ];
        case "mo.approveAccounts":
            return [
                [
                    "Deliberado aprovar o relatório e as contas do exercício.",
                    "議決通過年度報告及帳目。"
                ]
            ];
        default:
            return [
                [
                    c.task.title,
                    c.task.title
                ]
            ];
    }
}
function moActa(c) {
    return [
        {
            t: "title",
            text: `${c.client.nameEn}${c.client.nameTc ? ` ${c.client.nameTc}` : ""}`
        },
        {
            t: "subtitle",
            text: `Registo n.º ${c.client.companyNumber ?? ""}  ·  Acta da Assembleia Geral / 股東會會議錄`
        },
        {
            t: "p",
            text: `Aos ${(0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$dates$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["fmtDate"])(c.today)}, reuniram-se os sócios representando a totalidade do capital social, que deliberaram por unanimidade: / 全體股東出席，一致議決：`
        },
        {
            t: "list",
            items: moClauses(c).map(([pt, tc])=>`${pt}\n${tc}`),
            numbered: true
        },
        {
            t: "sign",
            names: [
                ...new Map(c.members.map((m)=>[
                        m.personId,
                        m
                    ])).values()
            ].map((m)=>({
                    name: m.name,
                    caption: "Sócio / 股東",
                    field: `sign:${m.personId}`
                }))
        },
        {
            t: "small",
            text: "Signatures on documents for the Commercial Registry may need notarial recognition. / 提交商業登記局的文件簽名或須經公證認定。"
        }
    ];
}
function twClauses(c) {
    const v = c.values, p = c.person, name = p ? p.nameZh ?? p.nameEn : "";
    switch(c.pb.id){
        case "tw.changeDirectors":
            return [
                `經全體股東同意，選任${name}為本公司董事，自${(0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$dates$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["fmtDate"])(eff2(c), "tc")}起生效。`
            ];
        case "tw.changeResponsiblePerson":
            return [
                `經全體股東同意，推選${name}為本公司代表人，自${(0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$dates$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["fmtDate"])(eff2(c), "tc")}起生效。`
            ];
        case "tw.changeAddress":
            return [
                `經全體股東同意，本公司所在地變更為${v.newAddr ?? ""}。`
            ];
        case "tw.capitalIncrease":
            return [
                `經全體股東同意，本公司辦理增資：${v.twCapitalIncrease ?? ""}，並修正章程。`
            ];
        default:
            return [
                c.task.title
            ];
    }
}
function twResolution(c) {
    const ubn = c.client.jurisdictionData.ubn ?? c.client.companyNumber ?? "";
    return [
        {
            t: "title",
            text: c.client.nameTc ?? c.client.nameEn
        },
        {
            t: "subtitle",
            text: `統一編號：${ubn}  ·  股東同意書`
        },
        {
            t: "p",
            text: "本公司全體股東依公司法及章程規定，同意下列事項："
        },
        {
            t: "list",
            items: twClauses(c),
            numbered: true
        },
        {
            t: "p",
            text: `中華民國${Number(c.today.slice(0, 4)) - 1911}年${Number(c.today.slice(5, 7))}月${Number(c.today.slice(8, 10))}日`
        },
        {
            t: "sign",
            names: [
                ...new Map(c.members.map((m)=>[
                        m.personId,
                        m
                    ])).values()
            ].map((m)=>({
                    name: m.name,
                    caption: "股東（簽名蓋章）",
                    field: `sign:${m.personId}`
                }))
        }
    ];
}
TEMPLATES["tpl:cn-resolution"] = cnResolution;
TEMPLATES["tpl:mo-acta"] = moActa;
TEMPLATES["tpl:tw-resolution"] = twResolution;
}),
"[project]/src/domain/accounting-sync.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([]);
// Deterministic Xero sync jobs (DECISIONS.md #28). Idempotent: an invoice is looked up by
// number before creating, so a retried job never creates a duplicate.
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$select$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/drizzle-orm/sql/expressions/select.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/drizzle-orm/sql/expressions/conditions.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/db/schema.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$jobs$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/domain/jobs.ts [app-route] (ecmascript)");
;
;
;
(0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$jobs$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["onJob"])("xero.sync_invoice", async (ctx, { invoiceId })=>{
    const inv = await ctx.db.query.invoice.findFirst({
        where: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["invoice"].id, invoiceId)
    });
    if (inv.xeroInvoiceId) return;
    try {
        let xeroId = await ctx.accounting.findInvoiceByNumber(inv.number);
        if (!xeroId) {
            const cl = await ctx.db.query.client.findFirst({
                where: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["client"].id, inv.clientId)
            });
            const bc = inv.billingContactId ? await ctx.db.query.contact.findFirst({
                where: (c, { eq })=>eq(c.id, inv.billingContactId)
            }) : null;
            const contactId = await ctx.accounting.upsertContact(cl.nameEn, bc?.email);
            const lines = await ctx.db.select().from(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["invoiceLine"]).where((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["invoiceLine"].invoiceId, inv.id)).orderBy((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$select$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["asc"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["invoiceLine"].sort));
            xeroId = await ctx.accounting.createInvoice({
                contactName: cl.nameEn,
                contactEmail: bc?.email,
                number: inv.number,
                issuedOn: inv.issuedOn ?? ctx.clock.today(),
                dueOn: inv.dueOn ?? ctx.clock.today(),
                currency: inv.currency,
                lines: lines.map((l)=>({
                        description: l.description,
                        amountCents: l.amountCents,
                        accountCode: ctx.config.XERO_SALES_ACCOUNT_CODE
                    }))
            }, contactId);
        }
        await ctx.db.update(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["invoice"]).set({
            xeroInvoiceId: xeroId,
            xeroStatus: "synced",
            xeroError: null
        }).where((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["invoice"].id, inv.id));
    } catch (e) {
        await ctx.db.update(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["invoice"]).set({
            xeroStatus: "error",
            xeroError: e.message.slice(0, 500)
        }).where((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["invoice"].id, inv.id));
        throw e;
    }
});
(0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$jobs$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["onJob"])("xero.sync_payment", async (ctx, { paymentId })=>{
    const pay = await ctx.db.query.payment.findFirst({
        where: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["payment"].id, paymentId)
    });
    if (pay.xeroPaymentId) return;
    const inv = await ctx.db.query.invoice.findFirst({
        where: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["invoice"].id, pay.invoiceId)
    });
    if (!inv.xeroInvoiceId) throw new Error(`Invoice ${inv.number} is not in Xero yet; retrying after the invoice syncs`);
    try {
        const id = await ctx.accounting.createPayment({
            invoiceId: inv.xeroInvoiceId,
            amountCents: pay.amountCents,
            date: pay.receivedOn,
            reference: inv.number
        });
        await ctx.db.update(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["payment"]).set({
            xeroPaymentId: id,
            xeroStatus: "synced"
        }).where((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["payment"].id, pay.id));
    } catch (e) {
        await ctx.db.update(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["payment"]).set({
            xeroStatus: "error"
        }).where((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["payment"].id, pay.id));
        throw e;
    }
});
(0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$jobs$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["onJob"])("xero.void_invoice", async ()=>{
// Voiding in Xero needs the direct API; recorded for staff to void by hand until then.
});
}),
"[project]/src/domain/audit.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "audit",
    ()=>audit
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/db/schema.ts [app-route] (ecmascript)");
;
async function audit(ctx, action, entity, entityId, data = {}, actor = ctx.userId) {
    await ctx.db.insert(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["auditLog"]).values({
        id: ctx.ids.next("aud"),
        firmId: ctx.firmId,
        actor,
        action,
        entity,
        entityId,
        data,
        at: ctx.clock.now()
    });
}
}),
"[project]/src/domain/dates.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

// Date helpers on ISO YYYY-MM-DD strings (statutory dates have no time zone).
__turbopack_context__.s([
    "addDays",
    ()=>addDays,
    "addMonths",
    ()=>addMonths,
    "daysBetween",
    ()=>daysBetween,
    "fmtDate",
    ()=>fmtDate,
    "isIsoDate",
    ()=>isIsoDate
]);
function addDays(d, n) {
    const t = new Date(d + "T00:00:00Z");
    t.setUTCDate(t.getUTCDate() + n);
    return t.toISOString().slice(0, 10);
}
function addMonths(d, n) {
    const t = new Date(d + "T00:00:00Z");
    const day = t.getUTCDate();
    t.setUTCDate(1);
    t.setUTCMonth(t.getUTCMonth() + n);
    const last = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth() + 1, 0)).getUTCDate();
    t.setUTCDate(Math.min(day, last));
    return t.toISOString().slice(0, 10);
}
function daysBetween(a, b) {
    return Math.round((new Date(b + "T00:00:00Z").getTime() - new Date(a + "T00:00:00Z").getTime()) / 86400_000);
}
function isIsoDate(s) {
    return typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(new Date(s + "T00:00:00Z").getTime());
}
function fmtDate(d, lang = "en") {
    if (!d) return "";
    const t = new Date(d + "T00:00:00Z");
    if (lang === "en") return t.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
        timeZone: "UTC"
    });
    return `${t.getUTCFullYear()}年${t.getUTCMonth() + 1}月${t.getUTCDate()}日`;
}
}),
"[project]/src/domain/deadlines.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "upcomingDeadlines",
    ()=>upcomingDeadlines
]);
// Deadline engine: statutory and firm-policy deadlines computed from client data and
// last-done records (filings, recorded AGMs, CDD reviews). A period is satisfied by a
// filing with its period key, or covered while an open task carries that key. Nothing
// rolls forward on its own (PRODUCT_SPEC.md §12). Rules are playbook data where possible
// and all need company secretary verification.
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/drizzle-orm/sql/expressions/conditions.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/db/schema.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$dates$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/domain/dates.ts [app-route] (ecmascript)");
;
;
;
const pad = (x)=>String(x).padStart(2, "0");
async function upcomingDeadlines(ctx, opts) {
    const today = ctx.clock.today();
    const horizon = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$dates$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["addDays"])(today, opts.withinDays);
    const clients = await ctx.db.select().from(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["client"]).where((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["and"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["client"].firmId, ctx.firmId), opts.clientId ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["client"].id, opts.clientId) : undefined));
    const out = [];
    for (const c of clients){
        if (c.lifecycle === "prospect" || c.lifecycle === "ceased" || c.operatingStatus === "not_incorporated" || c.operatingStatus === "deregistering" || c.operatingStatus === "struck_off") continue;
        const filings = await ctx.db.select().from(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["filing"]).where((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["filing"].clientId, c.id));
        const doneKeys = new Set(filings.map((f)=>f.periodKey).filter(Boolean));
        const openTasks = await ctx.db.select().from(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["task"]).where((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["and"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["task"].clientId, c.id), (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["task"].status, "open")));
        const covered = new Set(openTasks.map((t)=>t.periodKey).filter(Boolean));
        const Y = Number(today.slice(0, 4));
        const push = (d)=>{
            if (d.dueDate > horizon) return;
            if (d.periodKey && (doneKeys.has(d.periodKey) || !opts.includeCovered && covered.has(d.periodKey))) return;
            const daysLeft = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$dates$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["daysBetween"])(today, d.dueDate);
            out.push({
                ...d,
                clientId: c.id,
                clientName: c.nameEn,
                daysLeft,
                overdue: daysLeft < 0
            });
        };
        if (c.jurisdiction === "HK" && c.incorporatedOn) {
            // Annual return: private company, within 42 days after each anniversary of incorporation.
            for (const y of [
                Y - 1,
                Y,
                Y + 1
            ]){
                const anniv = `${y}${c.incorporatedOn.slice(4)}`;
                if (anniv <= c.incorporatedOn) continue;
                const periodKey = `NAR1:${y}`;
                if (y === Y - 1 && (doneKeys.has(periodKey) || filings.some((f)=>f.form === "NAR1" && f.filedOn >= anniv))) continue;
                push({
                    key: "NAR1",
                    label: `Annual return ${y}`,
                    dueDate: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$dates$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["addDays"])(anniv, 42),
                    playbookId: "hk.annualReturn",
                    periodKey,
                    periodYear: y
                });
                if (!doneKeys.has(periodKey)) break;
            }
            // AGM / accounts: within 9 months after the financial year end; not for dormant companies.
            if (c.operatingStatus !== "dormant" && c.fyeMonth && c.fyeDay) {
                const lastAgm = c.jurisdictionData.lastAgm ?? null;
                for (const y of [
                    Y - 1,
                    Y
                ]){
                    const fye = `${y}-${pad(c.fyeMonth)}-${pad(c.fyeDay)}`;
                    if (fye >= today || fye < c.incorporatedOn) continue;
                    const periodKey = `AGM:${y}`;
                    if (lastAgm && lastAgm >= fye) {
                        doneKeys.add(periodKey);
                        continue;
                    }
                    push({
                        key: "AGM",
                        label: `AGM and accounts for year ended ${fye}`,
                        dueDate: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$dates$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["addMonths"])(fye, 9),
                        playbookId: "hk.agm",
                        periodKey,
                        periodYear: y
                    });
                }
                // Next year's AGM once this year's is done.
                const nextFye = `${Y}-${pad(c.fyeMonth)}-${pad(c.fyeDay)}`;
                if (nextFye >= today && (!lastAgm || lastAgm < nextFye)) push({
                    key: "AGM",
                    label: `AGM and accounts for year ended ${nextFye}`,
                    dueDate: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$dates$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["addMonths"])(nextFye, 9),
                    playbookId: "hk.agm",
                    periodKey: `AGM:${Y}`,
                    periodYear: Y
                });
                else if (nextFye < today && lastAgm && lastAgm >= nextFye) {
                    const f2 = `${Y + 1}-${pad(c.fyeMonth)}-${pad(c.fyeDay)}`;
                    push({
                        key: "AGM",
                        label: `AGM and accounts for year ended ${f2}`,
                        dueDate: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$dates$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["addMonths"])(f2, 9),
                        playbookId: "hk.agm",
                        periodKey: `AGM:${Y + 1}`,
                        periodYear: Y + 1
                    });
                }
            }
            // Business registration expiry.
            const br = await ctx.db.query.businessRegistration.findFirst({
                where: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["businessRegistration"].clientId, c.id)
            });
            if (br?.expiresOn) push({
                key: "BR",
                label: "Business registration renewal",
                dueDate: br.expiresOn,
                playbookId: "hk.brRenewal",
                periodKey: `BR:${br.expiresOn}`,
                periodYear: Number(br.expiresOn.slice(0, 4))
            });
        }
        // Periodic CDD review (firm policy): earliest review date among current officers and controllers.
        const people = new Set();
        for (const a of (await ctx.db.select().from(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["appointment"]).where((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["appointment"].clientId, c.id))))if (!a.toDate || a.toDate > today) people.add(a.personId);
        for (const s of (await ctx.db.select().from(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["significantController"]).where((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["significantController"].clientId, c.id))))if (!s.ceasedOn) people.add(s.personId);
        people.delete("per_firm");
        if (people.size) {
            const cdds = await ctx.db.select().from(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["cddRecord"]).where((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["inArray"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["cddRecord"].personId, [
                ...people
            ]));
            const latest = new Map();
            for (const r of cdds)if (!latest.has(r.personId) || r.reviewDueOn > latest.get(r.personId)) latest.set(r.personId, r.reviewDueOn);
            const due = [
                ...latest.values()
            ].sort()[0];
            if (due) push({
                key: "KYC",
                label: "Periodic KYC review",
                dueDate: due,
                playbookId: "hk.kycReview",
                periodKey: `KYC:${due}`,
                periodYear: Number(due.slice(0, 4))
            });
        }
        if (c.jurisdiction !== "HK") {
            const { jurisdictionDeadlines } = await __turbopack_context__.A("[project]/src/domain/deadlines-other.ts [app-route] (ecmascript, async loader)");
            for (const d of jurisdictionDeadlines(c, today, Y))push(d);
        }
    }
    return out.sort((a, b)=>a.dueDate.localeCompare(b.dueDate));
}
}),
"[project]/src/domain/engine.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "advance",
    ()=>advance,
    "buildChecklist",
    ()=>buildChecklist,
    "cancelTask",
    ()=>cancelTask,
    "clearStepHooks",
    ()=>clearStepHooks,
    "computeDueDate",
    ()=>computeDueDate,
    "createRequest",
    ()=>createRequest,
    "currentStep",
    ()=>currentStep,
    "getRequest",
    ()=>getRequest,
    "getTask",
    ()=>getTask,
    "hasCurrentCdd",
    ()=>hasCurrentCdd,
    "logEvent",
    ()=>logEvent,
    "markStepState",
    ()=>markStepState,
    "onEnterStep",
    ()=>onEnterStep,
    "openTasksForClient",
    ()=>openTasksForClient,
    "outstanding",
    ()=>outstanding,
    "setChecklist",
    ()=>setChecklist,
    "startTask",
    ()=>startTask,
    "stepData",
    ()=>stepData,
    "taskEvents",
    ()=>taskEvents,
    "tasksForRequest",
    ()=>tasksForRequest
]);
// The task engine: deterministic step progression over playbook data.
// Understanding what the client means is the agent layer's job (src/agent); this module
// only decides what happens next given the task's state.
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/drizzle-orm/sql/expressions/conditions.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$select$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/drizzle-orm/sql/expressions/select.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/db/schema.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$playbooks$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/domain/playbooks.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$dates$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/domain/dates.ts [app-route] (ecmascript)");
;
;
;
;
const enterHooks = new Map();
function onEnterStep(kind, hook) {
    const list = enterHooks.get(kind) ?? [];
    list.push(hook);
    enterHooks.set(kind, list);
}
function clearStepHooks() {
    enterHooks.clear();
}
async function createRequest(ctx, r) {
    const [row] = await ctx.db.insert(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["request"]).values({
        id: ctx.ids.next("req"),
        firmId: ctx.firmId,
        clientId: r.clientId,
        summary: r.summary ?? null,
        conversationId: r.conversationId ?? null,
        sourceMessageId: r.sourceMessageId ?? null,
        uploadToken: ctx.ids.token(),
        createdAt: ctx.clock.now()
    }).returning();
    return row;
}
async function getRequest(ctx, id) {
    const r = await ctx.db.query.request.findFirst({
        where: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["and"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["request"].id, id), (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["request"].firmId, ctx.firmId))
    });
    if (!r) throw new Error(`Request ${id} not found`);
    return r;
}
async function logEvent(ctx, taskId, kind, summary, data = {}, actor = "system") {
    await ctx.db.insert(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["taskEvent"]).values({
        id: ctx.ids.next("evt"),
        firmId: ctx.firmId,
        taskId,
        kind,
        summary,
        data,
        actor,
        at: ctx.clock.now()
    });
}
async function taskEvents(ctx, taskId) {
    return ctx.db.select().from(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["taskEvent"]).where((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["and"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["taskEvent"].firmId, ctx.firmId), (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["taskEvent"].taskId, taskId))).orderBy((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$select$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["asc"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["taskEvent"].at), (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$select$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["asc"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["taskEvent"].id));
}
async function hasCurrentCdd(ctx, personId) {
    const today = ctx.clock.today();
    const rows = await ctx.db.select().from(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["cddRecord"]).where((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["and"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["cddRecord"].firmId, ctx.firmId), (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["cddRecord"].personId, personId)));
    const current = rows.filter((r)=>r.verifiedOn <= today && r.reviewDueOn >= today).sort((a, b)=>b.reviewDueOn.localeCompare(a.reviewDueOn))[0];
    return current ?? null;
}
async function personPrefill(ctx, personId) {
    const p = await ctx.db.query.person.findFirst({
        where: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["person"].id, personId)
    });
    if (!p) return {};
    return {
        fullName: p.nameEn || null,
        chiName: p.nameZh || null,
        idNo: p.idNumberEnc ? "On file" : null,
        resAddr: p.residentialAddressEnc ? "On file" : null,
        corrAddr: p.correspondenceAddress || null,
        contactInfo: [
            p.email,
            p.phone
        ].filter(Boolean).join(" / ") || null
    };
}
async function buildChecklist(ctx, pb, opts) {
    const cl = await ctx.db.query.client.findFirst({
        where: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["client"].id, opts.clientId)
    });
    const cdd = opts.personId ? await hasCurrentCdd(ctx, opts.personId) : null;
    const prefill = opts.personId ? await personPrefill(ctx, opts.personId) : {};
    const out = [];
    for (const r of pb.requirements){
        const personId = r.scope === "person" ? opts.personId ?? null : null;
        const base = {
            key: r.key,
            personId,
            optional: !!r.optional
        };
        const ex = opts.extracted?.[r.key];
        if (ex?.value) {
            out.push({
                ...base,
                status: "received",
                value: ex.value,
                source: ex.source ?? null,
                documentId: ex.documentId ?? null,
                confidence: ex.confidence ?? null
            });
            continue;
        }
        if (r.condition === "personLacksCurrentCdd" && cdd) {
            out.push({
                ...base,
                status: "on_file",
                source: `CDD on file, review due ${cdd.reviewDueOn}`
            });
            continue;
        }
        if (r.condition === "clientIsNew" && cl?.lifecycle !== "prospect") {
            out.push({
                ...base,
                status: "not_needed",
                reason: "Existing client"
            });
            continue;
        }
        if (r.scope === "person" && prefill[r.key]) {
            out.push({
                ...base,
                status: "on_file",
                value: prefill[r.key],
                source: "Person record"
            });
            continue;
        }
        out.push({
            ...base,
            status: "needed"
        });
    }
    return out;
}
function outstanding(t) {
    return t.checklist.filter((e)=>e.status === "needed" && !e.optional);
}
async function setChecklist(ctx, taskId, checklist, reason, actor = "system") {
    const before = await getTask(ctx, taskId);
    await ctx.db.update(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["task"]).set({
        checklist
    }).where((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["task"].id, taskId));
    const changes = checklist.filter((e)=>{
        const b = before.checklist.find((x)=>x.key === e.key && (x.personId ?? null) === (e.personId ?? null));
        return !b || b.status !== e.status || b.value !== e.value;
    }).map((e)=>`${e.key}: ${e.status}`);
    const removed = before.checklist.filter((b)=>!checklist.some((e)=>e.key === b.key && (e.personId ?? null) === (b.personId ?? null))).map((b)=>`${b.key}: removed`);
    if (changes.length || removed.length) await logEvent(ctx, taskId, "checklist.updated", reason, {
        changes: [
            ...changes,
            ...removed
        ]
    }, actor);
}
async function getTask(ctx, id) {
    const t = await ctx.db.query.task.findFirst({
        where: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["and"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["task"].id, id), (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["task"].firmId, ctx.firmId))
    });
    if (!t) throw new Error(`Task ${id} not found`);
    return withSteps(ctx, t);
}
function currentStep(t, pb) {
    const steps = pb?.steps ?? t._steps;
    if (t.status !== "open" || !steps) return null;
    return steps[t.stepIndex] ?? null;
}
async function withSteps(ctx, t) {
    const pb = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$playbooks$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getPlaybook"])(ctx, t.playbookId, t.playbookVersion);
    return Object.assign(t, {
        _steps: pb.steps
    });
}
async function computeDueDate(ctx, pb, clientId, effectiveDate, periodYear) {
    const d = pb.deadline;
    if (d.kind === "event") return effectiveDate ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$dates$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["addDays"])(effectiveDate, d.days) : null;
    const cl = await ctx.db.query.client.findFirst({
        where: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["client"].id, clientId)
    });
    const year = periodYear ?? Number(ctx.clock.today().slice(0, 4));
    if (d.kind === "anniversary" && cl?.incorporatedOn) return (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$dates$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["addDays"])(`${year}${cl.incorporatedOn.slice(4)}`, d.days);
    if (d.kind === "fye" && cl?.fyeMonth && cl?.fyeDay) {
        const fye = `${year - 1}-${String(cl.fyeMonth).padStart(2, "0")}-${String(cl.fyeDay).padStart(2, "0")}`;
        return (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$dates$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["addMonths"])(fye, d.months);
    }
    if (d.kind === "br_expiry") {
        const br = await ctx.db.query.businessRegistration.findFirst({
            where: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["businessRegistration"].clientId, clientId)
        });
        return br?.expiresOn ?? null;
    }
    if (d.kind === "fixed_annual") return `${year}-${String(d.month).padStart(2, "0")}-${String(d.day).padStart(2, "0")}`;
    return null;
}
async function startTask(ctx, t) {
    const pb = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$playbooks$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getPlaybook"])(ctx, t.playbookId);
    const cl = await ctx.db.query.client.findFirst({
        where: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["client"].id, t.clientId)
    });
    if (!cl) throw new Error("Client not found");
    const checklist = await buildChecklist(ctx, pb, {
        clientId: t.clientId,
        personId: t.personId,
        extracted: t.extracted
    });
    const eff = t.extracted?.effDate?.value ?? t.params?.effectiveDate ?? null;
    const effectiveDate = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$dates$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["isIsoDate"])(eff) ? eff : null;
    const extracted = {};
    for (const [k, v] of Object.entries(t.extracted ?? {}))extracted[k] = v;
    const personName = t.personId ? (await ctx.db.query.person.findFirst({
        where: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["person"].id, t.personId)
    }))?.nameEn : null;
    const [row] = await ctx.db.insert(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["task"]).values({
        id: ctx.ids.next("tsk"),
        firmId: ctx.firmId,
        requestId: t.requestId ?? null,
        clientId: t.clientId,
        playbookId: pb.id,
        playbookVersion: pb.version,
        title: t.title ?? (personName ? `${pb.name.en}: ${personName}` : pb.name.en),
        personId: t.personId ?? null,
        assigneeId: t.assigneeId ?? cl.staffId ?? ctx.userId,
        checklist,
        extracted,
        params: t.params ?? {},
        effectiveDate,
        dueDate: await computeDueDate(ctx, pb, t.clientId, effectiveDate, t.periodYear),
        onCredit: cl.paymentTermsDays > 0,
        periodKey: t.periodKey ?? null,
        createdAt: ctx.clock.now()
    }).returning();
    await logEvent(ctx, row.id, "task.created", `Opened from playbook "${pb.name.en}"`, {
        playbookId: pb.id,
        version: pb.version
    });
    const task = row;
    await runEnterHooks(ctx, task, pb, 0);
    return getTask(ctx, row.id);
}
async function markStepState(ctx, taskId, which, data) {
    const t = await getTask(ctx, taskId);
    const pb = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$playbooks$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getPlaybook"])(ctx, t.playbookId, t.playbookVersion);
    let idx;
    if (typeof which === "number") idx = which;
    else if (pb.steps[t.stepIndex]?.kind === which) idx = t.stepIndex;
    else idx = pb.steps.findIndex((s, i)=>s.kind === which && i >= t.stepIndex);
    if (idx < 0) idx = pb.steps.findIndex((s)=>s.kind === which);
    if (idx < 0) throw new Error(`Task ${taskId} has no ${String(which)} step`);
    const stepState = {
        ...t.stepState,
        [String(idx)]: {
            ...t.stepState[String(idx)] ?? {},
            ...data
        }
    };
    await ctx.db.update(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["task"]).set({
        stepState
    }).where((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["task"].id, taskId));
    return idx;
}
function stepData(t, idx) {
    return t.stepState[String(idx)] ?? {};
}
async function invoiceStatus(ctx, t) {
    if (!t.requestId) return null;
    const r = await ctx.db.query.request.findFirst({
        where: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["request"].id, t.requestId)
    });
    if (!r?.invoiceId) return null;
    const inv = await ctx.db.query.invoice.findFirst({
        where: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["invoice"].id, r.invoiceId)
    });
    return inv?.status ?? null;
}
async function stepCompletion(ctx, t, step, idx, pb) {
    const s = stepData(t, idx);
    switch(step.kind){
        case "send":
            return {
                done: !!s.sent || !!s.skipped,
                skipped: s.skipped
            };
        case "pay":
            {
                if (t.onCredit) return {
                    done: true,
                    skipped: "Skipped: client is on credit terms, so work starts before payment"
                };
                const st = await invoiceStatus(ctx, t);
                if (st === "paid") return {
                    done: true
                };
                if (st === null && pb.feeCents === 0) return {
                    done: true,
                    skipped: "Skipped: no fee for this task"
                };
                if (s.waived) return {
                    done: true,
                    skipped: "Payment waived by staff"
                };
                return {
                    done: false
                };
            }
        case "collect":
            return {
                done: outstanding(t).length === 0
            };
        case "kyc":
        case "screen":
            return {
                done: !!s.cleared
            };
        case "generate":
            return {
                done: !!s.generated
            };
        case "sign":
            return {
                done: !!s.signed || !!s.skipped,
                skipped: s.skipped
            };
        case "file":
            return {
                done: !!s.filed
            };
        case "register":
            return {
                done: !!s.applied
            };
        case "confirm":
            return {
                done: !!s.sent
            };
        case "task":
            return {
                done: !!s.done
            };
        case "wait_until":
            return {
                done: !!t.effectiveDate && t.effectiveDate <= ctx.clock.today()
            };
    }
}
async function runEnterHooks(ctx, t, pb, idx) {
    const step = pb.steps[idx];
    if (!step) return;
    for (const h of enterHooks.get(step.kind) ?? [])await h(ctx, await getTask(ctx, t.id), step, idx, pb);
}
const REOPENABLE = [
    "kyc",
    "screen",
    "generate",
    "sign"
];
async function advance(ctx, taskId) {
    for(let guard = 0; guard < 40; guard++){
        const t = await getTask(ctx, taskId);
        if (t.status !== "open") return t;
        const pb = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$playbooks$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getPlaybook"])(ctx, t.playbookId, t.playbookVersion);
        // Entry check: new outstanding items after collection send the task back to collect
        // (nothing is generated or signed on stale information).
        const collectIdx = pb.steps.findIndex((s)=>s.kind === "collect");
        const cur = pb.steps[t.stepIndex];
        if (collectIdx >= 0 && t.stepIndex > collectIdx && cur && REOPENABLE.includes(cur.kind) && outstanding(t).length > 0) {
            const stepState = Object.fromEntries(Object.entries(t.stepState).filter(([k])=>Number(k) < collectIdx || !REOPENABLE.includes(pb.steps[Number(k)]?.kind)));
            await ctx.db.update(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["task"]).set({
                stepIndex: collectIdx,
                stepState
            }).where((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["task"].id, taskId));
            await logEvent(ctx, taskId, "step.reopened", `Back to "${pb.steps[collectIdx].label}": ${outstanding(t).map((e)=>e.key).join(", ")} now needed`);
            continue;
        }
        if (!cur) {
            await ctx.db.update(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["task"]).set({
                status: "done",
                completedAt: ctx.clock.now()
            }).where((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["task"].id, taskId));
            await logEvent(ctx, taskId, "task.done", "Task completed");
            continue;
        }
        const c = await stepCompletion(ctx, t, cur, t.stepIndex, pb);
        if (!c.done) return t;
        await logEvent(ctx, taskId, c.skipped ? "step.skipped" : "step.completed", c.skipped ?? `Done: ${cur.label}`, {
            step: t.stepIndex,
            kind: cur.kind
        });
        const next = t.stepIndex + 1;
        await ctx.db.update(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["task"]).set({
            stepIndex: next
        }).where((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["task"].id, taskId));
        if (pb.steps[next]) {
            await logEvent(ctx, taskId, "step.entered", `Now: ${pb.steps[next].label}`, {
                step: next,
                kind: pb.steps[next].kind
            });
            await runEnterHooks(ctx, t, pb, next);
        }
    }
    throw new Error(`advance(${taskId}) did not settle`);
}
async function cancelTask(ctx, taskId, reason, actor = ctx.userId) {
    await ctx.db.update(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["task"]).set({
        status: "cancelled",
        completedAt: ctx.clock.now()
    }).where((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["task"].id, taskId));
    await logEvent(ctx, taskId, "task.cancelled", reason, {}, actor);
}
async function tasksForRequest(ctx, requestId) {
    return await ctx.db.select().from(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["task"]).where((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["and"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["task"].firmId, ctx.firmId), (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["task"].requestId, requestId))).orderBy((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$select$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["asc"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["task"].createdAt), (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$select$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["asc"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["task"].id));
}
async function openTasksForClient(ctx, clientId) {
    return await ctx.db.select().from(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["task"]).where((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["and"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["task"].firmId, ctx.firmId), (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["task"].clientId, clientId), (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["task"].status, "open"))).orderBy((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$select$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["asc"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["task"].createdAt));
}
}),
"[project]/src/domain/firm.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "DEMO_FIRM",
    ()=>DEMO_FIRM,
    "DEMO_USERS",
    ()=>DEMO_USERS,
    "ensureFirm",
    ()=>ensureFirm,
    "getFirm",
    ()=>getFirm
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/drizzle-orm/sql/expressions/conditions.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/db/schema.ts [app-route] (ecmascript)");
;
;
const DEMO_FIRM = {
    legalName: "Caine Road Corporate Services Limited",
    legalNameZh: "堅道企業服務有限公司",
    tcspLicence: "TC009999 (fictional)",
    address: "18/F, 88 Caine Road, Mid-Levels, Hong Kong",
    email: "desk@caineroad.example",
    phone: "+852 3000 0000",
    invoicePrefix: "CRCS-",
    signOff: {
        en: "Karen Yip\nSenior Company Secretary\nCaine Road Corporate Services Limited",
        tc: "葉嘉欣\n高級公司秘書\n堅道企業服務有限公司",
        sc: "叶嘉欣\n高级公司秘书\n坚道企业服务有限公司"
    }
};
const DEMO_USERS = [
    {
        id: "user_ky",
        name: "Karen Yip",
        initials: "KY",
        title: "Senior Company Secretary",
        isDemoUser: true
    },
    {
        id: "user_mc",
        name: "Mary Chan",
        initials: "MC",
        title: "Company Secretarial Officer",
        isDemoUser: false
    },
    {
        id: "user_dh",
        name: "Daniel Ho",
        initials: "DH",
        title: "Assistant Company Secretary",
        isDemoUser: false
    }
];
async function ensureFirm(ctx) {
    const existing = await ctx.db.query.firm.findFirst({
        where: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["firm"].id, ctx.firmId)
    });
    if (!existing) {
        await ctx.db.insert(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["firm"]).values({
            id: ctx.firmId,
            ...DEMO_FIRM
        });
        for (const u of DEMO_USERS)await ctx.db.insert(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["appUser"]).values({
            ...u,
            firmId: ctx.firmId
        });
    }
    return await ctx.db.query.firm.findFirst({
        where: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["firm"].id, ctx.firmId)
    });
}
async function getFirm(ctx) {
    return await ctx.db.query.firm.findFirst({
        where: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["firm"].id, ctx.firmId)
    });
}
}),
"[project]/src/domain/handlers.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([]);
// Approval handlers: what happens when a human approves each kind of proposal.
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/drizzle-orm/sql/expressions/conditions.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/db/schema.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$proposals$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/domain/proposals.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$outbound$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/domain/outbound.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$engine$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/domain/engine.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$invoices$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/domain/invoices.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$records$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/domain/records.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$documents$2f$invoice$2d$pdf$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/documents/invoice-pdf.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$jobs$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/domain/jobs.ts [app-route] (ecmascript)");
;
;
;
;
;
;
;
;
;
;
const PERSON_FIELD = {
    fullName: "nameEn",
    chiName: "nameZh",
    idNo: "idNumber",
    resAddr: "residentialAddress",
    corrAddr: "correspondenceAddress"
};
(0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$proposals$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["onApprove"])("send_message", async (ctx, p, opts)=>{
    const messageId = p.payload.messageId;
    const m = await ctx.db.query.message.findFirst({
        where: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["message"].id, messageId)
    });
    const raw = opts.edits;
    const edits = raw ? {
        ...raw,
        to: typeof raw.to === "string" ? raw.to.split(/[,;\s]+/).filter(Boolean) : raw.to
    } : undefined;
    if (edits?.text && opts.editChars === undefined) opts.editChars = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$proposals$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["editDistance"])(m.text ?? "", edits.text);
    const inv = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$outbound$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["invoiceForRequest"])(ctx, p.payload.requestId ?? null);
    const attachInvoice = inv && inv.status === "draft" && m.intake?.attachInvoiceId === inv.id;
    const attachments = attachInvoice ? [
        {
            filename: `${inv.number}.pdf`,
            mime: "application/pdf",
            content: await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$documents$2f$invoice$2d$pdf$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["renderInvoicePdf"])(ctx, inv.id)
        }
    ] : [];
    for (const docId of p.payload.attachDocumentIds ?? []){
        const d = await ctx.db.query.document.findFirst({
            where: (x, { eq })=>eq(x.id, docId)
        });
        if (d?.storageKey) attachments.push({
            filename: d.title.endsWith(".pdf") ? d.title : `${d.title}.pdf`,
            mime: d.mime ?? "application/pdf",
            content: await ctx.storage.get(d.storageKey)
        });
    }
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$outbound$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["sendMessage"])(ctx, messageId, {
        edits,
        attachments,
        approvedBy: ctx.userId
    });
    if (attachInvoice) {
        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$invoices$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["markInvoiceSent"])(ctx, inv.id);
        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$jobs$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["enqueue"])(ctx, "xero.sync_invoice", {
            invoiceId: inv.id
        }, `xero.invoice:${inv.id}`);
    }
    for (const taskId of p.payload.taskIds ?? []){
        const t = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$engine$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getTask"])(ctx, taskId);
        if (t.status !== "open") continue;
        const step = t._steps[t.stepIndex];
        if (step?.kind === "send") await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$engine$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["markStepState"])(ctx, taskId, "send", {
            sent: true,
            messageId
        });
        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$engine$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["logEvent"])(ctx, taskId, "message.sent", `Email sent to ${m.toAddrs.join(", ")}: ${m.subject ?? ""}`, {
            messageId
        }, ctx.userId);
        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$engine$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["advance"])(ctx, taskId);
    }
    // Confirmation and step-specific messages mark their own step (see payload.markStep).
    const mark = p.payload.markStep;
    if (mark) {
        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$engine$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["markStepState"])(ctx, mark.taskId, mark.kind, {
            sent: true,
            messageId
        });
        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$engine$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["advance"])(ctx, mark.taskId);
    }
});
(0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$proposals$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["onReject"])("send_message", async (ctx, p)=>{
    await ctx.db.update(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["message"]).set({
        status: "failed",
        error: "Rejected by staff"
    }).where((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["message"].id, p.payload.messageId));
});
(0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$proposals$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["onApprove"])("cancel_task", async (ctx, p)=>{
    const taskId = p.payload.taskId;
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$engine$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["cancelTask"])(ctx, taskId, p.payload.reason ?? "Cancelled at the client's request");
    const t = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$engine$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getTask"])(ctx, taskId);
    if (p.payload.voidInvoice && t.requestId) {
        const inv = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$outbound$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["invoiceForRequest"])(ctx, t.requestId);
        if (inv && inv.status !== "void") await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$invoices$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["voidInvoice"])(ctx, inv.id, "All tasks on the invoice were cancelled");
        if (inv?.xeroInvoiceId) await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$jobs$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["enqueue"])(ctx, "xero.void_invoice", {
            invoiceId: inv.id
        }, `xero.void:${inv.id}`);
    }
});
(0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$proposals$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["onApprove"])("custom_plan", async (ctx, p, opts)=>{
    const taskId = p.payload.taskId;
    const t = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$engine$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getTask"])(ctx, taskId);
    const edits = opts.edits;
    const plan = {
        ...t.params.plan,
        ...edits?.feeHkd !== undefined ? {
            feeHkd: edits.feeHkd
        } : {},
        ...edits?.title ? {
            title: edits.title
        } : {}
    };
    await ctx.db.update(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["task"]).set({
        params: {
            ...t.params,
            plan,
            planStatus: "approved"
        },
        title: plan.title ?? t.title
    }).where((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["task"].id, taskId));
    if (edits?.feeHkd !== undefined) {
        const inv = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$outbound$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["invoiceForRequest"])(ctx, t.requestId);
        if (inv?.status === "draft") {
            await ctx.db.update(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["invoiceLine"]).set({
                amountCents: Math.round(edits.feeHkd * 100)
            }).where((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["invoiceLine"].taskId, taskId));
            await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$invoices$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["recalcTotal"])(ctx, inv.id);
        }
    }
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$engine$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["logEvent"])(ctx, taskId, "plan.approved", "Staff approved the planned checklist", {}, ctx.userId);
});
(0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$proposals$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["onApprove"])("conflict", async (ctx, p, opts)=>{
    const { key, incoming, personId, taskId } = p.payload;
    const accept = opts.edits?.accept ?? "incoming";
    if (accept === "incoming" && personId && PERSON_FIELD[key]) await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$records$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["updatePerson"])(ctx, personId, {
        [PERSON_FIELD[key]]: incoming
    }, "Staff accepted the client's corrected value");
    if (taskId) {
        const t = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$engine$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getTask"])(ctx, taskId);
        const next = t.checklist.map((e)=>e.key === key && (!e.personId || e.personId === personId) ? {
                ...e,
                status: "received",
                value: accept === "incoming" ? incoming : e.value
            } : e);
        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$engine$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["setChecklist"])(ctx, taskId, next, `Conflict on ${key} resolved (${accept === "incoming" ? "client's value" : "value on file"})`, ctx.userId);
        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$engine$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["advance"])(ctx, taskId);
    }
});
(0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$proposals$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["onApprove"])("triage", async ()=>{});
(0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$proposals$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["onApprove"])("change_request", async (ctx, p)=>{
    const { taskId, mode, playbookId } = p.payload;
    const t = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$engine$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getTask"])(ctx, taskId);
    const nt = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$engine$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["startTask"])(ctx, {
        requestId: t.requestId,
        clientId: t.clientId,
        playbookId,
        personId: t.personId,
        extracted: t.extracted
    });
    if (mode === "swap") await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$engine$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["cancelTask"])(ctx, taskId, `Replaced by ${playbookId}`);
    const inv = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$outbound$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["invoiceForRequest"])(ctx, t.requestId);
    if (inv?.status === "draft") {
        const { getPlaybook } = await __turbopack_context__.A("[project]/src/domain/playbooks.ts [app-route] (ecmascript, async loader)");
        const pb = await getPlaybook(ctx, playbookId);
        if (mode === "swap") await ctx.db.delete(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["invoiceLine"]).where((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["invoiceLine"].taskId, taskId));
        if (pb.feeCents) await ctx.db.insert(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["invoiceLine"]).values({
            id: ctx.ids.next("inl"),
            firmId: ctx.firmId,
            invoiceId: inv.id,
            taskId: nt.id,
            description: nt.title,
            amountCents: pb.feeCents,
            kind: "fee",
            sort: 50
        });
        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$invoices$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["recalcTotal"])(ctx, inv.id);
    }
    // Already-sent step state carries over to the new task.
    const sent = (await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$engine$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["tasksForRequest"])(ctx, t.requestId)).some((x)=>Object.values(x.stepState).some((s)=>s.sent));
    if (sent) {
        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$engine$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["markStepState"])(ctx, nt.id, "send", {
            sent: true
        });
        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$engine$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["advance"])(ctx, nt.id);
    }
});
void __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["person"];
void __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["invoice"];
(0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$proposals$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["onApprove"])("revise_invoice", async (ctx, p, opts)=>{
    const { invoiceId, reason, lines } = p.payload;
    const edits = opts.edits;
    const use = edits?.lines ?? lines;
    if (!use?.length) throw new Error("A revision needs its new lines");
    const nw = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$invoices$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["applyRevision"])(ctx, invoiceId, {
        reason,
        lines: use
    });
    if (nw.status === "sent") await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$jobs$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["enqueue"])(ctx, "xero.sync_invoice", {
        invoiceId: nw.id
    }, `xero.invoice:${nw.id}`);
});
}),
"[project]/src/domain/inbound.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "composeReply",
    ()=>composeReply,
    "ingestMessage",
    ()=>ingestMessage,
    "processInbound",
    ()=>processInbound
]);
// Inbound pipeline: store the message, let the intake agent read it against the client's
// open tasks, apply what it found (internal changes automatically, anything client-facing
// as a proposal), and draft one reply for approval.
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/drizzle-orm/sql/expressions/conditions.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$select$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/drizzle-orm/sql/expressions/select.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$names$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/domain/names.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/db/schema.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$crypto$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/crypto.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$agent$2f$intake$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/agent/intake.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$agent$2f$review$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/agent/review.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$agent$2f$planner$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/agent/planner.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$agent$2f$draft$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/agent/draft.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$agent$2f$call$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/agent/call.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$lookup$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/domain/lookup.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$records$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/domain/records.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$people$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/domain/people.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$engine$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/domain/engine.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$playbooks$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/domain/playbooks.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$invoices$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/domain/invoices.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$proposals$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/domain/proposals.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$firm$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/domain/firm.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$labels$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/domain/labels.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$dates$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/domain/dates.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$handlers$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/domain/handlers.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$payments$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/domain/payments.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$accounting$2d$sync$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/domain/accounting-sync.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$step$2d$hooks$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/domain/step-hooks.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$signing$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/domain/signing.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$screening$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/domain/screening.ts [app-route] (ecmascript)");
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
const MIN_CONFIDENCE = 0.7;
const ONBOARDING = new Set([
    "hk.transferIn",
    "hk.incorporation"
]);
async function ingestMessage(ctx, m) {
    if (m.providerMessageId) {
        const dup = await ctx.db.query.message.findFirst({
            where: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["and"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["message"].provider, m.provider), (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["message"].providerMessageId, m.providerMessageId))
        });
        if (dup) return {
            ...dup,
            duplicate: true
        };
    }
    // Thread: provider thread id, then In-Reply-To, else a new conversation.
    let conv = m.providerThreadId ? await ctx.db.query.conversation.findFirst({
        where: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["and"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["conversation"].firmId, ctx.firmId), (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["conversation"].providerThreadId, m.providerThreadId))
    }) : undefined;
    if (!conv && m.inReplyTo) {
        const parent = await ctx.db.query.message.findFirst({
            where: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["message"].rfcMessageId, m.inReplyTo)
        });
        if (parent) conv = await ctx.db.query.conversation.findFirst({
            where: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["conversation"].id, parent.conversationId)
        });
    }
    if (!conv) {
        [conv] = await ctx.db.insert(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["conversation"]).values({
            id: ctx.ids.next("cnv"),
            firmId: ctx.firmId,
            clientId: m.clientId ?? null,
            channel: m.channel,
            providerThreadId: m.providerThreadId ?? null,
            subject: m.subject.replace(/^(re|fwd?):\s*/i, ""),
            counterpartyEmail: m.from.email?.toLowerCase() ?? null,
            lastMessageAt: m.receivedAt,
            createdAt: ctx.clock.now()
        }).returning();
    } else {
        await ctx.db.update(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["conversation"]).set({
            lastMessageAt: m.receivedAt
        }).where((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["conversation"].id, conv.id));
    }
    const [row] = await ctx.db.insert(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["message"]).values({
        id: ctx.ids.next("msg"),
        firmId: ctx.firmId,
        conversationId: conv.id,
        direction: "in",
        provider: m.provider,
        providerMessageId: m.providerMessageId ?? null,
        rfcMessageId: m.rfcMessageId ?? null,
        inReplyTo: m.inReplyTo ?? null,
        fromAddr: m.from.email?.toLowerCase() ?? null,
        fromName: m.from.name ?? null,
        toAddrs: m.to,
        ccAddrs: m.cc,
        subject: m.subject,
        text: m.text,
        html: m.html ?? null,
        status: "received",
        at: m.receivedAt
    }).returning();
    for (const a of m.attachments){
        const docId = ctx.ids.next("doc");
        const key = `attachments/${row.id}/${a.filename.replace(/[^\w.\-]/g, "_")}`;
        await ctx.storage.put(key, a.content);
        await ctx.db.insert(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["document"]).values({
            id: docId,
            firmId: ctx.firmId,
            clientId: conv.clientId,
            kind: "upload",
            title: a.filename,
            storageKey: key,
            mime: a.mime,
            sha256: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$crypto$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["Crypto"].sha256(a.content),
            source: m.channel === "portal" ? "upload" : "email",
            createdAt: ctx.clock.now()
        });
        await ctx.db.insert(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["attachment"]).values({
            id: ctx.ids.next("att"),
            firmId: ctx.firmId,
            messageId: row.id,
            documentId: docId,
            filename: a.filename,
            mime: a.mime,
            size: a.content.length
        });
    }
    return {
        ...row,
        duplicate: false
    };
}
async function processInbound(ctx, messageId) {
    const msg = await ctx.db.query.message.findFirst({
        where: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["message"].id, messageId)
    });
    if (!msg) throw new Error("Message not found");
    const conv = await ctx.db.query.conversation.findFirst({
        where: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["conversation"].id, msg.conversationId)
    });
    const result = {
        messageId,
        clientId: null,
        requestId: null,
        taskIds: [],
        proposalIds: []
    };
    const atts = await ctx.db.select().from(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["attachment"]).where((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["attachment"].messageId, messageId));
    const matches = msg.fromAddr ? await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$lookup$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["findClientsBySenderEmail"])(ctx, msg.fromAddr) : [];
    const candidateIds = [
        ...new Set([
            ...conv.clientId ? [
                conv.clientId
            ] : [],
            ...matches.map((x)=>x.client.id)
        ])
    ];
    const history = await ctx.db.select().from(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["message"]).where((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["and"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["message"].conversationId, conv.id))).orderBy((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$select$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["asc"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["message"].at));
    let intake;
    try {
        ({ intake } = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$agent$2f$intake$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["runIntake"])(ctx, {
            messageId,
            from: {
                email: msg.fromAddr,
                name: msg.fromName
            },
            subject: msg.subject,
            text: msg.text ?? "",
            attachments: atts.map((a)=>({
                    filename: a.filename,
                    mime: a.mime
                })),
            candidateClientIds: candidateIds,
            threadHistory: history.filter((h)=>h.id !== messageId && (h.status === "sent" || h.status === "received")).map((h)=>({
                    direction: h.direction,
                    text: h.text ?? ""
                }))
        }));
    } catch (e) {
        if (!(e instanceof __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$agent$2f$call$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["AgentError"])) throw e;
        const p = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$proposals$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["createProposal"])(ctx, {
            kind: "triage",
            title: `Couldn't read a message from ${msg.fromName ?? msg.fromAddr ?? "unknown sender"}`,
            summary: "The intake agent failed twice. Read the message and start the request by hand.",
            clientId: conv.clientId,
            payload: {
                messageId,
                reason: e.message
            }
        });
        await markProcessed(ctx, messageId, {
            error: e.message
        });
        return {
            ...result,
            proposalIds: [
                p.id
            ]
        };
    }
    // ----- Client -----
    let clientId = null;
    if (intake.client.kind === "existing" && intake.client.clientId && candidateIds.includes(intake.client.clientId)) clientId = intake.client.clientId;
    else if (intake.client.kind === "unclear" && candidateIds.length === 1) clientId = candidateIds[0];
    else if (intake.client.kind === "new_prospect" || candidateIds.length === 0 && intake.actions.some((a)=>a.type !== "general_correspondence")) {
        clientId = await createProspect(ctx, intake, msg);
    }
    if (!clientId) {
        const p = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$proposals$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["createProposal"])(ctx, {
            kind: "triage",
            title: `Which client is this? ${msg.fromName ?? msg.fromAddr}`,
            summary: intake.client.reason,
            payload: {
                messageId,
                candidates: candidateIds,
                intake
            }
        });
        await markProcessed(ctx, messageId, {
            intake
        });
        return {
            ...result,
            proposalIds: [
                p.id
            ]
        };
    }
    result.clientId = clientId;
    await namePropsect(ctx, clientId, intake);
    if (conv.clientId !== clientId) await ctx.db.update(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["conversation"]).set({
        clientId
    }).where((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["conversation"].id, conv.id));
    for (const a of atts)if (a.documentId) await ctx.db.update(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["document"]).set({
        clientId
    }).where((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["document"].id, a.documentId));
    const cl = await ctx.db.query.client.findFirst({
        where: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["client"].id, clientId)
    });
    // ----- Actions -----
    const facts = emptyFacts(intake.language);
    const confident = (a)=>a.confidence >= MIN_CONFIDENCE || a.type === "general_correspondence" || a.type === "ask_question";
    for (const a of intake.actions.filter((x)=>!confident(x))){
        const p = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$proposals$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["createProposal"])(ctx, {
            kind: "triage",
            title: `Not sure what ${msg.fromName ?? "the client"} wants`,
            summary: `${a.type}: ${a.description ?? a.playbookId ?? ""} (confidence ${Math.round(a.confidence * 100)}%)`,
            clientId,
            payload: {
                messageId,
                action: a
            }
        });
        result.proposalIds.push(p.id);
    }
    const actions = intake.actions.filter(confident);
    const starts = actions.filter((a)=>a.type === "start_request" && a.playbookId);
    const unsupported = actions.filter((a)=>a.type === "unsupported_request");
    const validStarts = [];
    for (const a of starts){
        const pb = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$playbooks$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getPlaybook"])(ctx, a.playbookId).catch(()=>null);
        if (pb) validStarts.push({
            a,
            pbId: pb.id
        });
        else unsupported.push({
            ...a,
            type: "unsupported_request",
            description: a.description ?? `Request for ${a.playbookId}`
        });
    }
    if (cl.lifecycle === "prospect" && (validStarts.length || unsupported.length) && !validStarts.some((s)=>ONBOARDING.has(s.pbId))) {
        const sender = await ctx.db.query.contact.findFirst({
            where: (x, { and, eq })=>and(eq(x.clientId, clientId), eq(x.isInstructing, true))
        });
        validStarts.unshift({
            a: {
                type: "start_request",
                taskId: null,
                playbookId: "hk.transferIn",
                person: sender?.personId ? {
                    mode: "existing",
                    personId: sender.personId,
                    nameEn: sender.name,
                    nameZh: null,
                    email: sender.email
                } : null,
                fields: [],
                attachments: [],
                effectiveDate: null,
                description: "Onboarding as a new client",
                confidence: 1,
                evidence: null
            },
            pbId: "hk.transferIn"
        });
    }
    let requestId = null;
    const newTasks = [];
    if (validStarts.length || unsupported.length) {
        const req = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$engine$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["createRequest"])(ctx, {
            clientId,
            summary: intake.summary,
            conversationId: conv.id,
            sourceMessageId: messageId
        });
        requestId = req.id;
        for (const { a, pbId } of validStarts)newTasks.push(await startFromAction(ctx, clientId, req.id, pbId, a, messageId));
        for (const a of unsupported){
            const t = await startCustom(ctx, clientId, req.id, a, cl.nameEn, messageId).catch((e)=>{
                if (e instanceof __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$agent$2f$call$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["AgentError"]) return null;
                throw e;
            });
            if (t) {
                newTasks.push(t);
                const p = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$proposals$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["createProposal"])(ctx, {
                    kind: "custom_plan",
                    title: `Review planned one-off task: ${t.title}`,
                    summary: a.description,
                    clientId,
                    taskId: t.id,
                    requestId: req.id,
                    payload: {
                        taskId: t.id
                    }
                });
                result.proposalIds.push(p.id);
            } else {
                const p = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$proposals$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["createProposal"])(ctx, {
                    kind: "triage",
                    title: `Unsupported request: ${a.description}`,
                    clientId,
                    payload: {
                        messageId,
                        action: a
                    }
                });
                result.proposalIds.push(p.id);
            }
        }
        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$invoices$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["createInvoiceForRequest"])(ctx, req.id);
        result.requestId = req.id;
        result.taskIds.push(...newTasks.map((t)=>t.id));
    }
    const touchedTasks = [];
    const taskActions = actions.filter((x)=>[
            "provide_information",
            "change_request",
            "cancel_request"
        ].includes(x.type));
    // Different tasks are independent, so their reviews run in parallel; actions on the same task stay in order.
    const byTask = new Map();
    for (const a of taskActions)byTask.set(a.taskId ?? `none-${Math.random()}`, [
        ...byTask.get(a.taskId ?? "") ?? [],
        a
    ]);
    const groupResults = await Promise.all([
        ...byTask.values()
    ].map(async (group)=>{
        const local = {
            questions: [],
            touched: [],
            changes: [],
            cancellations: [],
            proposals: []
        };
        for (const a of group)await handleTaskAction(a, local);
        return local;
    }));
    for (const g of groupResults){
        facts.clarifications.push(...g.questions);
        touchedTasks.push(...g.touched);
        facts.changes.push(...g.changes);
        facts.cancellations.push(...g.cancellations);
        result.proposalIds.push(...g.proposals);
    }
    async function handleTaskAction(a, local) {
        const t = a.taskId ? await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$engine$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getTask"])(ctx, a.taskId).catch(()=>null) : null;
        if (!t || t.clientId !== clientId || t.status !== "open") {
            const p = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$proposals$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["createProposal"])(ctx, {
                kind: "triage",
                title: `Which task is this for? (${a.type.replace("_", " ")})`,
                summary: a.description ?? JSON.stringify(a.fields.map((f)=>f.key)),
                clientId,
                payload: {
                    messageId,
                    action: a
                }
            });
            local.proposals.push(p.id);
            return;
        }
        if (a.type === "cancel_request") {
            const p = await proposeCancel(ctx, t, a.description ?? "Client asked to cancel", messageId);
            local.proposals.push(p.id);
            local.cancellations.push({
                title: pbTitle(await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$playbooks$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getPlaybook"])(ctx, t.playbookId, t.playbookVersion), intake.language),
                note: a.description ?? ""
            });
            return;
        }
        const sub = {
            proposalIds: []
        };
        const questions = a.type === "provide_information" ? await applyInformation(ctx, t, a, atts, messageId, sub) : await applyChange(ctx, t, a, messageId, sub);
        local.proposals.push(...sub.proposalIds);
        local.questions.push(...questions);
        if (!local.touched.some((x)=>x.id === t.id)) local.touched.push(await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$engine$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getTask"])(ctx, t.id));
        if (a.type === "change_request") local.changes.push({
            title: pbTitle(await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$playbooks$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getPlaybook"])(ctx, t.playbookId, t.playbookVersion), intake.language),
            change: a.description ?? "",
            nowNeeded: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$engine$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["outstanding"])(await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$engine$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getTask"])(ctx, t.id)).map((e)=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$labels$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["itemLabel"])(e.key, intake.language, t.params))
        });
    }
    for (const a of actions.filter((x)=>x.type === "ask_question"))facts.questions.push({
        question: a.description ?? "",
        facts: await answerFacts(ctx, clientId)
    });
    // Advance touched tasks (e.g. collection complete) and new tasks (send step waits for approval).
    for (const t of touchedTasks)await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$engine$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["advance"])(ctx, t.id);
    // ----- Reply -----
    const needsReply = newTasks.length > 0 || facts.questions.length > 0 || facts.changes.length > 0 || facts.cancellations.length > 0 || touchedTasks.length > 0 || facts.clarifications.length > 0;
    if (needsReply) {
        for (const t of newTasks){
            const tt = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$engine$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getTask"])(ctx, t.id);
            const pb = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$playbooks$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getPlaybook"])(ctx, tt.playbookId, tt.playbookVersion);
            facts.newRequests.push({
                title: pbTitle(pb, intake.language) + (tt.personId ? ` (${(await ctx.db.query.person.findFirst({
                    where: (p, { eq })=>eq(p.id, tt.personId)
                }))?.nameEn})` : ""),
                needed: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$engine$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["outstanding"])(tt).map((e)=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$labels$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["itemLabel"])(e.key, intake.language, tt.params)),
                onFile: tt.checklist.filter((e)=>e.status === "on_file").map((e)=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$labels$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["itemLabel"])(e.key, intake.language, tt.params)),
                alreadyReceived: tt.checklist.filter((e)=>e.status === "received").map((e)=>`${(0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$labels$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["itemLabel"])(e.key, intake.language, tt.params)}${e.value && !__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$labels$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["PROTECTED_KEYS"].has(e.key) ? `: ${(0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$dates$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["isIsoDate"])(e.value) ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$dates$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["fmtDate"])(e.value, intake.language) : e.value}` : ""}`),
                deadline: tt.dueDate ? `${(0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$dates$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["fmtDate"])(tt.dueDate, intake.language)} (${pb.deadline.kind !== "none" ? pb.deadline.rule : ""})` : null
            });
        }
        for (const t of touchedTasks){
            const tt = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$engine$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getTask"])(ctx, t.id);
            const ttTitle = pbTitle(await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$playbooks$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getPlaybook"])(ctx, tt.playbookId, tt.playbookVersion), intake.language);
            if (facts.changes.some((c)=>c.title.startsWith(ttTitle))) continue;
            facts.updates.push({
                title: tt.title,
                received: tt.checklist.filter((e)=>e.status === "received").map((e)=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$labels$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["itemLabel"])(e.key, intake.language, tt.params)),
                stillNeeded: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$engine$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["outstanding"])(tt).map((e)=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$labels$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["itemLabel"])(e.key, intake.language, tt.params)),
                nextStep: tt._steps[tt.stepIndex]?.label ?? null
            });
        }
        const reqForLink = requestId ?? touchedTasks[0]?.requestId ?? null;
        const draft = await composeReply(ctx, {
            clientId,
            conversationId: conv.id,
            inReplyTo: msg,
            facts,
            requestId: reqForLink,
            messageId
        });
        const p = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$proposals$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["createProposal"])(ctx, {
            kind: "send_message",
            title: requestId ? `Approve reply and invoice to ${msg.fromName ?? msg.fromAddr}` : `Approve reply to ${msg.fromName ?? msg.fromAddr}`,
            summary: intake.summary,
            clientId,
            requestId,
            payload: {
                messageId: draft.id,
                requestId,
                taskIds: [
                    ...newTasks,
                    ...touchedTasks
                ].map((t)=>t.id),
                draftSource: draft.source,
                purpose: requestId ? "request" : "update"
            }
        });
        await ctx.db.update(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["message"]).set({
            proposalId: p.id
        }).where((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["message"].id, draft.id));
        result.proposalIds.push(p.id);
    }
    await markProcessed(ctx, messageId, {
        intake
    });
    return result;
}
// ---------- Helpers ----------
/** A prospect first known only by the sender's name takes the company's name and number once given. */ async function namePropsect(ctx, clientId, intake) {
    const cl = await ctx.db.query.client.findFirst({
        where: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["client"].id, clientId)
    });
    if (!cl || cl.lifecycle !== "prospect") return;
    const patch = {};
    if (intake.client.companyName && /\(new prospect\)$/.test(cl.nameEn)) patch.nameEn = intake.client.companyName.trim();
    if (intake.client.companyNumber && !cl.companyNumber) patch.companyNumber = intake.client.companyNumber.trim();
    if (Object.keys(patch).length) {
        await ctx.db.update(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["client"]).set(patch).where((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["client"].id, clientId));
        const { audit } = await __turbopack_context__.A("[project]/src/domain/audit.ts [app-route] (ecmascript, async loader)");
        await audit(ctx, "client.named", "client", clientId, patch, "agent");
    }
}
function emptyFacts(language) {
    return {
        language,
        recipientName: "",
        clientName: "",
        signOff: "",
        newRequests: [],
        updates: [],
        changes: [],
        cancellations: [],
        questions: [],
        clarifications: [],
        invoice: null,
        uploadUrl: null
    };
}
function pbTitle(pb, lang) {
    return pb.name[lang] ?? pb.name.en;
}
async function markProcessed(ctx, messageId, data) {
    await ctx.db.update(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["message"]).set({
        processedAt: ctx.clock.now(),
        intake: data.intake ?? null,
        error: data.error ?? null
    }).where((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["message"].id, messageId));
}
async function createProspect(ctx, intake, msg) {
    const name = intake.client.companyName?.trim() || `${intake.client.senderName ?? msg.fromName ?? msg.fromAddr} (new prospect)`;
    const cl = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$records$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["createClient"])(ctx, {
        nameEn: name,
        lifecycle: "prospect",
        operatingStatus: intake.actions.some((a)=>a.playbookId === "hk.incorporation") ? "not_incorporated" : "operating",
        companyNumber: intake.client.companyNumber,
        messageLang: intake.language,
        staffId: ctx.userId,
        jurisdiction: "HK"
    });
    const person = msg.fromAddr ? await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$people$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["resolvePerson"])(ctx, cl.id, {
        nameEn: intake.client.senderName ?? msg.fromName ?? msg.fromAddr,
        email: msg.fromAddr
    }) : null;
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$records$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["addContact"])(ctx, {
        clientId: cl.id,
        personId: person?.id ?? null,
        name: intake.client.senderName ?? msg.fromName ?? msg.fromAddr ?? "Contact",
        role: "Gives instructions and receives invoices",
        email: msg.fromAddr,
        channel: "email",
        language: intake.language,
        isBilling: true,
        isInstructing: true
    });
    return cl.id;
}
function toExtracted(fields, allowed) {
    const out = {};
    for (const f of fields)if (allowed.has(f.key) && f.value?.trim()) out[f.key] = {
        value: f.value.trim(),
        source: f.quote
    };
    return out;
}
async function startFromAction(ctx, clientId, requestId, pbId, a, messageId) {
    const pb = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$playbooks$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getPlaybook"])(ctx, pbId);
    let personId = null;
    if (pb.personSelection && pb.personSelection !== "none" && a.person && a.person.mode !== "none") {
        const p = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$people$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["resolvePerson"])(ctx, clientId, {
            personId: a.person.mode === "existing" ? a.person.personId : null,
            nameEn: a.person.nameEn,
            nameZh: a.person.nameZh,
            email: a.person.email
        });
        personId = p.id;
    }
    const extracted = toExtracted(a.fields, new Set(pb.requirements.map((r)=>r.key)));
    if (a.effectiveDate && !extracted.effDate && pb.requirements.some((r)=>r.key === "effDate")) extracted.effDate = {
        value: a.effectiveDate,
        source: a.evidence
    };
    // Person particulars given in the first message go on the new person's record; for an
    // existing person, differing values are conflicts (never silent overwrites).
    const conflicts = personId ? await writePersonParticulars(ctx, personId, extracted, clientId) : [];
    for (const c of conflicts)delete extracted[c];
    const t = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$engine$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["startTask"])(ctx, {
        requestId,
        clientId,
        playbookId: pb.id,
        personId,
        extracted
    });
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$engine$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["logEvent"])(ctx, t.id, "agent.intake", `Harbourline read the client's message: ${a.description ?? pb.name.en}`, {
        evidence: a.evidence,
        confidence: a.confidence,
        messageId
    }, "agent");
    return t;
}
const PERSON_FIELD = {
    fullName: "nameEn",
    chiName: "nameZh",
    idNo: "idNumber",
    resAddr: "residentialAddress",
    corrAddr: "correspondenceAddress"
};
/** Returns keys that conflict with on-file values (these become conflict proposals). */ async function writePersonParticulars(ctx, personId, ex, clientId, taskId) {
    const p = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$records$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getPersonProtected"])(ctx, personId);
    const patch = {};
    const conflicts = [];
    for (const [key, field] of Object.entries(PERSON_FIELD)){
        const v = ex[key]?.value;
        if (!v) continue;
        const onFile = p[field];
        if (!onFile) {
            patch[field] = v;
            continue;
        }
        if (!(0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$names$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["sameValue"])(onFile, v)) {
            conflicts.push(key);
            await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$proposals$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["createProposal"])(ctx, {
                kind: "conflict",
                title: `Conflicting ${(0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$labels$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["itemLabel"])(key)} for ${p.nameEn}`,
                summary: `On file: ${__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$labels$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["PROTECTED_KEYS"].has(key) ? "(protected)" : onFile}. Client now says: ${v}.`,
                clientId,
                taskId: taskId ?? null,
                payload: {
                    taskId: taskId ?? null,
                    key,
                    onFile: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$labels$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["PROTECTED_KEYS"].has(key) ? "(protected value on file)" : onFile,
                    incoming: v,
                    personId,
                    question: `Could you please confirm your ${(0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$labels$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["itemLabel"])(key).toLowerCase()}? It differs from our records.`
                }
            });
        }
    }
    const ci = ex.contactInfo?.value;
    if (ci) {
        const email = ci.match(/[\w.+-]+@[\w.-]+/)?.[0];
        const phone = ci.match(/\+?\d[\d\s-]{6,}/)?.[0]?.trim();
        if (email && !p.email) patch.email = email;
        if (phone && !p.phone) patch.phone = phone;
    }
    if (Object.keys(patch).length) await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$records$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["updatePerson"])(ctx, personId, patch, "From client's message");
    return conflicts;
}
async function startCustom(ctx, clientId, requestId, a, clientName, messageId) {
    const plan = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$agent$2f$planner$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["planCustomTask"])(ctx, {
        description: a.description ?? "",
        clientName,
        messageId
    });
    const t = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$engine$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["startTask"])(ctx, {
        requestId,
        clientId,
        playbookId: "hk.custom",
        title: plan.title,
        params: {
            plan,
            planStatus: "proposed",
            description: a.description
        },
        extracted: {
            taskScope: {
                value: a.description ?? plan.title,
                source: a.evidence
            }
        }
    });
    const checklist = [
        ...t.checklist,
        ...plan.items.map((i)=>({
                key: i.key,
                personId: null,
                status: "needed"
            }))
    ];
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$engine$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["setChecklist"])(ctx, t.id, checklist, "Checklist planned by the agent (staff to review)", "agent");
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$engine$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getTask"])(ctx, t.id);
}
async function applyInformation(ctx, t, a, atts, messageId, result) {
    const pb = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$playbooks$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getPlaybook"])(ctx, t.playbookId, t.playbookVersion);
    const allowed = new Set(t.checklist.map((e)=>e.key));
    const ex = toExtracted(a.fields, allowed);
    const conflicts = t.personId ? await writePersonParticulars(ctx, t.personId, ex, t.clientId, t.id) : [];
    const next = t.checklist.map((e)=>({
            ...e
        }));
    const personKeys = new Set(pb.requirements.filter((r)=>r.scope === "person").map((r)=>r.key));
    const received = [];
    for (const [key, v] of Object.entries(ex)){
        if (conflicts.includes(key)) continue;
        const i = next.findIndex((e)=>e.key === key && (!personKeys.has(key) || e.personId === t.personId));
        if (i >= 0 && next[i].status !== "on_file") {
            next[i] = {
                ...next[i],
                status: "received",
                value: v.value,
                source: v.source ?? null
            };
            received.push(key);
        }
    }
    for (const m of a.attachments){
        const att = atts.find((x)=>x.filename === m.filename);
        if (!att?.documentId || !m.key || !allowed.has(m.key)) continue;
        const pid = personKeys.has(m.key) ? m.personId ?? t.personId : null;
        const i = next.findIndex((e)=>e.key === m.key && (!personKeys.has(m.key) || e.personId === pid));
        if (i < 0) continue;
        next[i] = {
            ...next[i],
            status: "received",
            documentId: att.documentId,
            source: m.filename
        };
        await ctx.db.update(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["document"]).set({
            taskId: t.id,
            personId: pid,
            requirementKey: m.key,
            kind: m.key === "idCopy" ? "id_copy" : m.key === "addrProof" ? "address_proof" : "upload"
        }).where((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["document"].id, att.documentId));
        received.push(m.key);
    }
    const extracted = {
        ...t.extracted,
        ...ex
    };
    await ctx.db.update(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["task"]).set({
        extracted
    }).where((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["task"].id, t.id));
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$engine$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["setChecklist"])(ctx, t.id, next, "Information received from the client", "agent");
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$engine$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["logEvent"])(ctx, t.id, "agent.information", `Harbourline filed ${received.length} item(s) from the client's message`, {
        keys: received,
        messageId
    }, "agent");
    const review = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$agent$2f$review$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["runReview"])(ctx, t.id, {
        kind: "information",
        description: a.description ?? "Client provided information",
        newFields: a.fields.map((f)=>({
                key: f.key,
                value: f.value
            })),
        messageId
    });
    const out = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$agent$2f$review$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["applyReview"])(ctx, t.id, review, {
        clientId: t.clientId
    });
    result.proposalIds.push(...out.proposals);
    return out.questions;
}
async function applyChange(ctx, t, a, messageId, result) {
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$engine$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["logEvent"])(ctx, t.id, "agent.change", `Client changed the instructions: ${a.description ?? ""}`, {
        messageId
    }, "agent");
    const review = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$agent$2f$review$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["runReview"])(ctx, t.id, {
        kind: "change",
        description: a.description ?? "",
        newFields: a.fields.map((f)=>({
                key: f.key,
                value: f.value
            })),
        messageId
    });
    const out = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$agent$2f$review$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["applyReview"])(ctx, t.id, review, {
        clientId: t.clientId,
        newPersonHint: a.person && a.person.mode !== "none" ? {
            nameEn: a.person.nameEn,
            nameZh: a.person.nameZh,
            email: a.person.email,
            personId: a.person.mode === "existing" ? a.person.personId : null
        } : null
    });
    // Values given alongside the change (e.g. the new date) land on the checklist too.
    if (a.fields.length) {
        const cur = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$engine$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getTask"])(ctx, t.id);
        const ex = toExtracted(a.fields, new Set(cur.checklist.map((e)=>e.key)));
        const next = cur.checklist.map((e)=>ex[e.key] && e.status !== "on_file" && (!e.personId || e.personId === cur.personId) ? {
                ...e,
                status: "received",
                value: ex[e.key].value
            } : e);
        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$engine$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["setChecklist"])(ctx, t.id, next, "Updated from the client's change", "agent");
    }
    result.proposalIds.push(...out.proposals);
    return out.questions;
}
async function proposeCancel(ctx, t, reason, messageId) {
    let voidInvoice = false;
    if (t.requestId) {
        const req = await ctx.db.query.request.findFirst({
            where: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["request"].id, t.requestId)
        });
        if (req?.invoiceId) {
            const inv = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$invoices$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["invoiceWithLines"])(ctx, req.invoiceId);
            const others = (await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$engine$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["tasksForRequest"])(ctx, t.requestId)).filter((x)=>x.id !== t.id && x.status === "open");
            voidInvoice = inv.paidCents === 0 && inv.status !== "void" && others.length === 0;
        }
    }
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$proposals$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["createProposal"])(ctx, {
        kind: "cancel_task",
        title: `Cancel: ${t.title}`,
        summary: reason,
        clientId: t.clientId,
        taskId: t.id,
        requestId: t.requestId,
        payload: {
            taskId: t.id,
            voidInvoice,
            reason,
            messageId
        }
    });
}
async function answerFacts(ctx, clientId) {
    const tasks = await ctx.db.select().from(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["task"]).where((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["and"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["task"].clientId, clientId), (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["task"].status, "open")));
    const lines = [];
    for (const t0 of tasks){
        const t = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$engine$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getTask"])(ctx, t0.id);
        lines.push(`${t.title}: current step "${t._steps[t.stepIndex]?.label ?? "done"}"; waiting for ${(0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$engine$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["outstanding"])(t).map((e)=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$labels$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["itemLabel"])(e.key)).join(", ") || "nothing from the client"}${t.dueDate ? `; statutory deadline ${t.dueDate}` : ""}.`);
    }
    const { upcomingDeadlines } = await __turbopack_context__.A("[project]/src/domain/deadlines.ts [app-route] (ecmascript, async loader)");
    for (const d of (await upcomingDeadlines(ctx, {
        clientId,
        withinDays: 180
    })))lines.push(`${d.label} due ${d.dueDate}.`);
    return lines.join("\n") || "No open work for this client.";
}
async function composeReply(ctx, o) {
    const f = o.facts;
    const firm = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$firm$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getFirm"])(ctx);
    const cl = await ctx.db.query.client.findFirst({
        where: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["client"].id, o.clientId)
    });
    const contacts = await ctx.db.query.contact.findMany({
        where: (c, { eq })=>eq(c.clientId, o.clientId)
    });
    const toAddr = o.to?.[0] ?? o.inReplyTo?.fromAddr ?? contacts.find((c)=>c.isInstructing)?.email ?? contacts[0]?.email ?? null;
    const ct = contacts.find((c)=>c.email && toAddr && c.email.toLowerCase() === toAddr.toLowerCase());
    f.recipientName = ct?.salutation?.[f.language] ?? ct?.name ?? o.inReplyTo?.fromName ?? (f.language === "en" ? "Sir or Madam" : "客戶");
    f.clientName = (f.language === "tc" ? cl.nameTc : f.language === "sc" ? cl.nameSc : null) ?? cl.nameEn;
    f.signOff = firm.signOff?.[f.language] ?? firm.legalName;
    if (o.requestId) {
        const req = await ctx.db.query.request.findFirst({
            where: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["request"].id, o.requestId)
        });
        f.uploadUrl = `${ctx.config.APP_URL}/u/${req.uploadToken}`;
        if (req.invoiceId && o.purpose !== "update") {
            const inv = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$invoices$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["invoiceWithLines"])(ctx, req.invoiceId);
            if (inv.status === "draft") {
                const details = await ctx.bank.accountDetails();
                f.invoice = {
                    number: inv.number,
                    totalFormatted: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$labels$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["money"])(inv.totalCents, inv.currency),
                    lines: inv.lines.map((l)=>({
                            description: l.description,
                            amount: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$labels$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["money"])(l.amountCents, inv.currency)
                        })),
                    terms: inv.termsDays ? f.language === "en" ? `payable within ${inv.termsDays} days; we have started work` : `${inv.termsDays}天內付款；我們已開始處理` : f.language === "en" ? "payable on receipt; we start work once payment arrives" : "收到發票後付款；收到款項後即開始處理",
                    paymentInstructions: Object.entries(details).map(([k, v])=>`${k}: ${v}`).join("\n")
                };
            }
        }
    }
    const d = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$agent$2f$draft$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["draftEmail"])(ctx, f, {
        messageId: o.messageId,
        purpose: o.purpose
    });
    const subject = o.inReplyTo?.subject ? /^re:/i.test(o.inReplyTo.subject) ? o.inReplyTo.subject : `Re: ${o.inReplyTo.subject}` : d.subject;
    const [row] = await ctx.db.insert(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["message"]).values({
        id: ctx.ids.next("msg"),
        firmId: ctx.firmId,
        conversationId: o.conversationId,
        direction: "out",
        status: "draft",
        fromAddr: ctx.mail.address,
        toAddrs: toAddr ? [
            toAddr
        ] : [],
        subject,
        text: d.body,
        language: f.language,
        inReplyTo: o.inReplyTo?.rfcMessageId ?? null,
        at: ctx.clock.now(),
        intake: {
            facts: f,
            requestId: o.requestId,
            attachInvoiceId: f.invoice ? (await ctx.db.query.request.findFirst({
                where: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["request"].id, o.requestId)
            }))?.invoiceId ?? null : null
        }
    }).returning();
    return {
        ...row,
        source: d.source
    };
}
}),
"[project]/src/domain/invoices.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "InvoiceError",
    ()=>InvoiceError,
    "applyRevision",
    ()=>applyRevision,
    "billingContact",
    ()=>billingContact,
    "createInvoiceForRequest",
    ()=>createInvoiceForRequest,
    "invoiceWithLines",
    ()=>invoiceWithLines,
    "markInvoiceSent",
    ()=>markInvoiceSent,
    "nextInvoiceNumber",
    ()=>nextInvoiceNumber,
    "proposeRevision",
    ()=>proposeRevision,
    "recalcTotal",
    ()=>recalcTotal,
    "setInvoiceNumber",
    ()=>setInvoiceNumber,
    "setLineAmount",
    ()=>setLineAmount,
    "voidInvoice",
    ()=>voidInvoice
]);
// Invoices: one per request, a line per task fee plus statutory disbursements.
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/drizzle-orm/sql/expressions/conditions.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$select$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/drizzle-orm/sql/expressions/select.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$sql$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/drizzle-orm/sql/sql.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/db/schema.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$playbooks$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/domain/playbooks.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$engine$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/domain/engine.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$dates$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/domain/dates.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$audit$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/domain/audit.ts [app-route] (ecmascript)");
;
;
;
;
;
;
class InvoiceError extends Error {
}
async function nextInvoiceNumber(ctx) {
    const year = ctx.clock.today().slice(0, 4);
    // Allocate atomically, skipping numbers already used as custom numbers.
    for(;;){
        const [f] = await ctx.db.update(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["firm"]).set({
            invoiceSeq: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$sql$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["sql"]`${__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["firm"].invoiceSeq} + 1`
        }).where((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["firm"].id, ctx.firmId)).returning();
        const n = `${f.invoicePrefix}${year}-${String(f.invoiceSeq).padStart(4, "0")}`;
        const clash = await ctx.db.query.invoice.findFirst({
            where: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["and"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["invoice"].firmId, ctx.firmId), (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["invoice"].number, n))
        });
        if (!clash) return n;
    }
}
async function billingContact(ctx, clientId) {
    const cs = await ctx.db.select().from(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["contact"]).where((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["and"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["contact"].firmId, ctx.firmId), (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["contact"].clientId, clientId)));
    return cs.find((c)=>c.isBilling) ?? cs.find((c)=>c.isInstructing) ?? cs[0] ?? null;
}
async function createInvoiceForRequest(ctx, requestId) {
    const req = await ctx.db.query.request.findFirst({
        where: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["request"].id, requestId)
    });
    if (!req) throw new InvoiceError("Request not found");
    const cl = await ctx.db.query.client.findFirst({
        where: (t, { eq })=>eq(t.id, req.clientId)
    });
    const tasks = (await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$engine$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["tasksForRequest"])(ctx, requestId)).filter((t)=>t.status !== "cancelled");
    const lines = [];
    const disb = [];
    for (const t of tasks){
        const pb = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$playbooks$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getPlaybook"])(ctx, t.playbookId, t.playbookVersion);
        const plan = t.params.plan;
        const fee = plan ? Math.round(plan.feeHkd * 100) : pb.feeCents;
        if (fee > 0) lines.push({
            taskId: t.id,
            description: plan ? plan.title : t.title,
            amountCents: fee,
            kind: "fee"
        });
        for (const s of pb.statutoryFees ?? [])disb.push({
            taskId: t.id,
            description: s.description,
            amountCents: s.amountCents,
            kind: "disbursement"
        });
    }
    const all = [
        ...lines,
        ...disb
    ];
    if (all.length === 0) return null;
    const terms = cl?.paymentTermsDays ?? 0;
    const bc = await billingContact(ctx, req.clientId);
    const [inv] = await ctx.db.insert(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["invoice"]).values({
        id: ctx.ids.next("inv"),
        firmId: ctx.firmId,
        clientId: req.clientId,
        requestId,
        number: await nextInvoiceNumber(ctx),
        status: "draft",
        termsDays: terms,
        totalCents: all.reduce((s, l)=>s + l.amountCents, 0),
        billingContactId: bc?.id ?? null,
        createdAt: ctx.clock.now()
    }).returning();
    await ctx.db.insert(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["invoiceLine"]).values(all.map((l, i)=>({
            id: ctx.ids.next("inl"),
            firmId: ctx.firmId,
            invoiceId: inv.id,
            ...l,
            sort: i
        })));
    await ctx.db.update(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["request"]).set({
        invoiceId: inv.id
    }).where((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["request"].id, requestId));
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$audit$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["audit"])(ctx, "invoice.create", "invoice", inv.id, {
        number: inv.number,
        total: inv.totalCents
    }, "system");
    return inv;
}
async function invoiceWithLines(ctx, invoiceId) {
    const inv = await ctx.db.query.invoice.findFirst({
        where: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["invoice"].id, invoiceId)
    });
    if (!inv) throw new InvoiceError("Invoice not found");
    const lines = await ctx.db.select().from(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["invoiceLine"]).where((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["invoiceLine"].invoiceId, invoiceId)).orderBy((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$select$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["asc"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["invoiceLine"].sort));
    return {
        ...inv,
        lines
    };
}
async function recalcTotal(ctx, invoiceId) {
    const lines = await ctx.db.select().from(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["invoiceLine"]).where((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["invoiceLine"].invoiceId, invoiceId));
    const total = lines.reduce((s, l)=>s + l.amountCents, 0);
    await ctx.db.update(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["invoice"]).set({
        totalCents: total
    }).where((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["invoice"].id, invoiceId));
    return total;
}
async function markInvoiceSent(ctx, invoiceId) {
    const inv = await ctx.db.query.invoice.findFirst({
        where: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["invoice"].id, invoiceId)
    });
    if (!inv || inv.status !== "draft") return inv;
    const issued = ctx.clock.today();
    const [row] = await ctx.db.update(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["invoice"]).set({
        status: "sent",
        issuedOn: issued,
        dueOn: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$dates$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["addDays"])(issued, inv.termsDays)
    }).where((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["invoice"].id, invoiceId)).returning();
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$audit$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["audit"])(ctx, "invoice.sent", "invoice", invoiceId, {
        number: inv.number
    });
    return row;
}
async function voidInvoice(ctx, invoiceId, reason) {
    const inv = await ctx.db.query.invoice.findFirst({
        where: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["invoice"].id, invoiceId)
    });
    if (!inv) throw new InvoiceError("Invoice not found");
    if (inv.paidCents > 0) throw new InvoiceError("A paid or part-paid invoice can't be voided; issue a credit note instead");
    await ctx.db.update(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["invoice"]).set({
        status: "void"
    }).where((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["invoice"].id, invoiceId));
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$audit$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["audit"])(ctx, "invoice.void", "invoice", invoiceId, {
        reason
    });
}
async function setInvoiceNumber(ctx, invoiceId, number) {
    const n = number.trim();
    if (!n) throw new InvoiceError("Invoice number can't be blank");
    const inv = await ctx.db.query.invoice.findFirst({
        where: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["invoice"].id, invoiceId)
    });
    if (!inv) throw new InvoiceError("Invoice not found");
    if (inv.status !== "draft") throw new InvoiceError("The number can't change once the invoice has been sent; revise it instead");
    const clash = await ctx.db.query.invoice.findFirst({
        where: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["and"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["invoice"].firmId, ctx.firmId), (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["invoice"].number, n))
    });
    if (clash && clash.id !== invoiceId) throw new InvoiceError(`Invoice number ${n} is already used`);
    await ctx.db.update(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["invoice"]).set({
        number: n,
        numberIsCustom: true
    }).where((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["invoice"].id, invoiceId));
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$audit$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["audit"])(ctx, "invoice.renumber", "invoice", invoiceId, {
        from: inv.number,
        to: n
    });
}
async function setLineAmount(ctx, lineId, amountCents) {
    const line = await ctx.db.query.invoiceLine.findFirst({
        where: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["invoiceLine"].id, lineId)
    });
    if (!line) throw new InvoiceError("Line not found");
    const inv = await ctx.db.query.invoice.findFirst({
        where: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["invoice"].id, line.invoiceId)
    });
    if (inv?.status !== "draft") throw new InvoiceError("Prices can't change once the invoice has been sent; revise it instead");
    if (!Number.isFinite(amountCents) || amountCents < 0) throw new InvoiceError("Amount must be zero or more");
    await ctx.db.update(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["invoiceLine"]).set({
        amountCents: Math.round(amountCents)
    }).where((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["invoiceLine"].id, lineId));
    return recalcTotal(ctx, line.invoiceId);
}
async function proposeRevision(ctx, invoiceId, r) {
    const inv = await invoiceWithLines(ctx, invoiceId);
    if (inv.status === "draft") throw new InvoiceError("Edit a draft directly");
    if (inv.status === "void") throw new InvoiceError("Invoice is void");
    const { createProposal } = await __turbopack_context__.A("[project]/src/domain/proposals.ts [app-route] (ecmascript, async loader)");
    const total = r.lines.reduce((s, l)=>s + l.amountCents, 0);
    return createProposal(ctx, {
        kind: "revise_invoice",
        title: `Revise invoice ${inv.number}`,
        summary: `${r.reason}. New total ${total / 100}.`,
        clientId: inv.clientId,
        requestId: inv.requestId,
        payload: {
            invoiceId,
            reason: r.reason,
            lines: r.lines
        }
    });
}
async function applyRevision(ctx, invoiceId, r) {
    const old = await invoiceWithLines(ctx, invoiceId);
    if (old.paidCents > 0) throw new InvoiceError("Part-paid invoices are revised with a credit note (not built yet)");
    const version = old.version + 1;
    const base = old.number.replace(/-R\d+$/, "");
    const [nw] = await ctx.db.insert(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["invoice"]).values({
        id: ctx.ids.next("inv"),
        firmId: ctx.firmId,
        clientId: old.clientId,
        requestId: old.requestId,
        number: `${base}-R${version}`,
        numberIsCustom: old.numberIsCustom,
        status: old.status === "draft" ? "draft" : "sent",
        issuedOn: ctx.clock.today(),
        dueOn: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$dates$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["addDays"])(ctx.clock.today(), old.termsDays),
        termsDays: old.termsDays,
        currency: old.currency,
        totalCents: r.lines.reduce((s, l)=>s + l.amountCents, 0),
        billingContactId: old.billingContactId,
        version,
        supersedesId: old.id,
        createdAt: ctx.clock.now()
    }).returning();
    await ctx.db.insert(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["invoiceLine"]).values(r.lines.map((l, i)=>({
            id: ctx.ids.next("inl"),
            firmId: ctx.firmId,
            invoiceId: nw.id,
            taskId: l.taskId ?? null,
            description: l.description,
            amountCents: l.amountCents,
            kind: l.kind,
            sort: i
        })));
    await ctx.db.update(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["invoice"]).set({
        status: "void"
    }).where((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["invoice"].id, old.id));
    if (old.requestId) await ctx.db.update(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["request"]).set({
        invoiceId: nw.id
    }).where((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["request"].id, old.requestId));
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$audit$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["audit"])(ctx, "invoice.revise", "invoice", nw.id, {
        supersedes: old.number,
        reason: r.reason
    });
    return nw;
}
}),
"[project]/src/domain/jobs.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "enqueue",
    ()=>enqueue,
    "onJob",
    ()=>onJob,
    "runJobs",
    ()=>runJobs
]);
// Postgres-backed job queue (no Redis). Handlers register by kind; the worker drains it.
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/drizzle-orm/sql/expressions/conditions.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$select$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/drizzle-orm/sql/expressions/select.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$sql$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/drizzle-orm/sql/sql.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/db/schema.ts [app-route] (ecmascript)");
;
;
const jobHandlers = new Map();
function onJob(kind, h) {
    jobHandlers.set(kind, h);
}
async function enqueue(ctx, kind, payload, dedupeKey) {
    await ctx.db.insert(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["job"]).values({
        id: ctx.ids.next("job"),
        firmId: ctx.firmId,
        kind,
        payload,
        dedupeKey: dedupeKey ?? null,
        runAfter: ctx.clock.now()
    }).onConflictDoNothing();
}
async function runJobs(ctx, limit = 20) {
    const due = await ctx.db.select().from(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["job"]).where((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["and"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["job"].firmId, ctx.firmId), (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["job"].status, "queued"), (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["lte"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["job"].runAfter, ctx.clock.now()))).orderBy((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$select$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["asc"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["job"].createdAt)).limit(limit);
    let ran = 0;
    for (const j of due){
        const claimed = await ctx.db.update(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["job"]).set({
            status: "running",
            attempts: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$sql$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["sql"]`${__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["job"].attempts} + 1`
        }).where((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["and"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["job"].id, j.id), (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["job"].status, "queued"))).returning();
        if (!claimed.length) continue;
        const h = jobHandlers.get(j.kind);
        try {
            if (!h) throw new Error(`No handler for job ${j.kind}`);
            await h(ctx, j.payload);
            await ctx.db.update(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["job"]).set({
                status: "done",
                lastError: null
            }).where((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["job"].id, j.id));
        } catch (e) {
            const attempts = claimed[0].attempts;
            await ctx.db.update(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["job"]).set({
                status: attempts >= 5 ? "failed" : "queued",
                lastError: e.message.slice(0, 1000),
                runAfter: new Date(ctx.clock.now().getTime() + 2 ** attempts * 5000)
            }).where((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["job"].id, j.id));
        }
        ran++;
    }
    return ran;
}
}),
"[project]/src/domain/kv.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "kvGet",
    ()=>kvGet,
    "kvSet",
    ()=>kvSet,
    "withLease",
    ()=>withLease
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/drizzle-orm/sql/expressions/conditions.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$sql$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/drizzle-orm/sql/sql.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/db/schema.ts [app-route] (ecmascript)");
;
;
async function kvGet(ctx, key) {
    const r = await ctx.db.query.kv.findFirst({
        where: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["and"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["kv"].firmId, ctx.firmId), (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["kv"].key, key))
    });
    return r?.value ?? null;
}
async function kvSet(ctx, key, value) {
    await ctx.db.insert(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["kv"]).values({
        firmId: ctx.firmId,
        key,
        value
    }).onConflictDoUpdate({
        target: [
            __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["kv"].firmId,
            __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["kv"].key
        ],
        set: {
            value
        }
    });
}
async function withLease(ctx, name, seconds, fn) {
    const key = `lease.${name}`;
    const now = new Date();
    const until = new Date(now.getTime() + seconds * 1000).toISOString();
    await ctx.db.insert(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["kv"]).values({
        firmId: ctx.firmId,
        key,
        value: {
            until: new Date(0).toISOString()
        }
    }).onConflictDoNothing();
    const got = await ctx.db.execute(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$sql$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["sql"]`update kv set value = ${JSON.stringify({
        until
    })}::jsonb where firm_id = ${ctx.firmId} and key = ${key} and (value->>'until')::timestamptz < ${now.toISOString()}::timestamptz returning key`);
    if (!got.rows.length) return null;
    try {
        return await fn();
    } finally{
        await ctx.db.execute(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$sql$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["sql"]`update kv set value = ${JSON.stringify({
            until: new Date(0).toISOString()
        })}::jsonb where firm_id = ${ctx.firmId} and key = ${key}`);
    }
}
}),
"[project]/src/domain/labels.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "PROTECTED_KEYS",
    ()=>PROTECTED_KEYS,
    "itemKind",
    ()=>itemKind,
    "itemLabel",
    ()=>itemLabel,
    "money",
    ()=>money
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$playbooks$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/domain/playbooks.ts [app-route] (ecmascript)");
;
let lib = null;
function library() {
    return lib ??= (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$playbooks$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["requirementLibrary"])();
}
function itemLabel(key, lang = "en", params) {
    const def = library()[key];
    if (def) return def.label[lang] ?? def.label.en;
    const plan = params?.plan?.items?.find((i)=>i.key === key);
    if (plan) return lang === "tc" ? plan.labelTc : lang === "sc" ? plan.labelSc : plan.labelEn;
    return key;
}
function itemKind(key, params) {
    const def = library()[key];
    if (def) return def.kind;
    const plan = params?.plan?.items?.find((i)=>i.key === key);
    return plan?.kind ?? "data";
}
function money(cents, currency = "HKD") {
    const v = (cents / 100).toLocaleString("en-US", {
        minimumFractionDigits: cents % 100 ? 2 : 0,
        maximumFractionDigits: 2
    });
    return `${currency === "HKD" ? "HK$" : currency + " "}${v}`;
}
const PROTECTED_KEYS = new Set([
    "idNo",
    "resAddr"
]);
}),
"[project]/src/domain/lookup.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "findClientsBySenderEmail",
    ()=>findClientsBySenderEmail
]);
// Deterministic sender lookup: which clients is this address linked to (as a contact or
// as an officer/member's email)? The intake agent confirms or overrides the match.
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/drizzle-orm/sql/expressions/conditions.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$sql$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/drizzle-orm/sql/sql.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/db/schema.ts [app-route] (ecmascript)");
;
;
async function findClientsBySenderEmail(ctx, email) {
    const e = email.trim().toLowerCase();
    const out = new Map();
    const contacts = await ctx.db.select({
        c: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["contact"],
        cl: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["client"]
    }).from(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["contact"]).innerJoin(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["client"], (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["client"].id, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["contact"].clientId)).where((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["and"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["contact"].firmId, ctx.firmId), __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$sql$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["sql"]`lower(${__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["contact"].email}) = ${e}`));
    for (const { c, cl } of contacts)out.set(cl.id, {
        client: cl,
        personId: c.personId,
        contactId: c.id,
        via: `contact (${c.role ?? "contact"})`
    });
    const officers = await ctx.db.select({
        p: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["person"],
        cl: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["client"]
    }).from(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["person"]).innerJoin(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["appointment"], (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["appointment"].personId, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["person"].id)).innerJoin(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["client"], (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["client"].id, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["appointment"].clientId)).where((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["and"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["person"].firmId, ctx.firmId), __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$sql$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["sql"]`lower(${__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["person"].email}) = ${e}`, (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["or"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["isNull"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["appointment"].toDate), __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$sql$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["sql"]`${__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["appointment"].toDate} > ${ctx.clock.today()}`)));
    for (const { p, cl } of officers)if (!out.has(cl.id)) out.set(cl.id, {
        client: cl,
        personId: p.id,
        contactId: null,
        via: "officer"
    });
    else if (!out.get(cl.id).personId) out.get(cl.id).personId = p.id;
    return [
        ...out.values()
    ];
}
}),
"[project]/src/domain/names.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

// Comparing names and values from different sources: case, punctuation and word order
// ("Jane DOE" / "DOE, Jane") don't make two values different.
__turbopack_context__.s([
    "normTokens",
    ()=>normTokens,
    "sameValue",
    ()=>sameValue
]);
function sameValue(a, b) {
    return normTokens(a) === normTokens(b);
}
function normTokens(s) {
    return s.toLowerCase().normalize("NFKC").replace(/[^\p{L}\p{N}\s]/gu, " ").split(/\s+/).filter(Boolean).sort().join(" ");
}
}),
"[project]/src/domain/outbound.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "OutboundError",
    ()=>OutboundError,
    "invoiceForRequest",
    ()=>invoiceForRequest,
    "sendMessage",
    ()=>sendMessage,
    "textToHtml",
    ()=>textToHtml
]);
// Sending an approved message through the connected mailbox. Only called from an
// approval handler, so nothing reaches a client without a human click.
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/drizzle-orm/sql/expressions/conditions.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/db/schema.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$audit$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/domain/audit.ts [app-route] (ecmascript)");
;
;
;
class OutboundError extends Error {
}
async function sendMessage(ctx, messageId, o) {
    const m = await ctx.db.query.message.findFirst({
        where: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["message"].id, messageId)
    });
    if (!m) throw new OutboundError("Message not found");
    if (m.direction !== "out" || m.status !== "draft" && m.status !== "approved" && m.status !== "failed") throw new OutboundError(`Message is ${m.status}`);
    const conv = await ctx.db.query.conversation.findFirst({
        where: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["conversation"].id, m.conversationId)
    });
    const subject = o.edits?.subject ?? m.subject ?? "";
    const text = o.edits?.text ?? m.text ?? "";
    const to = o.edits?.to ?? m.toAddrs;
    if (!to.length) throw new OutboundError("No recipient");
    await ctx.db.update(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["message"]).set({
        status: "approved",
        subject,
        text,
        toAddrs: to
    }).where((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["message"].id, messageId));
    const refs = m.inReplyTo ? [
        m.inReplyTo
    ] : [];
    try {
        const sent = await ctx.mail.send({
            to,
            cc: m.ccAddrs,
            subject,
            text,
            html: textToHtml(text),
            attachments: o.attachments,
            inReplyTo: m.inReplyTo,
            references: refs,
            providerThreadId: conv.providerThreadId
        });
        await ctx.db.update(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["message"]).set({
            status: "sent",
            provider: ctx.mail.name,
            providerMessageId: sent.providerMessageId,
            rfcMessageId: sent.rfcMessageId ?? null,
            at: ctx.clock.now(),
            error: null
        }).where((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["message"].id, messageId));
        if (sent.providerThreadId && !conv.providerThreadId) await ctx.db.update(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["conversation"]).set({
            providerThreadId: sent.providerThreadId
        }).where((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["conversation"].id, conv.id));
        await ctx.db.update(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["conversation"]).set({
            lastMessageAt: ctx.clock.now()
        }).where((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["conversation"].id, conv.id));
        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$audit$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["audit"])(ctx, "message.sent", "message", messageId, {
            to,
            subject,
            approvedBy: o.approvedBy,
            attachments: (o.attachments ?? []).map((a)=>a.filename)
        });
    } catch (e) {
        await ctx.db.update(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["message"]).set({
            status: "failed",
            error: e.message
        }).where((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["message"].id, messageId));
        throw e;
    }
    return await ctx.db.query.message.findFirst({
        where: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["message"].id, messageId)
    });
}
function textToHtml(text) {
    const esc = (s)=>s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const linked = esc(text).replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1">$1</a>');
    return `<div style="font-family:Arial,'PingFang HK','Microsoft JhengHei',sans-serif;font-size:14px;line-height:1.55;color:#16181D">${linked.split(/\n{2,}/).map((p)=>`<p style="margin:0 0 12px">${p.replace(/\n/g, "<br>")}</p>`).join("")}</div>`;
}
async function invoiceForRequest(ctx, requestId) {
    if (!requestId) return null;
    const req = await ctx.db.query.request.findFirst({
        where: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["request"].id, requestId)
    });
    return req?.invoiceId ? await ctx.db.query.invoice.findFirst({
        where: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["invoice"].id, req.invoiceId)
    }) ?? null : null;
}
}),
"[project]/src/domain/payments.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "markPaidManually",
    ()=>markPaidManually,
    "matchDeposit",
    ()=>matchDeposit,
    "pollBank",
    ()=>pollBank,
    "recordPayment",
    ()=>recordPayment
]);
// Bank deposit matching (deterministic, not LLM): invoice number in the reference and the
// exact amount -> automatic; anything else -> a proposal for staff, or the unmatched queue.
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/drizzle-orm/sql/expressions/conditions.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/db/schema.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$proposals$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/domain/proposals.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$engine$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/domain/engine.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$kv$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/domain/kv.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$jobs$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/domain/jobs.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$clock$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/clock.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$labels$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/domain/labels.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$audit$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/domain/audit.ts [app-route] (ecmascript)");
;
;
;
;
;
;
;
;
;
const squash = (s)=>s.toUpperCase().replace(/[^A-Z0-9]/g, "");
async function pollBank(ctx) {
    return await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$kv$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["withLease"])(ctx, "bank", 120, ()=>pollBankUnlocked(ctx)) ?? {
        fetched: 0,
        matched: 0,
        proposed: 0,
        unmatched: 0
    };
}
async function pollBankUnlocked(ctx) {
    const since = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$kv$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["kvGet"])(ctx, `bank.cursor.${ctx.bank.name}`);
    const deposits = await ctx.bank.listDeposits(since ? new Date(new Date(since).getTime() - 3600_000) : null);
    const out = {
        fetched: deposits.length,
        matched: 0,
        proposed: 0,
        unmatched: 0
    };
    let latest = since ? new Date(since) : new Date(0);
    for (const d of deposits){
        if (d.receivedAt > latest) latest = d.receivedAt;
        const exists = await ctx.db.query.bankTransaction.findFirst({
            where: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["and"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["bankTransaction"].provider, ctx.bank.name), (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["bankTransaction"].providerTxId, d.providerTxId))
        });
        if (exists) continue;
        const r = await matchDeposit(ctx, d);
        out[r]++;
    }
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$kv$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["kvSet"])(ctx, `bank.cursor.${ctx.bank.name}`, latest.toISOString());
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$kv$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["kvSet"])(ctx, "bank.lastPollAt", ctx.clock.now().toISOString());
    return out;
}
async function openInvoices(ctx) {
    return ctx.db.select().from(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["invoice"]).where((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["and"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["invoice"].firmId, ctx.firmId), (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["inArray"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["invoice"].status, [
        "sent",
        "part_paid"
    ])));
}
async function matchDeposit(ctx, d) {
    const [tx] = await ctx.db.insert(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["bankTransaction"]).values({
        id: ctx.ids.next("btx"),
        firmId: ctx.firmId,
        provider: ctx.bank.name,
        providerTxId: d.providerTxId,
        amountCents: d.amountCents,
        currency: d.currency,
        reference: d.reference,
        payerName: d.payerName,
        receivedAt: d.receivedAt,
        raw: d.raw ?? null
    }).onConflictDoNothing().returning();
    if (!tx) return "unmatched";
    const open = await openInvoices(ctx);
    const ref = squash(d.reference ?? "");
    const byRef = ref ? open.filter((i)=>ref.includes(squash(i.number))).sort((a, b)=>b.number.length - a.number.length)[0] : undefined;
    if (byRef) {
        const due = byRef.totalCents - byRef.paidCents;
        if (d.amountCents === due && d.currency === byRef.currency) {
            await recordPayment(ctx, {
                invoiceId: byRef.id,
                bankTransactionId: tx.id,
                amountCents: d.amountCents,
                receivedOn: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$clock$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["hkDate"])(d.receivedAt),
                method: "bank_auto"
            });
            await ctx.db.update(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["bankTransaction"]).set({
                status: "matched",
                matchNote: `Invoice number and amount match ${byRef.number}`
            }).where((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["bankTransaction"].id, tx.id));
            return "matched";
        }
        const diff = d.amountCents - due;
        await ctx.db.update(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["bankTransaction"]).set({
            status: "proposed",
            matchNote: `Quotes ${byRef.number} but amount differs`
        }).where((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["bankTransaction"].id, tx.id));
        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$proposals$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["createProposal"])(ctx, {
            kind: "match_payment",
            title: `Check payment for ${byRef.number}`,
            clientId: byRef.clientId,
            requestId: byRef.requestId,
            summary: `${(0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$labels$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["money"])(d.amountCents, d.currency)} from ${d.payerName ?? "unknown payer"} quotes ${byRef.number}, ${diff < 0 ? `${(0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$labels$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["money"])(-diff)} less than` : `${(0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$labels$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["money"])(diff)} more than`} the ${(0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$labels$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["money"])(due)} due.`,
            payload: {
                bankTransactionId: tx.id,
                invoiceId: byRef.id,
                amountCents: Math.min(d.amountCents, due)
            }
        });
        return "proposed";
    }
    const byAmount = open.filter((i)=>i.totalCents - i.paidCents === d.amountCents && i.currency === d.currency);
    if (byAmount.length === 1) {
        const inv = byAmount[0];
        await ctx.db.update(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["bankTransaction"]).set({
            status: "proposed",
            matchNote: `Amount matches ${inv.number}; no invoice number in the reference`
        }).where((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["bankTransaction"].id, tx.id));
        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$proposals$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["createProposal"])(ctx, {
            kind: "match_payment",
            title: `Is this payment for ${inv.number}?`,
            clientId: inv.clientId,
            requestId: inv.requestId,
            summary: `${(0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$labels$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["money"])(d.amountCents, d.currency)} from ${d.payerName ?? "unknown payer"} (reference "${d.reference ?? ""}") matches the amount due on ${inv.number}.`,
            payload: {
                bankTransactionId: tx.id,
                invoiceId: inv.id,
                amountCents: d.amountCents
            }
        });
        return "proposed";
    }
    return "unmatched";
}
async function recordPayment(ctx, p) {
    const inv = await ctx.db.query.invoice.findFirst({
        where: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["invoice"].id, p.invoiceId)
    });
    const [pay] = await ctx.db.insert(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["payment"]).values({
        id: ctx.ids.next("pay"),
        firmId: ctx.firmId,
        invoiceId: p.invoiceId,
        bankTransactionId: p.bankTransactionId ?? null,
        amountCents: p.amountCents,
        receivedOn: p.receivedOn,
        method: p.method,
        createdAt: ctx.clock.now()
    }).returning();
    const paid = inv.paidCents + p.amountCents;
    const status = paid >= inv.totalCents ? "paid" : "part_paid";
    await ctx.db.update(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["invoice"]).set({
        paidCents: paid,
        status
    }).where((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["invoice"].id, inv.id));
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$audit$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["audit"])(ctx, "payment.record", "invoice", inv.id, {
        amount: p.amountCents,
        method: p.method,
        status
    }, p.method === "bank_auto" ? "system" : ctx.userId);
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$jobs$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["enqueue"])(ctx, "xero.sync_payment", {
        paymentId: pay.id
    }, `xero.payment:${pay.id}`);
    if (inv.requestId) {
        const tasks = await ctx.db.select().from(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["task"]).where((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["and"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["task"].requestId, inv.requestId), (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["task"].status, "open")));
        for (const t of tasks){
            await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$engine$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["logEvent"])(ctx, t.id, "payment.received", `${(0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$labels$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["money"])(p.amountCents, inv.currency)} received against ${inv.number}${status === "paid" ? " (paid in full)" : " (part payment)"}`, {
                paymentId: pay.id,
                method: p.method
            });
            await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$engine$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["advance"])(ctx, t.id);
        }
    }
    return pay;
}
(0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$proposals$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["onApprove"])("match_payment", async (ctx, p)=>{
    const { bankTransactionId, invoiceId, amountCents } = p.payload;
    const tx = await ctx.db.query.bankTransaction.findFirst({
        where: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["bankTransaction"].id, bankTransactionId)
    });
    await recordPayment(ctx, {
        invoiceId,
        bankTransactionId,
        amountCents,
        receivedOn: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$clock$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["hkDate"])(tx.receivedAt),
        method: "bank_approved"
    });
    await ctx.db.update(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["bankTransaction"]).set({
        status: "matched"
    }).where((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["bankTransaction"].id, bankTransactionId));
});
async function markPaidManually(ctx, invoiceId, note) {
    const inv = await ctx.db.query.invoice.findFirst({
        where: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["invoice"].id, invoiceId)
    });
    return recordPayment(ctx, {
        invoiceId,
        amountCents: inv.totalCents - inv.paidCents,
        receivedOn: ctx.clock.today(),
        method: "manual"
    }).then(async (p)=>{
        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$audit$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["audit"])(ctx, "payment.manual", "invoice", invoiceId, {
            note
        });
        return p;
    });
}
void __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["request"];
}),
"[project]/src/domain/people.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "peopleLinkedToClient",
    ()=>peopleLinkedToClient,
    "resolvePerson",
    ()=>resolvePerson
]);
// Resolving the person an instruction is about, without creating duplicates.
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/drizzle-orm/sql/expressions/conditions.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$sql$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/drizzle-orm/sql/sql.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$names$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/domain/names.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/db/schema.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$records$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/domain/records.ts [app-route] (ecmascript)");
;
;
;
;
async function peopleLinkedToClient(ctx, clientId) {
    const ids = new Set();
    for (const r of (await ctx.db.select({
        id: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["appointment"].personId
    }).from(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["appointment"]).where((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["appointment"].clientId, clientId))))ids.add(r.id);
    for (const r of (await ctx.db.select({
        a: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["shareMovement"].toPersonId,
        b: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["shareMovement"].fromPersonId
    }).from(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["shareMovement"]).where((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["shareMovement"].clientId, clientId)))){
        if (r.a) ids.add(r.a);
        if (r.b) ids.add(r.b);
    }
    for (const r of (await ctx.db.select({
        id: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["contact"].personId
    }).from(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["contact"]).where((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["contact"].clientId, clientId))))if (r.id) ids.add(r.id);
    if (ids.size === 0) return [];
    const rows = await ctx.db.select().from(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["person"]).where((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["and"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["person"].firmId, ctx.firmId), __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$sql$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["sql"]`${__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["person"].id} in ${[
        ...ids
    ]}`));
    return rows;
}
async function resolvePerson(ctx, clientId, p) {
    if (p.personId) {
        const row = await ctx.db.query.person.findFirst({
            where: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["and"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["person"].id, p.personId), (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["person"].firmId, ctx.firmId))
        });
        if (row) return row;
    }
    const linked = await peopleLinkedToClient(ctx, clientId);
    const byName = linked.find((x)=>p.nameEn && (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$names$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["sameValue"])(x.nameEn, p.nameEn) || p.nameZh && x.nameZh && (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$names$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["sameValue"])(x.nameZh, p.nameZh));
    if (byName) return byName;
    if (p.email) {
        const byEmail = await ctx.db.query.person.findFirst({
            where: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["and"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["person"].firmId, ctx.firmId), __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$sql$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["sql"]`lower(${__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["person"].email}) = ${p.email.toLowerCase()}`)
        });
        if (byEmail && (!p.nameEn || (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$names$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["sameValue"])(byEmail.nameEn, p.nameEn))) return byEmail;
    }
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$records$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["createPerson"])(ctx, {
        nameEn: p.nameEn || p.nameZh || "Unnamed person",
        nameZh: p.nameZh ?? null,
        email: p.email ?? null
    });
}
}),
"[project]/src/domain/playbooks.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "allPlaybookFiles",
    ()=>allPlaybookFiles,
    "getPlaybook",
    ()=>getPlaybook,
    "getRequirementDefs",
    ()=>getRequirementDefs,
    "listPlaybooks",
    ()=>listPlaybooks,
    "loadPlaybookLibrary",
    ()=>loadPlaybookLibrary,
    "requirementLibrary",
    ()=>requirementLibrary
]);
// Playbook library: JSON files under seed/playbooks are the source of truth,
// loaded into the versioned `playbook` table.
var __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$fs__$5b$external$5d$__$28$node$3a$fs$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/node:fs [external] (node:fs, cjs)");
var __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$path__$5b$external$5d$__$28$node$3a$path$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/node:path [external] (node:path, cjs)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/drizzle-orm/sql/expressions/conditions.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$select$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/drizzle-orm/sql/expressions/select.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/db/schema.ts [app-route] (ecmascript)");
;
;
;
;
const SEED = __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$path__$5b$external$5d$__$28$node$3a$path$2c$__cjs$29$__["default"].join(process.cwd(), "seed");
function allPlaybookFiles() {
    const dir = __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$path__$5b$external$5d$__$28$node$3a$path$2c$__cjs$29$__["default"].join(SEED, "playbooks");
    return (0, __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$fs__$5b$external$5d$__$28$node$3a$fs$2c$__cjs$29$__["readdirSync"])(dir).filter((f)=>f.endsWith(".json")).sort().flatMap((f)=>JSON.parse((0, __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$fs__$5b$external$5d$__$28$node$3a$fs$2c$__cjs$29$__["readFileSync"])(__TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$path__$5b$external$5d$__$28$node$3a$path$2c$__cjs$29$__["default"].join(dir, f), "utf8")));
}
function requirementLibrary() {
    return JSON.parse((0, __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$fs__$5b$external$5d$__$28$node$3a$fs$2c$__cjs$29$__["readFileSync"])(__TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$path__$5b$external$5d$__$28$node$3a$path$2c$__cjs$29$__["default"].join(SEED, "requirement-items.v2.json"), "utf8"));
}
async function loadPlaybookLibrary(ctx) {
    for (const pb of allPlaybookFiles()){
        await ctx.db.insert(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["playbook"]).values({
            id: pb.id,
            firmId: ctx.firmId,
            version: pb.version,
            jurisdiction: pb.jurisdiction,
            def: pb
        }).onConflictDoUpdate({
            target: [
                __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["playbook"].firmId,
                __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["playbook"].id,
                __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["playbook"].version
            ],
            set: {
                def: pb,
                jurisdiction: pb.jurisdiction
            }
        });
    }
    for (const [key, def] of Object.entries(requirementLibrary())){
        await ctx.db.insert(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["requirementItem"]).values({
            key,
            firmId: ctx.firmId,
            def
        }).onConflictDoUpdate({
            target: [
                __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["requirementItem"].firmId,
                __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["requirementItem"].key
            ],
            set: {
                def
            }
        });
    }
}
async function getPlaybook(ctx, id, version) {
    const rows = await ctx.db.select().from(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["playbook"]).where((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["and"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["playbook"].firmId, ctx.firmId), (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["playbook"].id, id), version ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["playbook"].version, version) : (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["playbook"].active, true))).orderBy((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$select$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["desc"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["playbook"].version)).limit(1);
    if (!rows[0]) throw new Error(`Playbook ${id} not found`);
    return rows[0].def;
}
async function listPlaybooks(ctx) {
    const rows = await ctx.db.select().from(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["playbook"]).where((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["and"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["playbook"].firmId, ctx.firmId), (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["playbook"].active, true))).orderBy(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["playbook"].id, (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$select$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["desc"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["playbook"].version));
    const seen = new Set();
    return rows.filter((r)=>seen.has(r.id) ? false : (seen.add(r.id), true)).map((r)=>r.def);
}
async function getRequirementDefs(ctx) {
    const rows = await ctx.db.select().from(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["requirementItem"]).where((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["requirementItem"].firmId, ctx.firmId));
    return Object.fromEntries(rows.map((r)=>[
            r.key,
            r.def
        ]));
}
}),
"[project]/src/domain/proposals.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "ProposalError",
    ()=>ProposalError,
    "approveProposal",
    ()=>approveProposal,
    "createProposal",
    ()=>createProposal,
    "editDistance",
    ()=>editDistance,
    "getProposal",
    ()=>getProposal,
    "onApprove",
    ()=>onApprove,
    "onReject",
    ()=>onReject,
    "pendingProposals",
    ()=>pendingProposals,
    "recentProposals",
    ()=>recentProposals,
    "rejectProposal",
    ()=>rejectProposal,
    "supersede",
    ()=>supersede
]);
// The approval gate. Anything client-facing, register-affecting or invoice-affecting after
// sending is a proposal; nothing happens until a human approves it (AGENTS.md).
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/drizzle-orm/sql/expressions/conditions.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$select$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/drizzle-orm/sql/expressions/select.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/db/schema.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$audit$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/domain/audit.ts [app-route] (ecmascript)");
;
;
;
const handlers = new Map();
const rejectHandlers = new Map();
function onApprove(kind, h) {
    handlers.set(kind, h);
}
function onReject(kind, h) {
    rejectHandlers.set(kind, h);
}
class ProposalError extends Error {
}
async function createProposal(ctx, p) {
    const [row] = await ctx.db.insert(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["proposal"]).values({
        id: ctx.ids.next("prp"),
        firmId: ctx.firmId,
        kind: p.kind,
        title: p.title,
        summary: p.summary ?? null,
        clientId: p.clientId ?? null,
        taskId: p.taskId ?? null,
        requestId: p.requestId ?? null,
        payload: p.payload ?? {},
        createdAt: ctx.clock.now()
    }).returning();
    return row;
}
async function pendingProposals(ctx, filter = {}) {
    return ctx.db.select().from(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["proposal"]).where((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["and"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["proposal"].firmId, ctx.firmId), (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["proposal"].status, "pending"), filter.clientId ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["proposal"].clientId, filter.clientId) : undefined, filter.taskId ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["proposal"].taskId, filter.taskId) : undefined, filter.kind ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["proposal"].kind, filter.kind) : undefined)).orderBy((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$select$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["asc"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["proposal"].createdAt), (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$select$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["asc"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["proposal"].id));
}
async function recentProposals(ctx, limit = 50) {
    return ctx.db.select().from(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["proposal"]).where((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["proposal"].firmId, ctx.firmId)).orderBy((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$select$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["desc"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["proposal"].createdAt)).limit(limit);
}
async function getProposal(ctx, id) {
    const p = await ctx.db.query.proposal.findFirst({
        where: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["and"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["proposal"].id, id), (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["proposal"].firmId, ctx.firmId))
    });
    if (!p) throw new ProposalError("Proposal not found");
    return p;
}
async function approveProposal(ctx, id, opts = {}) {
    const p = await getProposal(ctx, id);
    if (p.status !== "pending") throw new ProposalError(`Proposal is already ${p.status}`);
    const h = handlers.get(p.kind);
    if (!h) throw new ProposalError(`No approval handler for ${p.kind}`);
    // Claim first so a double click can't run the handler twice.
    const claimed = await ctx.db.update(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["proposal"]).set({
        status: "approved",
        decidedAt: ctx.clock.now(),
        decidedBy: ctx.userId
    }).where((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["and"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["proposal"].id, id), (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["proposal"].status, "pending"))).returning();
    if (claimed.length === 0) throw new ProposalError("Proposal was decided by someone else");
    try {
        await h(ctx, p, opts);
    } catch (e) {
        await ctx.db.update(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["proposal"]).set({
            status: "pending",
            decidedAt: null,
            decidedBy: null
        }).where((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["proposal"].id, id));
        throw e;
    }
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$audit$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["audit"])(ctx, `proposal.approve.${p.kind}`, "proposal", id, {
        edits: opts.edits ?? null
    });
    if (opts.shownAt) {
        const now = ctx.clock.now();
        await ctx.db.insert(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["stepTiming"]).values({
            id: ctx.ids.next("tim"),
            firmId: ctx.firmId,
            taskId: p.taskId,
            proposalId: id,
            activity: `approve_${p.kind}`,
            shownAt: opts.shownAt,
            actedAt: now,
            seconds: Math.max(0, Math.round((now.getTime() - opts.shownAt.getTime()) / 1000)),
            editChars: opts.editChars ?? 0
        });
    }
    return getProposal(ctx, id);
}
async function rejectProposal(ctx, id, reason = "") {
    const p = await getProposal(ctx, id);
    if (p.status !== "pending") throw new ProposalError(`Proposal is already ${p.status}`);
    await ctx.db.update(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["proposal"]).set({
        status: "rejected",
        decidedAt: ctx.clock.now(),
        decidedBy: ctx.userId
    }).where((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["proposal"].id, id));
    const h = rejectHandlers.get(p.kind);
    if (h) await h(ctx, p, {});
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$audit$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["audit"])(ctx, `proposal.reject.${p.kind}`, "proposal", id, {
        reason
    });
}
async function supersede(ctx, filter) {
    const rows = await pendingProposals(ctx, filter);
    for (const r of rows)await ctx.db.update(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["proposal"]).set({
        status: "superseded",
        decidedAt: ctx.clock.now()
    }).where((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["proposal"].id, r.id));
    return rows.length;
}
function editDistance(a, b) {
    if (a === b) return 0;
    if (a.length * b.length > 4_000_000) return Math.abs(a.length - b.length) + 1;
    let prev = Array.from({
        length: b.length + 1
    }, (_, i)=>i);
    for(let i = 1; i <= a.length; i++){
        const cur = [
            i
        ];
        for(let j = 1; j <= b.length; j++)cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
        prev = cur;
    }
    return prev[b.length];
}
}),
"[project]/src/domain/records.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "RecordError",
    ()=>RecordError,
    "addContact",
    ()=>addContact,
    "appoint",
    ()=>appoint,
    "appointmentHistory",
    ()=>appointmentHistory,
    "ceaseAppointment",
    ()=>ceaseAppointment,
    "contactsFor",
    ()=>contactsFor,
    "createClient",
    ()=>createClient,
    "createPerson",
    ()=>createPerson,
    "getClient",
    ()=>getClient,
    "getPersonProtected",
    ()=>getPersonProtected,
    "officersAsAt",
    ()=>officersAsAt,
    "publicPerson",
    ()=>publicPerson,
    "updateClient",
    ()=>updateClient,
    "updatePerson",
    ()=>updatePerson
]);
// Client, person and officer records. Appointments are effective-dated:
// a person holds office on date d iff fromDate <= d and (toDate is null or d < toDate),
// where toDate is the date the appointment ceased.
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/drizzle-orm/sql/expressions/conditions.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$crypto$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/crypto.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/db/schema.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$audit$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/domain/audit.ts [app-route] (ecmascript)");
;
;
;
;
class RecordError extends Error {
}
async function createClient(ctx, data) {
    const [row] = await ctx.db.insert(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["client"]).values({
        id: data.id ?? ctx.ids.next("cli"),
        firmId: ctx.firmId,
        ...data
    }).returning();
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$audit$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["audit"])(ctx, "client.create", "client", row.id, {
        nameEn: row.nameEn
    });
    return row;
}
async function updateClient(ctx, id, patch, reason) {
    const [row] = await ctx.db.update(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["client"]).set(patch).where((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["and"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["client"].id, id), (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["client"].firmId, ctx.firmId))).returning();
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$audit$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["audit"])(ctx, "client.update", "client", id, {
        patch,
        reason
    });
    return row;
}
async function getClient(ctx, id) {
    const row = await ctx.db.query.client.findFirst({
        where: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["and"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["client"].id, id), (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["client"].firmId, ctx.firmId))
    });
    if (!row) throw new RecordError(`Client ${id} not found`);
    return row;
}
async function createPerson(ctx, p) {
    const [row] = await ctx.db.insert(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["person"]).values({
        id: p.id ?? ctx.ids.next("per"),
        firmId: ctx.firmId,
        kind: p.kind ?? "individual",
        nameEn: p.nameEn,
        nameZh: p.nameZh ?? null,
        idType: p.idType ?? null,
        idNumberEnc: p.idNumber ? ctx.crypto.encrypt(p.idNumber) : null,
        idCountry: p.idCountry ?? null,
        dateOfBirth: p.dateOfBirth ?? null,
        nationality: p.nationality ?? null,
        residentialAddressEnc: p.residentialAddress ? ctx.crypto.encrypt(p.residentialAddress) : null,
        correspondenceAddress: p.correspondenceAddress ?? null,
        email: p.email?.toLowerCase() ?? null,
        phone: p.phone ?? null
    }).returning();
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$audit$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["audit"])(ctx, "person.create", "person", row.id, {
        nameEn: row.nameEn
    });
    return row;
}
async function updatePerson(ctx, id, p, reason) {
    const patch = {};
    if (p.nameEn !== undefined) patch.nameEn = p.nameEn;
    if (p.nameZh !== undefined) patch.nameZh = p.nameZh;
    if (p.idType !== undefined) patch.idType = p.idType;
    if (p.idNumber !== undefined) patch.idNumberEnc = p.idNumber ? ctx.crypto.encrypt(p.idNumber) : null;
    if (p.idCountry !== undefined) patch.idCountry = p.idCountry;
    if (p.dateOfBirth !== undefined) patch.dateOfBirth = p.dateOfBirth;
    if (p.nationality !== undefined) patch.nationality = p.nationality;
    if (p.residentialAddress !== undefined) patch.residentialAddressEnc = p.residentialAddress ? ctx.crypto.encrypt(p.residentialAddress) : null;
    if (p.correspondenceAddress !== undefined) patch.correspondenceAddress = p.correspondenceAddress;
    if (p.email !== undefined) patch.email = p.email?.toLowerCase() ?? null;
    if (p.phone !== undefined) patch.phone = p.phone;
    const [row] = await ctx.db.update(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["person"]).set(patch).where((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["and"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["person"].id, id), (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["person"].firmId, ctx.firmId))).returning();
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$audit$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["audit"])(ctx, "person.update", "person", id, {
        fields: Object.keys(patch),
        reason
    });
    return row;
}
function publicPerson(row, crypto) {
    const { idNumberEnc, residentialAddressEnc, ...rest } = row;
    const idNumberMasked = idNumberEnc ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$crypto$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["mask"])(crypto.decrypt(idNumberEnc)) : null;
    return {
        ...rest,
        idNumberMasked,
        hasIdNumber: !!idNumberEnc,
        hasResidentialAddress: !!residentialAddressEnc
    };
}
async function getPersonProtected(ctx, id) {
    const row = await ctx.db.query.person.findFirst({
        where: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["and"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["person"].id, id), (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["person"].firmId, ctx.firmId))
    });
    if (!row) throw new RecordError(`Person ${id} not found`);
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$audit$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["audit"])(ctx, "person.read_protected", "person", id);
    return {
        ...row,
        idNumber: row.idNumberEnc ? ctx.crypto.decrypt(row.idNumberEnc) : null,
        residentialAddress: row.residentialAddressEnc ? ctx.crypto.decrypt(row.residentialAddressEnc) : null
    };
}
async function appoint(ctx, a) {
    const [row] = await ctx.db.insert(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["appointment"]).values({
        id: ctx.ids.next("apt"),
        firmId: ctx.firmId,
        clientId: a.clientId,
        personId: a.personId,
        role: a.role,
        fromDate: a.fromDate,
        sourceTaskId: a.sourceTaskId ?? null,
        extra: a.extra ?? {}
    }).returning();
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$audit$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["audit"])(ctx, "appointment.create", "appointment", row.id, a);
    return row;
}
async function ceaseAppointment(ctx, appointmentId, toDate, sourceTaskId) {
    const a = await ctx.db.query.appointment.findFirst({
        where: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["and"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["appointment"].id, appointmentId), (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["appointment"].firmId, ctx.firmId))
    });
    if (!a) throw new RecordError("Appointment not found");
    if (toDate < a.fromDate) throw new RecordError(`Cessation date ${toDate} is before the appointment date ${a.fromDate}`);
    const [row] = await ctx.db.update(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["appointment"]).set({
        toDate
    }).where((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["appointment"].id, appointmentId)).returning();
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$audit$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["audit"])(ctx, "appointment.cease", "appointment", appointmentId, {
        toDate,
        sourceTaskId
    });
    return row;
}
async function officersAsAt(ctx, clientId, date, role) {
    const rows = await ctx.db.select({
        a: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["appointment"],
        p: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["person"]
    }).from(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["appointment"]).innerJoin(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["person"], (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["person"].id, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["appointment"].personId)).where((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["and"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["appointment"].firmId, ctx.firmId), (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["appointment"].clientId, clientId), role ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["appointment"].role, role) : undefined, (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["lte"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["appointment"].fromDate, date), (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["or"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["isNull"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["appointment"].toDate), (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["gt"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["appointment"].toDate, date)))).orderBy(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["appointment"].fromDate);
    return rows.map(({ a, p })=>({
            ...a,
            personId: p.id,
            person: publicPerson(p, ctx.crypto)
        }));
}
async function appointmentHistory(ctx, clientId) {
    const rows = await ctx.db.select({
        a: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["appointment"],
        p: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["person"]
    }).from(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["appointment"]).innerJoin(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["person"], (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["person"].id, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["appointment"].personId)).where((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["and"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["appointment"].firmId, ctx.firmId), (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["appointment"].clientId, clientId))).orderBy(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["appointment"].fromDate);
    return rows.map(({ a, p })=>({
            ...a,
            person: publicPerson(p, ctx.crypto)
        }));
}
async function contactsFor(ctx, clientId) {
    return ctx.db.query.contact.findMany({
        where: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["and"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["contact"].firmId, ctx.firmId), (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["contact"].clientId, clientId))
    });
}
async function addContact(ctx, c) {
    const [row] = await ctx.db.insert(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["contact"]).values({
        id: ctx.ids.next("con"),
        firmId: ctx.firmId,
        ...c,
        email: c.email?.toLowerCase() ?? null
    }).returning();
    return row;
}
}),
"[project]/src/domain/register-effects.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "applyRegisterChanges",
    ()=>applyRegisterChanges,
    "planRegisterChanges",
    ()=>planRegisterChanges
]);
// Declarative register effects from playbook data, applied only after a human approves
// the previewed change (AGENTS.md: no register change without a click).
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/drizzle-orm/sql/expressions/conditions.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/db/schema.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$records$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/domain/records.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$engine$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/domain/engine.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$playbooks$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/domain/playbooks.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$dates$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/domain/dates.ts [app-route] (ecmascript)");
;
;
;
;
;
;
async function planRegisterChanges(ctx, taskId) {
    const t = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$engine$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getTask"])(ctx, taskId);
    const pb = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$playbooks$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getPlaybook"])(ctx, t.playbookId, t.playbookVersion);
    const cl = await ctx.db.query.client.findFirst({
        where: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["client"].id, t.clientId)
    });
    const person = t.personId ? await ctx.db.query.person.findFirst({
        where: (p, { eq })=>eq(p.id, t.personId)
    }) : null;
    const v = {};
    for (const e of t.checklist)if (e.value) v[e.key] = e.value;
    const eff = t.effectiveDate ?? v.effDate ?? ctx.clock.today();
    const out = [];
    for (const e of pb.registerEffects){
        switch(e.kind){
            case "appoint_officer":
                {
                    const firmPerson = e.role === "secretary" && [
                        "hk.changeSecretary",
                        "hk.transferIn"
                    ].includes(pb.id) ? await ensureFirmPerson(ctx) : null;
                    const pid = firmPerson ?? person?.id;
                    if (!pid) break;
                    const name = pid === "per_firm" ? "Caine Road Corporate Services Limited" : person.nameEn;
                    out.push({
                        effect: e.kind,
                        description: `Appoint ${name} as ${e.role.replace("_", " ")} with effect from ${eff}`,
                        apply: async ()=>{
                            await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$records$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["appoint"])(ctx, {
                                clientId: t.clientId,
                                personId: pid,
                                role: e.role,
                                fromDate: eff,
                                sourceTaskId: t.id
                            });
                        }
                    });
                    break;
                }
            case "cease_officer":
                {
                    const current = await ctx.db.select().from(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["appointment"]).where((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["and"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["appointment"].clientId, t.clientId), (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["appointment"].role, e.role), (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["isNull"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["appointment"].toDate)));
                    const targets = e.role === "secretary" ? current.filter((a)=>a.personId !== "per_firm") : current.filter((a)=>a.personId === person?.id);
                    if (e.role === "secretary" && pb.id === "hk.transferIn" && !targets.length) break;
                    const date = v.lastDay ?? eff;
                    for (const a of targets)out.push({
                        effect: e.kind,
                        description: `End ${e.role} appointment (${a.personId === person?.id ? person?.nameEn : a.personId}) on ${date}`,
                        apply: async ()=>{
                            await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$records$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["ceaseAppointment"])(ctx, a.id, date, t.id);
                        }
                    });
                    break;
                }
            case "replace_officer":
                {
                    if (!person) break;
                    const current = await ctx.db.select().from(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["appointment"]).where((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["and"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["appointment"].clientId, t.clientId), (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["appointment"].role, e.role), (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["isNull"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["appointment"].toDate)));
                    let warning = "";
                    if (e.role === "legal_representative") {
                        const officers = await ctx.db.select().from(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["appointment"]).where((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["and"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["appointment"].clientId, t.clientId), (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["appointment"].personId, person.id), (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["isNull"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["appointment"].toDate)));
                        if (!officers.some((a)=>a.role === "director" || a.role === "manager")) warning = ` Blocked: under the 2024 Company Law (art. 10) the legal representative must be a director or manager who executes company affairs; appoint ${person.nameEn} as director or manager first.`;
                    }
                    out.push({
                        effect: e.kind,
                        description: `${person.nameEn} becomes ${e.role.replace(/_/g, " ")} from ${eff}${current.length ? `, replacing ${current.map((a)=>a.personId).join(", ")}` : ""}.${warning}`,
                        apply: async ()=>{
                            if (warning) throw new Error(warning.trim());
                            for (const a of current)if (a.personId !== person.id) await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$records$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["ceaseAppointment"])(ctx, a.id, eff, t.id);
                            if (!current.some((a)=>a.personId === person.id)) await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$records$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["appoint"])(ctx, {
                                clientId: t.clientId,
                                personId: person.id,
                                role: e.role,
                                fromDate: eff,
                                sourceTaskId: t.id
                            });
                        }
                    });
                    break;
                }
            case "change_capital":
                {
                    const text = v.cnCapitalChange ?? v.twCapitalIncrease;
                    if (text) out.push({
                        effect: e.kind,
                        description: `Registered capital: ${text}`,
                        apply: async ()=>{
                            await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$records$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["updateClient"])(ctx, cl.id, {
                                jurisdictionData: {
                                    ...cl.jurisdictionData,
                                    capitalChange: {
                                        text,
                                        on: eff
                                    }
                                }
                            }, `Task ${t.id}`);
                        }
                    });
                    break;
                }
            case "change_registered_office":
                {
                    const addr = pb.id === "hk.transferIn" ? "18/F, 88 Caine Road, Mid-Levels, Hong Kong" : v.newAddr ?? v.cnNewAddress;
                    if (addr) out.push({
                        effect: e.kind,
                        description: `Registered office: ${cl.regOfficeEn ?? "—"} → ${addr}`,
                        apply: async ()=>{
                            await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$records$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["updateClient"])(ctx, cl.id, {
                                regOfficeEn: addr
                            }, `Task ${t.id}`);
                        }
                    });
                    break;
                }
            case "change_name":
                if (v.newName) out.push({
                    effect: e.kind,
                    description: `Company name: ${cl.nameEn} → ${v.newName} (effective on the certificate of change of name)`,
                    apply: async ()=>{
                        const zh = v.newName.match(/[㐀-鿿]+[㐀-鿿（）()]*/)?.[0];
                        const en = v.newName.match(/[A-Za-z][A-Za-z0-9&.,'()\- ]*Limited/i)?.[0]?.trim() ?? (zh ? cl.nameEn : v.newName);
                        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$records$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["updateClient"])(ctx, cl.id, {
                            nameEn: en,
                            ...zh ? {
                                nameTc: zh
                            } : {}
                        }, `Task ${t.id}`);
                    }
                });
                break;
            case "activate_client":
                out.push({
                    effect: e.kind,
                    description: `Mark ${cl.nameEn} as an active client`,
                    apply: async ()=>{
                        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$records$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["updateClient"])(ctx, cl.id, {
                            lifecycle: "active"
                        }, `Task ${t.id}`);
                    }
                });
                break;
            case "record_agm":
                out.push({
                    effect: e.kind,
                    description: `Record AGM / written resolutions on ${ctx.clock.today()}`,
                    apply: async ()=>{
                        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$records$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["updateClient"])(ctx, cl.id, {
                            jurisdictionData: {
                                ...cl.jurisdictionData,
                                lastAgm: ctx.clock.today()
                            }
                        }, `Task ${t.id}`);
                    }
                });
                break;
            case "renew_br":
                {
                    const br = await ctx.db.query.businessRegistration.findFirst({
                        where: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["businessRegistration"].clientId, cl.id)
                    });
                    if (br?.expiresOn) {
                        const years = Number(v.brTerm?.match(/3/) ? 3 : 1);
                        const next = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$dates$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["addDays"])(br.expiresOn, 365 * years);
                        out.push({
                            effect: e.kind,
                            description: `Business registration valid until ${next}`,
                            apply: async ()=>{
                                await ctx.db.update(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["businessRegistration"]).set({
                                    expiresOn: next,
                                    termYears: years
                                }).where((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["businessRegistration"].id, br.id));
                            }
                        });
                    }
                    break;
                }
            case "deregister":
                out.push({
                    effect: e.kind,
                    description: "Mark the company as deregistering",
                    apply: async ()=>{
                        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$records$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["updateClient"])(ctx, cl.id, {
                            operatingStatus: "deregistering"
                        }, `Task ${t.id}`);
                    }
                });
                break;
            case "change_auditor":
                if (v.newAuditor) out.push({
                    effect: e.kind,
                    description: `Auditor: ${cl.auditor ?? "—"} → ${v.newAuditor}`,
                    apply: async ()=>{
                        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$records$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["updateClient"])(ctx, cl.id, {
                            auditor: v.newAuditor
                        }, `Task ${t.id}`);
                    }
                });
                break;
            case "record_annual_return":
                out.push({
                    effect: e.kind,
                    description: "Annual return recorded (clears this year's deadline)",
                    apply: async ()=>{}
                });
                break;
            default:
                {
                    const extra = await __turbopack_context__.A("[project]/src/domain/register-effects-structured.ts [app-route] (ecmascript, async loader)");
                    const planned = await extra.planStructured(ctx, t, e, v, eff);
                    out.push(...planned);
                }
        }
    }
    return out;
}
async function applyRegisterChanges(ctx, taskId) {
    const changes = await planRegisterChanges(ctx, taskId);
    for (const c of changes)await c.apply();
    return changes.map((c)=>c.description);
}
/** The firm itself, as corporate secretary. */ async function ensureFirmPerson(ctx) {
    const existing = await ctx.db.query.person.findFirst({
        where: (p, { eq })=>eq(p.id, "per_firm")
    });
    if (existing) return existing.id;
    const { createPerson } = await __turbopack_context__.A("[project]/src/domain/records.ts [app-route] (ecmascript, async loader)");
    const firm = await (await __turbopack_context__.A("[project]/src/domain/firm.ts [app-route] (ecmascript, async loader)")).getFirm(ctx);
    return (await createPerson(ctx, {
        id: "per_firm",
        kind: "corporate",
        nameEn: firm.legalName,
        nameZh: firm.legalNameZh,
        correspondenceAddress: firm.address,
        email: firm.email
    })).id;
}
}),
"[project]/src/domain/screening.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "recordCdd",
    ()=>recordCdd,
    "screenPerson",
    ()=>screenPerson
]);
// Screening step: sanctions/PEP screening of the task's people, LLM adjudication of any
// hits, a human decision on anything not clear, and the CDD record on success.
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/drizzle-orm/sql/expressions/conditions.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/db/schema.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$engine$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/domain/engine.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$proposals$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/domain/proposals.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$records$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/domain/records.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$agent$2f$call$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/agent/call.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$agent$2f$schemas$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/agent/schemas.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$agent$2f$prompts$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/agent/prompts.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$dates$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/domain/dates.ts [app-route] (ecmascript)");
;
;
;
;
;
;
;
;
;
const REVIEW_YEARS = {
    low: 3,
    medium: 2,
    high: 1
};
async function peopleToScreen(ctx, t) {
    if (t.personId) return [
        t.personId
    ];
    const ids = new Set((await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$records$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["officersAsAt"])(ctx, t.clientId, ctx.clock.today(), "director")).map((o)=>o.personId));
    for (const c of (await ctx.db.select().from(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["contact"]).where((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["contact"].clientId, t.clientId))))if (c.personId && c.isInstructing) ids.add(c.personId);
    return [
        ...ids
    ].filter((id)=>id !== "per_firm");
}
async function screenPerson(ctx, personId, taskId) {
    const p = await ctx.db.query.person.findFirst({
        where: (x, { eq })=>eq(x.id, personId)
    });
    const query = {
        name: p.nameEn,
        nameZh: p.nameZh,
        birthDate: p.dateOfBirth,
        nationality: p.nationality
    };
    const hits = await ctx.screening.match(query);
    let status = "clear";
    let adjudication = [];
    if (hits.length) {
        const r = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$agent$2f$call$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["callAgent"])(ctx, {
            agent: "screen",
            system: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$agent$2f$prompts$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["SCREEN_SYSTEM"],
            taskId,
            schema: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$agent$2f$schemas$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["AdjudicationZ"],
            user: `Person screened: ${JSON.stringify(query)}\nCandidate hits: ${JSON.stringify(hits)}`
        });
        adjudication = r.hits;
        status = r.overall === "clear" && hits.every((h)=>h.score < 0.9) ? "clear" : r.overall === "clear" ? "potential" : r.overall;
    }
    const [row] = await ctx.db.insert(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["screeningResult"]).values({
        id: ctx.ids.next("scn"),
        firmId: ctx.firmId,
        personId,
        taskId,
        provider: ctx.screening.name,
        datasetVersion: await ctx.screening.datasetVersion(),
        query,
        hits,
        adjudication,
        status,
        createdAt: ctx.clock.now()
    }).returning();
    return row;
}
async function recordCdd(ctx, personId, taskId, screeningId) {
    const t = taskId ? await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$engine$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getTask"])(ctx, taskId) : null;
    const cl = t ? await ctx.db.query.client.findFirst({
        where: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["client"].id, t.clientId)
    }) : null;
    const risk = cl?.riskRating ?? "medium";
    const docs = await ctx.db.select().from(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["document"]).where((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["document"].personId, personId));
    const latest = (k)=>docs.filter((d)=>d.requirementKey === k).sort((a, b)=>b.createdAt.getTime() - a.createdAt.getTime())[0]?.id ?? null;
    const today = ctx.clock.today();
    await ctx.db.insert(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["cddRecord"]).values({
        id: ctx.ids.next("cdd"),
        firmId: ctx.firmId,
        personId,
        riskRating: risk,
        idDocumentId: latest("idCopy"),
        addressProofDocumentId: latest("addrProof"),
        livenessCheckedOn: latest("selfie") ? today : null,
        screeningId,
        verifiedOn: today,
        reviewDueOn: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$dates$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["addMonths"])(today, 12 * REVIEW_YEARS[risk]),
        sourceTaskId: taskId,
        createdAt: ctx.clock.now()
    });
}
(0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$engine$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["onEnterStep"])("screen", runScreenStep);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$engine$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["onEnterStep"])("kyc", runScreenStep);
async function runScreenStep(ctx, task) {
    const people = await peopleToScreen(ctx, task);
    const open = [];
    for (const pid of people){
        const r = await screenPerson(ctx, pid, task.id);
        const p = await ctx.db.query.person.findFirst({
            where: (x, { eq })=>eq(x.id, pid)
        });
        if (r.status === "clear") {
            if (!await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$engine$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["hasCurrentCdd"])(ctx, pid) || task.personId === pid) await recordCdd(ctx, pid, task.id, r.id);
            await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$engine$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["logEvent"])(ctx, task.id, "screening.clear", `${p.nameEn}: no sanctions or PEP matches (${r.datasetVersion})`);
        } else {
            open.push(pid);
            const hits = r.hits;
            await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$proposals$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["createProposal"])(ctx, {
                kind: "screening_review",
                title: `Screening hit: ${p.nameEn}`,
                clientId: task.clientId,
                taskId: task.id,
                summary: `${hits.length} possible match(es): ${hits.map((h)=>`${h.caption} (${h.datasets.join(", ")}, score ${h.score})`).join("; ")}. Agent's view: ${r.adjudication.map((a)=>`${a.verdict}: ${a.reason}`).join("; ")}`,
                payload: {
                    screeningId: r.id,
                    personId: pid,
                    taskId: task.id
                }
            });
            await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$engine$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["logEvent"])(ctx, task.id, "screening.hit", `${p.nameEn}: possible match, waiting for a compliance decision`);
        }
    }
    if (open.length === 0) await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$engine$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["markStepState"])(ctx, task.id, "screen", {
        cleared: true,
        screened: people
    });
    else await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$engine$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["markStepState"])(ctx, task.id, "screen", {
        pending: open
    });
}
(0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$proposals$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["onApprove"])("screening_review", async (ctx, p, opts)=>{
    const { screeningId, personId, taskId } = p.payload;
    const edits = opts.edits ?? {};
    const decision = edits.decision ?? "clear";
    await ctx.db.update(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["screeningResult"]).set({
        status: decision === "clear" ? "cleared_by_staff" : "escalated",
        reviewedBy: ctx.userId
    }).where((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["screeningResult"].id, screeningId));
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$engine$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["logEvent"])(ctx, taskId, "screening.decision", decision === "clear" ? `Compliance cleared the hit${edits.note ? `: ${edits.note}` : ""}` : "Escalated to the MLRO; task on hold", {}, ctx.userId);
    if (decision !== "clear") return;
    await recordCdd(ctx, personId, taskId, screeningId);
    const t = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$engine$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getTask"])(ctx, taskId);
    const idx = t._steps.findIndex((s)=>s.kind === "screen" || s.kind === "kyc");
    const pending = (t.stepState[String(idx)]?.pending ?? []).filter((x)=>x !== personId);
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$engine$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["markStepState"])(ctx, taskId, idx, {
        pending,
        cleared: pending.length === 0
    });
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$engine$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["advance"])(ctx, taskId);
});
}),
"[project]/src/domain/secrets.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "getSecret",
    ()=>getSecret,
    "listSecretNames",
    ()=>listSecretNames,
    "setSecret",
    ()=>setSecret
]);
// Credentials (CR e-accounts, OAuth refresh tokens, bank keys): encrypted at rest,
// every read logged, never returned by listing or UI APIs (AGENTS.md non-negotiable).
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/drizzle-orm/sql/expressions/conditions.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/db/schema.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$audit$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/domain/audit.ts [app-route] (ecmascript)");
;
;
;
async function setSecret(ctx, name, value) {
    const ciphertext = ctx.crypto.encrypt(value);
    await ctx.db.insert(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["secret"]).values({
        id: ctx.ids.next("sec"),
        firmId: ctx.firmId,
        name,
        ciphertext,
        updatedAt: ctx.clock.now()
    }).onConflictDoUpdate({
        target: [
            __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["secret"].firmId,
            __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["secret"].name
        ],
        set: {
            ciphertext,
            updatedAt: ctx.clock.now()
        }
    });
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$audit$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["audit"])(ctx, "secret.write", "secret", name);
}
async function getSecret(ctx, name, purpose) {
    const row = await ctx.db.query.secret.findFirst({
        where: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["and"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["secret"].firmId, ctx.firmId), (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["secret"].name, name))
    });
    if (!row) return null;
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$audit$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["audit"])(ctx, "secret.read", "secret", name, {
        purpose
    });
    return ctx.crypto.decrypt(row.ciphertext);
}
async function listSecretNames(ctx) {
    const rows = await ctx.db.select({
        name: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["secret"].name,
        updatedAt: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["secret"].updatedAt
    }).from(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["secret"]).where((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["secret"].firmId, ctx.firmId));
    return rows;
}
}),
"[project]/src/domain/shares.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "RegisterError",
    ()=>RegisterError,
    "allot",
    ()=>allot,
    "buyback",
    ()=>buyback,
    "createShareClass",
    ()=>createShareClass,
    "issuedAsAt",
    ()=>issuedAsAt,
    "membersAsAt",
    ()=>membersAsAt,
    "movementHistory",
    ()=>movementHistory,
    "transfer",
    ()=>transfer
]);
// Share capital and members are derived from dated movements, so the members register
// is reproducible as at any date and always reconciles to issued capital.
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/drizzle-orm/sql/expressions/conditions.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/db/schema.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$audit$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/domain/audit.ts [app-route] (ecmascript)");
;
;
;
class RegisterError extends Error {
}
async function createShareClass(ctx, c) {
    const [row] = await ctx.db.insert(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["shareClass"]).values({
        id: ctx.ids.next("shc"),
        firmId: ctx.firmId,
        currency: "HKD",
        ...c
    }).returning();
    return row;
}
async function movements(ctx, clientId, upTo) {
    return ctx.db.select().from(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["shareMovement"]).where((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["and"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["shareMovement"].firmId, ctx.firmId), (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["shareMovement"].clientId, clientId), upTo ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["lte"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["shareMovement"].date, upTo) : undefined)).orderBy(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["shareMovement"].date, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["shareMovement"].createdAt, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["shareMovement"].id);
}
/** Replays movements in date order; throws if any holding would go negative. */ function replay(ms) {
    const holdings = new Map(); // `${classId}|${personId}` -> qty
    const issued = new Map();
    const k = (c, p)=>`${c}|${p}`;
    for (const m of ms){
        const iss = issued.get(m.shareClassId) ?? {
            issued: 0,
            paidUpCents: 0
        };
        if (m.kind === "allotment" || m.kind === "capital_change" && m.quantity > 0) {
            holdings.set(k(m.shareClassId, m.toPersonId), (holdings.get(k(m.shareClassId, m.toPersonId)) ?? 0) + m.quantity);
            iss.issued += m.quantity;
            iss.paidUpCents += m.amountPaidCents;
        } else if (m.kind === "transfer") {
            const from = holdings.get(k(m.shareClassId, m.fromPersonId)) ?? 0;
            if (from < m.quantity) throw new RegisterError(`Transfer on ${m.date} of ${m.quantity} exceeds the ${from} held by the transferor`);
            holdings.set(k(m.shareClassId, m.fromPersonId), from - m.quantity);
            holdings.set(k(m.shareClassId, m.toPersonId), (holdings.get(k(m.shareClassId, m.toPersonId)) ?? 0) + m.quantity);
        } else if (m.kind === "buyback" || m.kind === "cancellation" || m.kind === "capital_change" && m.quantity < 0) {
            const qty = Math.abs(m.quantity);
            const from = holdings.get(k(m.shareClassId, m.fromPersonId)) ?? 0;
            if (from < qty) throw new RegisterError(`${m.kind} on ${m.date} of ${qty} exceeds the ${from} held`);
            holdings.set(k(m.shareClassId, m.fromPersonId), from - qty);
            const ratio = iss.issued ? qty / iss.issued : 0;
            iss.paidUpCents -= Math.round(iss.paidUpCents * ratio);
            iss.issued -= qty;
        }
        issued.set(m.shareClassId, iss);
    }
    return {
        holdings,
        issued
    };
}
async function insertChecked(ctx, m) {
    const existing = await movements(ctx, m.clientId);
    const candidate = {
        ...m,
        id: "candidate",
        firmId: ctx.firmId,
        createdAt: ctx.clock.now(),
        amountPaidCents: m.amountPaidCents ?? 0
    };
    const all = [
        ...existing,
        candidate
    ].sort((a, b)=>a.date.localeCompare(b.date) || (a.createdAt?.getTime() ?? 0) - (b.createdAt?.getTime() ?? 0));
    replay(all); // throws RegisterError if any point in history goes negative
    const [row] = await ctx.db.insert(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["shareMovement"]).values({
        ...m,
        id: ctx.ids.next("shm"),
        firmId: ctx.firmId,
        createdAt: ctx.clock.now()
    }).returning();
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$audit$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["audit"])(ctx, `shares.${m.kind}`, "share_movement", row.id, {
        ...m
    });
    return row;
}
function allot(ctx, a) {
    if (a.quantity <= 0) throw new RegisterError("Allotment quantity must be positive");
    return insertChecked(ctx, {
        ...a,
        kind: "allotment",
        amountPaidCents: a.amountPaidCents ?? 0
    });
}
function transfer(ctx, t) {
    if (t.quantity <= 0) throw new RegisterError("Transfer quantity must be positive");
    if (t.fromPersonId === t.toPersonId) throw new RegisterError("Transferor and transferee must differ");
    return insertChecked(ctx, {
        ...t,
        kind: "transfer"
    });
}
function buyback(ctx, t) {
    if (t.quantity <= 0) throw new RegisterError("Buy-back quantity must be positive");
    return insertChecked(ctx, {
        ...t,
        kind: "buyback"
    });
}
async function membersAsAt(ctx, clientId, date) {
    const { holdings } = replay(await movements(ctx, clientId, date));
    const classes = await ctx.db.query.shareClass.findMany({
        where: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["shareClass"].clientId, clientId)
    });
    const people = await ctx.db.query.person.findMany({
        where: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["person"].firmId, ctx.firmId)
    });
    const totals = new Map();
    for (const [key, q] of holdings){
        const c = key.split("|")[0];
        totals.set(c, (totals.get(c) ?? 0) + q);
    }
    const out = [
        ...holdings.entries()
    ].filter(([, q])=>q > 0).map(([key, quantity])=>{
        const [shareClassId, personId] = key.split("|");
        const p = people.find((x)=>x.id === personId);
        const total = totals.get(shareClassId) ?? 0;
        return {
            shareClassId,
            className: classes.find((c)=>c.id === shareClassId)?.name ?? "",
            personId,
            name: p?.nameEn ?? personId,
            nameZh: p?.nameZh ?? null,
            quantity,
            percent: total ? Math.round(quantity / total * 10000) / 100 : 0
        };
    });
    return out.sort((a, b)=>b.quantity - a.quantity || a.name.localeCompare(b.name));
}
async function issuedAsAt(ctx, clientId, date) {
    const { issued } = replay(await movements(ctx, clientId, date));
    const classes = await ctx.db.query.shareClass.findMany({
        where: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["shareClass"].clientId, clientId)
    });
    return classes.map((c)=>({
            shareClassId: c.id,
            name: c.name,
            currency: c.currency,
            unit: c.unit,
            ...issued.get(c.id) ?? {
                issued: 0,
                paidUpCents: 0
            }
        }));
}
async function movementHistory(ctx, clientId) {
    return movements(ctx, clientId);
}
}),
"[project]/src/domain/signing.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "SigningError",
    ()=>SigningError,
    "envelopeStatus",
    ()=>envelopeStatus,
    "openSigning",
    ()=>openSigning,
    "requestOtp",
    ()=>requestOtp,
    "signDocuments",
    ()=>signDocuments,
    "verifyOtp",
    ()=>verifyOtp
]);
// In-house e-signature (DECISIONS.md #30): single-use emailed link, 6-digit email OTP,
// typed or drawn signature, stamped PDF with an audit certificate page. Behind
// SignatureProvider-style functions so a vendor can replace it later.
var __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$crypto__$5b$external$5d$__$28$node$3a$crypto$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/node:crypto [external] (node:crypto, cjs)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/drizzle-orm/sql/expressions/conditions.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$externals$5d2f$pdf$2d$lib__$5b$external$5d$__$28$pdf$2d$lib$2c$__cjs$2c$__$5b$project$5d2f$node_modules$2f$pdf$2d$lib$29$__ = __turbopack_context__.i("[externals]/pdf-lib [external] (pdf-lib, cjs, [project]/node_modules/pdf-lib)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$crypto$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/crypto.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/db/schema.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$engine$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/domain/engine.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$proposals$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/domain/proposals.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$records$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/domain/records.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$shares$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/domain/shares.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$firm$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/domain/firm.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$documents$2f$fonts$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/documents/fonts.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$audit$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/domain/audit.ts [app-route] (ecmascript)");
;
;
;
;
;
;
;
;
;
;
;
;
class SigningError extends Error {
}
const OTP_TTL_MS = 10 * 60_000;
const MAX_ATTEMPTS = 5;
async function instructingSigner(ctx, clientId, role) {
    const c = await ctx.db.query.contact.findFirst({
        where: (x, { and, eq })=>and(eq(x.clientId, clientId), eq(x.isInstructing, true))
    });
    if (!c?.personId) return [];
    const p = await ctx.db.query.person.findFirst({
        where: (x, { eq })=>eq(x.id, c.personId)
    });
    return p ? [
        {
            personId: p.id,
            name: p.nameEn,
            email: p.email ?? c.email,
            role
        }
    ] : [];
}
async function signersFor(ctx, clientId, personId, kind) {
    const today = ctx.clock.today();
    if (kind === "directors") {
        const ds = (await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$records$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["officersAsAt"])(ctx, clientId, today, "director")).map((o)=>({
                personId: o.personId,
                name: o.person.nameEn,
                email: o.person.email,
                role: "Director"
            }));
        // A new client's directors aren't on file yet: the instructing director signs.
        return ds.length ? ds : instructingSigner(ctx, clientId, "Director (as instructed)");
    }
    if (kind === "person" && personId) {
        const p = await ctx.db.query.person.findFirst({
            where: (x, { eq })=>eq(x.id, personId)
        });
        return p ? [
            {
                personId: p.id,
                name: p.nameEn,
                email: p.email,
                role: "Appointee"
            }
        ] : [];
    }
    if (kind === "members") {
        const ms = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$shares$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["membersAsAt"])(ctx, clientId, today);
        if (!ms.length) return instructingSigner(ctx, clientId, "Member (as instructed)");
        const people = await Promise.all([
            ...new Set(ms.map((m)=>m.personId))
        ].map((id)=>ctx.db.query.person.findFirst({
                where: (x, { eq })=>eq(x.id, id)
            })));
        return people.filter(Boolean).map((p)=>({
                personId: p.id,
                name: p.nameEn,
                email: p.email,
                role: "Member"
            }));
    }
    return [];
}
/** On entering the sign step: build the signing pack and ask staff to approve sending it. */ (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$engine$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["onEnterStep"])("sign", async (ctx, task)=>{
    if ((await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$proposals$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["pendingProposals"])(ctx, {
        taskId: task.id,
        kind: "send_signing"
    })).length) return;
    const t = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$engine$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getTask"])(ctx, task.id);
    const genIdx = t._steps.findIndex((s)=>s.kind === "generate");
    const gen = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$engine$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["stepData"])(t, genIdx).signatureFields ?? [];
    const docSigners = [];
    for (const g of gen){
        if (!g.signers || g.signers === "none") continue;
        const s = await signersFor(ctx, t.clientId, t.personId, g.signers);
        if (s.length) docSigners.push({
            docId: g.id,
            signers: s
        });
    }
    if (docSigners.length === 0) {
        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$engine$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["markStepState"])(ctx, t.id, "sign", {
            skipped: "No documents need signatures"
        });
        return;
    }
    const bySigner = new Map();
    for (const d of docSigners)for (const s of d.signers){
        const cur = bySigner.get(s.personId) ?? {
            ...s,
            docIds: []
        };
        cur.docIds.push(d.docId);
        bySigner.set(s.personId, cur);
    }
    const missing = [
        ...bySigner.values()
    ].filter((s)=>!s.email);
    const [env] = await ctx.db.insert(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["signEnvelope"]).values({
        id: ctx.ids.next("env"),
        firmId: ctx.firmId,
        taskId: t.id,
        documentIds: docSigners.map((d)=>d.docId),
        createdAt: ctx.clock.now()
    }).returning();
    const titles = await ctx.db.select({
        id: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["document"].id,
        title: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["document"].title
    }).from(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["document"]).where((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["inArray"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["document"].id, env.documentIds));
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$proposals$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["createProposal"])(ctx, {
        kind: "send_signing",
        title: `Send for signature: ${t.title}`,
        clientId: t.clientId,
        taskId: t.id,
        requestId: t.requestId,
        summary: `${titles.map((x)=>x.title).join(", ")}. Signers: ${[
            ...bySigner.values()
        ].map((s)=>`${s.name} <${s.email ?? "no email"}>`).join(", ")}.${missing.length ? ` Add an email for ${missing.map((m)=>m.name).join(", ")} before sending.` : ""}`,
        payload: {
            envelopeId: env.id,
            signers: [
                ...bySigner.values()
            ]
        }
    });
});
(0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$proposals$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["onApprove"])("send_signing", async (ctx, p, opts)=>{
    const { envelopeId, signers } = p.payload;
    const overrides = opts.edits?.emails ?? {};
    const env = await ctx.db.query.signEnvelope.findFirst({
        where: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["signEnvelope"].id, envelopeId)
    });
    const t = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$engine$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getTask"])(ctx, env.taskId);
    const firm = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$firm$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getFirm"])(ctx);
    for (const s of signers){
        const email = overrides[s.personId] ?? s.email;
        if (!email) throw new SigningError(`${s.name} has no email address`);
        const token = ctx.ids.token();
        await ctx.db.insert(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["signer"]).values({
            id: ctx.ids.next("sgn"),
            firmId: ctx.firmId,
            envelopeId,
            personId: s.personId,
            name: s.name,
            email,
            role: s.role,
            tokenHash: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$crypto$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["Crypto"].sha256(token)
        });
        const url = `${ctx.config.APP_URL}/sign/${token}`;
        await ctx.mail.send({
            to: [
                email
            ],
            subject: `Documents to sign: ${t.title}`,
            text: `Dear ${s.name},\n\nPlease review and sign the documents for "${t.title}" here:\n${url}\n\nYou'll receive a 6-digit code by email to confirm it's you. The link is personal to you and can be used once.\n\n文件已準備好，請按上面連結審閱及簽署。\n\n${firm.signOff?.en ?? firm.legalName}`
        });
    }
    await ctx.db.update(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["signEnvelope"]).set({
        status: "sent"
    }).where((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["signEnvelope"].id, envelopeId));
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$engine$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["logEvent"])(ctx, t.id, "signing.sent", `Signing links sent to ${signers.map((s)=>s.name).join(", ")}`, {
        envelopeId
    }, ctx.userId);
});
async function signerByToken(ctx, token) {
    const s = await ctx.db.query.signer.findFirst({
        where: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["signer"].tokenHash, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$crypto$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["Crypto"].sha256(token))
    });
    if (!s) throw new SigningError("This signing link isn't valid");
    const env = await ctx.db.query.signEnvelope.findFirst({
        where: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["signEnvelope"].id, s.envelopeId)
    });
    if (env.status === "voided") throw new SigningError("This signing request was withdrawn");
    return {
        s,
        env
    };
}
async function openSigning(ctx, token) {
    const { s, env } = await signerByToken(ctx, token);
    const t = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$engine$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getTask"])(ctx, env.taskId);
    const genIdx = t._steps.findIndex((x)=>x.kind === "generate");
    const gen = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$engine$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["stepData"])(t, genIdx).signatureFields ?? [];
    const mine = gen.filter((g)=>g.fields.some((f)=>f.field === `sign:${s.personId}`)).map((g)=>g.id);
    const docs = await ctx.db.select().from(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["document"]).where((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["inArray"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["document"].id, mine.length ? mine : env.documentIds));
    const client = await ctx.db.query.client.findFirst({
        where: (c, { eq })=>eq(c.id, t.clientId)
    });
    return {
        signer: {
            name: s.name,
            email: s.email,
            role: s.role,
            signedAt: s.signedAt,
            otpVerified: !!s.otpVerifiedAt,
            locked: s.otpAttempts >= MAX_ATTEMPTS
        },
        documents: docs.map((d)=>({
                id: d.id,
                title: d.title
            })),
        companyName: client?.nameEn ?? "",
        taskTitle: t.title
    };
}
async function requestOtp(ctx, token) {
    const { s } = await signerByToken(ctx, token);
    if (s.signedAt) throw new SigningError("You've already signed");
    if (s.otpAttempts >= MAX_ATTEMPTS) throw new SigningError("This link is locked after too many wrong codes; ask us for a new one");
    const code = String((0, __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$crypto__$5b$external$5d$__$28$node$3a$crypto$2c$__cjs$29$__["randomInt"])(0, 1_000_000)).padStart(6, "0");
    await ctx.db.update(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["signer"]).set({
        otpHash: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$crypto$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["Crypto"].sha256(`${s.id}:${code}`),
        otpExpiresAt: new Date(ctx.clock.now().getTime() + OTP_TTL_MS)
    }).where((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["signer"].id, s.id));
    await ctx.mail.send({
        to: [
            s.email
        ],
        subject: "Your signing code",
        text: `Your code to sign documents is ${code}. It expires in 10 minutes.\n\n您的簽署驗證碼為 ${code}，10分鐘內有效。`
    });
}
async function verifyOtp(ctx, token, code) {
    const { s } = await signerByToken(ctx, token);
    if (s.otpAttempts >= MAX_ATTEMPTS) throw new SigningError("This link is locked after too many wrong codes; ask us for a new one");
    if (!s.otpHash || !s.otpExpiresAt) throw new SigningError("Request a code first");
    if (s.otpExpiresAt < ctx.clock.now()) throw new SigningError("The code has expired; request a new one");
    if (!__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$crypto$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["Crypto"].safeEqualHex(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$crypto$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["Crypto"].sha256(`${s.id}:${code.trim()}`), s.otpHash)) {
        await ctx.db.update(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["signer"]).set({
            otpAttempts: s.otpAttempts + 1
        }).where((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["signer"].id, s.id));
        throw new SigningError(s.otpAttempts + 1 >= MAX_ATTEMPTS ? "Too many wrong codes; this link is now locked" : "That code isn't right");
    }
    await ctx.db.update(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["signer"]).set({
        otpVerifiedAt: ctx.clock.now(),
        otpHash: null
    }).where((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["signer"].id, s.id));
}
async function signDocuments(ctx, token, sig) {
    const { s, env } = await signerByToken(ctx, token);
    if (s.signedAt) throw new SigningError("You've already signed these documents");
    if (!s.otpVerifiedAt) throw new SigningError("Verify the code sent to your email first");
    if (!sig.data.trim()) throw new SigningError("Add your signature");
    if (sig.kind === "drawn" && !/^data:image\/png;base64,/.test(sig.data)) throw new SigningError("Drawn signature must be a PNG");
    await ctx.db.update(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["signer"]).set({
        signedAt: ctx.clock.now(),
        signatureKind: sig.kind,
        signatureData: sig.data.slice(0, 200_000),
        ip: sig.ip.slice(0, 64),
        userAgent: sig.userAgent.slice(0, 300)
    }).where((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["signer"].id, s.id));
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$audit$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["audit"])(ctx, "signing.signed", "signer", s.id, {
        envelopeId: env.id,
        ip: sig.ip
    }, `signer:${s.email}`);
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$engine$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["logEvent"])(ctx, env.taskId, "signing.signed", `${s.name} signed`, {
        signerId: s.id
    }, "client");
    const all = await ctx.db.select().from(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["signer"]).where((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["signer"].envelopeId, env.id));
    if (all.every((x)=>x.signedAt || x.id === s.id)) await completeEnvelope(ctx, env.id);
}
async function completeEnvelope(ctx, envelopeId) {
    const env = await ctx.db.query.signEnvelope.findFirst({
        where: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["signEnvelope"].id, envelopeId)
    });
    const signers = await ctx.db.select().from(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["signer"]).where((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["signer"].envelopeId, envelopeId));
    const t = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$engine$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getTask"])(ctx, env.taskId);
    const genIdx = t._steps.findIndex((x)=>x.kind === "generate");
    const gen = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$engine$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["stepData"])(t, genIdx).signatureFields ?? [];
    const signedIds = [];
    for (const docId of env.documentIds){
        const orig = await ctx.db.query.document.findFirst({
            where: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["document"].id, docId)
        });
        const fields = gen.find((g)=>g.id === docId)?.fields ?? [];
        const { pdf, certificate } = await stampPdf(await ctx.storage.get(orig.storageKey), orig, signers, fields, ctx.clock.now());
        const id = ctx.ids.next("doc");
        const key = `documents/${orig.clientId}/${id}-signed.pdf`;
        await ctx.storage.put(key, pdf);
        await ctx.db.insert(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["document"]).values({
            id,
            firmId: ctx.firmId,
            clientId: orig.clientId,
            taskId: orig.taskId,
            personId: orig.personId,
            kind: orig.kind,
            title: `${orig.title} (signed)`,
            storageKey: key,
            mime: "application/pdf",
            sha256: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$crypto$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["Crypto"].sha256(pdf),
            language: orig.language,
            source: "signed",
            extractedText: certificate,
            createdAt: ctx.clock.now()
        });
        signedIds.push(id);
    }
    await ctx.db.update(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["signEnvelope"]).set({
        status: "completed",
        completedAt: ctx.clock.now(),
        signedDocumentIds: signedIds
    }).where((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["signEnvelope"].id, envelopeId));
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$engine$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["markStepState"])(ctx, env.taskId, "sign", {
        signed: true,
        envelopeId,
        signedDocumentIds: signedIds
    });
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$engine$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["logEvent"])(ctx, env.taskId, "signing.completed", "All signatures received; signed copies filed", {
        envelopeId
    });
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$engine$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["advance"])(ctx, env.taskId);
}
async function stampPdf(buf, orig, signers, fields, now) {
    const doc = await __TURBOPACK__imported__module__$5b$externals$5d2f$pdf$2d$lib__$5b$external$5d$__$28$pdf$2d$lib$2c$__cjs$2c$__$5b$project$5d2f$node_modules$2f$pdf$2d$lib$29$__["PDFDocument"].load(buf, {
        ignoreEncryption: true
    });
    const fonts = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$documents$2f$fonts$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["embedFonts"])(doc, "tc");
    const pages = doc.getPages();
    for (const s of signers){
        for (const f of fields.filter((x)=>x.field === `sign:${s.personId}`)){
            const page = pages[f.page];
            if (!page) continue;
            if (s.signatureKind === "drawn" && s.signatureData?.startsWith("data:image/png;base64,")) {
                const img = await doc.embedPng(Buffer.from(s.signatureData.split(",")[1], "base64"));
                const scale = Math.min(f.w / img.width, f.h / img.height);
                page.drawImage(img, {
                    x: f.x,
                    y: f.y,
                    width: img.width * scale,
                    height: img.height * scale
                });
            } else if (s.signatureData) {
                page.drawText(s.signatureData.slice(0, 60), {
                    x: f.x + 4,
                    y: f.y + 6,
                    size: 16,
                    font: fonts.pick(s.signatureData),
                    color: (0, __TURBOPACK__imported__module__$5b$externals$5d2f$pdf$2d$lib__$5b$external$5d$__$28$pdf$2d$lib$2c$__cjs$2c$__$5b$project$5d2f$node_modules$2f$pdf$2d$lib$29$__["rgb"])(0.1, 0.16, 0.45)
                });
            }
            page.drawText(`Signed electronically ${now.toISOString().slice(0, 16).replace("T", " ")} UTC`, {
                x: f.x,
                y: f.y - 44,
                size: 6.5,
                font: fonts.regular,
                color: (0, __TURBOPACK__imported__module__$5b$externals$5d2f$pdf$2d$lib__$5b$external$5d$__$28$pdf$2d$lib$2c$__cjs$2c$__$5b$project$5d2f$node_modules$2f$pdf$2d$lib$29$__["rgb"])(0.42, 0.45, 0.5)
            });
        }
    }
    // Audit certificate page.
    const lines = [
        "Certificate of electronic signature / 電子簽署證明",
        `Document: ${orig.title}`,
        `Unsigned document SHA-256: ${orig.sha256}`,
        `Completed: ${now.toISOString()}`,
        "",
        ...signers.flatMap((s)=>[
                `${s.name} (${s.role ?? "signer"}) <${s.email}>`,
                `  Code sent to email and verified: ${s.otpVerifiedAt?.toISOString() ?? "—"}`,
                `  Signed: ${(s.signedAt ?? now).toISOString()}  ·  ${s.signatureKind ?? "typed"} signature`,
                `  IP address: ${s.ip ?? "—"}  ·  Device: ${(s.userAgent ?? "—").slice(0, 70)}`,
                ""
            ]),
        "Signed under the Electronic Transactions Ordinance (Cap. 553). Each signer opened a personal single-use link",
        "and confirmed a one-time code sent to their email before signing."
    ];
    const page = doc.addPage([
        595,
        842
    ]);
    let y = 780;
    for (const l of lines){
        page.drawText(l, {
            x: 56,
            y,
            size: l === lines[0] ? 13 : 9,
            font: l === lines[0] ? fonts.bold : fonts.pick(l),
            color: (0, __TURBOPACK__imported__module__$5b$externals$5d2f$pdf$2d$lib__$5b$external$5d$__$28$pdf$2d$lib$2c$__cjs$2c$__$5b$project$5d2f$node_modules$2f$pdf$2d$lib$29$__["rgb"])(0.09, 0.09, 0.11)
        });
        y -= l === lines[0] ? 24 : 14;
    }
    return {
        pdf: Buffer.from(await doc.save()),
        certificate: lines.join("\n")
    };
}
async function envelopeStatus(ctx, taskId) {
    const envs = await ctx.db.select().from(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["signEnvelope"]).where((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["and"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["signEnvelope"].taskId, taskId)));
    const out = [];
    for (const e of envs)out.push({
        ...e,
        signers: (await ctx.db.select().from(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["signer"]).where((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["signer"].envelopeId, e.id))).map((s)=>({
                name: s.name,
                email: s.email,
                signedAt: s.signedAt,
                otpVerifiedAt: s.otpVerifiedAt
            }))
    });
    return out;
}
}),
"[project]/src/domain/step-hooks.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "completeManualStep",
    ()=>completeManualStep,
    "tickItem",
    ()=>tickItem
]);
// Wires the engine's human-gated steps to proposals, and automatic steps to their work.
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/drizzle-orm/sql/expressions/conditions.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/db/schema.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$engine$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/domain/engine.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$proposals$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/domain/proposals.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$register$2d$effects$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/domain/register-effects.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$documents$2f$generate$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/src/documents/generate.ts [app-route] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$jobs$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/domain/jobs.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$inbound$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/domain/inbound.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$labels$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/domain/labels.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$playbooks$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/domain/playbooks.ts [app-route] (ecmascript)");
;
;
;
;
;
;
;
;
;
;
(0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$engine$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["onEnterStep"])("generate", async (ctx, task, _step, idx)=>{
    try {
        const docs = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$documents$2f$generate$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__["generateForTask"])(ctx, task.id);
        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$engine$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["markStepState"])(ctx, task.id, idx, {
            generated: true,
            documentIds: docs.map((d)=>d.id),
            signatureFields: docs.map((d)=>({
                    id: d.id,
                    signers: d.signers,
                    fields: d.signatureFields
                }))
        });
        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$engine$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["logEvent"])(ctx, task.id, "documents.generated", `Prepared ${docs.map((d)=>d.title).join(", ")}`, {
            documentIds: docs.map((d)=>d.id)
        });
    } catch (e) {
        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$engine$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["logEvent"])(ctx, task.id, "documents.failed", `Couldn't prepare documents: ${e.message}`);
        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$proposals$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["createProposal"])(ctx, {
            kind: "triage",
            title: `Documents need attention: ${task.title}`,
            summary: e.message,
            clientId: task.clientId,
            taskId: task.id,
            payload: {
                taskId: task.id
            }
        });
    }
});
(0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$engine$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["onEnterStep"])("file", async (ctx, task, step)=>{
    if ((await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$proposals$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["pendingProposals"])(ctx, {
        taskId: task.id,
        kind: "record_filing"
    })).length) return;
    const pb = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$playbooks$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getPlaybook"])(ctx, task.playbookId, task.playbookVersion);
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$proposals$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["createProposal"])(ctx, {
        kind: "record_filing",
        title: `${step.label}: ${task.title}`,
        summary: `File on ${step.authority ?? "the portal"} and record the reference here.`,
        clientId: task.clientId,
        taskId: task.id,
        payload: {
            taskId: task.id,
            form: pb.forms ?? "",
            authority: step.authority ?? null
        }
    });
});
(0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$proposals$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["onApprove"])("record_filing", async (ctx, p, opts)=>{
    const taskId = p.payload.taskId;
    const t = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$engine$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getTask"])(ctx, taskId);
    const edits = opts.edits ?? {};
    if (!edits.reference?.trim()) throw new Error("Enter the filing reference (e.g. the e-Registry submission number)");
    const form = String(p.payload.form ?? "");
    const filedOn = edits.filedOn ?? ctx.clock.today();
    const periodKey = t.periodKey ?? (form === "NAR1" ? `NAR1:${filedOn.slice(0, 4)}` : null);
    await ctx.db.insert(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["filing"]).values({
        id: ctx.ids.next("fil"),
        firmId: ctx.firmId,
        clientId: t.clientId,
        form: form || "Filing",
        description: t.title,
        filedOn,
        reference: edits.reference.trim(),
        periodKey,
        sourceTaskId: taskId
    });
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$engine$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["markStepState"])(ctx, taskId, "file", {
        filed: true,
        reference: edits.reference.trim(),
        filedOn
    });
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$engine$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["logEvent"])(ctx, taskId, "filing.recorded", `${form} filed, reference ${edits.reference.trim()}`, {}, ctx.userId);
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$engine$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["advance"])(ctx, taskId);
});
(0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$engine$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["onEnterStep"])("register", async (ctx, task)=>{
    if ((await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$proposals$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["pendingProposals"])(ctx, {
        taskId: task.id,
        kind: "register_change"
    })).length) return;
    const changes = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$register$2d$effects$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["planRegisterChanges"])(ctx, task.id);
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$proposals$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["createProposal"])(ctx, {
        kind: "register_change",
        title: `Update registers: ${task.title}`,
        summary: changes.map((c)=>c.description).join("\n") || "No register changes; confirm to continue.",
        clientId: task.clientId,
        taskId: task.id,
        payload: {
            taskId: task.id,
            preview: changes.map((c)=>c.description)
        }
    });
});
(0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$proposals$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["onApprove"])("register_change", async (ctx, p)=>{
    const taskId = p.payload.taskId;
    const applied = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$register$2d$effects$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["applyRegisterChanges"])(ctx, taskId);
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$engine$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["markStepState"])(ctx, taskId, "register", {
        applied: true,
        changes: applied
    });
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$engine$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["logEvent"])(ctx, taskId, "register.updated", applied.length ? applied.join("; ") : "Registers confirmed", {}, ctx.userId);
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$engine$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["advance"])(ctx, taskId);
});
(0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$engine$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["onEnterStep"])("task", async (ctx, task, step)=>{
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$engine$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["logEvent"])(ctx, task.id, "step.waiting", `Waiting for staff: ${step.label}`);
});
(0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$engine$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["onEnterStep"])("confirm", async (ctx, task)=>{
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$jobs$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["enqueue"])(ctx, "draft.confirmation", {
        taskId: task.id
    }, `confirm:${task.id}`);
});
(0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$jobs$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["onJob"])("draft.confirmation", async (ctx, { taskId })=>{
    const t = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$engine$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getTask"])(ctx, taskId);
    if (t.status !== "open") return;
    const existing = await ctx.db.select().from(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["proposal"]).where((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["and"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["proposal"].taskId, t.id), (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["proposal"].kind, "send_message")));
    if (existing.some((x)=>x.payload.markStep && x.status === "pending")) return;
    const pb = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$playbooks$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getPlaybook"])(ctx, t.playbookId, t.playbookVersion);
    const req = t.requestId ? await ctx.db.query.request.findFirst({
        where: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["request"].id, t.requestId)
    }) : null;
    const conv = req?.conversationId ? await ctx.db.query.conversation.findFirst({
        where: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["conversation"].id, req.conversationId)
    }) : null;
    const lastIn = conv ? (await ctx.db.select().from(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["message"]).where((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["and"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["message"].conversationId, conv.id), (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["message"].direction, "in")))).sort((a, b)=>b.at.getTime() - a.at.getTime())[0] ?? null : null;
    const cl = await ctx.db.query.client.findFirst({
        where: (c, { eq })=>eq(c.id, t.clientId)
    });
    const lang = lastIn?.language ?? (conv ? (await ctx.db.select().from(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["message"]).where((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["message"].conversationId, conv.id))).find((m)=>m.direction === "out")?.language : null) ?? cl.messageLang;
    const filed = Object.values(t.stepState).map((s)=>s.reference).find(Boolean);
    const facts = {
        language: lang,
        recipientName: "",
        clientName: "",
        signOff: "",
        newRequests: [],
        changes: [],
        cancellations: [],
        questions: [],
        clarifications: [],
        invoice: null,
        uploadUrl: null,
        updates: [
            {
                title: pb.name[lang] ?? t.title,
                received: [],
                stillNeeded: [],
                nextStep: "Completed"
            }
        ],
        extraNotes: [
            `This task is now complete: ${t.title}.`,
            ...filed ? [
                `Filed with the authority, reference ${filed}.`
            ] : [],
            ...pb.complianceNotes.filter((n)=>/remind|bank|chop|signboard|update/i.test(n)).slice(0, 2)
        ]
    };
    let convId = conv?.id;
    if (!convId) {
        const [c] = await ctx.db.insert(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["conversation"]).values({
            id: ctx.ids.next("cnv"),
            firmId: ctx.firmId,
            clientId: t.clientId,
            channel: "email",
            subject: t.title,
            createdAt: ctx.clock.now()
        }).returning();
        convId = c.id;
    }
    const draft = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$inbound$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["composeReply"])(ctx, {
        clientId: t.clientId,
        conversationId: convId,
        inReplyTo: lastIn,
        facts,
        requestId: null,
        purpose: "Tell the client the work is complete, with the filing reference and any follow-up they should do."
    });
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$proposals$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["createProposal"])(ctx, {
        kind: "send_message",
        title: `Confirm completion to client: ${t.title}`,
        clientId: t.clientId,
        taskId: t.id,
        requestId: t.requestId,
        payload: {
            messageId: draft.id,
            requestId: null,
            taskIds: [],
            draftSource: draft.source,
            markStep: {
                taskId: t.id,
                kind: "confirm"
            },
            purpose: "confirmation"
        }
    });
});
async function completeManualStep(ctx, taskId, note) {
    const t = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$engine$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getTask"])(ctx, taskId);
    const step = t._steps[t.stepIndex];
    if (step?.kind !== "task") throw new Error("The current step isn't a manual step");
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$engine$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["markStepState"])(ctx, taskId, "task", {
        done: true,
        note: note ?? null
    });
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$engine$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["logEvent"])(ctx, taskId, "step.manual_done", `${step.label}${note ? `: ${note}` : ""}`, {}, ctx.userId);
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$engine$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["advance"])(ctx, taskId);
}
async function tickItem(ctx, taskId, key, value) {
    const t = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$engine$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getTask"])(ctx, taskId);
    const next = t.checklist.map((e)=>e.key === key && (!e.personId || e.personId === t.personId) ? {
            ...e,
            status: "received",
            value: value ?? e.value ?? null,
            source: "Ticked by staff"
        } : e);
    const { setChecklist } = await __turbopack_context__.A("[project]/src/domain/engine.ts [app-route] (ecmascript, async loader)");
    await setChecklist(ctx, taskId, next, `${(0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$labels$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["itemLabel"])(key)} marked received by staff`, ctx.userId);
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$engine$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["advance"])(ctx, taskId);
}
}),
"[project]/src/integrations/accounting/fake.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "FakeAccounting",
    ()=>FakeAccounting
]);
class FakeAccounting {
    name = "fake";
    contacts = new Map();
    invoices = new Map();
    payments = [];
    calls = [];
    failNext = 0;
    n = 0;
    maybeFail(op) {
        this.calls.push(op);
        if (this.failNext > 0) {
            this.failNext--;
            throw new Error(`Fake accounting failure on ${op}`);
        }
    }
    async upsertContact(name) {
        this.maybeFail("upsertContact");
        let id = this.contacts.get(name);
        if (!id) {
            id = `xc-${++this.n}`;
            this.contacts.set(name, id);
        }
        return id;
    }
    async createInvoice(inv, contactId) {
        this.maybeFail("createInvoice");
        const id = `xi-${++this.n}`;
        this.invoices.set(id, {
            ...inv,
            id,
            contactId
        });
        return id;
    }
    async findInvoiceByNumber(number) {
        this.calls.push("findInvoiceByNumber");
        for (const inv of this.invoices.values())if (inv.number === number) return inv.id;
        return null;
    }
    async createPayment(p) {
        this.maybeFail("createPayment");
        const id = `xp-${++this.n}`;
        this.payments.push({
            id,
            ...p
        });
        return id;
    }
}
}),
"[project]/src/integrations/accounting/xero-mcp.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

return __turbopack_context__.a(async (__turbopack_handle_async_dependencies__, __turbopack_async_result__) => { try {
__turbopack_context__.s([
    "XERO_MCP_PACKAGE",
    ()=>XERO_MCP_PACKAGE,
    "XeroMcpAccounting",
    ()=>XeroMcpAccounting,
    "parseBlocks",
    ()=>parseBlocks,
    "parseField",
    ()=>parseField
]);
// Xero via the official Xero MCP server (DECISIONS.md #28). Harbourline is the MCP client.
// The MCP server creates invoices as DRAFT and has no tool to approve them, while Xero only
// accepts payments on AUTHORISED invoices, so approval uses one direct Xero API call
// (DECISIONS.md #32).
var __TURBOPACK__imported__module__$5b$externals$5d2f40$modelcontextprotocol$2f$sdk$2f$client$2f$index$2e$js__$5b$external$5d$__$2840$modelcontextprotocol$2f$sdk$2f$client$2f$index$2e$js$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f40$modelcontextprotocol$2f$sdk$29$__ = __turbopack_context__.i("[externals]/@modelcontextprotocol/sdk/client/index.js [external] (@modelcontextprotocol/sdk/client/index.js, esm_import, [project]/node_modules/@modelcontextprotocol/sdk)");
var __TURBOPACK__imported__module__$5b$externals$5d2f40$modelcontextprotocol$2f$sdk$2f$client$2f$stdio$2e$js__$5b$external$5d$__$2840$modelcontextprotocol$2f$sdk$2f$client$2f$stdio$2e$js$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f40$modelcontextprotocol$2f$sdk$29$__ = __turbopack_context__.i("[externals]/@modelcontextprotocol/sdk/client/stdio.js [external] (@modelcontextprotocol/sdk/client/stdio.js, esm_import, [project]/node_modules/@modelcontextprotocol/sdk)");
var __turbopack_async_dependencies__ = __turbopack_handle_async_dependencies__([
    __TURBOPACK__imported__module__$5b$externals$5d2f40$modelcontextprotocol$2f$sdk$2f$client$2f$index$2e$js__$5b$external$5d$__$2840$modelcontextprotocol$2f$sdk$2f$client$2f$index$2e$js$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f40$modelcontextprotocol$2f$sdk$29$__,
    __TURBOPACK__imported__module__$5b$externals$5d2f40$modelcontextprotocol$2f$sdk$2f$client$2f$stdio$2e$js__$5b$external$5d$__$2840$modelcontextprotocol$2f$sdk$2f$client$2f$stdio$2e$js$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f40$modelcontextprotocol$2f$sdk$29$__
]);
[__TURBOPACK__imported__module__$5b$externals$5d2f40$modelcontextprotocol$2f$sdk$2f$client$2f$index$2e$js__$5b$external$5d$__$2840$modelcontextprotocol$2f$sdk$2f$client$2f$index$2e$js$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f40$modelcontextprotocol$2f$sdk$29$__, __TURBOPACK__imported__module__$5b$externals$5d2f40$modelcontextprotocol$2f$sdk$2f$client$2f$stdio$2e$js__$5b$external$5d$__$2840$modelcontextprotocol$2f$sdk$2f$client$2f$stdio$2e$js$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f40$modelcontextprotocol$2f$sdk$29$__] = __turbopack_async_dependencies__.then ? (await __turbopack_async_dependencies__)() : __turbopack_async_dependencies__;
;
;
const XERO_MCP_PACKAGE = "@xeroapi/xero-mcp-server@0.0.17";
function parseField(text, label) {
    const m = text.match(new RegExp(`${label}:\\s*([^\\n]+)`));
    return m ? m[1].trim() : null;
}
function parseBlocks(text, startLabel) {
    return text.split(new RegExp(`(?=^${startLabel}:)`, "m")).filter((b)=>b.startsWith(`${startLabel}:`));
}
class XeroMcpAccounting {
    o;
    name;
    client;
    bankAccountId;
    constructor(o){
        this.o = o;
        this.name = "xero";
        this.client = null;
        this.bankAccountId = null;
    }
    async call(name, args) {
        if (this.o.callTool) return this.o.callTool(name, args);
        if (!this.client) {
            const transport = new __TURBOPACK__imported__module__$5b$externals$5d2f40$modelcontextprotocol$2f$sdk$2f$client$2f$stdio$2e$js__$5b$external$5d$__$2840$modelcontextprotocol$2f$sdk$2f$client$2f$stdio$2e$js$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f40$modelcontextprotocol$2f$sdk$29$__["StdioClientTransport"]({
                command: "npx",
                args: [
                    "-y",
                    XERO_MCP_PACKAGE
                ],
                env: {
                    ...process.env,
                    ...this.o.env
                }
            });
            const c = new __TURBOPACK__imported__module__$5b$externals$5d2f40$modelcontextprotocol$2f$sdk$2f$client$2f$index$2e$js__$5b$external$5d$__$2840$modelcontextprotocol$2f$sdk$2f$client$2f$index$2e$js$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f40$modelcontextprotocol$2f$sdk$29$__["Client"]({
                name: "harbourline-desk",
                version: "1.0.0"
            });
            await c.connect(transport);
            this.client = c;
        }
        const r = await this.client.callTool({
            name,
            arguments: args
        });
        const text = (r.content ?? []).map((x)=>x.text ?? "").join("\n");
        if (r.isError || /^Error /m.test(text)) throw new Error(`Xero ${name}: ${text.slice(0, 400)}`);
        return text;
    }
    async upsertContact(name, email) {
        const found = await this.call("list-contacts", {
            searchTerm: name
        });
        for (const b of parseBlocks(found, "Contact"))if (parseField(b, "Contact")?.toLowerCase() === name.toLowerCase()) return parseField(b, "ID");
        const created = await this.call("create-contact", {
            name,
            ...email ? {
                email
            } : {}
        });
        const id = created.match(/\(ID: ([^)]+)\)/)?.[1];
        if (!id) throw new Error(`Xero create-contact returned no id: ${created.slice(0, 200)}`);
        return id;
    }
    async createInvoice(inv, contactId) {
        const text = await this.call("create-invoice", {
            contactId,
            type: "ACCREC",
            reference: inv.number,
            date: inv.issuedOn,
            lineItems: inv.lines.map((l)=>({
                    description: l.description,
                    quantity: 1,
                    unitAmount: l.amountCents / 100,
                    accountCode: l.accountCode ?? this.o.salesAccountCode,
                    taxType: this.o.taxType ?? "NONE"
                }))
        });
        const id = parseField(text, "ID");
        if (!id) throw new Error(`Xero create-invoice returned no id: ${text.slice(0, 200)}`);
        await this.authorise(id);
        return id;
    }
    async findInvoiceByNumber(number) {
        const text = await this.call("list-invoices", {
            page: 1,
            invoiceNumbers: [
                number
            ]
        });
        for (const b of parseBlocks(text, "Invoice ID"))if (parseField(b, "Invoice") === number) return parseField(b, "Invoice ID");
        return null;
    }
    async createPayment(p) {
        if (!this.bankAccountId) {
            const text = await this.call("list-accounts", {});
            const block = parseBlocks(text, "Account").find((b)=>parseField(b, "Code") === this.o.bankAccountCode);
            this.bankAccountId = block ? parseField(block, "ID") : null;
            if (!this.bankAccountId) throw new Error(`No Xero account with code ${this.o.bankAccountCode}; set XERO_BANK_ACCOUNT_CODE`);
        }
        const text = await this.call("create-payment", {
            invoiceId: p.invoiceId,
            accountId: this.bankAccountId,
            amount: p.amountCents / 100,
            date: p.date,
            reference: p.reference
        });
        const id = parseField(text, "ID");
        if (!id) throw new Error(`Xero create-payment returned no id: ${text.slice(0, 200)}`);
        return id;
    }
    async authorise(invoiceId) {
        if (this.o.authorise) return this.o.authorise(invoiceId);
        const token = await xeroToken(this.o.env);
        const tenant = await xeroTenant(token);
        const r = await fetch(`https://api.xero.com/api.xro/2.0/Invoices/${invoiceId}`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token}`,
                "Xero-tenant-id": tenant,
                "Content-Type": "application/json",
                Accept: "application/json"
            },
            body: JSON.stringify({
                Invoices: [
                    {
                        InvoiceID: invoiceId,
                        Status: "AUTHORISED"
                    }
                ]
            })
        });
        if (!r.ok) throw new Error(`Xero authorise failed: ${r.status} ${(await r.text()).slice(0, 300)}`);
    }
    async close() {
        await this.client?.close();
        this.client = null;
    }
}
async function xeroToken(env) {
    if (env.XERO_CLIENT_BEARER_TOKEN) return env.XERO_CLIENT_BEARER_TOKEN;
    const r = await fetch("https://identity.xero.com/connect/token", {
        method: "POST",
        headers: {
            Authorization: `Basic ${Buffer.from(`${env.XERO_CLIENT_ID}:${env.XERO_CLIENT_SECRET}`).toString("base64")}`,
            "Content-Type": "application/x-www-form-urlencoded"
        },
        body: new URLSearchParams({
            grant_type: "client_credentials",
            scope: env.XERO_SCOPES ?? "accounting.transactions accounting.contacts accounting.settings"
        })
    });
    if (!r.ok) throw new Error(`Xero token failed: ${r.status}`);
    return (await r.json()).access_token;
}
async function xeroTenant(token) {
    const r = await fetch("https://api.xero.com/connections", {
        headers: {
            Authorization: `Bearer ${token}`
        }
    });
    const j = await r.json();
    if (!j[0]) throw new Error("No Xero organisation connected");
    return j[0].tenantId;
}
__turbopack_async_result__();
} catch(e) { __turbopack_async_result__(e); } }, false);}),
"[project]/src/integrations/bank/airwallex.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

// Airwallex adapter (DECISIONS.md #27): Global Account deposits, matched by the app.
// Sandbox base URL defaults to api-demo.airwallex.com; set AIRWALLEX_BASE_URL if Airwallex
// has moved the sandbox host (their newer docs mention api.sandbox.airwallex.com).
__turbopack_context__.s([
    "AirwallexBank",
    ()=>AirwallexBank,
    "mapDeposit",
    ()=>mapDeposit
]);
class AirwallexBank {
    o;
    name;
    token;
    constructor(o){
        this.o = o;
        this.name = "airwallex";
        this.token = null;
    }
    f() {
        return this.o.fetch ?? fetch;
    }
    async auth() {
        if (this.token && this.token.expires > Date.now() + 60_000) return this.token.value;
        const r = await this.f()(`${this.o.baseUrl}/api/v1/authentication/login`, {
            method: "POST",
            headers: {
                "x-client-id": this.o.clientId,
                "x-api-key": this.o.apiKey,
                "Content-Type": "application/json"
            }
        });
        if (!r.ok) throw new Error(`Airwallex login failed: ${r.status} ${await r.text()}`);
        const j = await r.json();
        this.token = {
            value: j.token,
            expires: j.expires_at ? new Date(j.expires_at).getTime() : Date.now() + 25 * 60_000
        };
        return j.token;
    }
    async call(method, path, body) {
        const r = await this.f()(`${this.o.baseUrl}${path}`, {
            method,
            headers: {
                Authorization: `Bearer ${await this.auth()}`,
                "Content-Type": "application/json"
            },
            body: body ? JSON.stringify(body) : undefined
        });
        if (!r.ok) throw new Error(`Airwallex ${method} ${path} failed: ${r.status} ${await r.text()}`);
        return r.json();
    }
    async listDeposits(since) {
        const q = new URLSearchParams({
            page_num: "0",
            page_size: "100"
        });
        if (since) q.set("from_created_at", since.toISOString());
        const j = await this.call("GET", `/api/v1/deposits?${q}`);
        return (j.items ?? []).filter((d)=>!d.status || d.status === "SETTLED").map(mapDeposit);
    }
    async simulateDeposit(d) {
        if (!this.o.globalAccountId) throw new Error("Set AIRWALLEX_GLOBAL_ACCOUNT_ID to simulate deposits");
        const j = await this.call("POST", "/api/v1/simulation/deposit/create", {
            global_account_id: this.o.globalAccountId,
            amount: d.amountCents / 100,
            currency: d.currency,
            reference: d.reference,
            payer_name: d.payerName,
            payer_bankname: "HSBC Hong Kong",
            payer_country: "HK",
            status: "SETTLED"
        });
        return mapDeposit(j);
    }
    async accountDetails() {
        if (!this.o.globalAccountId) return {
            "Account name": "Caine Road Corporate Services Limited",
            Note: "Airwallex Global Account not configured"
        };
        const a = await this.call("GET", `/api/v1/global_accounts/${this.o.globalAccountId}`);
        const inst = a.institution ?? {};
        const out = {
            "Account name": String(a.account_name ?? ""),
            Bank: String(inst.name ?? "Airwallex"),
            "Account number": String(a.account_number ?? "")
        };
        if (a.swift_code) out.SWIFT = String(a.swift_code);
        for (const rc of a.account_routing_type ? [
            {
                type: a.account_routing_type,
                value: a.account_routing_value
            }
        ] : a.routing_codes ?? [])out[String(rc.type).replace(/_/g, " ")] = String(rc.value);
        return out;
    }
}
function mapDeposit(d) {
    const amount = Number(d.amount ?? 0);
    return {
        providerTxId: String(d.id),
        amountCents: Math.round(amount * 100),
        currency: String(d.currency ?? "HKD"),
        reference: d.reference ?? null,
        payerName: d.payer_name ?? d.payer?.name ?? null,
        receivedAt: new Date(String(d.create_time ?? d.created_at ?? new Date().toISOString())),
        raw: d
    };
}
}),
"[project]/src/integrations/bank/fake.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "FakeBank",
    ()=>FakeBank
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$integrations$2f$json$2d$store$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/integrations/json-store.ts [app-route] (ecmascript)");
;
class FakeBank {
    deposits;
    clockNow;
    name;
    constructor(deposits = new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$integrations$2f$json$2d$store$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["MemoryList"](), clockNow = ()=>new Date()){
        this.deposits = deposits;
        this.clockNow = clockNow;
        this.name = "fake";
    }
    async listDeposits(since) {
        return this.deposits.all().map((d)=>({
                ...d,
                receivedAt: new Date(d.receivedAt)
            })).filter((d)=>!since || d.receivedAt >= since);
    }
    async simulateDeposit(d) {
        const dep = {
            providerTxId: `fake-dep-${this.deposits.all().length + 1}-${Date.now()}`,
            amountCents: d.amountCents,
            currency: d.currency,
            reference: d.reference,
            payerName: d.payerName,
            receivedAt: this.clockNow()
        };
        this.deposits.push({
            ...dep,
            receivedAt: dep.receivedAt.toISOString()
        });
        return dep;
    }
    async accountDetails() {
        return {
            "Account name": "Caine Road Corporate Services Limited",
            Bank: "Airwallex (Hong Kong) Limited (via DBS Bank (Hong Kong) Limited)",
            "Bank code": "016",
            "Account number": "7950 1234 5678",
            "FPS ID": "1234567",
            "SWIFT": "DHBKHKHH"
        };
    }
}
}),
"[project]/src/integrations/json-store.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "FileList",
    ()=>FileList,
    "MemoryList",
    ()=>MemoryList
]);
// Tiny JSON-file store so fake adapters work across the web and worker processes in
// offline demo mode. Tests use the in-memory variant.
var __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$fs__$5b$external$5d$__$28$node$3a$fs$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/node:fs [external] (node:fs, cjs)");
var __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$path__$5b$external$5d$__$28$node$3a$path$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/node:path [external] (node:path, cjs)");
;
;
class MemoryList {
    items = [];
    all() {
        return [
            ...this.items
        ];
    }
    push(item) {
        this.items.push(item);
    }
}
class FileList {
    file;
    constructor(file){
        this.file = file;
    }
    all() {
        if (!(0, __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$fs__$5b$external$5d$__$28$node$3a$fs$2c$__cjs$29$__["existsSync"])(this.file)) return [];
        return JSON.parse((0, __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$fs__$5b$external$5d$__$28$node$3a$fs$2c$__cjs$29$__["readFileSync"])(this.file, "utf8"));
    }
    push(item) {
        const items = this.all();
        items.push(item);
        (0, __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$fs__$5b$external$5d$__$28$node$3a$fs$2c$__cjs$29$__["mkdirSync"])(__TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$path__$5b$external$5d$__$28$node$3a$path$2c$__cjs$29$__["default"].dirname(this.file), {
            recursive: true
        });
        (0, __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$fs__$5b$external$5d$__$28$node$3a$fs$2c$__cjs$29$__["writeFileSync"])(this.file, JSON.stringify(items, null, 2));
    }
}
}),
"[project]/src/integrations/llm/openrouter.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

// Product LLM via OpenRouter (DECISIONS.md #22). Only the running product uses this.
__turbopack_context__.s([
    "OpenRouterLlm",
    ()=>OpenRouterLlm,
    "parseJsonLoose",
    ()=>parseJsonLoose
]);
class OpenRouterLlm {
    apiKey;
    model;
    appUrl;
    reasoning;
    name;
    constructor(apiKey, model, appUrl = "http://localhost:3000", reasoning = "low"){
        this.apiKey = apiKey;
        this.model = model;
        this.appUrl = appUrl;
        this.reasoning = reasoning;
        this.name = "openrouter";
    }
    async complete(req) {
        const body = {
            model: this.model,
            messages: req.messages,
            temperature: req.temperature ?? 0.2,
            ...this.reasoning === "none" ? {
                reasoning: {
                    enabled: false
                }
            } : {
                reasoning: {
                    effort: this.reasoning
                }
            },
            response_format: {
                type: "json_schema",
                json_schema: {
                    name: req.schemaName,
                    strict: true,
                    schema: req.schema
                }
            }
        };
        let lastErr;
        for(let attempt = 0; attempt < 3; attempt++){
            try {
                const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${this.apiKey}`,
                        "Content-Type": "application/json",
                        "HTTP-Referer": this.appUrl,
                        "X-Title": "Harbourline Desk"
                    },
                    body: JSON.stringify(body),
                    signal: AbortSignal.timeout(90_000)
                });
                if (res.status === 429 || res.status >= 500) throw new Error(`OpenRouter ${res.status}: ${await res.text()}`);
                if (!res.ok) throw Object.assign(new Error(`OpenRouter ${res.status}: ${await res.text()}`), {
                    fatal: true
                });
                const data = await res.json();
                if (data.error) throw new Error(`OpenRouter error: ${data.error.message}`);
                const raw = data.choices?.[0]?.message?.content ?? "";
                return {
                    json: parseJsonLoose(raw),
                    raw,
                    tokensIn: data.usage?.prompt_tokens,
                    tokensOut: data.usage?.completion_tokens,
                    model: data.model ?? this.model
                };
            } catch (e) {
                lastErr = e;
                if (e.fatal) break;
                await new Promise((r)=>setTimeout(r, 800 * (attempt + 1)));
            }
        }
        throw lastErr;
    }
}
function parseJsonLoose(raw) {
    const t = raw.trim();
    try {
        return JSON.parse(t);
    } catch  {}
    const m = t.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (m) {
        try {
            return JSON.parse(m[1]);
        } catch  {}
    }
    const i = t.indexOf("{"), j = t.lastIndexOf("}");
    if (i >= 0 && j > i) {
        try {
            return JSON.parse(t.slice(i, j + 1));
        } catch  {}
    }
    return null;
}
}),
"[project]/src/integrations/llm/scripted.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

// Scripted LLM for tests: each agent gets a responder that returns recorded JSON.
// Tests never depend on a live model call (AGENTS.md).
__turbopack_context__.s([
    "ScriptedLlm",
    ()=>ScriptedLlm
]);
class ScriptedLlm {
    name = "scripted";
    responders = new Map();
    calls = [];
    on(agent, r) {
        const fn = typeof r === "function" ? r : ()=>r;
        const list = this.responders.get(agent) ?? [];
        list.push(fn);
        this.responders.set(agent, list);
        return this;
    }
    /** Replace all responders for an agent. */ set(agent, r) {
        this.responders.delete(agent);
        return this.on(agent, r);
    }
    async complete(req) {
        this.calls.push(req);
        const list = this.responders.get(req.agent);
        if (!list || list.length === 0) throw new Error(`ScriptedLlm: no responder for agent "${req.agent}"`);
        const n = this.calls.filter((c)=>c.agent === req.agent).length;
        // Use responders in order; the last one repeats.
        const fn = list[Math.min(n - 1, list.length - 1)];
        const json = fn(req, n);
        return {
            json,
            raw: JSON.stringify(json),
            model: "scripted"
        };
    }
    callsFor(agent) {
        return this.calls.filter((c)=>c.agent === agent);
    }
}
}),
"[project]/src/integrations/mail/agentmail.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

return __turbopack_context__.a(async (__turbopack_handle_async_dependencies__, __turbopack_async_result__) => { try {
__turbopack_context__.s([
    "AgentMailMail",
    ()=>AgentMailMail
]);
// AgentMail adapter (fallback mailbox). Uses extracted_text to drop quoted history.
var __TURBOPACK__imported__module__$5b$externals$5d2f$agentmail__$5b$external$5d$__$28$agentmail$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f$agentmail$29$__ = __turbopack_context__.i("[externals]/agentmail [external] (agentmail, esm_import, [project]/node_modules/agentmail)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$integrations$2f$mail$2f$mime$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/integrations/mail/mime.ts [app-route] (ecmascript)");
var __turbopack_async_dependencies__ = __turbopack_handle_async_dependencies__([
    __TURBOPACK__imported__module__$5b$externals$5d2f$agentmail__$5b$external$5d$__$28$agentmail$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f$agentmail$29$__,
    __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$integrations$2f$mail$2f$mime$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__
]);
[__TURBOPACK__imported__module__$5b$externals$5d2f$agentmail__$5b$external$5d$__$28$agentmail$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f$agentmail$29$__, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$integrations$2f$mail$2f$mime$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__] = __turbopack_async_dependencies__.then ? (await __turbopack_async_dependencies__)() : __turbopack_async_dependencies__;
;
;
class AgentMailMail {
    address;
    name;
    client;
    constructor(apiKey, address){
        this.address = address;
        this.name = "agentmail";
        this.client = new __TURBOPACK__imported__module__$5b$externals$5d2f$agentmail__$5b$external$5d$__$28$agentmail$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f$agentmail$29$__["AgentMailClient"]({
            apiKey
        });
    }
    async fetchNew(cursor) {
        const after = cursor ? new Date(cursor) : new Date(Date.now() - 60_000);
        const list = await this.client.inboxes.messages.list(this.address, {
            after,
            ascending: true,
            limit: 50,
            labels: [
                "received"
            ]
        });
        const messages = [];
        let latest = after;
        for (const item of list.messages){
            const m = await this.client.inboxes.messages.get(this.address, item.messageId);
            const created = new Date(m.createdAt);
            if (created > latest) latest = created;
            const fromMatch = m.from.match(/^(.*?)\s*<([^>]+)>$/);
            const fromEmail = (fromMatch?.[2] ?? m.from).toLowerCase();
            if (fromEmail === this.address.toLowerCase()) continue;
            const atts = [];
            for (const a of m.attachments ?? []){
                const meta = await this.client.inboxes.messages.getAttachment(this.address, m.messageId, a.attachmentId);
                const res = await fetch(meta.downloadUrl);
                atts.push({
                    filename: a.filename ?? "attachment",
                    mime: a.contentType ?? "application/octet-stream",
                    content: Buffer.from(await res.arrayBuffer())
                });
            }
            messages.push({
                provider: "agentmail",
                providerMessageId: m.messageId,
                providerThreadId: m.threadId,
                rfcMessageId: m.messageId,
                inReplyTo: m.inReplyTo ?? null,
                references: m.references ?? [],
                from: {
                    email: fromEmail,
                    name: fromMatch?.[1]?.replace(/"/g, "") || null
                },
                to: m.to,
                cc: m.cc ?? [],
                subject: m.subject ?? "",
                text: m.extractedText ?? (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$integrations$2f$mail$2f$mime$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["stripQuoted"])(m.text ?? ""),
                html: m.html ?? null,
                receivedAt: created,
                attachments: atts
            });
        }
        return {
            messages,
            cursor: new Date(latest.getTime() + 1).toISOString()
        };
    }
    async send(m) {
        const attachments = (m.attachments ?? []).map((a)=>({
                filename: a.filename,
                contentType: a.mime,
                content: a.content.toString("base64")
            }));
        const r = m.inReplyTo ? await this.client.inboxes.messages.reply(this.address, m.inReplyTo, {
            text: m.text,
            html: m.html,
            attachments,
            to: m.to,
            cc: m.cc
        }) : await this.client.inboxes.messages.send(this.address, {
            to: m.to,
            cc: m.cc,
            subject: m.subject,
            text: m.text,
            html: m.html,
            attachments
        });
        return {
            providerMessageId: r.messageId,
            providerThreadId: r.threadId,
            rfcMessageId: r.messageId
        };
    }
}
__turbopack_async_result__();
} catch(e) { __turbopack_async_result__(e); } }, false);}),
"[project]/src/integrations/mail/fake.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

// Fake mailbox: the Dev inbox page and tests "deliver" inbound mail here; sent mail is captured.
__turbopack_context__.s([
    "FakeMail",
    ()=>FakeMail
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$integrations$2f$json$2d$store$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/integrations/json-store.ts [app-route] (ecmascript)");
;
class FakeMail {
    address;
    inbox;
    outbox;
    name;
    seq;
    constructor(address = "desk@caineroad.example", inbox = new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$integrations$2f$json$2d$store$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["MemoryList"](), outbox = new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$integrations$2f$json$2d$store$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["MemoryList"]()){
        this.address = address;
        this.inbox = inbox;
        this.outbox = outbox;
        this.name = "fake";
        this.seq = 0;
    }
    /** Simulate an email arriving. */ deliver(m) {
        const n = this.inbox.all().length + 1;
        const mail = {
            provider: "fake",
            providerMessageId: m.providerMessageId ?? `fake-in-${n}-${Date.now()}`,
            providerThreadId: m.providerThreadId ?? null,
            rfcMessageId: m.rfcMessageId ?? `<in-${n}-${Date.now()}@client.example>`,
            inReplyTo: m.inReplyTo ?? null,
            references: m.references ?? [],
            to: m.to ?? [
                this.address
            ],
            cc: m.cc ?? [],
            html: m.html ?? null,
            receivedAt: m.receivedAt ?? new Date(),
            attachments: m.attachments ?? [],
            from: m.from,
            subject: m.subject,
            text: m.text
        };
        this.inbox.push({
            ...mail,
            receivedAt: mail.receivedAt.toISOString(),
            attachments: mail.attachments.map((a)=>({
                    filename: a.filename,
                    mime: a.mime,
                    base64: a.content.toString("base64")
                }))
        });
        return mail;
    }
    async fetchNew(cursor) {
        const all = this.inbox.all();
        const start = cursor ? Number(cursor) : 0;
        const messages = all.slice(start).map((m)=>({
                ...m,
                receivedAt: new Date(m.receivedAt),
                attachments: m.attachments.map((a)=>({
                        filename: a.filename,
                        mime: a.mime,
                        content: Buffer.from(a.base64, "base64")
                    }))
            }));
        return {
            messages,
            cursor: String(all.length)
        };
    }
    async send(mail) {
        const id = `fake-out-${this.outbox.all().length + 1}-${++this.seq}`;
        const rfc = `<${id}@caineroad.example>`;
        const { attachments, ...rest } = mail;
        this.outbox.push({
            ...rest,
            providerMessageId: id,
            rfcMessageId: rfc,
            sentAt: new Date().toISOString(),
            attachmentNames: (attachments ?? []).map((a)=>a.filename)
        });
        return {
            providerMessageId: id,
            providerThreadId: mail.providerThreadId ?? `fake-thread-${id}`,
            rfcMessageId: rfc
        };
    }
    sent() {
        return this.outbox.all();
    }
}
}),
"[project]/src/integrations/mail/gmail.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

return __turbopack_context__.a(async (__turbopack_handle_async_dependencies__, __turbopack_async_result__) => { try {
__turbopack_context__.s([
    "GMAIL_SCOPES",
    ()=>GMAIL_SCOPES,
    "GmailMail",
    ()=>GmailMail,
    "gmailOAuthClient",
    ()=>gmailOAuthClient
]);
// Gmail API adapter (DECISIONS.md #25). OAuth on localhost; the refresh token lives in the
// encrypted secrets table. Polls the history API from the last historyId.
var __TURBOPACK__imported__module__$5b$externals$5d2f$googleapis__$5b$external$5d$__$28$googleapis$2c$__cjs$2c$__$5b$project$5d2f$node_modules$2f$googleapis$29$__ = __turbopack_context__.i("[externals]/googleapis [external] (googleapis, cjs, [project]/node_modules/googleapis)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$integrations$2f$mail$2f$mime$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/integrations/mail/mime.ts [app-route] (ecmascript)");
var __turbopack_async_dependencies__ = __turbopack_handle_async_dependencies__([
    __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$integrations$2f$mail$2f$mime$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__
]);
[__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$integrations$2f$mail$2f$mime$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__] = __turbopack_async_dependencies__.then ? (await __turbopack_async_dependencies__)() : __turbopack_async_dependencies__;
;
;
const GMAIL_SCOPES = [
    "https://www.googleapis.com/auth/gmail.modify",
    "https://www.googleapis.com/auth/gmail.send"
];
function gmailOAuthClient(clientId, clientSecret, redirectUri) {
    return new __TURBOPACK__imported__module__$5b$externals$5d2f$googleapis__$5b$external$5d$__$28$googleapis$2c$__cjs$2c$__$5b$project$5d2f$node_modules$2f$googleapis$29$__["google"].auth.OAuth2(clientId, clientSecret, redirectUri);
}
class GmailMail {
    address;
    name;
    gmail;
    constructor(address, auth){
        this.address = address;
        this.name = "gmail";
        this.gmail = __TURBOPACK__imported__module__$5b$externals$5d2f$googleapis__$5b$external$5d$__$28$googleapis$2c$__cjs$2c$__$5b$project$5d2f$node_modules$2f$googleapis$29$__["google"].gmail({
            version: "v1",
            auth
        });
    }
    async fetchNew(cursor) {
        if (!cursor) {
            // First run: start from now; don't import the whole mailbox.
            const prof = await this.gmail.users.getProfile({
                userId: "me"
            });
            return {
                messages: [],
                cursor: prof.data.historyId ?? null
            };
        }
        const ids = new Set();
        let pageToken;
        let latest = cursor;
        try {
            do {
                const h = await this.gmail.users.history.list({
                    userId: "me",
                    startHistoryId: cursor,
                    historyTypes: [
                        "messageAdded"
                    ],
                    labelId: "INBOX",
                    pageToken
                });
                for (const rec of h.data.history ?? [])for (const ma of rec.messagesAdded ?? [])if (ma.message?.id && !(ma.message.labelIds ?? []).includes("SENT")) ids.add(ma.message.id);
                latest = h.data.historyId ?? latest;
                pageToken = h.data.nextPageToken ?? undefined;
            }while (pageToken)
        } catch (e) {
            if (e.code === 404) {
                const prof = await this.gmail.users.getProfile({
                    userId: "me"
                });
                return {
                    messages: [],
                    cursor: prof.data.historyId ?? null
                };
            }
            throw e;
        }
        const messages = [];
        for (const id of ids){
            const r = await this.gmail.users.messages.get({
                userId: "me",
                id,
                format: "raw"
            });
            if (!r.data.raw) continue;
            const m = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$integrations$2f$mail$2f$mime$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["parseRaw"])(Buffer.from(r.data.raw, "base64url"), "gmail", id, r.data.threadId);
            if (m.from.email === this.address.toLowerCase()) continue;
            messages.push(m);
        }
        return {
            messages,
            cursor: latest
        };
    }
    async send(m) {
        const raw = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$integrations$2f$mail$2f$mime$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["buildRaw"])(this.address, m);
        const r = await this.gmail.users.messages.send({
            userId: "me",
            requestBody: {
                raw: raw.toString("base64url"),
                threadId: m.providerThreadId ?? undefined
            }
        });
        const sent = await this.gmail.users.messages.get({
            userId: "me",
            id: r.data.id,
            format: "metadata",
            metadataHeaders: [
                "Message-ID"
            ]
        });
        const rfc = sent.data.payload?.headers?.find((h)=>h.name?.toLowerCase() === "message-id")?.value ?? null;
        return {
            providerMessageId: r.data.id,
            providerThreadId: r.data.threadId ?? null,
            rfcMessageId: rfc
        };
    }
}
__turbopack_async_result__();
} catch(e) { __turbopack_async_result__(e); } }, false);}),
"[project]/src/integrations/mail/lazy.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

// Defers building a mailbox adapter until first use (e.g. the Gmail refresh token is
// read from the encrypted secrets table).
__turbopack_context__.s([
    "LazyMail",
    ()=>LazyMail
]);
class LazyMail {
    name;
    address;
    factory;
    inner;
    constructor(name, address, factory){
        this.name = name;
        this.address = address;
        this.factory = factory;
        this.inner = null;
    }
    get() {
        return this.inner ??= this.factory().catch((e)=>{
            this.inner = null;
            throw e;
        });
    }
    async fetchNew(cursor) {
        return (await this.get()).fetchNew(cursor);
    }
    async send(m) {
        return (await this.get()).send(m);
    }
}
}),
"[project]/src/integrations/mail/mime.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

return __turbopack_context__.a(async (__turbopack_handle_async_dependencies__, __turbopack_async_result__) => { try {
__turbopack_context__.s([
    "buildRaw",
    ()=>buildRaw,
    "parseRaw",
    ()=>parseRaw,
    "stripQuoted",
    ()=>stripQuoted
]);
// MIME helpers shared by mailbox adapters.
var __TURBOPACK__imported__module__$5b$externals$5d2f$mailparser__$5b$external$5d$__$28$mailparser$2c$__cjs$2c$__$5b$project$5d2f$node_modules$2f$mailparser$29$__ = __turbopack_context__.i("[externals]/mailparser [external] (mailparser, cjs, [project]/node_modules/mailparser)");
var __TURBOPACK__imported__module__$5b$externals$5d2f$nodemailer$2f$lib$2f$mail$2d$composer$2f$index$2e$js__$5b$external$5d$__$28$nodemailer$2f$lib$2f$mail$2d$composer$2f$index$2e$js$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f$nodemailer$29$__ = __turbopack_context__.i("[externals]/nodemailer/lib/mail-composer/index.js [external] (nodemailer/lib/mail-composer/index.js, esm_import, [project]/node_modules/nodemailer)");
var __turbopack_async_dependencies__ = __turbopack_handle_async_dependencies__([
    __TURBOPACK__imported__module__$5b$externals$5d2f$nodemailer$2f$lib$2f$mail$2d$composer$2f$index$2e$js__$5b$external$5d$__$28$nodemailer$2f$lib$2f$mail$2d$composer$2f$index$2e$js$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f$nodemailer$29$__
]);
[__TURBOPACK__imported__module__$5b$externals$5d2f$nodemailer$2f$lib$2f$mail$2d$composer$2f$index$2e$js__$5b$external$5d$__$28$nodemailer$2f$lib$2f$mail$2d$composer$2f$index$2e$js$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f$nodemailer$29$__] = __turbopack_async_dependencies__.then ? (await __turbopack_async_dependencies__)() : __turbopack_async_dependencies__;
;
;
function stripQuoted(text) {
    const lines = text.replace(/\r\n/g, "\n").split("\n");
    const cut = lines.findIndex((l, i)=>/^On .{3,200}wrote:\s*$/.test(l) || /^On .{3,200}$/.test(l) && /wrote:\s*$/.test(lines[i + 1] ?? "") || /^-{2,}\s*Original Message\s*-{2,}/i.test(l) || /^From: .+/.test(l) && /^(Sent|Date): /.test(lines[i + 1] ?? "") || /^於.{2,80}寫道[:：]\s*$/.test(l) || /^在.{2,80}写道[:：]\s*$/.test(l));
    const kept = (cut >= 0 ? lines.slice(0, cut) : lines).filter((l)=>!/^>/.test(l));
    return kept.join("\n").trim();
}
async function parseRaw(raw, provider, providerMessageId, providerThreadId) {
    const p = await (0, __TURBOPACK__imported__module__$5b$externals$5d2f$mailparser__$5b$external$5d$__$28$mailparser$2c$__cjs$2c$__$5b$project$5d2f$node_modules$2f$mailparser$29$__["simpleParser"])(raw);
    const addr = (a)=>{
        const v = a;
        const list = Array.isArray(v) ? v.flatMap((x)=>x.value ?? []) : v?.value ?? [];
        return list.map((x)=>(x.address ?? "").toLowerCase()).filter(Boolean);
    };
    const from = p.from?.value?.[0] ?? {};
    const refs = Array.isArray(p.references) ? p.references : p.references ? [
        p.references
    ] : [];
    return {
        provider,
        providerMessageId,
        providerThreadId: providerThreadId ?? null,
        rfcMessageId: p.messageId ?? null,
        inReplyTo: p.inReplyTo ?? null,
        references: refs,
        from: {
            email: (from.address ?? "").toLowerCase(),
            name: from.name || null
        },
        to: addr(p.to),
        cc: addr(p.cc),
        subject: p.subject ?? "",
        text: stripQuoted(p.text ?? (p.html ? String(p.html).replace(/<[^>]+>/g, " ") : "")),
        html: typeof p.html === "string" ? p.html : null,
        receivedAt: p.date ?? new Date(),
        attachments: (p.attachments ?? []).filter((a)=>a.contentDisposition !== "inline" || !a.contentId).map((a)=>({
                filename: a.filename ?? "attachment",
                mime: a.contentType,
                content: a.content
            }))
    };
}
async function buildRaw(from, m) {
    const composer = new __TURBOPACK__imported__module__$5b$externals$5d2f$nodemailer$2f$lib$2f$mail$2d$composer$2f$index$2e$js__$5b$external$5d$__$28$nodemailer$2f$lib$2f$mail$2d$composer$2f$index$2e$js$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f$nodemailer$29$__["default"]({
        from,
        to: m.to,
        cc: m.cc,
        subject: m.subject,
        text: m.text,
        html: m.html,
        inReplyTo: m.inReplyTo ?? undefined,
        references: m.references?.length ? m.references : undefined,
        attachments: (m.attachments ?? []).map((a)=>({
                filename: a.filename,
                content: a.content,
                contentType: a.mime
            }))
    });
    return composer.compile().build();
}
__turbopack_async_result__();
} catch(e) { __turbopack_async_result__(e); } }, false);}),
"[project]/src/integrations/screening/fake.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "FakeScreening",
    ()=>FakeScreening
]);
class FakeScreening {
    watch;
    name;
    constructor(watch = {}){
        this.watch = watch;
        this.name = "fake";
    }
    async datasetVersion() {
        return "fake-2026-09-29";
    }
    async match(q) {
        return this.watch[q.name.toUpperCase()] ?? [];
    }
}
}),
"[project]/src/integrations/screening/opensanctions-api.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

// OpenSanctions hosted API (/match/default), used when OPENSANCTIONS_API_KEY is set.
// Covers sanctions and PEPs.
__turbopack_context__.s([
    "OpenSanctionsApi",
    ()=>OpenSanctionsApi
]);
class OpenSanctionsApi {
    apiKey;
    f;
    name;
    constructor(apiKey, f = fetch){
        this.apiKey = apiKey;
        this.f = f;
        this.name = "opensanctions-api";
    }
    async datasetVersion() {
        return "opensanctions-api/default";
    }
    async match(q) {
        const properties = {
            name: [
                q.name,
                ...q.nameZh ? [
                    q.nameZh
                ] : []
            ]
        };
        if (q.birthDate) properties.birthDate = [
            q.birthDate
        ];
        if (q.nationality) properties.nationality = [
            q.nationality
        ];
        const r = await this.f("https://api.opensanctions.org/match/default?algorithm=logic-v1", {
            method: "POST",
            headers: {
                Authorization: `ApiKey ${this.apiKey}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                queries: {
                    q: {
                        schema: "Person",
                        properties
                    }
                }
            })
        });
        if (!r.ok) throw new Error(`OpenSanctions ${r.status}: ${(await r.text()).slice(0, 200)}`);
        const j = await r.json();
        return j.responses.q.results.filter((x)=>x.score >= 0.5).map((x)=>({
                id: x.id,
                caption: x.caption,
                score: x.score,
                datasets: x.datasets,
                topics: x.properties.topics ?? [],
                birthDates: x.properties.birthDate,
                countries: x.properties.country
            }));
    }
}
}),
"[project]/src/integrations/screening/opensanctions-local.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "LocalOpenSanctions",
    ()=>LocalOpenSanctions
]);
// Local OpenSanctions matcher over the bulk "targets.simple.csv" export (non-commercial
// licence). Used when no API key is configured. Candidate generation by name tokens;
// the LLM adjudicator and a human decide what a hit means.
var __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$fs__$5b$external$5d$__$28$node$3a$fs$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/node:fs [external] (node:fs, cjs)");
var __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$readline__$5b$external$5d$__$28$node$3a$readline$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/node:readline [external] (node:readline, cjs)");
;
;
const norm = (s)=>s.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9㐀-鿿 ]/g, " ").replace(/\s+/g, " ").trim();
const tokens = (s)=>{
    const n = norm(s);
    return /[㐀-鿿]/.test(n) ? [
        n.replace(/\s/g, "")
    ] : n.split(" ").filter((t)=>t.length > 1);
};
function parseCsvLine(line) {
    const out = [];
    let cur = "";
    let q = false;
    for(let i = 0; i < line.length; i++){
        const c = line[i];
        if (q) {
            if (c === '"' && line[i + 1] === '"') {
                cur += '"';
                i++;
            } else if (c === '"') q = false;
            else cur += c;
        } else if (c === '"') q = true;
        else if (c === ",") {
            out.push(cur);
            cur = "";
        } else cur += c;
    }
    out.push(cur);
    return out;
}
class LocalOpenSanctions {
    file;
    name;
    rows;
    index;
    constructor(file){
        this.file = file;
        this.name = "opensanctions-local";
        this.rows = null;
        this.index = new Map();
    }
    async datasetVersion() {
        return (0, __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$fs__$5b$external$5d$__$28$node$3a$fs$2c$__cjs$29$__["existsSync"])(this.file) ? `opensanctions-sanctions@${(0, __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$fs__$5b$external$5d$__$28$node$3a$fs$2c$__cjs$29$__["statSync"])(this.file).mtime.toISOString().slice(0, 10)}` : "opensanctions-not-downloaded";
    }
    async load() {
        if (this.rows) return this.rows;
        this.rows = [];
        if (!(0, __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$fs__$5b$external$5d$__$28$node$3a$fs$2c$__cjs$29$__["existsSync"])(this.file)) return this.rows;
        const rl = __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$readline__$5b$external$5d$__$28$node$3a$readline$2c$__cjs$29$__["default"].createInterface({
            input: (0, __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$fs__$5b$external$5d$__$28$node$3a$fs$2c$__cjs$29$__["createReadStream"])(this.file, "utf8"),
            crlfDelay: Infinity
        });
        let header = null;
        for await (const line of rl){
            if (!line) continue;
            const cols = parseCsvLine(line);
            if (!header) {
                header = cols;
                continue;
            }
            const get = (k)=>cols[header.indexOf(k)] ?? "";
            if (get("schema") !== "Person") continue;
            const names = [
                get("name"),
                ...get("aliases").split(";")
            ].map((s)=>s.trim()).filter(Boolean);
            const row = {
                id: get("id"),
                schema: "Person",
                names,
                birthDates: get("birth_date").split(";").filter(Boolean),
                countries: get("countries").split(";").filter(Boolean),
                datasets: get("dataset").split(";").filter(Boolean),
                topics: [
                    "sanction"
                ]
            };
            const idx = this.rows.push(row) - 1;
            for (const n of names)for (const t of tokens(n)){
                const l = this.index.get(t) ?? [];
                l.push(idx);
                this.index.set(t, l);
            }
        }
        return this.rows;
    }
    async match(q) {
        const rows = await this.load();
        const queries = [
            q.name,
            q.nameZh
        ].filter(Boolean);
        const scored = new Map();
        for (const qn of queries){
            const qt = tokens(qn);
            if (!qt.length) continue;
            const cand = new Set(this.index.get(qt[0]) ?? []);
            for (const i of cand){
                let best = 0;
                for (const n of rows[i].names){
                    const nt = new Set(tokens(n));
                    if (!qt.every((t)=>nt.has(t))) continue;
                    best = Math.max(best, qt.length / Math.max(nt.size, qt.length));
                }
                if (best > 0) scored.set(i, Math.max(scored.get(i) ?? 0, best));
            }
        }
        return [
            ...scored.entries()
        ].map(([i, s])=>{
            const r = rows[i];
            let score = s;
            if (q.birthDate && r.birthDates.length && !r.birthDates.some((b)=>b.slice(0, 4) === q.birthDate.slice(0, 4))) score *= 0.6;
            return {
                id: r.id,
                caption: r.names[0],
                score: Math.round(score * 100) / 100,
                topics: r.topics,
                datasets: r.datasets,
                birthDates: r.birthDates,
                countries: r.countries
            };
        }).filter((h)=>h.score >= 0.5).sort((a, b)=>b.score - a.score).slice(0, 10);
    }
}
}),
"[project]/src/integrations/storage.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "DiskStorage",
    ()=>DiskStorage,
    "MemoryStorage",
    ()=>MemoryStorage
]);
var __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$fs$2f$promises__$5b$external$5d$__$28$node$3a$fs$2f$promises$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/node:fs/promises [external] (node:fs/promises, cjs)");
var __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$path__$5b$external$5d$__$28$node$3a$path$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/node:path [external] (node:path, cjs)");
;
;
class DiskStorage {
    root;
    constructor(root){
        this.root = root;
    }
    p(key) {
        const clean = key.replace(/\.\.+/g, ".").replace(/^\/+/, "");
        return __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$path__$5b$external$5d$__$28$node$3a$path$2c$__cjs$29$__["default"].join(this.root, clean);
    }
    async put(key, content) {
        const file = this.p(key);
        await (0, __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$fs$2f$promises__$5b$external$5d$__$28$node$3a$fs$2f$promises$2c$__cjs$29$__["mkdir"])(__TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$path__$5b$external$5d$__$28$node$3a$path$2c$__cjs$29$__["default"].dirname(file), {
            recursive: true
        });
        await (0, __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$fs$2f$promises__$5b$external$5d$__$28$node$3a$fs$2f$promises$2c$__cjs$29$__["writeFile"])(file, content);
    }
    async get(key) {
        return (0, __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$fs$2f$promises__$5b$external$5d$__$28$node$3a$fs$2f$promises$2c$__cjs$29$__["readFile"])(this.p(key));
    }
}
class MemoryStorage {
    files = new Map();
    async put(key, content) {
        this.files.set(key, content);
    }
    async get(key) {
        const f = this.files.get(key);
        if (!f) throw new Error(`No such file: ${key}`);
        return f;
    }
}
}),
"[project]/src/lib/clock.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

// Clock behind an interface so deadline and ageing rules are testable.
__turbopack_context__.s([
    "FixedClock",
    ()=>FixedClock,
    "hkDate",
    ()=>hkDate,
    "systemClock",
    ()=>systemClock
]);
function hkDate(d) {
    return new Date(d.getTime() + 8 * 3600_000).toISOString().slice(0, 10);
}
const systemClock = {
    now: ()=>new Date(),
    today: ()=>hkDate(new Date())
};
class FixedClock {
    t;
    constructor(t){
        this.t = t;
    }
    now() {
        return new Date(this.t);
    }
    today() {
        return hkDate(this.t);
    }
    set(iso) {
        this.t = new Date(iso);
    }
    advanceDays(n) {
        this.t = new Date(this.t.getTime() + n * 86400_000);
    }
    advanceSeconds(n) {
        this.t = new Date(this.t.getTime() + n * 1000);
    }
}
}),
"[project]/src/lib/config.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "loadConfig",
    ()=>loadConfig
]);
// Typed environment. Each integration is "real" only when its keys are present;
// otherwise the fake adapter is used (BUILD_SPEC.md §2: credentials never block).
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__ = __turbopack_context__.i("[project]/node_modules/zod/v4/classic/external.js [app-route] (ecmascript) <export * as z>");
;
const Env = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
    DATABASE_URL: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().default("postgres://localhost/harbourline"),
    APP_SECRET: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().min(32).default("dev-only-secret-change-me-dev-only-secret"),
    APP_URL: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().default("http://localhost:3000"),
    FIRM_ID: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().default("firm_crcs"),
    or_api_key: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().optional(),
    LLM_MODEL: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().default("google/gemini-3.8-flash"),
    LLM_MODE: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].enum([
        "live",
        "fixture"
    ]).optional(),
    LLM_REASONING: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].enum([
        "none",
        "low",
        "medium",
        "high"
    ]).default("low"),
    MAIL_PROVIDER: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].enum([
        "gmail",
        "agentmail",
        "fake"
    ]).optional(),
    GOOGLE_CLIENT_ID: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().optional(),
    GOOGLE_CLIENT_SECRET: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().optional(),
    GMAIL_ADDRESS: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().optional(),
    AGENTMAIL_API_KEY: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().optional(),
    AGENTMAIL_INBOX: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().optional(),
    AIRWALLEX_CLIENT_ID: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().optional(),
    AIRWALLEX_API_KEY: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().optional(),
    AIRWALLEX_BASE_URL: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().default("https://api-demo.airwallex.com"),
    AIRWALLEX_GLOBAL_ACCOUNT_ID: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().optional(),
    XERO_CLIENT_ID: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().optional(),
    XERO_CLIENT_SECRET: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().optional(),
    XERO_CLIENT_BEARER_TOKEN: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().optional(),
    XERO_SALES_ACCOUNT_CODE: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().default("200"),
    XERO_BANK_ACCOUNT_CODE: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().default("090"),
    OPENSANCTIONS_API_KEY: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().optional(),
    DEMO_EXISTING_CLIENT_EMAIL: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().optional(),
    POLL_INTERVAL_MS: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].coerce.number().default(5000)
});
function loadConfig(env = process.env) {
    const e = Env.parse(env);
    const gmailReady = !!(e.GOOGLE_CLIENT_ID && e.GOOGLE_CLIENT_SECRET);
    const agentmailReady = !!(e.AGENTMAIL_API_KEY && e.AGENTMAIL_INBOX);
    const mailProvider = e.MAIL_PROVIDER ?? (gmailReady ? "gmail" : agentmailReady ? "agentmail" : "fake");
    return {
        ...e,
        llmMode: e.LLM_MODE ?? (e.or_api_key ? "live" : "fixture"),
        mailProvider,
        bankProvider: e.AIRWALLEX_CLIENT_ID && e.AIRWALLEX_API_KEY ? "airwallex" : "fake",
        accountingProvider: e.XERO_CLIENT_ID && e.XERO_CLIENT_SECRET || e.XERO_CLIENT_BEARER_TOKEN ? "xero" : "fake",
        screeningProvider: e.OPENSANCTIONS_API_KEY ? "opensanctions-api" : "opensanctions-local"
    };
}
}),
"[project]/src/lib/crypto.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Crypto",
    ()=>Crypto,
    "mask",
    ()=>mask
]);
// AES-256-GCM for protected information (ID numbers, residential addresses) and
// integration secrets. Keys derive from APP_SECRET; ciphertext is never sent to the UI.
var __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$crypto__$5b$external$5d$__$28$node$3a$crypto$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/node:crypto [external] (node:crypto, cjs)");
;
class Crypto {
    key;
    constructor(secret){
        this.key = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$crypto__$5b$external$5d$__$28$node$3a$crypto$2c$__cjs$29$__["createHash"])("sha256").update("harbourline:" + secret).digest();
    }
    encrypt(plain) {
        const iv = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$crypto__$5b$external$5d$__$28$node$3a$crypto$2c$__cjs$29$__["randomBytes"])(12);
        const c = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$crypto__$5b$external$5d$__$28$node$3a$crypto$2c$__cjs$29$__["createCipheriv"])("aes-256-gcm", this.key, iv);
        const ct = Buffer.concat([
            c.update(plain, "utf8"),
            c.final()
        ]);
        return [
            "v1",
            iv.toString("base64"),
            c.getAuthTag().toString("base64"),
            ct.toString("base64")
        ].join(".");
    }
    decrypt(enc) {
        const [v, iv, tag, ct] = enc.split(".");
        if (v !== "v1") throw new Error("Unknown ciphertext version");
        const d = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$crypto__$5b$external$5d$__$28$node$3a$crypto$2c$__cjs$29$__["createDecipheriv"])("aes-256-gcm", this.key, Buffer.from(iv, "base64"));
        d.setAuthTag(Buffer.from(tag, "base64"));
        return Buffer.concat([
            d.update(Buffer.from(ct, "base64")),
            d.final()
        ]).toString("utf8");
    }
    static sha256(data) {
        return (0, __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$crypto__$5b$external$5d$__$28$node$3a$crypto$2c$__cjs$29$__["createHash"])("sha256").update(data).digest("hex");
    }
    static safeEqualHex(a, b) {
        const x = Buffer.from(a, "hex"), y = Buffer.from(b, "hex");
        return x.length === y.length && (0, __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$crypto__$5b$external$5d$__$28$node$3a$crypto$2c$__cjs$29$__["timingSafeEqual"])(x, y);
    }
}
function mask(value, keep = 4) {
    if (!value) return null;
    return value.length <= keep ? "•".repeat(value.length) : "•".repeat(Math.max(4, value.length - keep)) + value.slice(-keep);
}
}),
"[project]/src/lib/ids.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "SeqIds",
    ()=>SeqIds,
    "randomIds",
    ()=>randomIds
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$nanoid$2f$index$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/nanoid/index.js [app-route] (ecmascript) <locals>");
;
const alpha = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$nanoid$2f$index$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__["customAlphabet"])("0123456789abcdefghijklmnopqrstuvwxyz", 12);
const randomIds = {
    next: (prefix)=>`${prefix}_${alpha()}`,
    token: ()=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$nanoid$2f$index$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__["customAlphabet"])("ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789", 32)()
};
class SeqIds {
    n = 0;
    next(prefix) {
        return `${prefix}_${String(++this.n).padStart(6, "0")}`;
    }
    token() {
        return `tok${String(++this.n).padStart(29, "0")}`;
    }
}
}),
"[project]/src/lib/runtime.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

return __turbopack_context__.a(async (__turbopack_handle_async_dependencies__, __turbopack_async_result__) => { try {
__turbopack_context__.s([
    "STORAGE_ROOT",
    ()=>STORAGE_ROOT,
    "makeRuntimeCtx",
    ()=>makeRuntimeCtx
]);
// Builds a real runtime context (web app, worker, scripts) from the environment.
var __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$path__$5b$external$5d$__$28$node$3a$path$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/node:path [external] (node:path, cjs)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$client$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/db/client.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$config$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/config.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$clock$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/clock.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$ids$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/ids.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$crypto$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/crypto.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$integrations$2f$llm$2f$openrouter$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/integrations/llm/openrouter.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$integrations$2f$llm$2f$scripted$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/integrations/llm/scripted.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$integrations$2f$storage$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/integrations/storage.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$integrations$2f$mail$2f$fake$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/integrations/mail/fake.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$integrations$2f$bank$2f$fake$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/integrations/bank/fake.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$integrations$2f$accounting$2f$fake$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/integrations/accounting/fake.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$integrations$2f$screening$2f$fake$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/integrations/screening/fake.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$integrations$2f$json$2d$store$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/integrations/json-store.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$integrations$2f$bank$2f$airwallex$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/integrations/bank/airwallex.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$integrations$2f$accounting$2f$xero$2d$mcp$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/integrations/accounting/xero-mcp.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$integrations$2f$screening$2f$opensanctions$2d$api$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/integrations/screening/opensanctions-api.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$integrations$2f$screening$2f$opensanctions$2d$local$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/integrations/screening/opensanctions-local.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$integrations$2f$mail$2f$lazy$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/integrations/mail/lazy.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$integrations$2f$mail$2f$gmail$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/integrations/mail/gmail.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$integrations$2f$mail$2f$agentmail$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/integrations/mail/agentmail.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$secrets$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/domain/secrets.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$kv$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/domain/kv.ts [app-route] (ecmascript)");
var __turbopack_async_dependencies__ = __turbopack_handle_async_dependencies__([
    __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$client$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__,
    __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$integrations$2f$accounting$2f$xero$2d$mcp$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__,
    __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$integrations$2f$mail$2f$gmail$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__,
    __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$integrations$2f$mail$2f$agentmail$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__
]);
[__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$client$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$integrations$2f$accounting$2f$xero$2d$mcp$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$integrations$2f$mail$2f$gmail$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$integrations$2f$mail$2f$agentmail$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__] = __turbopack_async_dependencies__.then ? (await __turbopack_async_dependencies__)() : __turbopack_async_dependencies__;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
const g = globalThis;
const STORAGE_ROOT = __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$path__$5b$external$5d$__$28$node$3a$path$2c$__cjs$29$__["default"].join(process.cwd(), "storage");
function makeRuntimeCtx(overrides = {}) {
    const config = {
        ...(0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$config$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["loadConfig"])(),
        ...overrides
    };
    g.__hlAdapters ??= {};
    const cache = g.__hlAdapters;
    const once = (k, f)=>cache[k] ??= f();
    const storage = new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$integrations$2f$storage$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["DiskStorage"](STORAGE_ROOT);
    const llm = config.llmMode === "live" && config.or_api_key ? new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$integrations$2f$llm$2f$openrouter$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["OpenRouterLlm"](config.or_api_key, config.LLM_MODEL, config.APP_URL, config.LLM_REASONING) : new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$integrations$2f$llm$2f$scripted$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["ScriptedLlm"]();
    return {
        db: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$client$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getDb"])(config.DATABASE_URL),
        firmId: config.FIRM_ID,
        config,
        clock: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$clock$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["systemClock"],
        ids: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$ids$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["randomIds"],
        crypto: new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$crypto$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["Crypto"](config.APP_SECRET),
        llm,
        mail: once(`mail:${config.mailProvider}`, ()=>makeMail(config)),
        bank: once(`bank:${config.bankProvider}`, ()=>makeBank(config)),
        accounting: once(`acct:${config.accountingProvider}`, ()=>makeAccounting(config)),
        screening: once(`scr:${config.screeningProvider}`, ()=>makeScreening(config)),
        storage,
        userId: "user_ky"
    };
}
// Real adapters are wired in as their milestones land; until then the fakes persist to disk
// so the web app and worker share state in offline demo mode.
function makeMail(config) {
    if (config.mailProvider === "gmail") {
        return new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$integrations$2f$mail$2f$lazy$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["LazyMail"]("gmail", config.GMAIL_ADDRESS ?? "", async ()=>{
            const ctx = makeRuntimeCtx();
            const token = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$secrets$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getSecret"])(ctx, "gmail.refresh_token", "poll and send mail");
            if (!token) throw new Error("Gmail is not connected yet. Open Settings, Integrations, and connect the mailbox.");
            const auth = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$integrations$2f$mail$2f$gmail$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["gmailOAuthClient"])(config.GOOGLE_CLIENT_ID, config.GOOGLE_CLIENT_SECRET, `${config.APP_URL}/api/integrations/gmail/callback`);
            auth.setCredentials({
                refresh_token: token
            });
            const address = config.GMAIL_ADDRESS ?? await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$kv$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["kvGet"])(ctx, "gmail.address") ?? "";
            return new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$integrations$2f$mail$2f$gmail$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["GmailMail"](address, auth);
        });
    }
    if (config.mailProvider === "agentmail") return new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$integrations$2f$mail$2f$agentmail$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["AgentMailMail"](config.AGENTMAIL_API_KEY, config.AGENTMAIL_INBOX);
    return new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$integrations$2f$mail$2f$fake$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["FakeMail"]("desk@caineroad.example", new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$integrations$2f$json$2d$store$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["FileList"](__TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$path__$5b$external$5d$__$28$node$3a$path$2c$__cjs$29$__["default"].join(STORAGE_ROOT, "fake/inbox.json")), new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$integrations$2f$json$2d$store$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["FileList"](__TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$path__$5b$external$5d$__$28$node$3a$path$2c$__cjs$29$__["default"].join(STORAGE_ROOT, "fake/outbox.json")));
}
function makeBank(config) {
    if (config.bankProvider === "airwallex") return new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$integrations$2f$bank$2f$airwallex$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["AirwallexBank"]({
        clientId: config.AIRWALLEX_CLIENT_ID,
        apiKey: config.AIRWALLEX_API_KEY,
        baseUrl: config.AIRWALLEX_BASE_URL,
        globalAccountId: config.AIRWALLEX_GLOBAL_ACCOUNT_ID
    });
    return new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$integrations$2f$bank$2f$fake$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["FakeBank"](new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$integrations$2f$json$2d$store$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["FileList"](__TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$path__$5b$external$5d$__$28$node$3a$path$2c$__cjs$29$__["default"].join(STORAGE_ROOT, "fake/deposits.json")));
}
function makeAccounting(config) {
    if (config.accountingProvider === "xero") {
        const env = {};
        for (const k of [
            "XERO_CLIENT_ID",
            "XERO_CLIENT_SECRET",
            "XERO_CLIENT_BEARER_TOKEN",
            "XERO_SCOPES"
        ]){
            const v = config[k] ?? process.env[k];
            if (v) env[k] = String(v);
        }
        return new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$integrations$2f$accounting$2f$xero$2d$mcp$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["XeroMcpAccounting"]({
            env,
            salesAccountCode: config.XERO_SALES_ACCOUNT_CODE,
            bankAccountCode: config.XERO_BANK_ACCOUNT_CODE
        });
    }
    return new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$integrations$2f$accounting$2f$fake$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["FakeAccounting"]();
}
function makeScreening(config) {
    if (config.screeningProvider === "opensanctions-api") return new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$integrations$2f$screening$2f$opensanctions$2d$api$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["OpenSanctionsApi"](config.OPENSANCTIONS_API_KEY);
    if (config.screeningProvider === "opensanctions-local") return new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$integrations$2f$screening$2f$opensanctions$2d$local$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["LocalOpenSanctions"](__TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$path__$5b$external$5d$__$28$node$3a$path$2c$__cjs$29$__["default"].join(STORAGE_ROOT, "opensanctions/targets.simple.csv"));
    return new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$integrations$2f$screening$2f$fake$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["FakeScreening"]();
}
__turbopack_async_result__();
} catch(e) { __turbopack_async_result__(e); } }, false);}),
"[project]/src/server/ctx.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

return __turbopack_context__.a(async (__turbopack_handle_async_dependencies__, __turbopack_async_result__) => { try {
// Server-side context for pages, server actions and route handlers. Importing the domain
// entry point registers every step hook, approval handler and job handler.
__turbopack_context__.s([
    "getCtx",
    ()=>getCtx
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$inbound$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/domain/inbound.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$runtime$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/runtime.ts [app-route] (ecmascript)");
var __turbopack_async_dependencies__ = __turbopack_handle_async_dependencies__([
    __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$runtime$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__
]);
[__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$runtime$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__] = __turbopack_async_dependencies__.then ? (await __turbopack_async_dependencies__)() : __turbopack_async_dependencies__;
;
;
;
function getCtx() {
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$runtime$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["makeRuntimeCtx"])();
}
__turbopack_async_result__();
} catch(e) { __turbopack_async_result__(e); } }, false);}),
"[project]/src/server/queries.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "clientNames",
    ()=>clientNames,
    "conversations",
    ()=>conversations,
    "liveVersion",
    ()=>liveVersion,
    "mailItems",
    ()=>mailItems,
    "navCounts",
    ()=>navCounts,
    "pendingProposalRows",
    ()=>pendingProposalRows,
    "taskRows",
    ()=>taskRows,
    "taskTimeline",
    ()=>taskTimeline,
    "threadMessages",
    ()=>threadMessages,
    "todayData",
    ()=>todayData,
    "users",
    ()=>users
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/drizzle-orm/sql/expressions/conditions.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$select$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/drizzle-orm/sql/expressions/select.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$sql$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/drizzle-orm/sql/sql.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/db/schema.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$engine$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/domain/engine.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$deadlines$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/domain/deadlines.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$labels$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/domain/labels.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$kv$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/domain/kv.ts [app-route] (ecmascript)");
;
;
;
;
;
;
;
async function navCounts(ctx) {
    const [p] = await ctx.db.select({
        n: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$sql$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["sql"]`count(*)::int`
    }).from(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["proposal"]).where((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["and"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["proposal"].firmId, ctx.firmId), (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["proposal"].status, "pending")));
    const [t] = await ctx.db.select({
        n: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$sql$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["sql"]`count(*)::int`
    }).from(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["task"]).where((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["and"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["task"].firmId, ctx.firmId), (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["task"].status, "open")));
    const [u] = await ctx.db.select({
        n: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$sql$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["sql"]`count(*)::int`
    }).from(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["bankTransaction"]).where((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["and"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["bankTransaction"].firmId, ctx.firmId), (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["bankTransaction"].status, "unmatched")));
    const [i] = await ctx.db.select({
        n: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$sql$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["sql"]`count(*)::int`
    }).from(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["invoice"]).where((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["and"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["invoice"].firmId, ctx.firmId), (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["inArray"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["invoice"].status, [
        "sent",
        "part_paid"
    ])));
    return {
        pending: p.n,
        openTasks: t.n,
        unmatched: u.n,
        unpaid: i.n
    };
}
async function liveVersion(ctx) {
    const r = await ctx.db.execute(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$sql$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["sql"]`select
    (select coalesce(max(created_at), 'epoch') from proposal where firm_id = ${ctx.firmId})::text as p,
    (select coalesce(max(decided_at), 'epoch') from proposal where firm_id = ${ctx.firmId})::text as d,
    (select coalesce(max(at), 'epoch') from task_event where firm_id = ${ctx.firmId})::text as e,
    (select coalesce(max(at), 'epoch') from message where firm_id = ${ctx.firmId})::text as m,
    (select count(*) from job where firm_id = ${ctx.firmId} and status = 'queued')::text as j`);
    const row = r.rows[0];
    return Object.values(row).join("|");
}
async function clientNames(ctx) {
    const rows = await ctx.db.select({
        id: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["client"].id,
        nameEn: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["client"].nameEn,
        nameTc: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["client"].nameTc,
        lifecycle: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["client"].lifecycle,
        jurisdiction: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["client"].jurisdiction
    }).from(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["client"]).where((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["client"].firmId, ctx.firmId)).orderBy((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$select$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["asc"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["client"].nameEn));
    return rows;
}
async function taskRows(ctx, where = {}) {
    const rows = await ctx.db.select({
        t: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["task"],
        c: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["client"]
    }).from(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["task"]).innerJoin(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["client"], (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["client"].id, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["task"].clientId)).where((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["and"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["task"].firmId, ctx.firmId), where.status && where.status !== "all" ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["task"].status, where.status) : undefined, where.clientId ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["task"].clientId, where.clientId) : undefined, where.assigneeId ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["task"].assigneeId, where.assigneeId) : undefined)).orderBy((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$select$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["desc"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["task"].createdAt)).limit(300);
    const out = [];
    for (const { t, c } of rows){
        const full = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$engine$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getTask"])(ctx, t.id);
        const step = full._steps[full.stepIndex];
        const inv = t.requestId ? await ctx.db.select({
            i: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["invoice"]
        }).from(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["request"]).innerJoin(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["invoice"], (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["invoice"].id, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["request"].invoiceId)).where((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["request"].id, t.requestId)).then((r)=>r[0]?.i ?? null) : null;
        const waitingOn = t.status !== "open" ? null : step?.kind === "pay" ? "payment" : step?.kind === "collect" ? "client" : step?.kind === "sign" ? "signatures" : step?.human ? "you" : "harbourline";
        out.push({
            ...t,
            clientName: c.nameEn,
            clientNameZh: c.nameTc,
            stepLabel: step?.label ?? (t.status === "done" ? "Done" : t.status),
            stepKind: step?.kind ?? null,
            waitingOn,
            outstanding: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$engine$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["outstanding"])(full).map((e)=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$labels$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["itemLabel"])(e.key, "en", t.params)),
            invoice: inv ? {
                number: inv.number,
                status: inv.status,
                total: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$labels$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["money"])(inv.totalCents, inv.currency)
            } : null,
            stepCount: full._steps.length
        });
    }
    return out;
}
async function pendingProposalRows(ctx) {
    const rows = await ctx.db.select({
        p: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["proposal"],
        c: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["client"]
    }).from(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["proposal"]).leftJoin(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["client"], (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["client"].id, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["proposal"].clientId)).where((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["and"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["proposal"].firmId, ctx.firmId), (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["proposal"].status, "pending"))).orderBy((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$select$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["desc"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["proposal"].createdAt));
    return rows.map(({ p, c })=>({
            ...p,
            clientName: c?.nameEn ?? null,
            clientLifecycle: c?.lifecycle ?? null
        }));
}
async function todayData(ctx) {
    const proposals = await pendingProposalRows(ctx);
    const open = await taskRows(ctx, {
        status: "open"
    });
    const deadlines = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$deadlines$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["upcomingDeadlines"])(ctx, {
        withinDays: 30
    });
    const overdue = await ctx.db.select({
        i: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["invoice"],
        c: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["client"]
    }).from(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["invoice"]).innerJoin(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["client"], (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["client"].id, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["invoice"].clientId)).where((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["and"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["invoice"].firmId, ctx.firmId), (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["inArray"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["invoice"].status, [
        "sent",
        "part_paid"
    ]), __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$sql$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["sql"]`${__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["invoice"].dueOn} < ${ctx.clock.today()}`)).orderBy((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$select$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["asc"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["invoice"].dueOn));
    const done = await ctx.db.select({
        t: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["task"],
        c: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["client"]
    }).from(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["task"]).innerJoin(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["client"], (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["client"].id, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["task"].clientId)).where((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["and"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["task"].firmId, ctx.firmId), (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["task"].status, "done"), __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$sql$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["sql"]`${__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["task"].completedAt} > now() - interval '7 days'`)).orderBy((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$select$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["desc"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["task"].completedAt)).limit(8);
    return {
        proposals,
        waitingClient: open.filter((t)=>t.waitingOn === "client" || t.waitingOn === "signatures"),
        awaitingPayment: open.filter((t)=>t.waitingOn === "payment"),
        working: open.filter((t)=>t.waitingOn === "harbourline" || t.waitingOn === "you"),
        deadlines,
        overdue: overdue.map(({ i, c })=>({
                ...i,
                clientName: c.nameEn
            })),
        done: done.map(({ t, c })=>({
                ...t,
                clientName: c.nameEn
            })),
        lastMailPoll: await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$kv$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["kvGet"])(ctx, "mail.lastPollAt"),
        lastBankPoll: await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$kv$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["kvGet"])(ctx, "bank.lastPollAt")
    };
}
async function conversations(ctx) {
    const rows = await ctx.db.select({
        v: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["conversation"],
        c: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["client"]
    }).from(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["conversation"]).leftJoin(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["client"], (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["client"].id, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["conversation"].clientId)).where((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["conversation"].firmId, ctx.firmId)).orderBy((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$select$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["desc"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["conversation"].lastMessageAt), (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$select$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["desc"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["conversation"].createdAt)).limit(200);
    const out = [];
    for (const { v, c } of rows){
        const last = await ctx.db.select().from(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["message"]).where((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["and"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["message"].conversationId, v.id), (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["ne"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["message"].status, "draft"))).orderBy((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$select$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["desc"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["message"].at)).limit(1);
        const drafts = await ctx.db.select({
            n: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$sql$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["sql"]`count(*)::int`
        }).from(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["message"]).where((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["and"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["message"].conversationId, v.id), (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["message"].status, "draft")));
        out.push({
            ...v,
            clientName: c?.nameEn ?? null,
            last: last[0] ?? null,
            drafts: drafts[0].n
        });
    }
    return out.filter((c)=>c.last || c.drafts);
}
async function threadMessages(ctx, conversationId) {
    const msgs = await ctx.db.select().from(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["message"]).where((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["message"].conversationId, conversationId)).orderBy((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$select$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["asc"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["message"].at));
    const atts = msgs.length ? await ctx.db.select({
        a: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["attachment"],
        d: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["document"]
    }).from(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["attachment"]).leftJoin(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["document"], (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["document"].id, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["attachment"].documentId)).where((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["inArray"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["attachment"].messageId, msgs.map((m)=>m.id))) : [];
    return {
        msgs,
        atts: atts.map(({ a, d })=>({
                ...a,
                doc: d
            }))
    };
}
async function taskTimeline(ctx, taskId) {
    const ev = await ctx.db.select().from(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["taskEvent"]).where((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["taskEvent"].taskId, taskId)).orderBy((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$select$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["desc"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["taskEvent"].at), (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$select$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["desc"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["taskEvent"].id));
    const calls = await ctx.db.select({
        agent: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["llmCall"].agent,
        at: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["llmCall"].at,
        latencyMs: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["llmCall"].latencyMs,
        error: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["llmCall"].error
    }).from(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["llmCall"]).where((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["llmCall"].taskId, taskId)).orderBy((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$select$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["desc"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["llmCall"].at));
    return {
        ev,
        calls
    };
}
async function users(ctx) {
    return ctx.db.select().from(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["appUser"]).where((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["appUser"].firmId, ctx.firmId));
}
async function mailItems(ctx) {
    return ctx.db.select({
        m: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["mailItem"],
        c: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["client"]
    }).from(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["mailItem"]).leftJoin(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["client"], (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["client"].id, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["mailItem"].clientId)).where((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["mailItem"].firmId, ctx.firmId)).orderBy((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$select$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["desc"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["mailItem"].createdAt)).limit(100);
}
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__0m610ls._.js.map