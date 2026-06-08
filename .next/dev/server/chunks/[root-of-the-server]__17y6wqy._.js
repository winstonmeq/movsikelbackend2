module.exports = [
"[externals]/next/dist/compiled/next-server/app-route-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-route-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/next-server/app-route-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-route-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[externals]/next/dist/compiled/@opentelemetry/api [external] (next/dist/compiled/@opentelemetry/api, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/@opentelemetry/api", () => require("next/dist/compiled/@opentelemetry/api"));

module.exports = mod;
}),
"[externals]/next/dist/compiled/next-server/app-page-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-page-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/work-unit-async-storage.external.js [external] (next/dist/server/app-render/work-unit-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/work-unit-async-storage.external.js", () => require("next/dist/server/app-render/work-unit-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/work-async-storage.external.js [external] (next/dist/server/app-render/work-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/work-async-storage.external.js", () => require("next/dist/server/app-render/work-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/shared/lib/no-fallback-error.external.js [external] (next/dist/shared/lib/no-fallback-error.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/shared/lib/no-fallback-error.external.js", () => require("next/dist/shared/lib/no-fallback-error.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/after-task-async-storage.external.js [external] (next/dist/server/app-render/after-task-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/after-task-async-storage.external.js", () => require("next/dist/server/app-render/after-task-async-storage.external.js"));

module.exports = mod;
}),
"[project]/lib/http.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "fail",
    ()=>fail,
    "ok",
    ()=>ok
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/server.js [app-route] (ecmascript)");
;
function ok(data, status = 200) {
    return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
        ok: true,
        data
    }, {
        status
    });
}
function fail(message, status = 400) {
    return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
        ok: false,
        error: message
    }, {
        status
    });
}
}),
"[project]/app/api/places/autocomplete/route.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "GET",
    ()=>GET
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$http$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/http.ts [app-route] (ecmascript)");
;
const MIN_QUERY_LENGTH = 3;
const MAX_RESULTS = 5;
function cleanSessionToken(value) {
    const token = (value || '').trim();
    return token.length > 0 && token.length <= 128 ? token : null;
}
async function GET(req) {
    try {
        const key = process.env.GOOGLE_MAPS_API_KEY;
        if (!key) return (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$http$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["fail"])('Missing GOOGLE_MAPS_API_KEY', 500);
        const { searchParams } = new URL(req.url);
        const input = (searchParams.get('input') || '').trim();
        const lat = searchParams.get('lat');
        const lng = searchParams.get('lng');
        const sessionToken = cleanSessionToken(searchParams.get('sessionToken'));
        // Cost guard: do not call Google Places for very short input.
        if (input.length < MIN_QUERY_LENGTH) return (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$http$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["ok"])({
            predictions: []
        });
        const params = new URLSearchParams({
            input,
            key,
            components: 'country:ph'
        });
        // Session tokens group autocomplete + place details into one search session.
        if (sessionToken) params.set('sessiontoken', sessionToken);
        if (lat && lng) {
            params.set('location', `${lat},${lng}`);
            params.set('radius', '30000');
        }
        const response = await fetch(`https://maps.googleapis.com/maps/api/place/autocomplete/json?${params.toString()}`);
        const json = await response.json();
        if (json.status !== 'OK' && json.status !== 'ZERO_RESULTS') {
            return (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$http$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["fail"])(json.error_message || `Places error: ${json.status}`, 502);
        }
        return (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$http$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["ok"])({
            predictions: (json.predictions || []).slice(0, MAX_RESULTS).map((p)=>({
                    placeId: p.place_id,
                    description: p.description,
                    mainText: p.structured_formatting?.main_text,
                    secondaryText: p.structured_formatting?.secondary_text
                })),
            minQueryLength: MIN_QUERY_LENGTH,
            maxResults: MAX_RESULTS
        });
    } catch (err) {
        return (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$http$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["fail"])(err instanceof Error ? err.message : 'Places autocomplete failed');
    }
}
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__17y6wqy._.js.map