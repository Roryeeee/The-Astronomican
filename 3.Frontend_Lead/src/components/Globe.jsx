import { useState, useEffect } from 'react';
import { Viewer, Entity, PolylineGraphics } from 'resium';
import {
  Cartesian3,
  SampledPositionProperty,
  JulianDate,
  PolylineGlowMaterialProperty,
  Color,
} from 'cesium';

const MOCK_CONTRACT_B = {
  object_id: "matched-25544",
  matched_name: "ISS (ZARYA)",
  match_confidence: 0.94,
  trajectory: [
    { time_utc: "2026-07-02T18:42:00Z", lat: 27.7172, lon: 85.3240, alt_km: 418.2 },
    { time_utc: "2026-07-02T18:42:10Z", lat: 28.5000, lon: 86.1000, alt_km: 418.5 },
    { time_utc: "2026-07-02T18:42:20Z", lat: 29.2000, lon: 87.0000, alt_km: 418.8 }
  ]
};

function Globe() {
  const [trajectory, setTrajectory] = useState(null);

  useEffect(() => {
    setTrajectory(MOCK_CONTRACT_B);
  }, []);

  if (!trajectory) return <p style={{ color: 'white' }}>Loading trajectory...</p>;

  // Cesium time-interpolation property for smooth animated movement
  const positionProperty = new SampledPositionProperty();
  const pathPositions = [];

  trajectory.trajectory.forEach((point) => {
    const time = JulianDate.fromIso8601(point.time_utc);
    
    // Cesium requires altitude in meters, so multiply alt_km by 1000
    const position = Cartesian3.fromDegrees(
      point.lon,
      point.lat,
      point.alt_km * 1000 
    );
    
    positionProperty.addSample(time, position);
    pathPositions.push(position);
  });

  return (
    <Viewer full>
      <Entity
        name={trajectory.matched_name}
        position={positionProperty}
        point={{ pixelSize: 10, color: Color.CYAN }}
      >
        <PolylineGraphics
          positions={pathPositions}
          width={4}
          material={
            new PolylineGlowMaterialProperty({
              glowPower: 0.2,
              color: Color.CYAN,
            })
          }
        />
      </Entity>
    </Viewer>
  );
}

export default Globe;