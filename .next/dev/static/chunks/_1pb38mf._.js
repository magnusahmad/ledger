(globalThis["TURBOPACK"] || (globalThis["TURBOPACK"] = [])).push([typeof document === "object" ? document.currentScript : undefined,
"[project]/node_modules/next/dist/build/webpack/loaders/next-flight-loader/action-client-wrapper.js [app-client] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

// This file must be bundled in the app's client layer, it shouldn't be directly
// imported by the server.
Object.defineProperty(exports, "__esModule", {
    value: true
});
0 && (module.exports = {
    callServer: null,
    createServerReference: null,
    findSourceMapURL: null
});
function _export(target, all) {
    for(var name in all)Object.defineProperty(target, name, {
        enumerable: true,
        get: all[name]
    });
}
_export(exports, {
    callServer: function() {
        return _appcallserver.callServer;
    },
    createServerReference: function() {
        return _client.createServerReference;
    },
    findSourceMapURL: function() {
        return _appfindsourcemapurl.findSourceMapURL;
    }
});
const _appcallserver = __turbopack_context__.r("[project]/node_modules/next/dist/client/app-call-server.js [app-client] (ecmascript)");
const _appfindsourcemapurl = __turbopack_context__.r("[project]/node_modules/next/dist/client/app-find-source-map-url.js [app-client] (ecmascript)");
const _client = __turbopack_context__.r("[project]/node_modules/next/dist/compiled/react-server-dom-turbopack/client.js [app-client] (ecmascript)");
}),
"[project]/src/app/(desk)/review/[id]/client.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "AutoRedirect",
    ()=>AutoRedirect,
    "InlineEdit",
    ()=>InlineEdit,
    "RedraftButtons",
    ()=>RedraftButtons,
    "ReviewForm",
    ()=>ReviewForm
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/navigation.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$server$2f$data$3a$3b06c0__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$text$2f$javascript$3e$__ = __turbopack_context__.i("[project]/src/server/data:3b06c0 [app-client] (ecmascript) <text/javascript>");
;
var _s = __turbopack_context__.k.signature(), _s1 = __turbopack_context__.k.signature(), _s2 = __turbopack_context__.k.signature(), _s3 = __turbopack_context__.k.signature();
"use client";
;
;
;
function ReviewForm({ action, submit, children, redirectTo, tone }) {
    _s();
    const [state, run, pending] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useActionState"])(action, null);
    const [shownAt] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])({
        "ReviewForm.useState": ()=>new Date().toISOString()
    }["ReviewForm.useState"]);
    const router = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRouter"])();
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "ReviewForm.useEffect": ()=>{
            if (state?.ok && redirectTo) router.push(redirectTo);
        }
    }["ReviewForm.useEffect"], [
        state,
        redirectTo,
        router
    ]);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("form", {
        action: run,
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                type: "hidden",
                name: "shownAt",
                value: shownAt
            }, void 0, false, {
                fileName: "[project]/src/app/(desk)/review/[id]/client.tsx",
                lineNumber: 16,
                columnNumber: 7
            }, this),
            children,
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "row",
                style: {
                    marginTop: 14
                },
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        className: `btn${tone === "danger" ? " danger" : tone === "secondary" ? " sec2" : ""}`,
                        disabled: pending,
                        children: pending ? "Working…" : submit
                    }, void 0, false, {
                        fileName: "[project]/src/app/(desk)/review/[id]/client.tsx",
                        lineNumber: 19,
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
                        fileName: "[project]/src/app/(desk)/review/[id]/client.tsx",
                        lineNumber: 20,
                        columnNumber: 26
                    }, this),
                    state?.ok && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        className: "small",
                        style: {
                            color: "var(--ok)"
                        },
                        children: state.message ?? "Done"
                    }, void 0, false, {
                        fileName: "[project]/src/app/(desk)/review/[id]/client.tsx",
                        lineNumber: 21,
                        columnNumber: 23
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/app/(desk)/review/[id]/client.tsx",
                lineNumber: 18,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/app/(desk)/review/[id]/client.tsx",
        lineNumber: 15,
        columnNumber: 5
    }, this);
}
_s(ReviewForm, "O2s0JeKELHHwzGZyRbtfG+OuG/U=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useActionState"],
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRouter"]
    ];
});
_c = ReviewForm;
const LANGS = [
    {
        k: "en",
        label: "EN"
    },
    {
        k: "tc",
        label: "繁"
    },
    {
        k: "sc",
        label: "简"
    }
];
function RedraftButtons({ proposalId, current }) {
    _s1();
    const [pending, start] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useTransition"])();
    const [err, setErr] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "row",
        role: "group",
        "aria-label": "Draft language",
        children: [
            LANGS.map((l)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                    type: "button",
                    className: `btn sm${l.k === current ? "" : " sec2"}`,
                    disabled: pending,
                    "aria-pressed": l.k === current,
                    onClick: ()=>start(async ()=>{
                            const r = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$server$2f$data$3a$3b06c0__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$text$2f$javascript$3e$__["redraftAction"])(proposalId, l.k);
                            setErr(r.error ?? null);
                            if (r.ok) window.location.reload();
                        }),
                    children: l.label
                }, l.k, false, {
                    fileName: "[project]/src/app/(desk)/review/[id]/client.tsx",
                    lineNumber: 35,
                    columnNumber: 9
                }, this)),
            pending && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                className: "small muted",
                children: "Redrafting…"
            }, void 0, false, {
                fileName: "[project]/src/app/(desk)/review/[id]/client.tsx",
                lineNumber: 40,
                columnNumber: 19
            }, this),
            err && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                className: "small",
                style: {
                    color: "var(--red)"
                },
                children: err
            }, void 0, false, {
                fileName: "[project]/src/app/(desk)/review/[id]/client.tsx",
                lineNumber: 41,
                columnNumber: 15
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/app/(desk)/review/[id]/client.tsx",
        lineNumber: 33,
        columnNumber: 5
    }, this);
}
_s1(RedraftButtons, "jO2yagEzq8gAVqeOuLVRWidE/VQ=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useTransition"]
    ];
});
_c1 = RedraftButtons;
function InlineEdit({ action, name, value, label, prefix }) {
    _s2();
    const [editing, setEditing] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [state, run, pending] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useActionState"])({
        "InlineEdit.useActionState": async (p, f)=>{
            const r = await action(p, f);
            if (r.ok) setEditing(false);
            return r;
        }
    }["InlineEdit.useActionState"], null);
    if (!editing) return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                type: "button",
                className: "txt",
                onClick: ()=>setEditing(true),
                "aria-label": `Edit ${label}`,
                children: [
                    prefix,
                    value
                ]
            }, void 0, true, {
                fileName: "[project]/src/app/(desk)/review/[id]/client.tsx",
                lineNumber: 52,
                columnNumber: 7
            }, this),
            state?.error && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                className: "small",
                style: {
                    color: "var(--red)",
                    display: "block"
                },
                children: state.error
            }, void 0, false, {
                fileName: "[project]/src/app/(desk)/review/[id]/client.tsx",
                lineNumber: 53,
                columnNumber: 24
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/app/(desk)/review/[id]/client.tsx",
        lineNumber: 51,
        columnNumber: 5
    }, this);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("form", {
        action: run,
        className: "row",
        style: {
            gap: 6,
            justifyContent: "flex-end"
        },
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                type: "text",
                name: name,
                defaultValue: value,
                "aria-label": label,
                autoFocus: true,
                style: {
                    width: 150,
                    padding: "4px 8px"
                }
            }, void 0, false, {
                fileName: "[project]/src/app/(desk)/review/[id]/client.tsx",
                lineNumber: 58,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                className: "btn sm",
                disabled: pending,
                children: "Save"
            }, void 0, false, {
                fileName: "[project]/src/app/(desk)/review/[id]/client.tsx",
                lineNumber: 59,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                type: "button",
                className: "btn sm sec2",
                onClick: ()=>setEditing(false),
                children: "Cancel"
            }, void 0, false, {
                fileName: "[project]/src/app/(desk)/review/[id]/client.tsx",
                lineNumber: 60,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/app/(desk)/review/[id]/client.tsx",
        lineNumber: 57,
        columnNumber: 5
    }, this);
}
_s2(InlineEdit, "wWbv2IYYXKHOaamwNCL+OBNI450=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useActionState"]
    ];
});
_c2 = InlineEdit;
function AutoRedirect({ to, ms = 900 }) {
    _s3();
    const router = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRouter"])();
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "AutoRedirect.useEffect": ()=>{
            const t = setTimeout({
                "AutoRedirect.useEffect.t": ()=>router.push(to)
            }["AutoRedirect.useEffect.t"], ms);
            return ({
                "AutoRedirect.useEffect": ()=>clearTimeout(t)
            })["AutoRedirect.useEffect"];
        }
    }["AutoRedirect.useEffect"], [
        router,
        to,
        ms
    ]);
    return null;
}
_s3(AutoRedirect, "vQduR7x+OPXj6PSmJyFnf+hU7bg=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRouter"]
    ];
});
_c3 = AutoRedirect;
var _c, _c1, _c2, _c3;
__turbopack_context__.k.register(_c, "ReviewForm");
__turbopack_context__.k.register(_c1, "RedraftButtons");
__turbopack_context__.k.register(_c2, "InlineEdit");
__turbopack_context__.k.register(_c3, "AutoRedirect");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
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
"[project]/src/server/data:3b06c0 [app-client] (ecmascript) <text/javascript>", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "redraftAction",
    ()=>$$RSC_SERVER_ACTION_2
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$client$2d$wrapper$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/build/webpack/loaders/next-flight-loader/action-client-wrapper.js [app-client] (ecmascript)");
/* __next_internal_action_entry_do_not_use__ [{"6082cc2e33629bc61ef64accd4a440475cb3484d75":{"name":"redraftAction"}},"src/server/actions.ts",""] */ "use turbopack no side effects";
;
const $$RSC_SERVER_ACTION_2 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$client$2d$wrapper$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createServerReference"])("6082cc2e33629bc61ef64accd4a440475cb3484d75", __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$client$2d$wrapper$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["callServer"], void 0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$client$2d$wrapper$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["findSourceMapURL"], "redraftAction");
;
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
]);

//# sourceMappingURL=_1pb38mf._.js.map