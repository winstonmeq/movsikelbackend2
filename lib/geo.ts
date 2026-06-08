export type LatLng = { lat: number; lng: number };

export function toPoint(location: LatLng) {
  return {
    type: 'Point' as const,
    coordinates: [location.lng, location.lat]
  };
}

export function isValidLatLng(value: LatLng) {
  return (
    Number.isFinite(value.lat) &&
    Number.isFinite(value.lng) &&
    value.lat >= -90 &&
    value.lat <= 90 &&
    value.lng >= -180 &&
    value.lng <= 180
  );
}

export function haversineDistanceMeters(a: LatLng, b: LatLng) {
  const earthRadiusMeters = 6371000;
  const dLat = degToRad(b.lat - a.lat);
  const dLng = degToRad(b.lng - a.lng);
  const lat1 = degToRad(a.lat);
  const lat2 = degToRad(b.lat);
  const h =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return earthRadiusMeters * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export function estimateDurationSeconds(distanceMeters: number, averageKph = Number(process.env.TRICYCLE_AVERAGE_KPH || 20)) {
  const safeKph = Number.isFinite(averageKph) && averageKph > 0 ? averageKph : 20;
  const km = Math.max(distanceMeters / 1000, 0.1);
  return Math.max(Math.round((km / safeKph) * 3600), 60);
}

function degToRad(deg: number) {
  return (deg * Math.PI) / 180;
}
