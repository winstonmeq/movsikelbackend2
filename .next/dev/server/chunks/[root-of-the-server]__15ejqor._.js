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
"[project]/lib/db.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "connectDb",
    ()=>connectDb
]);
var __TURBOPACK__imported__module__$5b$externals$5d2f$mongoose__$5b$external$5d$__$28$mongoose$2c$__cjs$2c$__$5b$project$5d2f$node_modules$2f$mongoose$29$__ = __turbopack_context__.i("[externals]/mongoose [external] (mongoose, cjs, [project]/node_modules/mongoose)");
;
async function connectDb() {
    const uri = process.env.MONGODB_URI;
    if (!uri) throw new Error('Missing MONGODB_URI');
    if (!/*TURBOPACK member replacement*/ __turbopack_context__.g.mongooseConnection) {
        /*TURBOPACK member replacement*/ __turbopack_context__.g.mongooseConnection = __TURBOPACK__imported__module__$5b$externals$5d2f$mongoose__$5b$external$5d$__$28$mongoose$2c$__cjs$2c$__$5b$project$5d2f$node_modules$2f$mongoose$29$__["default"].connect(uri, {
            dbName: 'movsikel'
        });
    }
    return /*TURBOPACK member replacement*/ __turbopack_context__.g.mongooseConnection;
}
}),
"[project]/lib/auth.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "getAuthUser",
    ()=>getAuthUser,
    "signToken",
    ()=>signToken,
    "verifyToken",
    ()=>verifyToken
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jose$2f$dist$2f$webapi$2f$jwt$2f$sign$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/jose/dist/webapi/jwt/sign.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jose$2f$dist$2f$webapi$2f$jwt$2f$verify$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/jose/dist/webapi/jwt/verify.js [app-route] (ecmascript)");
;
const encoder = new TextEncoder();
function getSecret() {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error('Missing JWT_SECRET');
    return encoder.encode(secret);
}
async function signToken(payload) {
    return new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jose$2f$dist$2f$webapi$2f$jwt$2f$sign$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["SignJWT"](payload).setProtectedHeader({
        alg: 'HS256'
    }).setIssuedAt().setExpirationTime('30d').sign(getSecret());
}
async function verifyToken(token) {
    const result = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jose$2f$dist$2f$webapi$2f$jwt$2f$verify$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["jwtVerify"])(token, getSecret());
    const p = result.payload;
    if (!p.sub || !p.role || !p.name || !p.phone) throw new Error('Invalid token');
    return {
        sub: String(p.sub),
        role: p.role,
        name: String(p.name),
        phone: String(p.phone)
    };
}
async function getAuthUser(req) {
    const header = req.headers.get('authorization') || '';
    const token = header.startsWith('Bearer ') ? header.slice('Bearer '.length) : null;
    if (!token) throw new Error('Missing bearer token');
    return verifyToken(token);
}
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
"[project]/lib/realtime.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

// Socket.IO has been removed from the backend.
// These helpers are intentionally kept as safe no-ops so existing route files
// can keep calling emitToUser/emitToUsers until Firebase Cloud Messaging is wired in.
//
// Later, replace these functions with Firebase Admin SDK logic that sends FCM
// push notifications to the passenger/driver device tokens.
__turbopack_context__.s([
    "emitToUser",
    ()=>emitToUser,
    "emitToUsers",
    ()=>emitToUsers,
    "setRealtimeServer",
    ()=>setRealtimeServer
]);
function setRealtimeServer(_server) {
// No-op. Socket.IO is disabled.
}
function emitToUser(userId, event, payload) {
    if (process.env.REALTIME_DEBUG === 'true') {
        console.log('[realtime:no-socket]', {
            userId,
            event,
            payload
        });
    }
}
function emitToUsers(userIds, event, payload) {
    userIds.forEach((id)=>emitToUser(id, event, payload));
}
}),
"[project]/models/Ride.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Ride",
    ()=>Ride
]);
var __TURBOPACK__imported__module__$5b$externals$5d2f$mongoose__$5b$external$5d$__$28$mongoose$2c$__cjs$2c$__$5b$project$5d2f$node_modules$2f$mongoose$29$__ = __turbopack_context__.i("[externals]/mongoose [external] (mongoose, cjs, [project]/node_modules/mongoose)");
;
const locationSchema = new __TURBOPACK__imported__module__$5b$externals$5d2f$mongoose__$5b$external$5d$__$28$mongoose$2c$__cjs$2c$__$5b$project$5d2f$node_modules$2f$mongoose$29$__["default"].Schema({
    label: {
        type: String
    },
    name: {
        type: String
    },
    placeId: {
        type: String
    },
    address: {
        type: String,
        required: true
    },
    lat: {
        type: Number,
        required: true
    },
    lng: {
        type: Number,
        required: true
    }
}, {
    _id: false
});
const rideSchema = new __TURBOPACK__imported__module__$5b$externals$5d2f$mongoose__$5b$external$5d$__$28$mongoose$2c$__cjs$2c$__$5b$project$5d2f$node_modules$2f$mongoose$29$__["default"].Schema({
    passengerId: {
        type: __TURBOPACK__imported__module__$5b$externals$5d2f$mongoose__$5b$external$5d$__$28$mongoose$2c$__cjs$2c$__$5b$project$5d2f$node_modules$2f$mongoose$29$__["default"].Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    driverId: {
        type: __TURBOPACK__imported__module__$5b$externals$5d2f$mongoose__$5b$external$5d$__$28$mongoose$2c$__cjs$2c$__$5b$project$5d2f$node_modules$2f$mongoose$29$__["default"].Schema.Types.ObjectId,
        ref: 'User',
        index: true
    },
    pickup: {
        type: locationSchema,
        required: true
    },
    destination: {
        type: locationSchema,
        required: true
    },
    status: {
        type: String,
        enum: [
            'requested',
            'accepted',
            'arrived',
            'in_progress',
            'completed',
            'cancelled'
        ],
        default: 'requested',
        index: true
    },
    rideType: {
        type: String,
        enum: [
            'shared',
            'book'
        ],
        default: 'book',
        index: true
    },
    fareEstimate: {
        type: Number,
        required: true
    },
    offeredFare: {
        type: Number
    },
    distanceMeters: {
        type: Number
    },
    durationSeconds: {
        type: Number
    },
    candidateDriverIds: [
        {
            type: __TURBOPACK__imported__module__$5b$externals$5d2f$mongoose__$5b$external$5d$__$28$mongoose$2c$__cjs$2c$__$5b$project$5d2f$node_modules$2f$mongoose$29$__["default"].Schema.Types.ObjectId,
            ref: 'User'
        }
    ],
    acceptedAt: {
        type: Date
    },
    arrivedAt: {
        type: Date
    },
    startedAt: {
        type: Date
    },
    completedAt: {
        type: Date
    },
    cancelledAt: {
        type: Date
    }
}, {
    timestamps: true
});
const Ride = __TURBOPACK__imported__module__$5b$externals$5d2f$mongoose__$5b$external$5d$__$28$mongoose$2c$__cjs$2c$__$5b$project$5d2f$node_modules$2f$mongoose$29$__["default"].models.Ride || __TURBOPACK__imported__module__$5b$externals$5d2f$mongoose__$5b$external$5d$__$28$mongoose$2c$__cjs$2c$__$5b$project$5d2f$node_modules$2f$mongoose$29$__["default"].model('Ride', rideSchema);
}),
"[project]/app/api/driver/rides/[rideId]/status/route.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "POST",
    ()=>POST
]);
var __TURBOPACK__imported__module__$5b$externals$5d2f$mongoose__$5b$external$5d$__$28$mongoose$2c$__cjs$2c$__$5b$project$5d2f$node_modules$2f$mongoose$29$__ = __turbopack_context__.i("[externals]/mongoose [external] (mongoose, cjs, [project]/node_modules/mongoose)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__ = __turbopack_context__.i("[project]/node_modules/zod/v4/classic/external.js [app-route] (ecmascript) <export * as z>");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/db.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$auth$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/auth.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$http$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/http.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$realtime$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/realtime.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$models$2f$Ride$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/models/Ride.ts [app-route] (ecmascript)");
;
;
;
;
;
;
;
const allowedStatuses = [
    'arrived',
    'in_progress',
    'completed',
    'cancelled'
];
const schema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
    status: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].enum([
        'arrived',
        'in_progress',
        'completed',
        'cancelled'
    ])
});
async function POST(req, context) {
    try {
        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["connectDb"])();
        const auth = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$auth$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getAuthUser"])(req);
        if (auth.role !== 'driver') return (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$http$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["fail"])('Only drivers can update ride status', 403);
        const { rideId } = await context.params;
        if (!__TURBOPACK__imported__module__$5b$externals$5d2f$mongoose__$5b$external$5d$__$28$mongoose$2c$__cjs$2c$__$5b$project$5d2f$node_modules$2f$mongoose$29$__["default"].Types.ObjectId.isValid(rideId)) return (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$http$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["fail"])('Invalid ride id');
        const body = schema.parse(await req.json());
        if (!allowedStatuses.includes(body.status)) return (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$http$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["fail"])('Invalid status');
        const existingRide = await __TURBOPACK__imported__module__$5b$project$5d2f$models$2f$Ride$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["Ride"].findOne({
            _id: new __TURBOPACK__imported__module__$5b$externals$5d2f$mongoose__$5b$external$5d$__$28$mongoose$2c$__cjs$2c$__$5b$project$5d2f$node_modules$2f$mongoose$29$__["default"].Types.ObjectId(rideId),
            driverId: new __TURBOPACK__imported__module__$5b$externals$5d2f$mongoose__$5b$external$5d$__$28$mongoose$2c$__cjs$2c$__$5b$project$5d2f$node_modules$2f$mongoose$29$__["default"].Types.ObjectId(auth.sub)
        }).select('rideType status').lean();
        if (!existingRide) return (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$http$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["fail"])('Ride not found', 404);
        const requestedStatus = body.status;
        const nextStatus = existingRide.rideType === 'shared' && requestedStatus === 'arrived' ? 'completed' : requestedStatus;
        const updates = {
            status: nextStatus
        };
        if (requestedStatus === 'arrived') updates.arrivedAt = new Date();
        if (nextStatus === 'in_progress') updates.startedAt = new Date();
        if (nextStatus === 'completed') updates.completedAt = new Date();
        if (nextStatus === 'cancelled') updates.cancelledAt = new Date();
        const ride = await __TURBOPACK__imported__module__$5b$project$5d2f$models$2f$Ride$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["Ride"].findOneAndUpdate({
            _id: new __TURBOPACK__imported__module__$5b$externals$5d2f$mongoose__$5b$external$5d$__$28$mongoose$2c$__cjs$2c$__$5b$project$5d2f$node_modules$2f$mongoose$29$__["default"].Types.ObjectId(rideId),
            driverId: new __TURBOPACK__imported__module__$5b$externals$5d2f$mongoose__$5b$external$5d$__$28$mongoose$2c$__cjs$2c$__$5b$project$5d2f$node_modules$2f$mongoose$29$__["default"].Types.ObjectId(auth.sub),
            status: {
                $ne: 'completed'
            }
        }, updates, {
            returnDocument: 'after'
        }).populate('passengerId', 'name phone').lean();
        if (!ride) return (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$http$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["fail"])('Ride not found or already completed', 404);
        const update = {
            ride
        };
        const passengerId = String(ride.passengerId?._id || ride.passengerId);
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$realtime$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["emitToUser"])(passengerId, 'ride:update', update);
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$realtime$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["emitToUser"])(auth.sub, 'ride:update', update);
        return (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$http$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["ok"])(update);
    } catch (err) {
        return (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$http$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["fail"])(err instanceof Error ? err.message : 'Could not update ride status');
    }
}
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__15ejqor._.js.map