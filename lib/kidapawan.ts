export const KIDAPAWAN_BOUNDS = {
  minLat: 6.86,
  maxLat: 7.16,
  minLng: 124.94,
  maxLng: 125.24
};

export function isInsideKidapawan(lat: number, lng: number) {
  return (
    lat >= KIDAPAWAN_BOUNDS.minLat &&
    lat <= KIDAPAWAN_BOUNDS.maxLat &&
    lng >= KIDAPAWAN_BOUNDS.minLng &&
    lng <= KIDAPAWAN_BOUNDS.maxLng
  );
}
