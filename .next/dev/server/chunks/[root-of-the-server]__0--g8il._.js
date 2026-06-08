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
"[project]/lib/geo.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "estimateDurationSeconds",
    ()=>estimateDurationSeconds,
    "haversineDistanceMeters",
    ()=>haversineDistanceMeters,
    "isValidLatLng",
    ()=>isValidLatLng,
    "toPoint",
    ()=>toPoint
]);
function toPoint(location) {
    return {
        type: 'Point',
        coordinates: [
            location.lng,
            location.lat
        ]
    };
}
function isValidLatLng(value) {
    return Number.isFinite(value.lat) && Number.isFinite(value.lng) && value.lat >= -90 && value.lat <= 90 && value.lng >= -180 && value.lng <= 180;
}
function haversineDistanceMeters(a, b) {
    const earthRadiusMeters = 6371000;
    const dLat = degToRad(b.lat - a.lat);
    const dLng = degToRad(b.lng - a.lng);
    const lat1 = degToRad(a.lat);
    const lat2 = degToRad(b.lat);
    const h = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return earthRadiusMeters * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}
function estimateDurationSeconds(distanceMeters, averageKph = Number(process.env.TRICYCLE_AVERAGE_KPH || 20)) {
    const safeKph = Number.isFinite(averageKph) && averageKph > 0 ? averageKph : 20;
    const km = Math.max(distanceMeters / 1000, 0.1);
    return Math.max(Math.round(km / safeKph * 3600), 60);
}
function degToRad(deg) {
    return deg * Math.PI / 180;
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
"[project]/models/User.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "User",
    ()=>User
]);
var __TURBOPACK__imported__module__$5b$externals$5d2f$mongoose__$5b$external$5d$__$28$mongoose$2c$__cjs$2c$__$5b$project$5d2f$node_modules$2f$mongoose$29$__ = __turbopack_context__.i("[externals]/mongoose [external] (mongoose, cjs, [project]/node_modules/mongoose)");
;
const pointSchema = new __TURBOPACK__imported__module__$5b$externals$5d2f$mongoose__$5b$external$5d$__$28$mongoose$2c$__cjs$2c$__$5b$project$5d2f$node_modules$2f$mongoose$29$__["default"].Schema({
    type: {
        type: String,
        enum: [
            'Point'
        ],
        default: 'Point'
    },
    coordinates: {
        type: [
            Number
        ],
        required: true
    }
}, {
    _id: false
});
const userSchema = new __TURBOPACK__imported__module__$5b$externals$5d2f$mongoose__$5b$external$5d$__$28$mongoose$2c$__cjs$2c$__$5b$project$5d2f$node_modules$2f$mongoose$29$__["default"].Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    phone: {
        type: String,
        required: true,
        unique: true,
        index: true,
        trim: true
    },
    passwordHash: {
        type: String,
        required: true
    },
    role: {
        type: String,
        enum: [
            'passenger',
            'driver'
        ],
        required: true,
        index: true
    },
    homeBarangay: {
        type: String,
        trim: true
    },
    homeAddress: {
        type: String,
        trim: true
    },
    vehicleType: {
        type: String,
        default: 'Tricycle'
    },
    plateNumber: {
        type: String
    },
    tricycleNumber: {
        type: String
    },
    online: {
        type: Boolean,
        default: false,
        index: true
    },
    currentLocation: {
        type: pointSchema
    },
    heading: {
        type: Number
    }
}, {
    timestamps: true
});
userSchema.index({
    currentLocation: '2dsphere'
});
const User = __TURBOPACK__imported__module__$5b$externals$5d2f$mongoose__$5b$external$5d$__$28$mongoose$2c$__cjs$2c$__$5b$project$5d2f$node_modules$2f$mongoose$29$__["default"].models.User || __TURBOPACK__imported__module__$5b$externals$5d2f$mongoose__$5b$external$5d$__$28$mongoose$2c$__cjs$2c$__$5b$project$5d2f$node_modules$2f$mongoose$29$__["default"].model('User', userSchema);
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
"[project]/lib/dummyDriver.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "dummyDriverEnabled",
    ()=>dummyDriverEnabled,
    "ensureDummyDriverNearPickup",
    ()=>ensureDummyDriverNearPickup,
    "prepareDummyDriverCandidate",
    ()=>prepareDummyDriverCandidate,
    "scheduleDummyRideSimulation",
    ()=>scheduleDummyRideSimulation
]);
var __TURBOPACK__imported__module__$5b$externals$5d2f$mongoose__$5b$external$5d$__$28$mongoose$2c$__cjs$2c$__$5b$project$5d2f$node_modules$2f$mongoose$29$__ = __turbopack_context__.i("[externals]/mongoose [external] (mongoose, cjs, [project]/node_modules/mongoose)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$geo$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/geo.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$realtime$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/realtime.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$models$2f$User$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/models/User.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$models$2f$Ride$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/models/Ride.ts [app-route] (ecmascript)");
;
;
;
;
;
const DUMMY_PHONE = '09000000000';
const DUMMY_NAME = 'Juan Demo Driver';
const sleep = (ms)=>new Promise((resolve)=>setTimeout(resolve, ms));
const runningSimulations = new Set();
function dummyDriverEnabled() {
    return String(process.env.DUMMY_DRIVER_ENABLED || '').toLowerCase() === 'true';
}
function numberFromEnv(name, fallback) {
    const value = Number(process.env[name]);
    return Number.isFinite(value) && value > 0 ? value : fallback;
}
function driverStartNearPickup(pickup) {
    // Roughly 300-450 meters away, enough to visibly move on the map.
    return {
        lat: pickup.lat + 0.0028,
        lng: pickup.lng + 0.0028
    };
}
function bearing(from, to) {
    const lat1 = from.lat * Math.PI / 180;
    const lat2 = to.lat * Math.PI / 180;
    const deltaLng = (to.lng - from.lng) * Math.PI / 180;
    const y = Math.sin(deltaLng) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLng);
    return Math.atan2(y, x) * 180 / Math.PI;
}
function interpolate(from, to, step, totalSteps) {
    const ratio = step / totalSteps;
    return {
        lat: from.lat + (to.lat - from.lat) * ratio,
        lng: from.lng + (to.lng - from.lng) * ratio
    };
}
function publicDriver(driver) {
    return {
        _id: String(driver._id),
        id: String(driver._id),
        name: driver.name,
        phone: driver.phone,
        vehicleType: driver.vehicleType,
        plateNumber: driver.plateNumber,
        tricycleNumber: driver.tricycleNumber,
        currentLocation: driver.currentLocation,
        heading: driver.heading
    };
}
async function updateDummyLocation(driverId, location, heading) {
    return __TURBOPACK__imported__module__$5b$project$5d2f$models$2f$User$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["User"].findByIdAndUpdate(driverId, {
        online: true,
        currentLocation: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$geo$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["toPoint"])(location),
        heading
    }, {
        returnDocument: 'after'
    }).select('name phone vehicleType plateNumber tricycleNumber currentLocation heading');
}
async function ensureDummyDriverNearPickup(pickup) {
    const start = driverStartNearPickup(pickup);
    const driver = await __TURBOPACK__imported__module__$5b$project$5d2f$models$2f$User$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["User"].findOneAndUpdate({
        phone: DUMMY_PHONE
    }, {
        $setOnInsert: {
            name: DUMMY_NAME,
            phone: DUMMY_PHONE,
            passwordHash: 'dummy-driver-not-for-login',
            role: 'driver',
            vehicleType: 'Tricycle',
            plateNumber: 'DEMO-001',
            tricycleNumber: 'MSK-001'
        },
        $set: {
            online: true,
            currentLocation: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$geo$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["toPoint"])(start),
            heading: bearing(start, pickup)
        }
    }, {
        upsert: true,
        returnDocument: 'after'
    }).select('name phone role vehicleType plateNumber tricycleNumber currentLocation heading');
    return driver;
}
async function latestRide(rideId) {
    if (!__TURBOPACK__imported__module__$5b$externals$5d2f$mongoose__$5b$external$5d$__$28$mongoose$2c$__cjs$2c$__$5b$project$5d2f$node_modules$2f$mongoose$29$__["default"].Types.ObjectId.isValid(rideId)) return null;
    return __TURBOPACK__imported__module__$5b$project$5d2f$models$2f$Ride$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["Ride"].findById(rideId);
}
async function emitRideUpdate(rideId, driver, extra = {}) {
    const ride = await latestRide(rideId);
    if (!ride) return null;
    console.log(`[dummy-driver] ride ${rideId} status -> ${status}`);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$realtime$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["emitToUser"])(String(ride.passengerId), 'ride:update', {
        ride,
        driver: publicDriver(driver),
        simulator: true,
        ...extra
    });
    return ride;
}
async function setRideStatus(rideId, status1, driver) {
    const updates = {
        status: status1
    };
    if (status1 === 'accepted') updates.acceptedAt = new Date();
    if (status1 === 'arrived') updates.arrivedAt = new Date();
    if (status1 === 'in_progress') updates.startedAt = new Date();
    if (status1 === 'completed') updates.completedAt = new Date();
    if (status1 === 'cancelled') updates.cancelledAt = new Date();
    const ride = await __TURBOPACK__imported__module__$5b$project$5d2f$models$2f$Ride$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["Ride"].findByIdAndUpdate(rideId, updates, {
        returnDocument: 'after'
    });
    if (!ride) return null;
    console.log(`[dummy-driver] ride ${rideId} status -> ${status1}`);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$realtime$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["emitToUser"])(String(ride.passengerId), 'ride:update', {
        ride,
        driver: publicDriver(driver),
        simulator: true
    });
    return ride;
}
async function shouldContinue(rideId) {
    const ride = await latestRide(rideId);
    return Boolean(ride && [
        'requested',
        'accepted',
        'arrived',
        'in_progress'
    ].includes(ride.status));
}
async function moveDriver(rideId, driverId, from, to, status1, steps, delayMs) {
    for(let step = 1; step <= steps; step += 1){
        if (!await shouldContinue(rideId)) return null;
        const location = interpolate(from, to, step, steps);
        const heading = bearing(from, to);
        const driver = await updateDummyLocation(driverId, location, heading);
        const ride = await latestRide(rideId);
        if (driver && ride) {
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$realtime$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["emitToUser"])(String(ride.passengerId), 'ride:driver_location', {
                rideId: String(ride._id),
                lat: location.lat,
                lng: location.lng,
                heading,
                status: status1
            });
        }
        await sleep(delayMs);
    }
    return to;
}
async function prepareDummyDriverCandidate(rideId) {
    const ride = await latestRide(rideId);
    if (!ride) return null;
    if (ride.status === 'completed' || ride.status === 'cancelled') return null;
    const pickup = {
        lat: ride.pickup.lat,
        lng: ride.pickup.lng
    };
    const driver = await ensureDummyDriverNearPickup(pickup);
    const driverId = driver._id;
    const existing = (ride.candidateDriverIds || []).map(String);
    if (!existing.includes(String(driverId))) {
        ride.candidateDriverIds = [
            ...existing,
            String(driverId)
        ].map((id)=>new __TURBOPACK__imported__module__$5b$externals$5d2f$mongoose__$5b$external$5d$__$28$mongoose$2c$__cjs$2c$__$5b$project$5d2f$node_modules$2f$mongoose$29$__["default"].Types.ObjectId(id));
        await ride.save();
    }
    await emitRideUpdate(rideId, driver, {
        message: 'Dummy driver simulation is ready.'
    });
    return driver;
}
function scheduleDummyRideSimulation(rideId, options = {}) {
    if (!options.force && !dummyDriverEnabled()) return;
    if (runningSimulations.has(rideId)) return;
    runningSimulations.add(rideId);
    void runDummyRideSimulation(rideId).catch((err)=>{
        console.error('Dummy driver simulation failed:', err);
    }).finally(()=>{
        runningSimulations.delete(rideId);
    });
}
async function runDummyRideSimulation(rideId) {
    const acceptDelayMs = numberFromEnv('DUMMY_DRIVER_ACCEPT_DELAY_MS', 2500);
    const statusDelayMs = numberFromEnv('DUMMY_DRIVER_STATUS_DELAY_MS', 1500);
    const moveDelayMs = numberFromEnv('DUMMY_DRIVER_MOVE_DELAY_MS', 900);
    const pickupSteps = numberFromEnv('DUMMY_DRIVER_PICKUP_STEPS', 10);
    const destinationSteps = numberFromEnv('DUMMY_DRIVER_DESTINATION_STEPS', 16);
    await sleep(acceptDelayMs);
    let ride = await latestRide(rideId);
    if (!ride || ride.status !== 'requested') return;
    const pickup = {
        lat: ride.pickup.lat,
        lng: ride.pickup.lng
    };
    const destination = {
        lat: ride.destination.lat,
        lng: ride.destination.lng
    };
    const start = driverStartNearPickup(pickup);
    let driver = await ensureDummyDriverNearPickup(pickup);
    const driverId = driver._id;
    ride.driverId = driverId;
    ride.status = 'accepted';
    ride.acceptedAt = new Date();
    ride.candidateDriverIds = [
        ...new Set([
            ...(ride.candidateDriverIds || []).map(String),
            String(driverId)
        ])
    ].map((id)=>new __TURBOPACK__imported__module__$5b$externals$5d2f$mongoose__$5b$external$5d$__$28$mongoose$2c$__cjs$2c$__$5b$project$5d2f$node_modules$2f$mongoose$29$__["default"].Types.ObjectId(id));
    await ride.save();
    console.log(`[dummy-driver] ride ${rideId} status -> accepted`);
    await emitRideUpdate(rideId, driver, {
        message: 'Dummy driver accepted the ride.'
    });
    await moveDriver(rideId, driverId, start, pickup, 'accepted', pickupSteps, moveDelayMs);
    if (!await shouldContinue(rideId)) return;
    driver = await updateDummyLocation(driverId, pickup, bearing(start, pickup));
    if (!driver) return;
    ride = await setRideStatus(rideId, 'arrived', driver);
    if (!ride) return;
    await sleep(statusDelayMs);
    if (!await shouldContinue(rideId)) return;
    ride = await setRideStatus(rideId, 'in_progress', driver);
    if (!ride) return;
    await moveDriver(rideId, driverId, pickup, destination, 'in_progress', destinationSteps, moveDelayMs);
    if (!await shouldContinue(rideId)) return;
    driver = await updateDummyLocation(driverId, destination, bearing(pickup, destination));
    if (!driver) return;
    await setRideStatus(rideId, 'completed', driver);
}
}),
"[project]/app/api/rides/request/route.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
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
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$geo$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/geo.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$realtime$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/realtime.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$dummyDriver$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/dummyDriver.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$models$2f$User$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/models/User.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$models$2f$Ride$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/models/Ride.ts [app-route] (ecmascript)");
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
const DUMMY_DRIVER_PHONE = '09000000000';
const locSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
    label: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().optional(),
    name: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().optional(),
    placeId: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().optional(),
    address: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().min(1),
    lat: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number(),
    lng: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number()
});
const schema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
    pickup: locSchema,
    destination: locSchema,
    rideType: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].enum([
        'shared',
        'book'
    ]).default('book'),
    offeredFare: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number().positive().optional(),
    distanceMeters: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number().optional(),
    durationSeconds: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number().optional(),
    searchRadiusMeters: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number().min(500).max(50000).optional()
});
function estimateFare(distanceMeters) {
    const perKm = Number(process.env.PER_KM_FARE_PHP || 2);
    const km = Math.max((distanceMeters || 0) / 1000, 0.1);
    return Math.round(km * perKm * 100) / 100;
}
function cleanMoney(value) {
    return Math.round(value * 100) / 100;
}
async function findNearbyRealDrivers(pickup, radiusMeters) {
    return __TURBOPACK__imported__module__$5b$project$5d2f$models$2f$User$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["User"].find({
        role: 'driver',
        online: true,
        phone: {
            $ne: DUMMY_DRIVER_PHONE
        },
        currentLocation: {
            $near: {
                $geometry: {
                    type: 'Point',
                    coordinates: [
                        pickup.lng,
                        pickup.lat
                    ]
                },
                $maxDistance: radiusMeters
            }
        }
    }).select('name phone vehicleType plateNumber tricycleNumber currentLocation heading').limit(10);
}
async function findAnyOnlineRealDrivers() {
    return __TURBOPACK__imported__module__$5b$project$5d2f$models$2f$User$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["User"].find({
        role: 'driver',
        online: true,
        phone: {
            $ne: DUMMY_DRIVER_PHONE
        },
        currentLocation: {
            $exists: true
        }
    }).select('name phone vehicleType plateNumber tricycleNumber currentLocation heading').sort({
        updatedAt: -1
    }).limit(10);
}
async function POST(req) {
    try {
        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["connectDb"])();
        const auth = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$auth$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getAuthUser"])(req);
        if (auth.role !== 'passenger') return (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$http$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["fail"])('Only passengers can request rides', 403);
        const body = schema.parse(await req.json());
        if (!(0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$geo$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["isValidLatLng"])(body.pickup) || !(0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$geo$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["isValidLatLng"])(body.destination)) {
            return (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$http$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["fail"])('Invalid pickup or destination coordinates');
        }
        const simulatorEnabled = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$dummyDriver$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["dummyDriverEnabled"])();
        const radiusMeters = body.searchRadiusMeters || Number(process.env.DRIVER_SEARCH_RADIUS_METERS || 15000);
        const driversForRequest = [
            ...await findNearbyRealDrivers(body.pickup, radiusMeters)
        ];
        let searchExpanded = false;
        // Development/testing fallback: if your emulator phone location is not close to the pickup,
        // still send the request to online real drivers. Disable with DISPATCH_ALL_ONLINE_DRIVERS_IF_NONE_NEARBY=false.
        if (!simulatorEnabled && driversForRequest.length === 0 && String(process.env.DISPATCH_ALL_ONLINE_DRIVERS_IF_NONE_NEARBY || 'true').toLowerCase() === 'true') {
            const onlineDrivers = await findAnyOnlineRealDrivers();
            driversForRequest.push(...onlineDrivers);
            searchExpanded = onlineDrivers.length > 0;
        }
        if (simulatorEnabled) {
            const dummyDriver = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$dummyDriver$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["ensureDummyDriverNearPickup"])(body.pickup);
            const alreadyIncluded = driversForRequest.some((driver)=>String(driver._id) === String(dummyDriver._id));
            if (!alreadyIncluded) driversForRequest.unshift(dummyDriver);
        }
        const candidateDriverIds = driversForRequest.map((driver)=>driver._id);
        const fareEstimate = estimateFare(body.distanceMeters);
        if (body.rideType === 'book' && (!body.offeredFare || body.offeredFare <= 0)) {
            return (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$http$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["fail"])('Fare offer is required for Booking Ride.');
        }
        const offeredFare = body.rideType === 'book' && body.offeredFare ? cleanMoney(body.offeredFare) : undefined;
        const ride = await __TURBOPACK__imported__module__$5b$project$5d2f$models$2f$Ride$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["Ride"].create({
            passengerId: new __TURBOPACK__imported__module__$5b$externals$5d2f$mongoose__$5b$external$5d$__$28$mongoose$2c$__cjs$2c$__$5b$project$5d2f$node_modules$2f$mongoose$29$__["default"].Types.ObjectId(auth.sub),
            pickup: body.pickup,
            destination: body.destination,
            status: 'requested',
            rideType: body.rideType,
            fareEstimate,
            offeredFare,
            distanceMeters: body.distanceMeters,
            durationSeconds: body.durationSeconds,
            candidateDriverIds
        });
        const payload = {
            ride,
            passenger: {
                id: auth.sub,
                name: auth.name,
                phone: auth.phone
            },
            nearbyDrivers: driversForRequest,
            simulator: simulatorEnabled,
            searchExpanded
        };
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$realtime$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["emitToUsers"])(candidateDriverIds.map(String), 'ride:request', payload);
        if (simulatorEnabled) {
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$dummyDriver$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["scheduleDummyRideSimulation"])(String(ride._id));
        }
        return (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$http$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["ok"])({
            ride,
            notifiedDrivers: driversForRequest.length,
            searchExpanded,
            simulator: simulatorEnabled ? {
                enabled: true,
                message: 'Dummy driver will accept this ride automatically.'
            } : {
                enabled: false
            }
        }, 201);
    } catch (err) {
        return (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$http$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["fail"])(err instanceof Error ? err.message : 'Ride request failed');
    }
}
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__0--g8il._.js.map