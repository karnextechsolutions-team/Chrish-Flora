// lib/delivery.ts

/**
 * Haversine formula to calculate distance between two lat/lng points in km
 */
export function calculateDistanceKm(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 6371; // Earth radius in km
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number) {
  return deg * (Math.PI / 180);
}

/**
 * Calculate delivery charge based on admin-defined pricing matrix
 */
export function calculateDeliveryCharge(
  distanceKm: number,
  baseRate: number,
  baseDistanceKm: number,
  ratePerAdditionalKm: number
): number {
  if (distanceKm <= baseDistanceKm) {
    return baseRate;
  }
  const additionalKm = distanceKm - baseDistanceKm;
  return baseRate + additionalKm * ratePerAdditionalKm;
}

/**
 * Reverse geocode using Nominatim (OpenStreetMap)
 */
export async function reverseGeocode(lat: number, lng: number): Promise<{
  street: string;
  city: string;
  postcode: string;
  display_name: string;
} | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
      { headers: { 'Accept-Language': 'en' } }
    );
    const data = await res.json();
    return {
      street: [data.address?.road, data.address?.house_number]
        .filter(Boolean).join(' '),
      city: data.address?.city || data.address?.town || data.address?.village || '',
      postcode: data.address?.postcode || '',
      display_name: data.display_name || '',
    };
  } catch {
    return null;
  }
}
