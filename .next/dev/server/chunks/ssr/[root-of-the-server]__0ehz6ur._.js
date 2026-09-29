module.exports = [
"[externals]/@modelcontextprotocol/sdk/client/index.js [external] (@modelcontextprotocol/sdk/client/index.js, esm_import, [project]/node_modules/@modelcontextprotocol/sdk)", ((__turbopack_context__) => {
"use strict";

return __turbopack_context__.a(async (__turbopack_handle_async_dependencies__, __turbopack_async_result__) => { try {
var mod = await __turbopack_context__.y("@modelcontextprotocol/sdk-4089b9e8fbe68a78/client/index.js");

__turbopack_context__.n(mod);
__turbopack_async_result__();
} catch(e) { __turbopack_async_result__(e); } }, true);}),
"[externals]/@modelcontextprotocol/sdk/client/stdio.js [external] (@modelcontextprotocol/sdk/client/stdio.js, esm_import, [project]/node_modules/@modelcontextprotocol/sdk)", ((__turbopack_context__) => {
"use strict";

return __turbopack_context__.a(async (__turbopack_handle_async_dependencies__, __turbopack_async_result__) => { try {
var mod = await __turbopack_context__.y("@modelcontextprotocol/sdk-4089b9e8fbe68a78/client/stdio.js");

__turbopack_context__.n(mod);
__turbopack_async_result__();
} catch(e) { __turbopack_async_result__(e); } }, true);}),
"[externals]/@pdf-lib/fontkit [external] (@pdf-lib/fontkit, cjs, [project]/node_modules/@pdf-lib/fontkit)", ((__turbopack_context__, module, exports) => {

var mod = __turbopack_context__.x("@pdf-lib/fontkit-d4a42150569d40da", () => require("@pdf-lib/fontkit-d4a42150569d40da"));

module.exports = mod;
}),
"[externals]/agentmail [external] (agentmail, esm_import, [project]/node_modules/agentmail)", ((__turbopack_context__) => {
"use strict";

return __turbopack_context__.a(async (__turbopack_handle_async_dependencies__, __turbopack_async_result__) => { try {
var mod = await __turbopack_context__.y("agentmail-a32dfd2338c192c0");

__turbopack_context__.n(mod);
__turbopack_async_result__();
} catch(e) { __turbopack_async_result__(e); } }, true);}),
"[externals]/googleapis [external] (googleapis, cjs, [project]/node_modules/googleapis)", ((__turbopack_context__, module, exports) => {

var mod = __turbopack_context__.x("googleapis-9565988a00144fd3", () => require("googleapis-9565988a00144fd3"));

module.exports = mod;
}),
"[externals]/mailparser [external] (mailparser, cjs, [project]/node_modules/mailparser)", ((__turbopack_context__, module, exports) => {

var mod = __turbopack_context__.x("mailparser-b9242dd978d5cac6", () => require("mailparser-b9242dd978d5cac6"));

module.exports = mod;
}),
"[externals]/nodemailer/lib/mail-composer/index.js [external] (nodemailer/lib/mail-composer/index.js, esm_import, [project]/node_modules/nodemailer)", ((__turbopack_context__) => {
"use strict";

return __turbopack_context__.a(async (__turbopack_handle_async_dependencies__, __turbopack_async_result__) => { try {
var mod = await __turbopack_context__.y("nodemailer-9c35dd349a8aaa9f/lib/mail-composer/index.js");

__turbopack_context__.n(mod);
__turbopack_async_result__();
} catch(e) { __turbopack_async_result__(e); } }, true);}),
"[externals]/pdf-lib [external] (pdf-lib, cjs, [project]/node_modules/pdf-lib)", ((__turbopack_context__, module, exports) => {

var mod = __turbopack_context__.x("pdf-lib-2f1f3693f6ba3c4b", () => require("pdf-lib-2f1f3693f6ba3c4b"));

module.exports = mod;
}),
"[externals]/pg [external] (pg, esm_import, [project]/node_modules/pg)", ((__turbopack_context__) => {
"use strict";

return __turbopack_context__.a(async (__turbopack_handle_async_dependencies__, __turbopack_async_result__) => { try {
var mod = await __turbopack_context__.y("pg-587764f78a6c7a9c");

__turbopack_context__.n(mod);
__turbopack_async_result__();
} catch(e) { __turbopack_async_result__(e); } }, true);}),
"[project]/node_modules/nanoid/index.js [app-rsc] (ecmascript) <locals>", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "customAlphabet",
    ()=>customAlphabet,
    "customRandom",
    ()=>customRandom,
    "nanoid",
    ()=>nanoid,
    "random",
    ()=>random
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$nanoid$2f$url$2d$alphabet$2f$index$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/nanoid/url-alphabet/index.js [app-rsc] (ecmascript)");
;
;
const GET_RANDOM_LIMIT = 65536;
function fillRandom(buffer) {
    let from = 0;
    while(from < buffer.length){
        let to = Math.min(from + GET_RANDOM_LIMIT, buffer.length);
        crypto.getRandomValues(buffer.subarray(from, to));
        from = to;
    }
}
function random(bytes) {
    bytes |= 0;
    if (bytes < 0) throw new RangeError('Wrong ID size');
    let buffer = Buffer.allocUnsafe(bytes);
    fillRandom(buffer);
    return buffer;
}
function customRandom(alphabet, defaultSize, getRandom) {
    let safeByteCutoff = 256 - 256 % alphabet.length;
    if (safeByteCutoff === 256) {
        let mask = alphabet.length - 1;
        return (size = defaultSize)=>{
            if (!size) return '';
            let id = '';
            while(true){
                let bytes = getRandom(size);
                let i = size;
                while(i--){
                    id += alphabet[bytes[i] & mask];
                    if (id.length >= size) return id;
                }
            }
        };
    }
    let step = Math.ceil(1.6 * 256 * defaultSize / safeByteCutoff);
    return (size = defaultSize)=>{
        if (!size) return '';
        let id = '';
        while(true){
            let bytes = getRandom(step);
            let i = step;
            while(i--){
                if (bytes[i] < safeByteCutoff) {
                    id += alphabet[bytes[i] % alphabet.length];
                    if (id.length >= size) return id;
                }
            }
        }
    };
}
const POOL_MAX = GET_RANDOM_LIMIT / 2;
function customAlphabet(alphabet, defaultSize = 21) {
    if (typeof alphabet !== 'string' || !alphabet || alphabet.length > 256) {
        return customRandom(alphabet, defaultSize, random);
    }
    for(let i = 0; i < alphabet.length; i++){
        if (alphabet.charCodeAt(i) > 255) {
            return customRandom(alphabet, defaultSize, random);
        }
    }
    let charCodes = Uint8Array.from(alphabet, (str)=>{
        return str.charCodeAt(0);
    });
    let alphabetLen = alphabet.length;
    let mask = (2 << 31 - Math.clz32(alphabetLen - 1 | 1)) - 1;
    let pool = '';
    let poolOffset = 0;
    let poolNext = 0;
    return (size = defaultSize)=>{
        size |= 0;
        if (size < 0) throw new RangeError('Wrong ID size');
        if (size === 0) return '';
        if (poolOffset + size > pool.length) {
            let target = Math.max(poolNext, size);
            poolNext = Math.min(target * 16, POOL_MAX);
            let buffer = Buffer.allocUnsafe(target);
            if (mask === alphabetLen - 1) {
                fillRandom(buffer);
                for(let i = 0; i < target; i++){
                    buffer[i] = charCodes[buffer[i] & mask];
                }
            } else {
                let randomBytes = Buffer.allocUnsafe(Math.ceil(1.6 * (mask + 1) * target / alphabetLen));
                let accepted = 0;
                while(accepted < target){
                    fillRandom(randomBytes);
                    for(let i = 0; i < randomBytes.length; i++){
                        let index = randomBytes[i] & mask;
                        if (index < alphabetLen) {
                            buffer[accepted++] = charCodes[index];
                            if (accepted === target) break;
                        }
                    }
                }
            }
            pool = buffer.toString('latin1');
            poolOffset = 0;
        }
        poolOffset += size;
        return pool.substring(poolOffset - size, poolOffset);
    };
}
const nanoid = customAlphabet(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$nanoid$2f$url$2d$alphabet$2f$index$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["urlAlphabet"]);
}),
"[project]/node_modules/nanoid/url-alphabet/index.js [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "urlAlphabet",
    ()=>urlAlphabet
]);
let urlAlphabet = 'useandom-26T198340PX75pxJACKVERYMINDBUSHWOLF_GQZbfghjklqvwyzrict';
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__0ehz6ur._.js.map