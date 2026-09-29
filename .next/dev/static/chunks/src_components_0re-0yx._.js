(globalThis["TURBOPACK"] || (globalThis["TURBOPACK"] = [])).push([typeof document === "object" ? document.currentScript : undefined,
"[project]/src/components/ActionForm.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "ActionButton",
    ()=>ActionButton,
    "ActionForm",
    ()=>ActionForm
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature(), _s1 = __turbopack_context__.k.signature();
"use client";
;
function ActionForm({ action, children, submit, tone, className, confirm, stampShownAt, resetOnSuccess }) {
    _s();
    const [state, run, pending] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useActionState"])(action, null);
    const [shownAt] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])({
        "ActionForm.useState": ()=>new Date().toISOString()
    }["ActionForm.useState"]);
    const [formKey, setFormKey] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(0);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "ActionForm.useEffect": ()=>{
            if (state?.ok && resetOnSuccess) setFormKey({
                "ActionForm.useEffect": (k)=>k + 1
            }["ActionForm.useEffect"]);
        }
    }["ActionForm.useEffect"], [
        state,
        resetOnSuccess
    ]);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("form", {
        action: run,
        className: className,
        onSubmit: (e)=>{
            if (confirm && !window.confirm(confirm)) e.preventDefault();
        },
        children: [
            stampShownAt && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                type: "hidden",
                name: "shownAt",
                value: shownAt
            }, void 0, false, {
                fileName: "[project]/src/components/ActionForm.tsx",
                lineNumber: 17,
                columnNumber: 24
            }, this),
            children,
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "row",
                style: {
                    marginTop: children ? 12 : 0
                },
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        className: `btn${tone === "secondary" ? " sec2" : tone === "danger" ? " danger" : ""}`,
                        disabled: pending,
                        type: "submit",
                        children: pending ? "Working…" : submit
                    }, void 0, false, {
                        fileName: "[project]/src/components/ActionForm.tsx",
                        lineNumber: 20,
                        columnNumber: 9
                    }, this),
                    state?.error && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        className: "small",
                        role: "alert",
                        style: {
                            color: "var(--red)"
                        },
                        children: state.error
                    }, void 0, false, {
                        fileName: "[project]/src/components/ActionForm.tsx",
                        lineNumber: 21,
                        columnNumber: 26
                    }, this),
                    state?.ok && state.message && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        className: "small",
                        style: {
                            color: "var(--ok)"
                        },
                        children: state.message
                    }, void 0, false, {
                        fileName: "[project]/src/components/ActionForm.tsx",
                        lineNumber: 22,
                        columnNumber: 40
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/ActionForm.tsx",
                lineNumber: 19,
                columnNumber: 7
            }, this)
        ]
    }, formKey, true, {
        fileName: "[project]/src/components/ActionForm.tsx",
        lineNumber: 16,
        columnNumber: 5
    }, this);
}
_s(ActionForm, "mCsDQOWxhxs76LBCBr/0NBoCBrw=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useActionState"]
    ];
});
_c = ActionForm;
function ActionButton({ action, children, tone, confirm }) {
    _s1();
    const [state, run, pending] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useActionState"])({
        "ActionButton.useActionState": async ()=>action()
    }["ActionButton.useActionState"], null);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("form", {
        action: run,
        style: {
            display: "inline-flex",
            alignItems: "center",
            gap: 8
        },
        onSubmit: (e)=>{
            if (confirm && !window.confirm(confirm)) e.preventDefault();
        },
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                className: `btn sm${tone === "secondary" || !tone ? " sec2" : tone === "danger" ? " danger" : ""}`,
                disabled: pending,
                children: pending ? "Working…" : children
            }, void 0, false, {
                fileName: "[project]/src/components/ActionForm.tsx",
                lineNumber: 33,
                columnNumber: 7
            }, this),
            state?.error && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                className: "small",
                role: "alert",
                style: {
                    color: "var(--red)"
                },
                children: state.error
            }, void 0, false, {
                fileName: "[project]/src/components/ActionForm.tsx",
                lineNumber: 34,
                columnNumber: 24
            }, this),
            state?.ok && state.message && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                className: "small",
                style: {
                    color: "var(--ok)"
                },
                children: state.message
            }, void 0, false, {
                fileName: "[project]/src/components/ActionForm.tsx",
                lineNumber: 35,
                columnNumber: 38
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/components/ActionForm.tsx",
        lineNumber: 32,
        columnNumber: 5
    }, this);
}
_s1(ActionButton, "kn7DOk1CNGCrYEhnhmqjoEh6B+Q=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useActionState"]
    ];
});
_c1 = ActionButton;
var _c, _c1;
__turbopack_context__.k.register(_c, "ActionForm");
__turbopack_context__.k.register(_c1, "ActionButton");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/components/LiveRefresh.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "LiveRefresh",
    ()=>LiveRefresh
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
// Keeps server-rendered pages live: polls a fingerprint of the intray and refreshes when
// anything changes (new email processed, payment matched, signature received...).
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/navigation.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
"use client";
;
;
function LiveRefresh({ intervalMs = 3000, label = true }) {
    _s();
    const router = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRouter"])();
    const last = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    const [ok, setOk] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(true);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "LiveRefresh.useEffect": ()=>{
            let alive = true;
            const tick = {
                "LiveRefresh.useEffect.tick": async ()=>{
                    try {
                        const r = await fetch("/api/live", {
                            cache: "no-store"
                        });
                        const { v } = await r.json();
                        setOk(true);
                        if (last.current && v !== last.current) router.refresh();
                        last.current = v;
                    } catch  {
                        setOk(false);
                    }
                    if (alive) setTimeout(tick, intervalMs);
                }
            }["LiveRefresh.useEffect.tick"];
            tick();
            return ({
                "LiveRefresh.useEffect": ()=>{
                    alive = false;
                }
            })["LiveRefresh.useEffect"];
        }
    }["LiveRefresh.useEffect"], [
        router,
        intervalMs
    ]);
    if (!label) return null;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
        className: "live",
        title: "Updates automatically",
        children: [
            ok ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("i", {}, void 0, false, {
                fileName: "[project]/src/components/LiveRefresh.tsx",
                lineNumber: 27,
                columnNumber: 69
            }, this) : null,
            ok ? "Live" : "Reconnecting…"
        ]
    }, void 0, true, {
        fileName: "[project]/src/components/LiveRefresh.tsx",
        lineNumber: 27,
        columnNumber: 10
    }, this);
}
_s(LiveRefresh, "zJQb1+jOShXowDzPMR5hZwQqlec=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRouter"]
    ];
});
_c = LiveRefresh;
var _c;
__turbopack_context__.k.register(_c, "LiveRefresh");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
]);

//# sourceMappingURL=src_components_0re-0yx._.js.map