module.exports = [
"[project]/.next-internal/server/app/(desk)/review/[id]/page/actions.js { ACTIONS_MODULE0 => \"[project]/src/server/actions.ts [app-rsc] (ecmascript)\" } [app-rsc] (server actions loader, ecmascript)", ((__turbopack_context__) => {
"use strict";

return __turbopack_context__.a(async (__turbopack_handle_async_dependencies__, __turbopack_async_result__) => { try {
__turbopack_context__.s([
    "000a99812823d659fbcc9a0209e51e5d43e8596012",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$server$2f$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["checkMailAction"],
    "008e73902a1a5c2e97f2f7bf1a57cba0a83eee7946",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$server$2f$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["checkBankAction"],
    "008f5b4d65b0c798ba323ee2b7096ae705005c1151",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$server$2f$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["workerTickAction"],
    "009b438c649d505379ad02c5140b975f53b315c773",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$server$2f$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["resetDemoAction"],
    "00c3f345ec0ac9876429c29e8713ef1de41edc09a1",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$server$2f$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["remindersAction"],
    "405dc8dd4e5bf07d6ba04ef30f623ce7d2b95ab616",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$server$2f$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["markPaidAction"],
    "409a8b5f90d637a8405d49d22bcf57ff486466a8d6",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$server$2f$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["requestOtpAction"],
    "40ec7beb149458cde765d6ad043361753c6c5cb3da",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$server$2f$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["rejectAction"],
    "605da2304d6aca9bc8fa87e4591e8a2e55bfed8505",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$server$2f$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["batchAction"],
    "6082cc2e33629bc61ef64accd4a440475cb3484d75",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$server$2f$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["redraftAction"],
    "608f80954b003344c0d8686e4c4b45909207ffecf8",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$server$2f$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["simulatePaymentAction"],
    "60ab55bb9a9ef91a0335cd620f18ee16d3270a0ec1",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$server$2f$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["logMailAction"],
    "60ca62dad103580b48de9d18d0e46b6d32431ba550",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$server$2f$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["simulateEmailAction"],
    "60daaf8caddfdb1522ffc5e0df546aa17a7c41bfcc",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$server$2f$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["pasteRequestAction"],
    "705d6c0f1a6331ab9b5d807a67cfd894addf056baa",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$server$2f$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["verifyOtpAction"],
    "709909dae9dcaff27d395c850d9ece9fe96b9790e7",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$server$2f$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["manualStepAction"],
    "709adf229e2d60e9f21b0b6c168d64fe63712bdef6",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$server$2f$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["lineAmountAction"],
    "70b90ed94ce3d1ddb89bb240b40eeb4736e22c310a",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$server$2f$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["approveAction"],
    "70d165b547f2bd7e3b9b5e71486d200816b2f629dc",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$server$2f$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["signAction"],
    "70e1ff2d607628d328c8395de75323db5c5976cbef",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$server$2f$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["invoiceNumberAction"],
    "7890f260f5368d15e3cc7326c81e1e056c82e28ff4",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$server$2f$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["tickAction"],
    "7c49c6eed677b17d6f6877b5d70845def035092caf",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$server$2f$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["portalFieldAction"],
    "7c755a7b93c13162c0de7e1ad29203800fede0f4a7",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$server$2f$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["portalUploadAction"]
]);
var __TURBOPACK__imported__module__$5b$project$5d2f2e$next$2d$internal$2f$server$2f$app$2f28$desk$292f$review$2f5b$id$5d2f$page$2f$actions$2e$js__$7b$__ACTIONS_MODULE0__$3d3e$__$225b$project$5d2f$src$2f$server$2f$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$2922$__$7d$__$5b$app$2d$rsc$5d$__$28$server__actions__loader$2c$__ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i('[project]/.next-internal/server/app/(desk)/review/[id]/page/actions.js { ACTIONS_MODULE0 => "[project]/src/server/actions.ts [app-rsc] (ecmascript)" } [app-rsc] (server actions loader, ecmascript) <locals>');
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$server$2f$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/server/actions.ts [app-rsc] (ecmascript)");
var __turbopack_async_dependencies__ = __turbopack_handle_async_dependencies__([
    __TURBOPACK__imported__module__$5b$project$5d2f2e$next$2d$internal$2f$server$2f$app$2f28$desk$292f$review$2f5b$id$5d2f$page$2f$actions$2e$js__$7b$__ACTIONS_MODULE0__$3d3e$__$225b$project$5d2f$src$2f$server$2f$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$2922$__$7d$__$5b$app$2d$rsc$5d$__$28$server__actions__loader$2c$__ecmascript$29$__$3c$locals$3e$__,
    __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$server$2f$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__
]);
[__TURBOPACK__imported__module__$5b$project$5d2f2e$next$2d$internal$2f$server$2f$app$2f28$desk$292f$review$2f5b$id$5d2f$page$2f$actions$2e$js__$7b$__ACTIONS_MODULE0__$3d3e$__$225b$project$5d2f$src$2f$server$2f$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$2922$__$7d$__$5b$app$2d$rsc$5d$__$28$server__actions__loader$2c$__ecmascript$29$__$3c$locals$3e$__, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$server$2f$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__] = __turbopack_async_dependencies__.then ? (await __turbopack_async_dependencies__)() : __turbopack_async_dependencies__;
__turbopack_async_result__();
} catch(e) { __turbopack_async_result__(e); } }, false);}),
"[project]/.next-internal/server/app/(desk)/review/[id]/page/actions.js { ACTIONS_MODULE0 => \"[project]/src/server/actions.ts [app-rsc] (ecmascript)\" } [app-rsc] (server actions loader, ecmascript) <locals>", ((__turbopack_context__) => {
"use strict";

return __turbopack_context__.a(async (__turbopack_handle_async_dependencies__, __turbopack_async_result__) => { try {
__turbopack_context__.s([]);
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$server$2f$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/server/actions.ts [app-rsc] (ecmascript)");
var __turbopack_async_dependencies__ = __turbopack_handle_async_dependencies__([
    __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$server$2f$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__
]);
[__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$server$2f$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__] = __turbopack_async_dependencies__.then ? (await __turbopack_async_dependencies__)() : __turbopack_async_dependencies__;
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
__turbopack_async_result__();
} catch(e) { __turbopack_async_result__(e); } }, false);}),
"[project]/src/agent/extract.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

// Extraction agent: reads an uploaded document (image or PDF, sent to the model directly)
// or message text, and returns values for the task's checklist items.
__turbopack_context__.s([
    "extractFromDocument",
    ()=>extractFromDocument
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$agent$2f$call$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/agent/call.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$agent$2f$schemas$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/agent/schemas.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$agent$2f$prompts$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/agent/prompts.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$labels$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/domain/labels.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$playbooks$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/domain/playbooks.ts [app-rsc] (ecmascript)");
;
;
;
;
;
async function extractFromDocument(ctx, o) {
    const lib = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$playbooks$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["requirementLibrary"])();
    const text = [
        `Document uploaded for checklist item "${o.forKey}" (${(0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$labels$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["itemLabel"])(o.forKey)}). Filename: ${o.filename}.`,
        `Extract these checklist keys if present: ${JSON.stringify(o.wantKeys.map((k)=>({
                key: k,
                label: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$labels$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["itemLabel"])(k),
                hint: lib[k]?.extractionHint ?? null
            })))}`,
        `On-file values to compare (report conflicts, don't overwrite): ${JSON.stringify(Object.fromEntries(Object.entries(o.onFile).map(([k, v])=>[
                k,
                v && __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$labels$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["PROTECTED_KEYS"].has(k) ? v : v
            ])))}`,
        `Today's date: ${ctx.clock.today()}.`
    ].join("\n");
    const dataUrl = `data:${o.mime};base64,${o.content.toString("base64")}`;
    const parts = [
        {
            type: "text",
            text
        }
    ];
    if (o.mime.startsWith("image/")) parts.push({
        type: "image_url",
        image_url: {
            url: dataUrl
        }
    });
    else if (o.mime === "application/pdf") parts.push({
        type: "file",
        file: {
            filename: o.filename,
            file_data: dataUrl
        }
    });
    else parts.push({
        type: "text",
        text: `Document text:\n${o.content.toString("utf8").slice(0, 20000)}`
    });
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$agent$2f$call$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["callAgent"])(ctx, {
        agent: "extract",
        system: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$agent$2f$prompts$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["EXTRACT_SYSTEM"],
        user: parts,
        schema: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$agent$2f$schemas$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["ExtractionZ"],
        taskId: o.taskId
    });
}
}),
"[project]/src/channels/mail-poller.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

// Polls the connected mailbox, ingests new mail and runs the intake pipeline on each.
__turbopack_context__.s([
    "pollMail",
    ()=>pollMail
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$inbound$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/domain/inbound.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$kv$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/domain/kv.ts [app-rsc] (ecmascript)");
;
;
async function pollMail(ctx) {
    return await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$kv$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["withLease"])(ctx, "mail", 300, ()=>pollMailUnlocked(ctx)) ?? {
        fetched: 0,
        processed: 0,
        errors: []
    };
}
async function pollMailUnlocked(ctx) {
    const key = `mail.cursor.${ctx.mail.name}`;
    const cursor = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$kv$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["kvGet"])(ctx, key);
    const { messages, cursor: next } = await ctx.mail.fetchNew(cursor);
    let processed = 0;
    const errors = [];
    for (const m of messages){
        if (m.from.email?.toLowerCase() === ctx.mail.address.toLowerCase()) continue;
        const row = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$inbound$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["ingestMessage"])(ctx, {
            ...m,
            channel: "email"
        });
        if (row.duplicate) continue;
        try {
            await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$inbound$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["processInbound"])(ctx, row.id);
        } catch (e) {
            errors.push(`${row.id}: ${e.message}`);
            const { createProposal } = await __turbopack_context__.A("[project]/src/domain/proposals.ts [app-rsc] (ecmascript, async loader)");
            await createProposal(ctx, {
                kind: "triage",
                title: `Couldn't process a message from ${m.from.name ?? m.from.email}`,
                summary: e.message.slice(0, 300),
                payload: {
                    messageId: row.id
                }
            });
        }
        processed++;
    }
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$kv$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["kvSet"])(ctx, key, next);
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$kv$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["kvSet"])(ctx, "mail.lastPollAt", ctx.clock.now().toISOString());
    return {
        fetched: messages.length,
        processed,
        errors
    };
}
}),
"[project]/src/db/seed-demo.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "seedDemo",
    ()=>seedDemo
]);
// Loads the fictional demo data (seed/demo-clients.json) into the target model, plus
// history for the showcase client (Kowloon Bay Trading Limited): KYC on file, documents,
// filings, past invoices, a completed annual return and past correspondence.
var __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$fs__$5b$external$5d$__$28$node$3a$fs$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/node:fs [external] (node:fs, cjs)");
var __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$path__$5b$external$5d$__$28$node$3a$path$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/node:path [external] (node:path, cjs)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$firm$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/domain/firm.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$records$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/domain/records.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$shares$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/domain/shares.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$playbooks$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/domain/playbooks.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/db/schema.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$documents$2f$simple$2d$pdf$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/documents/simple-pdf.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$crypto$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/crypto.ts [app-rsc] (ecmascript)");
;
;
;
;
;
;
;
;
;
const STAFF = {
    u1: "user_ky",
    u2: "user_mc",
    u3: "user_dh"
};
const DOC_LANG = {
    English: "en",
    "Traditional Chinese": "tc",
    "Simplified Chinese": "sc"
};
const OP = {
    Operating: "operating",
    Dormant: "dormant",
    "Not yet incorporated": "not_incorporated"
};
// Fictional protected particulars for seeded people (never real data).
const PARTICULARS = {
    p1: {
        id: "Y123456(7)",
        res: "Flat 23A, Tower 2, Laguna City, Lam Tin, Kowloon",
        email: "chan.taiman@kbtrading.example",
        phone: "+852 9123 0001",
        dob: "1972-05-14"
    },
    p2: {
        id: "Z765432(1)",
        res: "Flat 8C, 12 Broadcast Drive, Kowloon Tong",
        email: "lee.siuling@example.com",
        phone: "+852 9123 0002",
        dob: "1975-11-02"
    },
    p3: {
        id: "R246810(2)",
        res: "House 5, 18 Headland Road, Repulse Bay",
        email: "wingyan@silverstrand.example",
        phone: "+852 9123 0003",
        dob: "1981-03-22"
    },
    p4: {
        id: "D135791(3)",
        res: "Flat 15F, 3 Tsing Yi Road, Tsing Yi",
        email: "kk.lam@tsingyilogistics.example",
        phone: "+852 9123 0004",
        dob: "1966-08-30"
    },
    p5: {
        id: "D975311(4)",
        res: "Flat 15F, 3 Tsing Yi Road, Tsing Yi",
        email: "meiling.lam@tsingyilogistics.example",
        phone: "+852 9123 0005",
        dob: "1969-01-19"
    },
    p6: {
        id: "G112233(5)",
        res: "Flat 2B, 9 Conduit Road, Mid-Levels",
        email: "cw.leung@example.com",
        phone: "+852 9123 0006",
        dob: "1978-12-07"
    }
};
const RISK = {
    Low: "low",
    Medium: "medium",
    High: "high"
};
const REVIEW_YEARS = {
    low: 3,
    medium: 2,
    high: 1
};
async function seedDemo(ctx, opts = {}) {
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$firm$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["ensureFirm"])(ctx);
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$playbooks$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["loadPlaybookLibrary"])(ctx);
    const data = JSON.parse((0, __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$fs__$5b$external$5d$__$28$node$3a$fs$2c$__cjs$29$__["readFileSync"])(__TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$path__$5b$external$5d$__$28$node$3a$path$2c$__cjs$29$__["default"].join(process.cwd(), "seed/demo-clients.json"), "utf8"));
    const firmSecretary = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$records$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createPerson"])(ctx, {
        id: "per_firm",
        kind: "corporate",
        nameEn: "Caine Road Corporate Services Limited",
        nameZh: "堅道企業服務有限公司",
        correspondenceAddress: "18/F, 88 Caine Road, Mid-Levels, Hong Kong",
        email: "desk@caineroad.example"
    });
    const personIds = {};
    for (const [pid, p] of Object.entries(data.people)){
        const part = PARTICULARS[pid];
        const email = pid === "p1" && opts.demoEmail ? opts.demoEmail : part.email;
        const row = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$records$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createPerson"])(ctx, {
            id: `per_${pid}`,
            nameEn: p.name,
            nameZh: p.zh,
            idType: "HKID",
            idNumber: part.id,
            idCountry: "Hong Kong",
            residentialAddress: part.res,
            correspondenceAddress: null,
            email,
            phone: part.phone,
            dateOfBirth: part.dob,
            nationality: "Chinese"
        });
        personIds[p.name] = row.id;
    }
    const corporates = {};
    async function personFor(name) {
        if (personIds[name]) return personIds[name];
        if (!corporates[name]) corporates[name] = (await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$records$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createPerson"])(ctx, {
            kind: "corporate",
            nameEn: name
        })).id;
        return corporates[name];
    }
    for (const c of data.clients){
        const risk = RISK[c.risk] ?? null;
        const cl = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$records$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createClient"])(ctx, {
            id: `cli_${c.id}`,
            code: c.id.toUpperCase(),
            jurisdiction: "HK",
            companyType: c.type,
            nameEn: c.name.en,
            nameTc: c.name.tc,
            nameSc: c.name.sc,
            companyNumber: c.cr || null,
            lifecycle: c.status === "Onboarding" ? "onboarding" : "active",
            operatingStatus: OP[c.op] ?? "operating",
            clientGroup: c.group || null,
            listedSubsidiary: c.listedSub,
            staffId: STAFF[c.staff] ?? "user_ky",
            messageLang: c.lang,
            docLang: DOC_LANG[c.docLang] ?? "en",
            riskRating: risk,
            paymentTermsDays: c.terms ?? 0,
            regOfficeEn: c.office || null,
            regOfficeZh: c.officeZh || null,
            businessNatureEn: c.biz.en,
            businessNatureZh: c.biz.zh,
            incorporatedOn: c.inc || null,
            fyeMonth: c.fye[0],
            fyeDay: c.fye[1],
            accountsLastMadeUpTo: c.accTo || null,
            auditor: c.auditor || null,
            registersKeptAt: c.regsAt ?? "Registered office",
            scrKeptAt: "Registered office",
            designatedRep: c.inc ? "Caine Road Corporate Services Limited (TCSP licensee)" : null,
            jurisdictionData: {
                lastAgm: c.lastAGM || null
            }
        });
        if (c.brNo) await ctx.db.insert(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["businessRegistration"]).values({
            id: ctx.ids.next("br"),
            firmId: ctx.firmId,
            clientId: cl.id,
            brNumber: c.brNo,
            termYears: c.brTerm,
            expiresOn: c.br || null,
            branches: c.branches
        });
        for (const [bank, acct, sig] of c.banks)await ctx.db.insert(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["bankAccount"]).values({
            id: ctx.ids.next("bka"),
            firmId: ctx.firmId,
            clientId: cl.id,
            bank,
            accountMasked: acct,
            signatories: sig
        });
        for (const pid of c.directors)await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$records$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["appoint"])(ctx, {
            clientId: cl.id,
            personId: `per_${pid}`,
            role: "director",
            fromDate: c.appointed[pid] ?? c.inc
        });
        if (c.secSince) await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$records$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["appoint"])(ctx, {
            clientId: cl.id,
            personId: firmSecretary.id,
            role: "secretary",
            fromDate: c.secSince
        });
        // Shares: allot on incorporation, then replay the recorded later movements.
        const classes = {};
        for (const [name, currency, , paid, voting] of c.shares){
            classes[name] = (await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$shares$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createShareClass"])(ctx, {
                clientId: cl.id,
                name,
                currency,
                votingRights: voting === "Yes"
            })).id;
            void paid;
        }
        if (c.id === "c2") {
            await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$shares$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["allot"])(ctx, {
                clientId: cl.id,
                shareClassId: classes.Ordinary,
                date: "2021-11-15",
                toPersonId: await personFor("HO Wing Yan"),
                quantity: 1000000,
                amountPaidCents: 100000000,
                note: "Allotment on incorporation"
            });
            await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$shares$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["transfer"])(ctx, {
                clientId: cl.id,
                shareClassId: classes.Ordinary,
                date: "2023-06-30",
                fromPersonId: await personFor("HO Wing Yan"),
                toPersonId: await personFor("Brightwater Ventures Limited (BVI)"),
                quantity: 200000,
                considerationCents: 20000000,
                stampDutyCents: 40000,
                note: "Stamp duty paid"
            });
            await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$shares$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["allot"])(ctx, {
                clientId: cl.id,
                shareClassId: classes.Preference,
                date: "2024-03-01",
                toPersonId: await personFor("Brightwater Ventures Limited (BVI)"),
                quantity: 200000,
                amountPaidCents: 20000000,
                note: "NSC1 filed"
            });
        } else {
            for (const [name, cls, qty] of c.members){
                const shareRow = c.shares.find((s)=>s[0] === cls);
                const perShare = shareRow[3] / shareRow[2];
                await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$shares$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["allot"])(ctx, {
                    clientId: cl.id,
                    shareClassId: classes[cls],
                    date: c.inc,
                    toPersonId: await personFor(name),
                    quantity: qty,
                    amountPaidCents: Math.round(qty * perShare * 100),
                    note: "Allotment on incorporation"
                });
            }
        }
        for (const [name, nature, since] of c.sc)await ctx.db.insert(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["significantController"]).values({
            id: ctx.ids.next("scr"),
            firmId: ctx.firmId,
            clientId: cl.id,
            personId: await personFor(name),
            nature,
            registrableFrom: since
        });
        for (const [created, chargee, desc] of c.charges)await ctx.db.insert(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["charge"]).values({
            id: ctx.ids.next("chg"),
            firmId: ctx.firmId,
            clientId: cl.id,
            description: desc,
            chargee,
            createdOn: created
        });
        for (const [form, desc, filed] of c.filings){
            const year = filed.slice(0, 4);
            await ctx.db.insert(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["filing"]).values({
                id: ctx.ids.next("fil"),
                firmId: ctx.firmId,
                clientId: cl.id,
                form,
                description: desc,
                filedOn: filed,
                periodKey: form === "NAR1" ? `NAR1:${desc.match(/\d{4}/)?.[0] ?? year}` : null,
                reference: `CR-${form}-${filed.replace(/-/g, "")}`
            });
        }
        for (const ct of c.contacts){
            const emailMatch = ct.ch.match(/[\w.+-]+@[\w.-]+/);
            const pid = personIds[ct.name];
            let email = emailMatch?.[0] ?? (pid ? PARTICULARS[pid.replace("per_", "")]?.email : null) ?? null;
            if (c.id === "c1" && ct.name === "CHAN Tai Man" && opts.demoEmail) email = opts.demoEmail;
            await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$records$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["addContact"])(ctx, {
                clientId: cl.id,
                personId: pid ?? null,
                name: ct.name,
                role: ct.role,
                email,
                channel: ct.ch.startsWith("WeChat") ? "wechat" : "email",
                language: ct.lang,
                isBilling: !!ct.billing,
                isInstructing: /instruction/i.test(ct.role) || /Director/.test(ct.role),
                salutation: ct.sal ?? (ct.name === c.contactName ? c.contact : null)
            });
        }
        // CDD on file for directors and controllers whose KYC is recorded.
        if (c.kyc && risk) {
            for (const pid of c.people){
                const due = new Date(c.kyc + "T00:00:00Z");
                due.setUTCFullYear(due.getUTCFullYear() + REVIEW_YEARS[risk]);
                await ctx.db.insert(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["cddRecord"]).values({
                    id: ctx.ids.next("cdd"),
                    firmId: ctx.firmId,
                    personId: `per_${pid}`,
                    riskRating: risk,
                    verifiedOn: c.kyc,
                    reviewDueOn: due.toISOString().slice(0, 10)
                });
            }
        }
    }
    await seedShowcaseHistory(ctx);
    await seedOtherJurisdictions(ctx);
}
async function seedOtherJurisdictions(ctx) {
    // Mainland China: a WFOE owned by Kowloon Bay Trading (fictional).
    const kbt = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$records$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createPerson"])(ctx, {
        id: "per_kbt",
        kind: "corporate",
        nameEn: "Kowloon Bay Trading Limited",
        nameZh: "九龍灣貿易有限公司"
    });
    const liu = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$records$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createPerson"])(ctx, {
        id: "per_cn_liu",
        nameEn: "LIU Wei",
        nameZh: "刘伟",
        idType: "Home Return Permit",
        idNumber: "H12345678",
        email: "liu.wei@qianhai.example"
    });
    const wang = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$records$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createPerson"])(ctx, {
        id: "per_cn_wang",
        nameEn: "WANG Fang",
        nameZh: "王芳",
        idType: "PRC resident ID",
        idNumber: "440301199001011234",
        email: "wang.fang@qianhai.example"
    });
    const cn = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$records$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createClient"])(ctx, {
        id: "cli_cn1",
        code: "CN1",
        jurisdiction: "CN",
        companyType: "Wholly foreign-owned enterprise (limited liability company)",
        nameEn: "Shenzhen Qianhai Harbour Trading Co., Ltd.",
        nameTc: "深圳前海港灣貿易有限公司",
        nameSc: "深圳前海港湾贸易有限公司",
        companyNumber: "91440300MA5G123X4K",
        lifecycle: "active",
        staffId: "user_ky",
        messageLang: "tc",
        docLang: "sc",
        riskRating: "medium",
        paymentTermsDays: 30,
        regOfficeEn: "Room 301, Building B7, Qianhai Fund Town, 128 Guiwan 5th Road, Nanshan, Shenzhen",
        regOfficeZh: "深圳市前海深港合作区南山街道桂湾五路128号前海深港基金小镇B7栋301",
        businessNatureEn: "Import and export of household goods",
        businessNatureZh: "家居用品进出口",
        incorporatedOn: "2021-06-18",
        fyeMonth: 12,
        fyeDay: 31,
        jurisdictionData: {
            uscc: "91440300MA5G123X4K",
            registeredCapital: {
                currency: "RMB",
                amountCents: 100000000
            },
            businessScope: "一般经营项目：家居用品的批发、进出口",
            subscriptions: [
                {
                    holder: "Kowloon Bay Trading Limited",
                    amountCents: 40000000,
                    paidCents: 40000000,
                    deadline: "2023-06-30"
                },
                {
                    holder: "Kowloon Bay Trading Limited",
                    amountCents: 30000000,
                    paidCents: 0,
                    deadline: "2028-12-31"
                },
                {
                    holder: "Kowloon Bay Trading Limited",
                    amountCents: 30000000,
                    paidCents: 0,
                    deadline: "2035-06-30"
                }
            ]
        }
    });
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$records$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["appoint"])(ctx, {
        clientId: cn.id,
        personId: liu.id,
        role: "director",
        fromDate: "2021-06-18",
        extra: {
            title: "Executive director 执行董事"
        }
    });
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$records$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["appoint"])(ctx, {
        clientId: cn.id,
        personId: liu.id,
        role: "legal_representative",
        fromDate: "2021-06-18"
    });
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$records$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["appoint"])(ctx, {
        clientId: cn.id,
        personId: "per_p2",
        role: "manager",
        fromDate: "2021-06-18",
        extra: {
            title: "General manager 总经理"
        }
    });
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$records$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["appoint"])(ctx, {
        clientId: cn.id,
        personId: wang.id,
        role: "supervisor",
        fromDate: "2021-06-18"
    });
    const cnCap = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$shares$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createShareClass"])(ctx, {
        clientId: cn.id,
        name: "Registered capital",
        nameZh: "注册资本",
        currency: "RMB",
        unit: "capital"
    });
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$shares$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["allot"])(ctx, {
        clientId: cn.id,
        shareClassId: cnCap.id,
        date: "2021-06-18",
        toPersonId: kbt.id,
        quantity: 1000000,
        amountPaidCents: 40000000,
        note: "Subscribed RMB 1,000,000; RMB 400,000 paid"
    });
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$records$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["addContact"])(ctx, {
        clientId: cn.id,
        personId: liu.id,
        name: "LIU Wei",
        role: "Legal representative, gives instructions",
        email: liu.email,
        channel: "email",
        language: "sc",
        isInstructing: true,
        isBilling: true
    });
    // Macau: sociedade por quotas (fictional).
    const maria = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$records$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createPerson"])(ctx, {
        id: "per_mo_b",
        nameEn: "Maria Ferreira",
        nameZh: "費麗雅",
        idType: "Macau BIR",
        idNumber: "1234567(8)",
        email: "maria.ferreira@baiavista.example"
    });
    const mo = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$records$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createClient"])(ctx, {
        id: "cli_mo1",
        code: "MO1",
        jurisdiction: "MO",
        companyType: "Sociedade por quotas (limited company)",
        nameEn: "Baia Vista Comercio, Limitada",
        nameTc: "灣景貿易有限公司",
        nameSc: "湾景贸易有限公司",
        companyNumber: "SO 81234",
        lifecycle: "active",
        staffId: "user_mc",
        messageLang: "en",
        docLang: "bilingual",
        riskRating: "low",
        paymentTermsDays: 0,
        regOfficeEn: "Avenida da Praia Grande, No. 409, 12 andar, Macau",
        businessNatureEn: "Trading",
        incorporatedOn: "2020-03-15",
        fyeMonth: 12,
        fyeDay: 31,
        jurisdictionData: {
            registeredCapital: {
                currency: "MOP",
                amountCents: 2500000
            }
        }
    });
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$records$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["appoint"])(ctx, {
        clientId: mo.id,
        personId: maria.id,
        role: "administrator",
        fromDate: "2020-03-15"
    });
    const quota = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$shares$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createShareClass"])(ctx, {
        clientId: mo.id,
        name: "Quota",
        nameZh: "股",
        currency: "MOP",
        unit: "quota"
    });
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$shares$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["allot"])(ctx, {
        clientId: mo.id,
        shareClassId: quota.id,
        date: "2020-03-15",
        toPersonId: "per_p2",
        quantity: 12500,
        amountPaidCents: 1250000
    });
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$shares$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["allot"])(ctx, {
        clientId: mo.id,
        shareClassId: quota.id,
        date: "2020-03-15",
        toPersonId: maria.id,
        quantity: 12500,
        amountPaidCents: 1250000
    });
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$records$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["addContact"])(ctx, {
        clientId: mo.id,
        personId: maria.id,
        name: "Maria Ferreira",
        role: "Administrator, gives instructions",
        email: maria.email,
        channel: "email",
        language: "en",
        isInstructing: true,
        isBilling: true
    });
    // Taiwan: limited company (fictional).
    const lin = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$records$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createPerson"])(ctx, {
        id: "per_tw_lin",
        nameEn: "LIN Chih-Hao",
        nameZh: "林志豪",
        idType: "ROC ID",
        idNumber: "A123456789",
        email: "chihhao.lin@taipeiharbour.example"
    });
    const tw = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$records$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createClient"])(ctx, {
        id: "cli_tw1",
        code: "TW1",
        jurisdiction: "TW",
        companyType: "有限公司 (limited company)",
        nameEn: "Taipei Harbour Technology Co., Ltd.",
        nameTc: "台北港灣科技有限公司",
        nameSc: "台北港湾科技有限公司",
        companyNumber: "83475612",
        lifecycle: "active",
        staffId: "user_ky",
        messageLang: "tc",
        docLang: "tc",
        riskRating: "low",
        paymentTermsDays: 30,
        regOfficeEn: "7F, No. 100, Section 5, Xinyi Road, Xinyi District, Taipei",
        regOfficeZh: "台北市信義區信義路五段100號7樓",
        businessNatureEn: "Software development",
        incorporatedOn: "2019-08-01",
        fyeMonth: 12,
        fyeDay: 31,
        jurisdictionData: {
            ubn: "83475612",
            capital: {
                currency: "TWD",
                amountCents: 500000000
            }
        }
    });
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$records$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["appoint"])(ctx, {
        clientId: tw.id,
        personId: lin.id,
        role: "director",
        fromDate: "2019-08-01"
    });
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$records$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["appoint"])(ctx, {
        clientId: tw.id,
        personId: lin.id,
        role: "responsible_person",
        fromDate: "2019-08-01"
    });
    const twCap = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$shares$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createShareClass"])(ctx, {
        clientId: tw.id,
        name: "Capital contribution",
        nameZh: "出資額",
        currency: "TWD",
        unit: "capital"
    });
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$shares$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["allot"])(ctx, {
        clientId: tw.id,
        shareClassId: twCap.id,
        date: "2019-08-01",
        toPersonId: lin.id,
        quantity: 5000000,
        amountPaidCents: 500000000
    });
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$records$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["addContact"])(ctx, {
        clientId: tw.id,
        personId: lin.id,
        name: "LIN Chih-Hao",
        role: "Responsible person, gives instructions",
        email: lin.email,
        channel: "email",
        language: "tc",
        isInstructing: true,
        isBilling: true
    });
    await ctx.db.insert(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["filing"]).values([
        {
            id: ctx.ids.next("fil"),
            firmId: ctx.firmId,
            clientId: cn.id,
            form: "Annual report",
            description: "Annual report for 2025",
            filedOn: "2026-04-18",
            periodKey: "CNAR:2025",
            reference: "GSXT-2025-0418"
        },
        {
            id: ctx.ids.next("fil"),
            firmId: ctx.firmId,
            clientId: tw.id,
            form: "Article 22-1",
            description: "Article 22-1 annual declaration 2026",
            filedOn: "2026-03-12",
            periodKey: "TW221:2026",
            reference: "TDCC-2026-0312"
        }
    ]);
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$records$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["updateClient"])(ctx, mo.id, {
        jurisdictionData: {
            ...mo.jurisdictionData,
            lastAgm: "2026-03-20"
        }
    }, "Seed");
    for (const pid of [
        "per_cn_liu",
        "per_cn_wang",
        "per_mo_b",
        "per_tw_lin"
    ])await ctx.db.insert(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["cddRecord"]).values({
        id: ctx.ids.next("cdd"),
        firmId: ctx.firmId,
        personId: pid,
        riskRating: "low",
        verifiedOn: "2025-06-01",
        reviewDueOn: "2028-06-01"
    });
}
async function storeDoc(ctx, d) {
    const pdf = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$documents$2f$simple$2d$pdf$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["simplePdf"])(d.title, d.lines);
    const id = ctx.ids.next("doc");
    const key = `documents/${id}.pdf`;
    await ctx.storage.put(key, pdf);
    await ctx.db.insert(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["document"]).values({
        id,
        firmId: ctx.firmId,
        clientId: d.clientId ?? null,
        personId: d.personId ?? null,
        taskId: d.taskId ?? null,
        kind: d.kind,
        title: d.title,
        storageKey: key,
        mime: "application/pdf",
        sha256: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$crypto$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["Crypto"].sha256(pdf),
        source: d.source ?? "seed",
        requirementKey: d.requirementKey ?? null,
        createdAt: new Date(d.createdAt + "T09:00:00+08:00")
    });
    return id;
}
async function seedShowcaseHistory(ctx) {
    const cid = "cli_c1";
    await storeDoc(ctx, {
        clientId: cid,
        kind: "certificate",
        title: "Certificate of Incorporation",
        lines: [
            "Kowloon Bay Trading Limited",
            "Company number 2811043",
            "Incorporated 28 October 2019",
            "(Fictional demo document)"
        ],
        createdAt: "2019-10-28"
    });
    await storeDoc(ctx, {
        clientId: cid,
        kind: "articles",
        title: "Articles of Association",
        lines: [
            "Kowloon Bay Trading Limited",
            "Adopted 28 October 2019",
            "(Fictional demo document)"
        ],
        createdAt: "2019-10-28"
    });
    await storeDoc(ctx, {
        clientId: cid,
        kind: "certificate",
        title: "Business Registration Certificate 2025-26",
        lines: [
            "BR number 70123456",
            "Valid until 27 October 2026",
            "(Fictional demo document)"
        ],
        createdAt: "2025-10-20"
    });
    await storeDoc(ctx, {
        personId: "per_p1",
        kind: "id_copy",
        title: "HKID copy: CHAN Tai Man",
        lines: [
            "Identity document copy on file",
            "(Fictional demo document)"
        ],
        createdAt: "2024-11-02",
        requirementKey: "idCopy"
    });
    await storeDoc(ctx, {
        personId: "per_p1",
        kind: "address_proof",
        title: "Address proof: CHAN Tai Man (utility bill)",
        lines: [
            "CLP bill, October 2024",
            "(Fictional demo document)"
        ],
        createdAt: "2024-11-02",
        requirementKey: "addrProof"
    });
    await storeDoc(ctx, {
        personId: "per_p2",
        kind: "id_copy",
        title: "HKID copy: LEE Siu Ling",
        lines: [
            "Identity document copy on file",
            "(Fictional demo document)"
        ],
        createdAt: "2024-11-02",
        requirementKey: "idCopy"
    });
    // Completed annual return task for 2025, with its invoice paid.
    const taskId = "tsk_seed_ar2025";
    await ctx.db.insert(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["task"]).values({
        id: taskId,
        firmId: ctx.firmId,
        clientId: cid,
        playbookId: "hk.annualReturn",
        playbookVersion: 2,
        title: "Annual return 2025",
        assigneeId: "user_ky",
        status: "done",
        stepIndex: 8,
        checklist: [
            {
                key: "changesSince",
                status: "received",
                value: "No changes since the last return"
            }
        ],
        periodKey: "NAR1:2025",
        dueDate: "2025-12-09",
        createdAt: new Date("2025-10-28T10:00:00+08:00"),
        completedAt: new Date("2025-12-05T16:00:00+08:00")
    });
    await ctx.db.insert(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["taskEvent"]).values([
        {
            id: ctx.ids.next("evt"),
            firmId: ctx.firmId,
            taskId,
            kind: "task.created",
            summary: "Opened from the deadline calendar",
            actor: "system",
            at: new Date("2025-10-28T10:00:00+08:00")
        },
        {
            id: ctx.ids.next("evt"),
            firmId: ctx.firmId,
            taskId,
            kind: "filing.recorded",
            summary: "NAR1 filed, reference CR-NAR1-20251205",
            actor: "user_ky",
            at: new Date("2025-12-05T15:30:00+08:00")
        },
        {
            id: ctx.ids.next("evt"),
            firmId: ctx.firmId,
            taskId,
            kind: "task.done",
            summary: "Task completed",
            actor: "system",
            at: new Date("2025-12-05T16:00:00+08:00")
        }
    ]);
    await storeDoc(ctx, {
        clientId: cid,
        taskId,
        kind: "form",
        title: "Form NAR1 (2025), filed",
        lines: [
            "Annual return made up to 28 October 2025",
            "Filed 5 December 2025",
            "(Fictional demo document)"
        ],
        createdAt: "2025-12-05",
        source: "generated"
    });
    const invId = "inv_seed_2025_0042";
    await ctx.db.insert(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["invoice"]).values({
        id: invId,
        firmId: ctx.firmId,
        clientId: cid,
        number: "CRCS-2025-0042",
        status: "paid",
        issuedOn: "2025-10-28",
        dueOn: "2025-11-27",
        termsDays: 30,
        totalCents: 130500,
        paidCents: 130500,
        xeroStatus: "not_synced",
        createdAt: new Date("2025-10-28T10:05:00+08:00")
    });
    await ctx.db.insert(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["invoiceLine"]).values([
        {
            id: ctx.ids.next("inl"),
            firmId: ctx.firmId,
            invoiceId: invId,
            taskId,
            description: "Annual return 2025",
            amountCents: 120000,
            kind: "fee",
            sort: 0
        },
        {
            id: ctx.ids.next("inl"),
            firmId: ctx.firmId,
            invoiceId: invId,
            taskId,
            description: "Annual registration fee (Companies Registry)",
            amountCents: 10500,
            kind: "disbursement",
            sort: 1
        }
    ]);
    await ctx.db.insert(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["payment"]).values({
        id: ctx.ids.next("pay"),
        firmId: ctx.firmId,
        invoiceId: invId,
        amountCents: 130500,
        receivedOn: "2025-11-18",
        method: "bank_auto"
    });
    const inv2 = "inv_seed_2025_0063";
    await ctx.db.insert(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["invoice"]).values({
        id: inv2,
        firmId: ctx.firmId,
        clientId: cid,
        number: "CRCS-2025-0063",
        status: "paid",
        issuedOn: "2025-11-20",
        dueOn: "2025-12-20",
        termsDays: 30,
        totalCents: 250000,
        paidCents: 250000,
        createdAt: new Date("2025-11-20T10:05:00+08:00")
    });
    await ctx.db.insert(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["invoiceLine"]).values({
        id: ctx.ids.next("inl"),
        firmId: ctx.firmId,
        invoiceId: inv2,
        description: "AGM and accounts approval 2025",
        amountCents: 250000,
        kind: "fee",
        sort: 0
    });
    await ctx.db.insert(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["payment"]).values({
        id: ctx.ids.next("pay"),
        firmId: ctx.firmId,
        invoiceId: inv2,
        amountCents: 250000,
        receivedOn: "2025-12-10",
        method: "bank_auto"
    });
    // Past correspondence.
    const conv = "cnv_seed_c1";
    await ctx.db.insert(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["conversation"]).values({
        id: conv,
        firmId: ctx.firmId,
        clientId: cid,
        channel: "email",
        subject: "Annual return 2025",
        counterpartyEmail: "chan.taiman@kbtrading.example",
        lastMessageAt: new Date("2025-11-03T09:12:00+08:00")
    });
    await ctx.db.insert(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["message"]).values([
        {
            id: ctx.ids.next("msg"),
            firmId: ctx.firmId,
            conversationId: conv,
            direction: "out",
            status: "sent",
            fromAddr: "desk@caineroad.example",
            toAddrs: [
                "chan.taiman@kbtrading.example"
            ],
            subject: "Annual return 2025",
            language: "tc",
            text: "陳生：\n\n九龍灣貿易有限公司的周年申報表將於2025年12月9日到期。請確認自上次申報後股東、董事或地址是否有任何變更。\n\n葉嘉欣",
            at: new Date("2025-10-28T10:06:00+08:00")
        },
        {
            id: ctx.ids.next("msg"),
            firmId: ctx.firmId,
            conversationId: conv,
            direction: "in",
            status: "received",
            fromAddr: "chan.taiman@kbtrading.example",
            fromName: "CHAN Tai Man",
            toAddrs: [
                "desk@caineroad.example"
            ],
            subject: "Re: Annual return 2025",
            language: "tc",
            text: "Karen，冇變更，照舊就得。已經過咗數。",
            at: new Date("2025-11-03T09:12:00+08:00"),
            processedAt: new Date("2025-11-03T09:13:00+08:00")
        }
    ]);
}
}),
"[project]/src/documents/simple-pdf.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "simplePdf",
    ()=>simplePdf
]);
// Minimal PDF for placeholder documents (seed data, demo uploads).
var __TURBOPACK__imported__module__$5b$externals$5d2f$pdf$2d$lib__$5b$external$5d$__$28$pdf$2d$lib$2c$__cjs$2c$__$5b$project$5d2f$node_modules$2f$pdf$2d$lib$29$__ = __turbopack_context__.i("[externals]/pdf-lib [external] (pdf-lib, cjs, [project]/node_modules/pdf-lib)");
;
async function simplePdf(title, lines) {
    const doc = await __TURBOPACK__imported__module__$5b$externals$5d2f$pdf$2d$lib__$5b$external$5d$__$28$pdf$2d$lib$2c$__cjs$2c$__$5b$project$5d2f$node_modules$2f$pdf$2d$lib$29$__["PDFDocument"].create();
    const page = doc.addPage([
        595,
        842
    ]);
    const font = await doc.embedFont(__TURBOPACK__imported__module__$5b$externals$5d2f$pdf$2d$lib__$5b$external$5d$__$28$pdf$2d$lib$2c$__cjs$2c$__$5b$project$5d2f$node_modules$2f$pdf$2d$lib$29$__["StandardFonts"].Helvetica);
    const bold = await doc.embedFont(__TURBOPACK__imported__module__$5b$externals$5d2f$pdf$2d$lib__$5b$external$5d$__$28$pdf$2d$lib$2c$__cjs$2c$__$5b$project$5d2f$node_modules$2f$pdf$2d$lib$29$__["StandardFonts"].HelveticaBold);
    page.drawText(title, {
        x: 56,
        y: 780,
        size: 16,
        font: bold,
        color: (0, __TURBOPACK__imported__module__$5b$externals$5d2f$pdf$2d$lib__$5b$external$5d$__$28$pdf$2d$lib$2c$__cjs$2c$__$5b$project$5d2f$node_modules$2f$pdf$2d$lib$29$__["rgb"])(0.09, 0.09, 0.11)
    });
    let y = 750;
    for (const l of lines){
        page.drawText(l.replace(/[^\x20-\x7E]/g, "?"), {
            x: 56,
            y,
            size: 11,
            font
        });
        y -= 18;
    }
    return Buffer.from(await doc.save());
}
}),
"[project]/src/domain/batch.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "batchStart",
    ()=>batchStart
]);
// Batch operations (CSA's "Mass Production"): start the same playbook for many clients in
// one action, each with its own request, invoice and drafted message queued for approval.
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/drizzle-orm/sql/expressions/conditions.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/db/schema.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$engine$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/domain/engine.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$playbooks$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/domain/playbooks.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$invoices$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/domain/invoices.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$inbound$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/domain/inbound.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$proposals$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/domain/proposals.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$labels$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/domain/labels.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$dates$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/domain/dates.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$deadlines$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/domain/deadlines.ts [app-rsc] (ecmascript)");
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
async function batchStart(ctx, o) {
    const pb = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$playbooks$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["getPlaybook"])(ctx, o.playbookId);
    const keyFor = (clientId, dls)=>{
        const d = dls.find((x)=>x.clientId === clientId && x.playbookId === o.playbookId && (!o.periodYear || x.periodYear === o.periodYear));
        return d ?? null;
    };
    const deadlines = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$deadlines$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["upcomingDeadlines"])(ctx, {
        withinDays: 400,
        includeCovered: true
    });
    const skipped = [];
    let created = 0;
    for (const clientId of o.clientIds){
        const cl = await ctx.db.query.client.findFirst({
            where: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["client"].id, clientId)
        });
        if (!cl) {
            skipped.push({
                clientId,
                reason: "Client not found"
            });
            continue;
        }
        const d = keyFor(clientId, deadlines);
        const periodKey = d?.periodKey ?? (pb.periodKey && o.periodYear ? pb.periodKey.replace("{year}", String(o.periodYear)) : null);
        if (periodKey) {
            const open = await ctx.db.select().from(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["task"]).where((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["and"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["task"].clientId, clientId), (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["task"].periodKey, periodKey)));
            if (open.some((t)=>t.status !== "cancelled")) {
                skipped.push({
                    clientId,
                    reason: `Already has a task for ${periodKey}`
                });
                continue;
            }
        }
        const req = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$engine$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createRequest"])(ctx, {
            clientId,
            summary: `${pb.name.en} (batch)`
        });
        const t = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$engine$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["startTask"])(ctx, {
            requestId: req.id,
            clientId,
            playbookId: pb.id,
            periodKey,
            periodYear: d?.periodYear ?? o.periodYear,
            title: d?.label ?? pb.name.en
        });
        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$invoices$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createInvoiceForRequest"])(ctx, req.id);
        const tt = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$engine$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["getTask"])(ctx, t.id);
        const lang = cl.messageLang;
        const instructing = await ctx.db.query.contact.findFirst({
            where: (c, { eq, and })=>and(eq(c.clientId, clientId), eq(c.isInstructing, true))
        });
        const [conv] = await ctx.db.insert(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["conversation"]).values({
            id: ctx.ids.next("cnv"),
            firmId: ctx.firmId,
            clientId,
            channel: "email",
            subject: `${cl.nameEn}: ${pb.name.en}`,
            counterpartyEmail: instructing?.email ?? null,
            createdAt: ctx.clock.now()
        }).returning();
        const facts = {
            language: lang,
            recipientName: "",
            clientName: "",
            signOff: "",
            updates: [],
            changes: [],
            cancellations: [],
            questions: [],
            clarifications: [],
            invoice: null,
            uploadUrl: null,
            newRequests: [
                {
                    title: pb.name[lang] ?? pb.name.en,
                    needed: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$engine$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["outstanding"])(tt).map((e)=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$labels$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["itemLabel"])(e.key, lang, tt.params)),
                    onFile: tt.checklist.filter((e)=>e.status === "on_file").map((e)=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$labels$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["itemLabel"])(e.key, lang)),
                    alreadyReceived: [],
                    deadline: tt.dueDate ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$dates$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["fmtDate"])(tt.dueDate, lang) : null
                }
            ],
            extraNotes: [
                "This is a firm-initiated reminder for recurring statutory work, not a reply to the client."
            ]
        };
        const draft = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$inbound$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["composeReply"])(ctx, {
            clientId,
            conversationId: conv.id,
            inReplyTo: null,
            facts,
            requestId: req.id,
            purpose: "Firm-initiated request: the statutory deadline is coming up; ask for what we need and send the invoice."
        });
        const p = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$proposals$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createProposal"])(ctx, {
            kind: "send_message",
            title: `Send ${pb.name.en} request to ${cl.nameEn}`,
            clientId,
            requestId: req.id,
            payload: {
                messageId: draft.id,
                requestId: req.id,
                taskIds: [
                    t.id
                ],
                draftSource: draft.source,
                purpose: "request",
                batch: true
            }
        });
        void p;
        created++;
    }
    return {
        created,
        skipped
    };
}
}),
"[project]/src/domain/demo.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "resetDemoData",
    ()=>resetDemoData
]);
// Resets the demo database to the seed state (single-user demo build only).
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$sql$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/drizzle-orm/sql/sql.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$fs__$5b$external$5d$__$28$node$3a$fs$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/node:fs [external] (node:fs, cjs)");
var __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$path__$5b$external$5d$__$28$node$3a$path$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/node:path [external] (node:path, cjs)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/db/schema.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$seed$2d$demo$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/db/seed-demo.ts [app-rsc] (ecmascript)");
;
;
;
;
;
async function resetDemoData(ctx) {
    const tables = Object.values(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__).filter((t)=>typeof t === "object" && t !== null && Symbol.for("drizzle:Name") in t).map((t)=>`"${t[Symbol.for("drizzle:Name")]}"`);
    await ctx.db.execute(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$sql$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["sql"].raw(`TRUNCATE ${tables.join(", ")} RESTART IDENTITY CASCADE`));
    const { STORAGE_ROOT } = await __turbopack_context__.A("[project]/src/lib/runtime.ts [app-rsc] (ecmascript, async loader)");
    for (const f of [
        "inbox.json",
        "outbox.json",
        "deposits.json"
    ])(0, __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$fs__$5b$external$5d$__$28$node$3a$fs$2c$__cjs$29$__["rmSync"])(__TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$path__$5b$external$5d$__$28$node$3a$path$2c$__cjs$29$__["default"].join(STORAGE_ROOT, "fake", f), {
        force: true
    });
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$seed$2d$demo$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["seedDemo"])(ctx, {
        demoEmail: ctx.config.DEMO_EXISTING_CLIENT_EMAIL ?? null
    });
}
}),
"[project]/src/domain/mail-items.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "logMailItem",
    ()=>logMailItem
]);
// Registered office mail: a scanned letter is read by the model, matched to a client,
// logged, and the client notification is drafted for approval in the client's language.
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/drizzle-orm/sql/expressions/conditions.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/db/schema.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$crypto$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/crypto.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$agent$2f$call$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/agent/call.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$agent$2f$schemas$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/agent/schemas.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$agent$2f$prompts$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/agent/prompts.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$inbound$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/domain/inbound.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$proposals$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/domain/proposals.ts [app-rsc] (ecmascript)");
;
;
;
;
;
;
;
;
async function logMailItem(ctx, o) {
    const clients = await ctx.db.select({
        id: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["client"].id,
        nameEn: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["client"].nameEn,
        nameTc: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["client"].nameTc,
        number: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["client"].companyNumber
    }).from(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["client"]).where((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["client"].firmId, ctx.firmId));
    const dataUrl = `data:${o.mime};base64,${o.content.toString("base64")}`;
    const parts = [
        {
            type: "text",
            text: `Clients at our registered-office address: ${JSON.stringify(clients)}\nToday: ${ctx.clock.today()}`
        }
    ];
    if (o.mime.startsWith("image/")) parts.push({
        type: "image_url",
        image_url: {
            url: dataUrl
        }
    });
    else parts.push({
        type: "file",
        file: {
            filename: o.filename,
            file_data: dataUrl
        }
    });
    const r = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$agent$2f$call$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["callAgent"])(ctx, {
        agent: "mail",
        system: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$agent$2f$prompts$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["MAIL_SYSTEM"],
        user: parts,
        schema: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$agent$2f$schemas$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["MailItemZ"]
    });
    const clientId = r.clientId && clients.some((c)=>c.id === r.clientId) ? r.clientId : null;
    const docId = ctx.ids.next("doc");
    const key = `mail/${docId}-${o.filename.replace(/[^\w.\-]/g, "_")}`;
    await ctx.storage.put(key, o.content);
    await ctx.db.insert(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["document"]).values({
        id: docId,
        firmId: ctx.firmId,
        clientId,
        kind: "mail_item",
        title: `Letter from ${r.sender}`,
        storageKey: key,
        mime: o.mime,
        sha256: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$crypto$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["Crypto"].sha256(o.content),
        source: "scan",
        extractedText: r.summaryEn,
        createdAt: ctx.clock.now()
    });
    const [row] = await ctx.db.insert(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["mailItem"]).values({
        id: ctx.ids.next("mai"),
        firmId: ctx.firmId,
        clientId,
        documentId: docId,
        receivedOn: o.receivedOn,
        sender: r.sender,
        summary: r.summaryEn,
        urgency: r.urgency,
        createdAt: ctx.clock.now()
    }).returning();
    if (!clientId) {
        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$proposals$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createProposal"])(ctx, {
            kind: "triage",
            title: `Whose letter is this? (${r.addressee})`,
            summary: r.summaryEn,
            payload: {
                mailItemId: row.id
            }
        });
        return row;
    }
    const cl = await ctx.db.query.client.findFirst({
        where: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["client"].id, clientId)
    });
    const instructing = await ctx.db.query.contact.findFirst({
        where: (c, { eq, and })=>and(eq(c.clientId, clientId), eq(c.isInstructing, true))
    });
    const [conv] = await ctx.db.insert(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["conversation"]).values({
        id: ctx.ids.next("cnv"),
        firmId: ctx.firmId,
        clientId,
        channel: "email",
        subject: `Mail received: ${r.sender}`,
        counterpartyEmail: instructing?.email ?? null,
        createdAt: ctx.clock.now()
    }).returning();
    const lang = instructing?.language ?? cl.messageLang;
    const facts = {
        language: lang,
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
        uploadUrl: null,
        extraNotes: [
            `We received a letter for the company at the registered office on ${o.receivedOn} from ${r.sender}: ${r.summaryEn}.`,
            r.actionNeeded ? `Action the client may need to take: ${r.actionNeeded}` : "",
            "A scanned copy is attached; ask whether they want the original forwarded or held."
        ].filter(Boolean)
    };
    const draft = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$inbound$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["composeReply"])(ctx, {
        clientId,
        conversationId: conv.id,
        inReplyTo: null,
        facts,
        requestId: null,
        purpose: "Notify the client that mail arrived at the registered office"
    });
    const p = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$proposals$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createProposal"])(ctx, {
        kind: "send_message",
        title: `${r.urgency === "urgent" ? "Urgent: " : ""}Tell ${cl.nameEn} about a letter from ${r.sender}`,
        clientId,
        payload: {
            messageId: draft.id,
            requestId: null,
            taskIds: [],
            draftSource: draft.source,
            purpose: "mail",
            attachDocumentIds: [
                docId
            ]
        }
    });
    await ctx.db.update(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["mailItem"]).set({
        proposalId: p.id
    }).where((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["mailItem"].id, row.id));
    return row;
}
}),
"[project]/src/domain/portal.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "PortalError",
    ()=>PortalError,
    "portalSubmitField",
    ()=>portalSubmitField,
    "portalUpload",
    ()=>portalUpload,
    "portalView",
    ()=>portalView
]);
// The client's secure upload link (/u/<token>): shows what is still needed per task in the
// client's language, accepts files and typed details, and ticks the checklist.
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/drizzle-orm/sql/expressions/conditions.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$names$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/domain/names.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/db/schema.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$crypto$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/crypto.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$engine$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/domain/engine.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$playbooks$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/domain/playbooks.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$labels$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/domain/labels.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$records$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/domain/records.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$proposals$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/domain/proposals.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$agent$2f$extract$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/agent/extract.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$agent$2f$call$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/agent/call.ts [app-rsc] (ecmascript)");
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
class PortalError extends Error {
}
async function requestByToken(ctx, token) {
    const r = await ctx.db.query.request.findFirst({
        where: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["and"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["request"].uploadToken, token), (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["request"].firmId, ctx.firmId))
    });
    if (!r) throw new PortalError("This link isn't valid");
    return r;
}
async function portalView(ctx, token, langOverride) {
    const r = await requestByToken(ctx, token);
    const cl = await ctx.db.query.client.findFirst({
        where: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["client"].id, r.clientId)
    });
    const lang = langOverride ?? cl.messageLang;
    const tasks = (await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$engine$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["tasksForRequest"])(ctx, r.id)).filter((t)=>t.status === "open");
    const out = [];
    for (const t0 of tasks){
        const t = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$engine$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["getTask"])(ctx, t0.id);
        const pb = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$playbooks$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["getPlaybook"])(ctx, t.playbookId, t.playbookVersion);
        const person = t.personId ? await ctx.db.query.person.findFirst({
            where: (p, { eq })=>eq(p.id, t.personId)
        }) : null;
        out.push({
            taskId: t.id,
            title: (pb.name[lang] ?? pb.name.en) + (person ? ` · ${person.nameZh && lang !== "en" ? person.nameZh : person.nameEn}` : ""),
            items: t.checklist.filter((e)=>e.status === "needed" || e.status === "received").map((e)=>({
                    key: e.key,
                    personId: e.personId ?? null,
                    label: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$labels$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["itemLabel"])(e.key, lang, t.params),
                    kind: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$labels$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["itemKind"])(e.key, t.params),
                    status: e.status,
                    optional: !!e.optional,
                    value: e.status === "received" && e.value && ![
                        "idNo",
                        "resAddr"
                    ].includes(e.key) ? e.value : null
                })),
            remaining: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$engine$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["outstanding"])(t).length
        });
    }
    return {
        clientName: (lang === "tc" ? cl.nameTc : lang === "sc" ? cl.nameSc : null) ?? cl.nameEn,
        language: lang,
        tasks: out
    };
}
async function taskInRequest(ctx, token, taskId) {
    const r = await requestByToken(ctx, token);
    const t = await ctx.db.query.task.findFirst({
        where: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["and"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["task"].id, taskId), (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["task"].requestId, r.id))
    });
    if (!t || t.status !== "open") throw new PortalError("That item isn't part of this request");
    return {
        r,
        t: await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$engine$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["getTask"])(ctx, taskId)
    };
}
const PERSON_FIELD = {
    fullName: "nameEn",
    chiName: "nameZh",
    idNo: "idNumber",
    resAddr: "residentialAddress",
    corrAddr: "correspondenceAddress"
};
async function portalUpload(ctx, token, u) {
    const { t } = await taskInRequest(ctx, token, u.taskId);
    const entry = t.checklist.find((e)=>e.key === u.key && (!e.personId || e.personId === t.personId));
    if (!entry) throw new PortalError("That item isn't needed for this task");
    if (u.content.length > 15 * 1024 * 1024) throw new PortalError("Files must be under 15 MB");
    const id = ctx.ids.next("doc");
    const key = `uploads/${t.clientId}/${id}-${u.filename.replace(/[^\w.\-]/g, "_")}`;
    await ctx.storage.put(key, u.content);
    await ctx.db.insert(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["document"]).values({
        id,
        firmId: ctx.firmId,
        clientId: t.clientId,
        taskId: t.id,
        personId: entry.personId ?? null,
        kind: u.key === "idCopy" ? "id_copy" : u.key === "addrProof" ? "address_proof" : u.key === "selfie" ? "selfie" : "upload",
        title: u.filename,
        storageKey: key,
        mime: u.mime,
        sha256: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$crypto$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["Crypto"].sha256(u.content),
        source: "upload",
        requirementKey: u.key,
        createdAt: ctx.clock.now()
    });
    const next = t.checklist.map((e)=>e === entry ? {
            ...e,
            status: "received",
            documentId: id,
            source: "Uploaded through the secure link"
        } : e);
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$engine$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["setChecklist"])(ctx, t.id, next, `Client uploaded ${(0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$labels$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["itemLabel"])(u.key)}`, "client");
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$engine$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["logEvent"])(ctx, t.id, "portal.upload", `Client uploaded ${u.filename} for ${(0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$labels$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["itemLabel"])(u.key)}`, {
        documentId: id
    }, "client");
    // Read the document for details that fill other checklist items (never on the selfie).
    if (u.key !== "selfie" && t.personId && (u.mime.startsWith("image/") || u.mime === "application/pdf")) {
        const person = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$records$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["getPersonProtected"])(ctx, t.personId);
        const want = t.checklist.filter((e)=>e.personId === t.personId && PERSON_FIELD[e.key]).map((e)=>e.key);
        try {
            const ex = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$agent$2f$extract$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["extractFromDocument"])(ctx, {
                taskId: t.id,
                forKey: u.key,
                wantKeys: want,
                filename: u.filename,
                mime: u.mime,
                content: u.content,
                onFile: Object.fromEntries(Object.entries(PERSON_FIELD).map(([k, f])=>[
                        k,
                        person[f]
                    ]))
            });
            await applyExtraction(ctx, t.id, t.personId, ex.fields, u.filename);
        } catch (e) {
            if (!(e instanceof __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$agent$2f$call$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["AgentError"])) throw e;
            await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$engine$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["logEvent"])(ctx, t.id, "extract.failed", `Couldn't read ${u.filename}; staff can enter the details`);
        }
    }
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$engine$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["advance"])(ctx, t.id);
}
async function applyExtraction(ctx, taskId, personId, fields, source) {
    const person = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$records$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["getPersonProtected"])(ctx, personId);
    const t = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$engine$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["getTask"])(ctx, taskId);
    const patch = {};
    let next = t.checklist;
    for (const f of fields){
        const field = PERSON_FIELD[f.key];
        if (!field || !f.value) continue;
        const onFile = person[field];
        if (onFile && !(0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$names$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["sameValue"])(onFile, f.value)) {
            await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$proposals$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createProposal"])(ctx, {
                kind: "conflict",
                title: `Conflicting ${(0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$labels$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["itemLabel"])(f.key)} for ${person.nameEn}`,
                summary: `Our records and ${source} differ.`,
                clientId: t.clientId,
                taskId,
                payload: {
                    taskId,
                    key: f.key,
                    onFile: [
                        "idNo",
                        "resAddr"
                    ].includes(f.key) ? "(protected value on file)" : onFile,
                    incoming: f.value,
                    personId,
                    question: `Please confirm your ${(0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$labels$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["itemLabel"])(f.key).toLowerCase()}.`
                }
            });
            continue;
        }
        if (!onFile) patch[field] = f.value;
        next = next.map((e)=>e.key === f.key && e.personId === personId && e.status === "needed" ? {
                ...e,
                status: "received",
                value: [
                    "idNo",
                    "resAddr"
                ].includes(f.key) ? "Provided" : f.value,
                source
            } : e);
    }
    if (Object.keys(patch).length) await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$records$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["updatePerson"])(ctx, personId, patch, `Read from ${source}`);
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$engine$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["setChecklist"])(ctx, taskId, next, `Details read from ${source}`, "agent");
}
async function portalSubmitField(ctx, token, f) {
    const { t } = await taskInRequest(ctx, token, f.taskId);
    const value = f.value.trim();
    if (!value) throw new PortalError("Enter a value");
    const entry = t.checklist.find((e)=>e.key === f.key && (!e.personId || e.personId === t.personId));
    if (!entry) throw new PortalError("That item isn't needed for this task");
    if (entry.personId && PERSON_FIELD[f.key]) {
        const person = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$records$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["getPersonProtected"])(ctx, entry.personId);
        if (!person[PERSON_FIELD[f.key]]) await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$records$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["updatePerson"])(ctx, entry.personId, {
            [PERSON_FIELD[f.key]]: value
        }, "Entered by the client on the secure link");
    }
    const next = t.checklist.map((e)=>e === entry ? {
            ...e,
            status: "received",
            value: [
                "idNo",
                "resAddr"
            ].includes(f.key) ? "Provided" : value,
            source: "Entered on the secure link"
        } : e);
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$engine$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["setChecklist"])(ctx, t.id, next, `Client entered ${(0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$labels$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["itemLabel"])(f.key)}`, "client");
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$engine$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["advance"])(ctx, t.id);
}
}),
"[project]/src/domain/reminders.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "DEFAULT_POLICY",
    ()=>DEFAULT_POLICY,
    "runReminders",
    ()=>runReminders
]);
// Overdue invoice reminders to the billing contact in their language. Default escalation:
// reminder at +7 and +14 days overdue, partner flag at +30 (awaiting the firm's real policy).
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/drizzle-orm/sql/expressions/conditions.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/db/schema.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$agent$2f$draft$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/agent/draft.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$proposals$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/domain/proposals.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$firm$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/domain/firm.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$dates$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/domain/dates.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$labels$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/domain/labels.ts [app-rsc] (ecmascript)");
;
;
;
;
;
;
;
const DEFAULT_POLICY = [
    {
        level: 1,
        daysOverdue: 7,
        action: "remind"
    },
    {
        level: 2,
        daysOverdue: 14,
        action: "remind"
    },
    {
        level: 3,
        daysOverdue: 30,
        action: "partner"
    }
];
async function runReminders(ctx) {
    const today = ctx.clock.today();
    const open = await ctx.db.select().from(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["invoice"]).where((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["and"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["invoice"].firmId, ctx.firmId), (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["inArray"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["invoice"].status, [
        "sent",
        "part_paid"
    ])));
    let created = 0;
    for (const inv of open){
        if (!inv.dueOn || inv.dueOn >= today) continue;
        const overdue = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$dates$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["daysBetween"])(inv.dueOn, today);
        const done = new Set((await ctx.db.select().from(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["reminder"]).where((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["reminder"].invoiceId, inv.id))).map((r)=>r.level));
        const step = [
            ...DEFAULT_POLICY
        ].reverse().find((p)=>overdue >= p.daysOverdue);
        if (!step || done.has(step.level)) continue;
        if (step.action === "partner") {
            const p = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$proposals$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createProposal"])(ctx, {
                kind: "triage",
                title: `Invoice ${inv.number} is ${overdue} days overdue`,
                summary: "Flag to the partner: consider switching this client to upfront terms.",
                clientId: inv.clientId,
                payload: {
                    invoiceId: inv.id,
                    escalation: true
                }
            });
            await ctx.db.insert(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["reminder"]).values({
                id: ctx.ids.next("rem"),
                firmId: ctx.firmId,
                invoiceId: inv.id,
                level: step.level,
                proposalId: p.id,
                createdAt: ctx.clock.now()
            });
            created++;
            continue;
        }
        const bc = inv.billingContactId ? await ctx.db.query.contact.findFirst({
            where: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["contact"].id, inv.billingContactId)
        }) : null;
        if (!bc?.email) continue;
        const lang = bc.language ?? "en";
        const firm = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$firm$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["getFirm"])(ctx);
        const facts = {
            language: lang,
            recipientName: bc.salutation?.[lang] ?? bc.name,
            clientName: "",
            signOff: firm.signOff?.[lang] ?? firm.legalName,
            newRequests: [],
            updates: [],
            changes: [],
            cancellations: [],
            questions: [],
            clarifications: [],
            uploadUrl: null,
            invoice: {
                number: inv.number,
                totalFormatted: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$labels$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["money"])(inv.totalCents - inv.paidCents, inv.currency),
                lines: [],
                terms: `issued ${(0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$dates$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["fmtDate"])(inv.issuedOn, lang)}, due ${(0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$dates$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["fmtDate"])(inv.dueOn, lang)}`,
                paymentInstructions: Object.entries(await ctx.bank.accountDetails()).map(([k, v])=>`${k}: ${v}`).join("\n")
            },
            extraNotes: [
                `This is payment reminder number ${step.level}. The invoice is ${overdue} days overdue. Be polite; if they have already paid, thank them and ask them to ignore this.`
            ]
        };
        const d = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$agent$2f$draft$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["draftEmail"])(ctx, facts, {
            purpose: `Polite payment reminder ${step.level} for an overdue invoice`
        });
        let conv = await ctx.db.query.conversation.findFirst({
            where: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["and"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["conversation"].clientId, inv.clientId), (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["conversation"].counterpartyEmail, bc.email.toLowerCase()))
        });
        if (!conv) [conv] = await ctx.db.insert(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["conversation"]).values({
            id: ctx.ids.next("cnv"),
            firmId: ctx.firmId,
            clientId: inv.clientId,
            channel: "email",
            subject: `Invoice ${inv.number}`,
            counterpartyEmail: bc.email.toLowerCase(),
            createdAt: ctx.clock.now()
        }).returning();
        const [draft] = await ctx.db.insert(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["message"]).values({
            id: ctx.ids.next("msg"),
            firmId: ctx.firmId,
            conversationId: conv.id,
            direction: "out",
            status: "draft",
            fromAddr: ctx.mail.address,
            toAddrs: [
                bc.email
            ],
            subject: d.subject,
            text: d.body,
            language: lang,
            at: ctx.clock.now()
        }).returning();
        const p = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$proposals$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createProposal"])(ctx, {
            kind: "send_message",
            title: `Send reminder ${step.level} for ${inv.number}`,
            summary: `${overdue} days overdue, ${(0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$labels$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["money"])(inv.totalCents - inv.paidCents)} outstanding`,
            clientId: inv.clientId,
            payload: {
                messageId: draft.id,
                requestId: null,
                taskIds: [],
                draftSource: d.source,
                purpose: "reminder",
                invoiceId: inv.id
            }
        });
        await ctx.db.insert(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["reminder"]).values({
            id: ctx.ids.next("rem"),
            firmId: ctx.firmId,
            invoiceId: inv.id,
            level: step.level,
            proposalId: p.id,
            messageId: draft.id,
            createdAt: ctx.clock.now()
        });
        created++;
    }
    return created;
}
}),
"[project]/src/server/actions.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

return __turbopack_context__.a(async (__turbopack_handle_async_dependencies__, __turbopack_async_result__) => { try {
/* __next_internal_action_entry_do_not_use__ [{"000a99812823d659fbcc9a0209e51e5d43e8596012":{"name":"checkMailAction"},"008e73902a1a5c2e97f2f7bf1a57cba0a83eee7946":{"name":"checkBankAction"},"008f5b4d65b0c798ba323ee2b7096ae705005c1151":{"name":"workerTickAction"},"009b438c649d505379ad02c5140b975f53b315c773":{"name":"resetDemoAction"},"00c3f345ec0ac9876429c29e8713ef1de41edc09a1":{"name":"remindersAction"},"405dc8dd4e5bf07d6ba04ef30f623ce7d2b95ab616":{"name":"markPaidAction"},"409a8b5f90d637a8405d49d22bcf57ff486466a8d6":{"name":"requestOtpAction"},"40ec7beb149458cde765d6ad043361753c6c5cb3da":{"name":"rejectAction"},"605da2304d6aca9bc8fa87e4591e8a2e55bfed8505":{"name":"batchAction"},"6082cc2e33629bc61ef64accd4a440475cb3484d75":{"name":"redraftAction"},"608f80954b003344c0d8686e4c4b45909207ffecf8":{"name":"simulatePaymentAction"},"60ab55bb9a9ef91a0335cd620f18ee16d3270a0ec1":{"name":"logMailAction"},"60ca62dad103580b48de9d18d0e46b6d32431ba550":{"name":"simulateEmailAction"},"60daaf8caddfdb1522ffc5e0df546aa17a7c41bfcc":{"name":"pasteRequestAction"},"705d6c0f1a6331ab9b5d807a67cfd894addf056baa":{"name":"verifyOtpAction"},"709909dae9dcaff27d395c850d9ece9fe96b9790e7":{"name":"manualStepAction"},"709adf229e2d60e9f21b0b6c168d64fe63712bdef6":{"name":"lineAmountAction"},"70b90ed94ce3d1ddb89bb240b40eeb4736e22c310a":{"name":"approveAction"},"70d165b547f2bd7e3b9b5e71486d200816b2f629dc":{"name":"signAction"},"70e1ff2d607628d328c8395de75323db5c5976cbef":{"name":"invoiceNumberAction"},"7890f260f5368d15e3cc7326c81e1e056c82e28ff4":{"name":"tickAction"},"7c49c6eed677b17d6f6877b5d70845def035092caf":{"name":"portalFieldAction"},"7c755a7b93c13162c0de7e1ad29203800fede0f4a7":{"name":"portalUploadAction"}},"src/server/actions.ts",""] */ __turbopack_context__.s([
    "approveAction",
    ()=>approveAction,
    "batchAction",
    ()=>batchAction,
    "checkBankAction",
    ()=>checkBankAction,
    "checkMailAction",
    ()=>checkMailAction,
    "invoiceNumberAction",
    ()=>invoiceNumberAction,
    "lineAmountAction",
    ()=>lineAmountAction,
    "logMailAction",
    ()=>logMailAction,
    "manualStepAction",
    ()=>manualStepAction,
    "markPaidAction",
    ()=>markPaidAction,
    "pasteRequestAction",
    ()=>pasteRequestAction,
    "portalFieldAction",
    ()=>portalFieldAction,
    "portalUploadAction",
    ()=>portalUploadAction,
    "redraftAction",
    ()=>redraftAction,
    "rejectAction",
    ()=>rejectAction,
    "remindersAction",
    ()=>remindersAction,
    "requestOtpAction",
    ()=>requestOtpAction,
    "resetDemoAction",
    ()=>resetDemoAction,
    "signAction",
    ()=>signAction,
    "simulateEmailAction",
    ()=>simulateEmailAction,
    "simulatePaymentAction",
    ()=>simulatePaymentAction,
    "tickAction",
    ()=>tickAction,
    "verifyOtpAction",
    ()=>verifyOtpAction,
    "workerTickAction",
    ()=>workerTickAction
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/build/webpack/loaders/next-flight-loader/server-reference.js [app-rsc] (ecmascript)");
// Server actions. Every client-facing, register or filing change goes through
// approveProposal (the approval gate); these actions only collect the human's input.
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$cache$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/cache.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$headers$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/headers.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/drizzle-orm/sql/expressions/conditions.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$server$2f$ctx$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/server/ctx.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$proposals$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/domain/proposals.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$inbound$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/domain/inbound.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$step$2d$hooks$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/domain/step-hooks.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$invoices$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/domain/invoices.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$payments$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/domain/payments.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$channels$2f$mail$2d$poller$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/channels/mail-poller.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$jobs$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/domain/jobs.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$reminders$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/domain/reminders.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$batch$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/domain/batch.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$mail$2d$items$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/domain/mail-items.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$agent$2f$draft$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/agent/draft.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$portal$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/domain/portal.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$signing$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/domain/signing.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/db/schema.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$demo$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/domain/demo.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$validate$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/build/webpack/loaders/next-flight-loader/action-validate.js [app-rsc] (ecmascript)");
var __turbopack_async_dependencies__ = __turbopack_handle_async_dependencies__([
    __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$server$2f$ctx$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__
]);
[__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$server$2f$ctx$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__] = __turbopack_async_dependencies__.then ? (await __turbopack_async_dependencies__)() : __turbopack_async_dependencies__;
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
const fail = (e)=>({
        ok: false,
        error: e.message
    });
const done = (message)=>{
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$cache$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["refresh"])();
    return {
        ok: true,
        message
    };
};
async function approveAction(proposalId, _prev, form) {
    const ctx = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$server$2f$ctx$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["getCtx"])();
    try {
        const edits = {};
        for (const [k, v] of form.entries()){
            if (k.startsWith("$") || k === "shownAt") continue;
            if (k.startsWith("email:")) {
                edits.emails = {
                    ...edits.emails ?? {},
                    [k.slice(6)]: String(v)
                };
                continue;
            }
            edits[k] = k === "feeHkd" ? Number(v) : String(v);
        }
        const shownAt = form.get("shownAt") ? new Date(String(form.get("shownAt"))) : null;
        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$proposals$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["approveProposal"])(ctx, proposalId, {
            edits,
            shownAt
        });
        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$jobs$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["runJobs"])(ctx); // e.g. queue the Xero sync and confirmation drafts straight away
        return done("Done");
    } catch (e) {
        return fail(e);
    }
}
async function rejectAction(proposalId) {
    try {
        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$proposals$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["rejectProposal"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$server$2f$ctx$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["getCtx"])(), proposalId, "Dismissed by staff");
        return done("Dismissed");
    } catch (e) {
        return fail(e);
    }
}
async function redraftAction(proposalId, lang) {
    const ctx = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$server$2f$ctx$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["getCtx"])();
    try {
        const p = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$proposals$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["getProposal"])(ctx, proposalId);
        const m = await ctx.db.query.message.findFirst({
            where: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["message"].id, p.payload.messageId)
        });
        const facts = m?.intake?.facts;
        if (!m || !facts) throw new Error("This draft can't be redrafted");
        const firm = await (await __turbopack_context__.A("[project]/src/domain/firm.ts [app-rsc] (ecmascript, async loader)")).getFirm(ctx);
        const d = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$agent$2f$draft$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["draftEmail"])(ctx, {
            ...facts,
            language: lang,
            signOff: firm.signOff?.[lang] ?? facts.signOff
        }, {
            messageId: m.id
        });
        await ctx.db.update(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["message"]).set({
            text: d.body,
            language: lang,
            intake: {
                ...m.intake,
                facts: {
                    ...facts,
                    language: lang
                }
            }
        }).where((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["message"].id, m.id));
        return done(`Redrafted in ${lang === "en" ? "English" : lang === "tc" ? "Traditional Chinese" : "Simplified Chinese"}`);
    } catch (e) {
        return fail(e);
    }
}
async function pasteRequestAction(_prev, form) {
    const ctx = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$server$2f$ctx$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["getCtx"])();
    try {
        const clientId = String(form.get("clientId") ?? "") || null;
        const text = String(form.get("text") ?? "").trim();
        if (!text) throw new Error("Paste the client's message first");
        let from = {
            email: "paste@local",
            name: "Pasted message"
        };
        if (clientId) {
            const c = await ctx.db.query.contact.findFirst({
                where: (x, { and, eq })=>and(eq(x.clientId, clientId), eq(x.isInstructing, true))
            }) ?? await ctx.db.query.contact.findFirst({
                where: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["contact"].clientId, clientId)
            });
            if (c?.email) from = {
                email: c.email,
                name: c.name
            };
        }
        const m = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$inbound$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["ingestMessage"])(ctx, {
            channel: "paste",
            provider: "paste",
            providerMessageId: `paste-${Date.now()}`,
            from,
            to: [],
            cc: [],
            subject: String(form.get("subject") ?? "Pasted message"),
            text,
            receivedAt: ctx.clock.now(),
            attachments: [],
            clientId
        });
        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$inbound$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["processInbound"])(ctx, m.id);
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$cache$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["revalidatePath"])("/", "layout");
        return {
            ok: true,
            message: "Harbourline has read the message; the draft is in your intray."
        };
    } catch (e) {
        return fail(e);
    }
}
async function tickAction(taskId, key, _prev, form) {
    try {
        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$step$2d$hooks$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["tickItem"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$server$2f$ctx$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["getCtx"])(), taskId, key, String(form.get("value") ?? "") || null);
        return done();
    } catch (e) {
        return fail(e);
    }
}
async function manualStepAction(taskId, _prev, form) {
    try {
        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$step$2d$hooks$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["completeManualStep"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$server$2f$ctx$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["getCtx"])(), taskId, String(form.get("note") ?? "") || undefined);
        return done();
    } catch (e) {
        return fail(e);
    }
}
async function invoiceNumberAction(invoiceId, _prev, form) {
    try {
        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$invoices$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["setInvoiceNumber"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$server$2f$ctx$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["getCtx"])(), invoiceId, String(form.get("number") ?? ""));
        return done("Invoice number updated");
    } catch (e) {
        return fail(e);
    }
}
async function lineAmountAction(lineId, _prev, form) {
    try {
        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$invoices$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["setLineAmount"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$server$2f$ctx$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["getCtx"])(), lineId, Math.round(Number(String(form.get("amount")).replace(/[^\d.]/g, "")) * 100));
        return done();
    } catch (e) {
        return fail(e);
    }
}
async function markPaidAction(invoiceId) {
    try {
        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$payments$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["markPaidManually"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$server$2f$ctx$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["getCtx"])(), invoiceId, "Marked paid by staff");
        return done("Marked paid");
    } catch (e) {
        return fail(e);
    }
}
async function checkBankAction() {
    try {
        const r = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$payments$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["pollBank"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$server$2f$ctx$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["getCtx"])());
        return done(`${r.fetched} deposit(s) checked: ${r.matched} matched, ${r.proposed} to review, ${r.unmatched} unmatched`);
    } catch (e) {
        return fail(e);
    }
}
async function checkMailAction() {
    try {
        const r = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$channels$2f$mail$2d$poller$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["pollMail"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$server$2f$ctx$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["getCtx"])());
        return done(`${r.processed} new message(s)`);
    } catch (e) {
        return fail(e);
    }
}
async function remindersAction() {
    try {
        const n = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$reminders$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["runReminders"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$server$2f$ctx$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["getCtx"])());
        return done(`${n} reminder(s) drafted`);
    } catch (e) {
        return fail(e);
    }
}
async function batchAction(_prev, form) {
    try {
        const r = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$batch$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["batchStart"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$server$2f$ctx$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["getCtx"])(), {
            playbookId: String(form.get("playbookId")),
            clientIds: form.getAll("clientId").map(String),
            periodYear: form.get("periodYear") ? Number(form.get("periodYear")) : undefined
        });
        return done(`Started ${r.created} task(s)${r.skipped.length ? `; skipped ${r.skipped.length} already in progress` : ""}. Drafts are in your intray.`);
    } catch (e) {
        return fail(e);
    }
}
async function logMailAction(_prev, form) {
    try {
        const f = form.get("file");
        if (!f || !f.size) throw new Error("Choose a scan");
        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$mail$2d$items$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["logMailItem"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$server$2f$ctx$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["getCtx"])(), {
            filename: f.name,
            mime: f.type || "application/pdf",
            content: Buffer.from(await f.arrayBuffer()),
            receivedOn: String(form.get("receivedOn") || new Date().toISOString().slice(0, 10))
        });
        return done("Letter logged; the client notification is in your intray");
    } catch (e) {
        return fail(e);
    }
}
async function simulatePaymentAction(_prev, form) {
    const ctx = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$server$2f$ctx$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["getCtx"])();
    try {
        const inv = await ctx.db.query.invoice.findFirst({
            where: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["invoice"].id, String(form.get("invoiceId")))
        });
        if (!inv) throw new Error("Pick an invoice");
        const amount = form.get("amount") ? Math.round(Number(form.get("amount")) * 100) : inv.totalCents - inv.paidCents;
        await ctx.bank.simulateDeposit({
            amountCents: amount,
            currency: inv.currency,
            reference: String(form.get("reference") || inv.number),
            payerName: String(form.get("payer") || "Demo client")
        });
        const r = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$payments$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["pollBank"])(ctx);
        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$jobs$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["runJobs"])(ctx);
        return done(`Deposit sent to ${ctx.bank.name === "airwallex" ? "the Airwallex sandbox" : "the demo bank"}; ${r.matched} matched automatically`);
    } catch (e) {
        return fail(e);
    }
}
async function simulateEmailAction(_prev, form) {
    const ctx = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$server$2f$ctx$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["getCtx"])();
    try {
        const fake = ctx.mail;
        if (typeof fake.deliver !== "function") throw new Error("A real mailbox is connected: send a real email to it instead");
        const files = form.getAll("files").filter((f)=>f instanceof File && f.size > 0);
        fake.deliver({
            from: {
                email: String(form.get("from")),
                name: String(form.get("fromName") || "") || null
            },
            subject: String(form.get("subject") || "(no subject)"),
            text: String(form.get("text") || ""),
            inReplyTo: String(form.get("inReplyTo") || "") || null,
            attachments: await Promise.all(files.map(async (f)=>({
                    filename: f.name,
                    mime: f.type || "application/octet-stream",
                    content: Buffer.from(await f.arrayBuffer())
                })))
        });
        const r = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$channels$2f$mail$2d$poller$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["pollMail"])(ctx);
        return done(`Delivered; ${r.processed} message(s) processed`);
    } catch (e) {
        return fail(e);
    }
}
async function resetDemoAction() {
    try {
        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$demo$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["resetDemoData"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$server$2f$ctx$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["getCtx"])());
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$cache$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["revalidatePath"])("/", "layout");
        return {
            ok: true,
            message: "Demo data reset"
        };
    } catch (e) {
        return fail(e);
    }
}
async function workerTickAction() {
    const ctx = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$server$2f$ctx$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["getCtx"])();
    try {
        const m = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$channels$2f$mail$2d$poller$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["pollMail"])(ctx);
        const b = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$payments$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["pollBank"])(ctx);
        const j = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$jobs$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["runJobs"])(ctx);
        return done(`Mail ${m.processed}, bank ${b.matched} matched, ${j} job(s)`);
    } catch (e) {
        return fail(e);
    }
}
async function portalUploadAction(token, taskId, key, _prev, form) {
    try {
        const f = form.get("file");
        if (!f || !f.size) throw new Error("Choose a file");
        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$portal$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["portalUpload"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$server$2f$ctx$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["getCtx"])(), token, {
            taskId,
            key,
            filename: f.name,
            mime: f.type || "application/octet-stream",
            content: Buffer.from(await f.arrayBuffer())
        });
        return done("Received, thank you");
    } catch (e) {
        return fail(e);
    }
}
async function portalFieldAction(token, taskId, key, _prev, form) {
    try {
        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$portal$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["portalSubmitField"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$server$2f$ctx$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["getCtx"])(), token, {
            taskId,
            key,
            value: String(form.get("value") ?? "")
        });
        return done("Saved, thank you");
    } catch (e) {
        return fail(e);
    }
}
async function requestOtpAction(token) {
    try {
        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$signing$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["requestOtp"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$server$2f$ctx$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["getCtx"])(), token);
        return {
            ok: true,
            message: "We've emailed you a 6-digit code"
        };
    } catch (e) {
        return fail(e);
    }
}
async function verifyOtpAction(token, _prev, form) {
    try {
        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$signing$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["verifyOtp"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$server$2f$ctx$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["getCtx"])(), token, String(form.get("code") ?? ""));
        return done("Verified");
    } catch (e) {
        return fail(e);
    }
}
async function signAction(token, _prev, form) {
    try {
        const h = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$headers$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["headers"])();
        const ip = (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || h.get("x-real-ip") || "127.0.0.1";
        const drawn = String(form.get("drawn") ?? "");
        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$domain$2f$signing$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["signDocuments"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$server$2f$ctx$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["getCtx"])(), token, drawn ? {
            kind: "drawn",
            data: drawn,
            ip,
            userAgent: h.get("user-agent") ?? ""
        } : {
            kind: "typed",
            data: String(form.get("typed") ?? ""),
            ip,
            userAgent: h.get("user-agent") ?? ""
        });
        return done("Signed. Thank you.");
    } catch (e) {
        return fail(e);
    }
}
;
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$validate$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["ensureServerEntryExports"])([
    approveAction,
    rejectAction,
    redraftAction,
    pasteRequestAction,
    tickAction,
    manualStepAction,
    invoiceNumberAction,
    lineAmountAction,
    markPaidAction,
    checkBankAction,
    checkMailAction,
    remindersAction,
    batchAction,
    logMailAction,
    simulatePaymentAction,
    simulateEmailAction,
    resetDemoAction,
    workerTickAction,
    portalUploadAction,
    portalFieldAction,
    requestOtpAction,
    verifyOtpAction,
    signAction
]);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])(approveAction, "70b90ed94ce3d1ddb89bb240b40eeb4736e22c310a", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])(rejectAction, "40ec7beb149458cde765d6ad043361753c6c5cb3da", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])(redraftAction, "6082cc2e33629bc61ef64accd4a440475cb3484d75", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])(pasteRequestAction, "60daaf8caddfdb1522ffc5e0df546aa17a7c41bfcc", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])(tickAction, "7890f260f5368d15e3cc7326c81e1e056c82e28ff4", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])(manualStepAction, "709909dae9dcaff27d395c850d9ece9fe96b9790e7", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])(invoiceNumberAction, "70e1ff2d607628d328c8395de75323db5c5976cbef", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])(lineAmountAction, "709adf229e2d60e9f21b0b6c168d64fe63712bdef6", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])(markPaidAction, "405dc8dd4e5bf07d6ba04ef30f623ce7d2b95ab616", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])(checkBankAction, "008e73902a1a5c2e97f2f7bf1a57cba0a83eee7946", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])(checkMailAction, "000a99812823d659fbcc9a0209e51e5d43e8596012", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])(remindersAction, "00c3f345ec0ac9876429c29e8713ef1de41edc09a1", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])(batchAction, "605da2304d6aca9bc8fa87e4591e8a2e55bfed8505", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])(logMailAction, "60ab55bb9a9ef91a0335cd620f18ee16d3270a0ec1", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])(simulatePaymentAction, "608f80954b003344c0d8686e4c4b45909207ffecf8", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])(simulateEmailAction, "60ca62dad103580b48de9d18d0e46b6d32431ba550", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])(resetDemoAction, "009b438c649d505379ad02c5140b975f53b315c773", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])(workerTickAction, "008f5b4d65b0c798ba323ee2b7096ae705005c1151", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])(portalUploadAction, "7c755a7b93c13162c0de7e1ad29203800fede0f4a7", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])(portalFieldAction, "7c49c6eed677b17d6f6877b5d70845def035092caf", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])(requestOtpAction, "409a8b5f90d637a8405d49d22bcf57ff486466a8d6", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])(verifyOtpAction, "705d6c0f1a6331ab9b5d807a67cfd894addf056baa", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])(signAction, "70d165b547f2bd7e3b9b5e71486d200816b2f629dc", null);
__turbopack_async_result__();
} catch(e) { __turbopack_async_result__(e); } }, false);}),
];

//# sourceMappingURL=_0khvy1z._.js.map