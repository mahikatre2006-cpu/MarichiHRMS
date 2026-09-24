/**
 * Haversine formula to compute great-circle distance between two GPS coordinates in meters.
 */
export function calculateDistanceInMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Earth radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Validate whether a punch coordinate falls within a location's configured geofence radius.
 * Returns { isInside: boolean, distanceMeters: number }
 */
export function validateGeofence(punchLat, punchLon, locationLat, locationLon, radiusMeters = 200) {
  if (
    punchLat === undefined ||
    punchLat === null ||
    punchLon === undefined ||
    punchLon === null ||
    locationLat === undefined ||
    locationLat === null ||
    locationLon === undefined ||
    locationLon === null
  ) {
    return {
      isInside: false,
      distanceMeters: null,
      error: 'Coordinates incomplete for geofence validation'
    };
  }

  const pLat = parseFloat(punchLat);
  const pLon = parseFloat(punchLon);
  const lLat = parseFloat(locationLat);
  const lLon = parseFloat(locationLon);
  const radius = parseFloat(radiusMeters);

  if (isNaN(pLat) || isNaN(pLon) || isNaN(lLat) || isNaN(lLon)) {
    return {
      isInside: false,
      distanceMeters: null,
      error: 'Invalid coordinate numbers'
    };
  }

  const distance = calculateDistanceInMeters(pLat, pLon, lLat, lLon);
  return {
    isInside: distance <= radius,
    distanceMeters: Math.round(distance),
    radiusMeters: radius
  };
}
