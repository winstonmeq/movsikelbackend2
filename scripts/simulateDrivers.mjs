#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';

const defaultConfigPath = path.join(process.cwd(), 'scripts', 'simulated-drivers.local.json');
const configPath = process.env.SIM_DRIVERS_CONFIG
  ? path.resolve(process.env.SIM_DRIVERS_CONFIG)
  : defaultConfigPath;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function normalizeBaseUrl(value) {
  return String(value || '').replace(/\/+$/, '');
}

function toRadians(value) {
  return (value * Math.PI) / 180;
}

function metersToLatitude(meters) {
  return meters / 111_320;
}

function metersToLongitude(meters, latitude) {
  return meters / (111_320 * Math.cos(toRadians(latitude)));
}

function formatCoordinate(value) {
  return Number(value.toFixed(7));
}

function getDriverLabel(driver, index) {
  return driver.name || driver.phone || `Driver ${index + 1}`;
}

function calculatePosition(driver, index, total, config, tick) {
  if (typeof driver.lat === 'number' && typeof driver.lng === 'number' && driver.lockPosition === true) {
    return {
      lat: driver.lat,
      lng: driver.lng,
      heading: typeof driver.heading === 'number' ? driver.heading : 0
    };
  }

  const center =
    typeof driver.lat === 'number' && typeof driver.lng === 'number'
      ? { lat: driver.lat, lng: driver.lng }
      : config.center;
  const spreadRadius = Math.max(0, Number(config.radiusMeters ?? 1000));
  const movementMeters = Math.max(0, Number(config.movementMeters ?? 0));
  const angle = (2 * Math.PI * index) / Math.max(total, 1);
  const radius =
    typeof driver.lat === 'number' && typeof driver.lng === 'number'
      ? 0
      : spreadRadius * (0.35 + (0.65 * ((index % 5) + 1)) / 5);
  const driftAngle = angle + tick * 0.16;
  const northMeters = Math.cos(angle) * radius + Math.cos(driftAngle) * movementMeters;
  const eastMeters = Math.sin(angle) * radius + Math.sin(driftAngle) * movementMeters;
  const heading = (Math.round((driftAngle * 180) / Math.PI) + 360) % 360;

  return {
    lat: formatCoordinate(center.lat + metersToLatitude(northMeters)),
    lng: formatCoordinate(center.lng + metersToLongitude(eastMeters, center.lat)),
    heading
  };
}

async function readConfig() {
  let raw;
  try {
    raw = await fs.readFile(configPath, 'utf8');
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;

    console.error(`Missing config file: ${configPath}`);
    console.error('');
    console.error('Create one from the example, then add your test driver phones/passwords:');
    console.error('  Copy-Item scripts\\simulated-drivers.example.json scripts\\simulated-drivers.local.json');
    process.exit(1);
  }

  const config = JSON.parse(raw);
  config.apiBaseUrl = normalizeBaseUrl(config.apiBaseUrl);

  if (!config.apiBaseUrl) throw new Error('apiBaseUrl is required.');
  if (!config.center || typeof config.center.lat !== 'number' || typeof config.center.lng !== 'number') {
    throw new Error('center.lat and center.lng are required numbers.');
  }
  if (!Array.isArray(config.drivers) || config.drivers.length === 0) {
    throw new Error('drivers must contain at least one test driver.');
  }

  config.locationIntervalMs = Math.max(1000, Number(config.locationIntervalMs ?? 5000));
  return config;
}

async function apiRequest(config, route, options = {}) {
  const response = await fetch(`${config.apiBaseUrl}${route}`, {
    method: options.method ?? 'POST',
    headers: {
      'content-type': 'application/json',
      ...(options.token ? { authorization: `Bearer ${options.token}` } : {})
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;

  if (!response.ok || payload?.ok === false) {
    const message = payload?.error || payload?.message || text || response.statusText;
    throw new Error(`${response.status} ${message}`);
  }

  return payload?.data ?? payload;
}

async function loginDriver(config, driver, index) {
  const password = driver.password || config.defaultPassword;
  if (!driver.phone || !password) {
    throw new Error(`${getDriverLabel(driver, index)} needs phone and password/defaultPassword.`);
  }

  const data = await apiRequest(config, '/api/auth/login', {
    body: {
      phone: driver.phone,
      password,
      role: 'driver'
    }
  });

  if (!data?.token) throw new Error(`${getDriverLabel(driver, index)} login did not return token.`);

  return {
    index,
    driver,
    label: getDriverLabel(driver, index),
    token: data.token,
    userId: data.user?.id
  };
}

async function setAvailability(config, session, online, position) {
  await apiRequest(config, '/api/driver/availability', {
    token: session.token,
    body: online
      ? {
          online: true,
          lat: position.lat,
          lng: position.lng,
          heading: position.heading
        }
      : { online: false }
  });
}

async function sendLocation(config, session, position) {
  await apiRequest(config, '/api/driver/location', {
    token: session.token,
    body: {
      lat: position.lat,
      lng: position.lng,
      heading: position.heading
    }
  });
}

async function setAllOffline(config, sessions) {
  if (sessions.length === 0) return;

  console.log('');
  console.log(`Setting ${sessions.length} simulated driver(s) offline...`);
  const results = await Promise.allSettled(
    sessions.map((session) => setAvailability(config, session, false, null).then(() => session.label))
  );
  const offlineCount = results.filter((result) => result.status === 'fulfilled').length;
  console.log(`Offline cleanup complete: ${offlineCount}/${sessions.length}`);
}

async function main() {
  const config = await readConfig();
  const sessions = [];
  let stopping = false;
  let tick = 0;

  const stop = async () => {
    if (stopping) return;
    stopping = true;
    await setAllOffline(config, sessions);
    process.exit(0);
  };

  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);

  console.log(`API: ${config.apiBaseUrl}`);
  console.log(`Preparing ${config.drivers.length} simulated driver(s).`);
  console.log(`Center: ${config.center.lat}, ${config.center.lng}`);
  console.log(`Radius: ${config.radiusMeters ?? 1000}m`);
  console.log(`Interval: ${config.locationIntervalMs}ms`);
  console.log('');

  for (let index = 0; index < config.drivers.length; index += 1) {
    const driver = config.drivers[index];
    const label = getDriverLabel(driver, index);
    try {
      const session = await loginDriver(config, driver, index);
      const position = calculatePosition(driver, index, config.drivers.length, config, tick);
      await setAvailability(config, session, true, position);
      sessions.push(session);
      console.log(`ONLINE ${label} @ ${position.lat}, ${position.lng}`);
    } catch (error) {
      console.error(`FAILED ${label}: ${error.message}`);
    }
  }

  if (sessions.length === 0) throw new Error('No drivers are online. Check credentials and API URL.');

  console.log('');
  console.log('Simulator running. Press Ctrl+C to set these drivers offline.');

  while (!stopping) {
    tick += 1;
    const results = await Promise.allSettled(
      sessions.map((session) => {
        const position = calculatePosition(session.driver, session.index, config.drivers.length, config, tick);
        return sendLocation(config, session, position);
      })
    );
    const okCount = results.filter((result) => result.status === 'fulfilled').length;
    const failedCount = results.length - okCount;
    console.log(
      `tick ${tick}: ${okCount}/${sessions.length} location update(s) sent${
        failedCount ? `, ${failedCount} failed` : ''
      }`
    );
    await sleep(config.locationIntervalMs);
  }
}

main().catch((error) => {
  console.error(`Simulator failed: ${error.message}`);
  process.exit(1);
});
