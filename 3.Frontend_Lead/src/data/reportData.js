// THE-ASTRONOMICAN :: Orbital Path Payload (mock)
// -----------------------------------------------------------------------------
// Shape mirrors the Backend Lead's contract for GET /api/v1/orbital-path/:targetId
//
//   {
//     id, name, noradId, orbitType, status,
//     path: [ { latitude, longitude, altitudeKm, velocityKmS, timestamp } ]
//   }
//
// `path` is a time-ordered array of samples along one full ground track.
// This file is pure mock data so the UI renders correctly before the real
// backend endpoint is wired up — swap `fetchOrbitalPath()` for a real
// `fetch(...)` call against the backend without touching component code.
// -----------------------------------------------------------------------------

const EARTH_ROTATION_DEG_PER_MIN = 360 / 1436.07; // sidereal day, for nodal drift

/**
 * Generates a simplified sinusoidal ground track approximating a real
 * inclined orbit: latitude oscillates between +/- inclination, longitude
 * advances each sample and drifts westward relative to the ground due to
 * Earth's rotation beneath the orbit.
 */
function buildGroundTrack({
  inclinationDeg,
  altitudeKm,
  velocityKmS,
  periodMinutes,
  startLon,
  startTimeIso,
  sampleCount,
  altitudeJitterKm = 0,
}) {
  const startMs = new Date(startTimeIso).getTime();
  const points = [];

  for (let i = 0; i < sampleCount; i += 1) {
    const frac = i / (sampleCount - 1);
    const angle = frac * 2 * Math.PI;

    const latitude = inclinationDeg * Math.sin(angle);

    const orbitalLonTravel = frac * 360;
    const nodalDrift = frac * periodMinutes * EARTH_ROTATION_DEG_PER_MIN;
    let longitude = startLon + orbitalLonTravel - nodalDrift;
    longitude = ((longitude + 180) % 360 + 360) % 360 - 180;

    const altitudeKmSample = altitudeKm + Math.sin(angle * 3) * altitudeJitterKm;
    const timestamp = new Date(startMs + frac * periodMinutes * 60000).toISOString();

    points.push({
      latitude: Number(latitude.toFixed(4)),
      longitude: Number(longitude.toFixed(4)),
      altitudeKm: Number(altitudeKmSample.toFixed(2)),
      velocityKmS,
      timestamp,
    });
  }

  return points;
}

export const trackedTargets = [
  {
    id: 'iss-zarya',
    name: 'ISS (ZARYA)',
    noradId: 25544,
    orbitType: 'LEO',
    status: 'Nominal',
    path: buildGroundTrack({
      inclinationDeg: 51.6,
      altitudeKm: 418,
      velocityKmS: 7.66,
      periodMinutes: 92.9,
      startLon: -42,
      startTimeIso: '2026-07-26T06:00:00Z',
      sampleCount: 70,
      altitudeJitterKm: 1.4,
    }),
  },
  {
    id: 'starlink-3011',
    name: 'STARLINK-3011',
    noradId: 48274,
    orbitType: 'LEO',
    status: 'Nominal',
    path: buildGroundTrack({
      inclinationDeg: 53.0,
      altitudeKm: 550,
      velocityKmS: 7.59,
      periodMinutes: 95.6,
      startLon: 110,
      startTimeIso: '2026-07-26T06:00:00Z',
      sampleCount: 70,
      altitudeJitterKm: 0.8,
    }),
  },
  {
    id: 'envisat-defunct',
    name: 'ENVISAT (DEFUNCT)',
    noradId: 27424,
    orbitType: 'LEO',
    status: 'Critical',
    path: buildGroundTrack({
      inclinationDeg: 98.4,
      altitudeKm: 771,
      velocityKmS: 7.46,
      periodMinutes: 100.6,
      startLon: -160,
      startTimeIso: '2026-07-26T06:00:00Z',
      sampleCount: 70,
      altitudeJitterKm: 2.1,
    }),
  },
];

export const apiMeta = {
  endpoint: '/api/v1/orbital-path',
  dataSource: 'Space-Track TLE / Backend Orbital Propagation Service',
  lastSync: '2026-07-26T06:12:44Z',
  connectionStatus: 'CONNECTED TO BACKEND API',
};

/**
 * Drop-in async accessor. Currently resolves the local mock instantly;
 * replace the body with a real `fetch(\`${apiMeta.endpoint}/${targetId}\`)`
 * once the backend endpoint is live — the component only depends on this
 * function's return shape, not on where the data comes from.
 */
export function fetchOrbitalPath(targetId) {
  const target = trackedTargets.find((t) => t.id === targetId) || trackedTargets[0];
  return Promise.resolve(target);
}