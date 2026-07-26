import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import * as Cesium from 'cesium';
import { Viewer, Entity, PolylineGraphics, PointGraphics, PathGraphics } from 'resium';
import 'cesium/Build/Cesium/Widgets/widgets.css';
import './Globe.css';
import { trackedTargets, apiMeta, fetchOrbitalPath } from '../data/reportData';

// ---------------------------------------------------------------------------
// Set your Cesium Ion Access Token here (Get one free at https://ion.cesium.com)
// ---------------------------------------------------------------------------
Cesium.Ion.defaultAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiI0YTg1ODA3ZC01ZDYwLTRhOWQtOWViNS03ZGVkNWUwZDM4YmIiLCJpZCI6NDUyNjkxLCJpc3MiOiJodHRwczovL2FwaS5jZXNpdW0uY29tIiwiYXVkIjoidW5kZWZpbmVkX2RlZmF1bHQiLCJpYXQiOjE3ODMyNjA5NDN9.p6FsUfCq_g3xCSmbNmwnIH4pIJ_Hw0lzxVL-fSkHibo';

if (typeof window !== 'undefined' && !window.CESIUM_BASE_URL) {
  window.CESIUM_BASE_URL = '/cesium/';
}

const SPEED_OPTIONS = [1, 10, 60, 300];
const AUTO_ROTATE_RATE = -0.00028; // radians/frame, subtle continuous spin
const TICK_THROTTLE_MS = 120;

/* ---------------------------------------------------------------------------
 * Helpers
 * ------------------------------------------------------------------------ */

function toCartesian(point) {
  return Cesium.Cartesian3.fromDegrees(point.longitude, point.latitude, point.altitudeKm * 1000);
}

function buildSampledPosition(path) {
  const property = new Cesium.SampledPositionProperty();
  property.setInterpolationOptions({
    interpolationDegree: 2,
    interpolationAlgorithm: Cesium.HermitePolynomialApproximation,
  });
  path.forEach((point) => {
    const time = Cesium.JulianDate.fromIso8601(point.timestamp);
    property.addSample(time, toCartesian(point));
  });
  return property;
}

function nearestSample(path, isoTime) {
  const target = new Date(isoTime).getTime();
  let closest = path[0];
  let closestDelta = Infinity;
  for (let i = 0; i < path.length; i += 1) {
    const delta = Math.abs(new Date(path[i].timestamp).getTime() - target);
    if (delta < closestDelta) {
      closestDelta = delta;
      closest = path[i];
    }
  }
  return closest;
}

function formatClock(julianDate) {
  const jsDate = Cesium.JulianDate.toDate(julianDate);
  return jsDate.toISOString().slice(0, 19).replace('T', ' ') + 'Z';
}

/* ---------------------------------------------------------------------------
 * Icons
 * ------------------------------------------------------------------------ */

function IconSearch() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="7" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function IconPlay() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function IconPause() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <rect x="6" y="5" width="4" height="14" />
      <rect x="14" y="5" width="4" height="14" />
    </svg>
  );
}

function IconSatellite() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M13 7l4 4-1.5 1.5-4-4z" />
      <path d="M7.5 12.5L11 16l-2 2-3.5-3.5z" />
      <path d="M15 5l1.5-1.5L20 7 18.5 8.5z" />
      <path d="M3.5 15.5L5 14l3.5 3.5L7 19z" />
      <path d="M9 11l4 4" />
    </svg>
  );
}

/* ---------------------------------------------------------------------------
 * Component
 * ------------------------------------------------------------------------ */

export default function Globe() {
  const viewerRef = useRef(null);
  const lastTickRef = useRef(0);
  const userInteractingRef = useRef(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [activeTargetId, setActiveTargetId] = useState(trackedTargets[0]?.id ?? null);
  const [activeTarget, setActiveTarget] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnected] = useState(apiMeta.connectionStatus === 'CONNECTED TO BACKEND API');

  const [isPlaying, setIsPlaying] = useState(true);
  const [speedMultiplier, setSpeedMultiplier] = useState(60);
  const [scrubFraction, setScrubFraction] = useState(0);
  const [clockLabel, setClockLabel] = useState('');
  const [liveTelemetry, setLiveTelemetry] = useState(null);

  const filteredTargets = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return trackedTargets;
    return trackedTargets.filter(
      (t) => t.name.toLowerCase().includes(term) || String(t.noradId).includes(term)
    );
  }, [searchTerm]);

  // Fetch (mocked) orbital path payload whenever the active target changes.
  useEffect(() => {
    if (!activeTargetId) return;
    let cancelled = false;

    // Defer state update to avoid synchronous cascading render warnings
    Promise.resolve().then(() => {
      if (!cancelled) setIsLoading(true);
    });

    fetchOrbitalPath(activeTargetId).then((target) => {
      if (!cancelled) {
        setActiveTarget(target);
        setIsLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [activeTargetId]);

  const positionProperty = useMemo(
    () => (activeTarget ? buildSampledPosition(activeTarget.path) : null),
    [activeTarget]
  );

  const pathCartesians = useMemo(
    () => (activeTarget ? activeTarget.path.map(toCartesian) : []),
    [activeTarget]
  );

  const timeBounds = useMemo(() => {
    if (!activeTarget) return null;
    const start = Cesium.JulianDate.fromIso8601(activeTarget.path[0].timestamp);
    const stop = Cesium.JulianDate.fromIso8601(activeTarget.path[activeTarget.path.length - 1].timestamp);
    const totalSeconds = Cesium.JulianDate.secondsDifference(stop, start);
    return { start, stop, totalSeconds };
  }, [activeTarget]);

  const availability = useMemo(() => {
    if (!timeBounds) return null;
    return new Cesium.TimeIntervalCollection([
      new Cesium.TimeInterval({ start: timeBounds.start, stop: timeBounds.stop }),
    ]);
  }, [timeBounds]);

  // Reset the Cesium clock whenever the target changes, then fly camera
  useEffect(() => {
    const viewer = viewerRef.current?.cesiumElement;
    if (!viewer || !timeBounds) return;

    viewer.clock.startTime = timeBounds.start.clone();
    viewer.clock.stopTime = timeBounds.stop.clone();
    viewer.clock.currentTime = timeBounds.start.clone();
    viewer.clock.clockRange = Cesium.ClockRange.LOOP_STOP;
    viewer.clock.multiplier = speedMultiplier;
    viewer.clock.shouldAnimate = isPlaying;
    setScrubFraction(0);

    if (pathCartesians.length > 1) {
      const sphere = Cesium.BoundingSphere.fromPoints(pathCartesians);
      viewer.camera.flyToBoundingSphere(sphere, {
        duration: 1.4,
        offset: new Cesium.HeadingPitchRange(0, -0.6, sphere.radius * 3.2),
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeBounds]);

  // Safely sync clock playback state without mutating refs directly inside effect body
  useEffect(() => {
    const currentRef = viewerRef.current;
    if (!currentRef?.cesiumElement?.clock) return;

    const clock = currentRef.cesiumElement.clock;
    clock.shouldAnimate = isPlaying;
    clock.multiplier = speedMultiplier;
  }, [isPlaying, speedMultiplier]);

  // Drive the telemetry HUD + scrubber off the live Cesium clock.
  const handleTick = useCallback(
    (clock) => {
      const now = typeof window !== 'undefined' ? window.performance.now() : 0;
      if (now - lastTickRef.current < TICK_THROTTLE_MS) return;
      lastTickRef.current = now;
      if (!positionProperty || !timeBounds || !activeTarget) return;

      const cartesian = positionProperty.getValue(clock.currentTime);
      if (cartesian) {
        const carto = Cesium.Cartographic.fromCartesian(cartesian);
        const nearest = nearestSample(activeTarget.path, Cesium.JulianDate.toIso8601(clock.currentTime));
        setLiveTelemetry({
          lat: Cesium.Math.toDegrees(carto.latitude),
          lon: Cesium.Math.toDegrees(carto.longitude),
          altKm: carto.height / 1000,
          velocityKmS: nearest.velocityKmS,
        });
      }

      const elapsed = Cesium.JulianDate.secondsDifference(clock.currentTime, timeBounds.start);
      setScrubFraction(Cesium.Math.clamp(elapsed / timeBounds.totalSeconds, 0, 1));
      setClockLabel(formatClock(clock.currentTime));
    },
    [positionProperty, timeBounds, activeTarget]
  );

  useEffect(() => {
    const viewer = viewerRef.current?.cesiumElement;
    if (!viewer) return undefined;
    viewer.clock.onTick.addEventListener(handleTick);
    return () => viewer.clock.onTick.removeEventListener(handleTick);
  }, [handleTick]);

  // Continuous subtle globe rotation, paused while user drags
  useEffect(() => {
    const viewer = viewerRef.current?.cesiumElement;
    if (!viewer) return undefined;

    const handleStart = () => {
      userInteractingRef.current = true;
    };
    const handleEnd = () => {
      userInteractingRef.current = false;
    };
    const spin = () => {
      if (!userInteractingRef.current) {
        viewer.scene.camera.rotate(Cesium.Cartesian3.UNIT_Z, AUTO_ROTATE_RATE);
      }
    };

    viewer.camera.moveStart.addEventListener(handleStart);
    viewer.camera.moveEnd.addEventListener(handleEnd);
    viewer.scene.preRender.addEventListener(spin);

    return () => {
      viewer.camera.moveStart.removeEventListener(handleStart);
      viewer.camera.moveEnd.removeEventListener(handleEnd);
      viewer.scene.preRender.removeEventListener(spin);
    };
  }, []);

  const handleScrub = useCallback(
    (e) => {
      const currentRef = viewerRef.current;
      if (!currentRef?.cesiumElement || !timeBounds) return;

      const fraction = Number(e.target.value);
      setScrubFraction(fraction);

      const clock = currentRef.cesiumElement.clock;
      if (clock) {
        clock.currentTime = Cesium.JulianDate.addSeconds(
          timeBounds.start,
          fraction * timeBounds.totalSeconds,
          new Cesium.JulianDate()
        );
      }
    },
    [timeBounds]
  );

  const pulsingPixelSize = useMemo(() => {
    return new Cesium.CallbackProperty(() => {
      const time = typeof window !== 'undefined' ? window.performance.now() : 0;
      return 9 + 4 * Math.sin(time / 260);
    }, false);
  }, []);

  return (
    <div className="astro-globe-stage">
      {isLoading && (
        <div className="globe-loading-veil">
          <div className="globe-loading-veil__ring" />
          <span className="globe-loading-veil__text">Acquiring orbital telemetry&hellip;</span>
        </div>
      )}

      <Viewer
        ref={viewerRef}
        full
        timeline={false}
        animation={false}
        homeButton={false}
        geocoder={false}
        sceneModePicker={false}
        baseLayerPicker={false}
        navigationHelpButton={false}
        fullscreenButton={false}
        infoBox={false}
        selectionIndicator={false}
      >
        {activeTarget && positionProperty && (
          <>
            {/* Static glow trace of the full ground track */}
            <Entity>
              <PolylineGraphics
                positions={pathCartesians}
                width={5}
                material={
                  new Cesium.PolylineGlowMaterialProperty({
                    glowPower: 0.25,
                    taperPower: 0.6,
                    color: Cesium.Color.fromCssColorString('#58a6ff').withAlpha(0.85),
                  })
                }
              />
            </Entity>

            {/* Moving marker — current position along the timeline */}
            <Entity
              position={positionProperty}
              availability={availability}
              orientation={new Cesium.VelocityOrientationProperty(positionProperty)}
            >
              <PointGraphics
                pixelSize={pulsingPixelSize}
                color={Cesium.Color.fromCssColorString('#58a6ff')}
                outlineColor={Cesium.Color.WHITE}
                outlineWidth={2}
                disableDepthTestDistance={Number.POSITIVE_INFINITY}
              />
              <PathGraphics
                leadTime={0}
                trailTime={timeBounds ? timeBounds.totalSeconds * 0.18 : 0}
                width={3}
                resolution={30}
                material={
                  new Cesium.PolylineGlowMaterialProperty({
                    glowPower: 0.35,
                    color: Cesium.Color.fromCssColorString('#e6edf3'),
                  })
                }
              />
            </Entity>
          </>
        )}
      </Viewer>

      {/* ---------------------------------------------------------------- */}
      {/* Header / Status HUD                                              */}
      {/* ---------------------------------------------------------------- */}
      <header className="hud-glass globe-header">
        <div className="globe-header__brand">
          <div className="globe-header__mark">
            <IconSatellite />
          </div>
          <div className="globe-header__titles">
            <h1>THE-ASTRONOMICAN</h1>
            <span>Space Situational Awareness &mdash; Live Track</span>
          </div>
        </div>

        <div className="globe-header__target">
          <span className="globe-header__target-label">Tracking</span>
          <span className="globe-header__target-value">
            {activeTarget ? `${activeTarget.name} (NORAD ${activeTarget.noradId})` : '—'}
          </span>
        </div>

        <div className={`conn-status${isConnected ? '' : ' conn-status--offline'}`}>
          <span className="conn-status__dot" />
          <span className="conn-status__label">
            {isConnected ? 'Connected to Backend API' : 'Backend Offline — Using Cache'}
          </span>
        </div>
      </header>

      {/* ---------------------------------------------------------------- */}
      {/* Target selector (left)                                           */}
      {/* ---------------------------------------------------------------- */}
      <aside className="hud-glass target-panel">
        <div className="target-panel__head">
          <span className="hud-glass__title">Target Selector</span>
        </div>
        <div className="target-search">
          <IconSearch />
          <input
            type="text"
            placeholder="Search name or NORAD ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <ul className="target-list">
          {filteredTargets.length === 0 && (
            <li className="target-list__empty">No targets match &ldquo;{searchTerm}&rdquo;</li>
          )}
          {filteredTargets.map((target) => (
            <li key={target.id}>
              <button
                type="button"
                className={`target-list__item${target.id === activeTargetId ? ' is-active' : ''}`}
                onClick={() => setActiveTargetId(target.id)}
              >
                <div className="target-list__row">
                  <span className="target-list__name">{target.name}</span>
                  <span className={`badge badge--${target.status}`}>{target.status}</span>
                </div>
                <span className="target-list__sub">
                  NORAD {target.noradId} &middot; {target.orbitType}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </aside>

      {/* ---------------------------------------------------------------- */}
      {/* Telemetry HUD (right)                                            */}
      {/* ---------------------------------------------------------------- */}
      <aside className="hud-glass telemetry-panel">
        <div className="telemetry-panel__head">
          <span className="hud-glass__title">Telemetry</span>
          {activeTarget && <span className={`badge badge--${activeTarget.status}`}>{activeTarget.status}</span>}
        </div>
        <div className="telemetry-panel__body">
          <div className="telemetry-field">
            <div className="telemetry-field__label">Altitude</div>
            <div className="telemetry-field__value">
              {liveTelemetry ? liveTelemetry.altKm.toFixed(1) : '—'}
              <span>km</span>
            </div>
          </div>
          <div className="telemetry-field">
            <div className="telemetry-field__label">Velocity</div>
            <div className="telemetry-field__value">
              {liveTelemetry ? liveTelemetry.velocityKmS.toFixed(2) : '—'}
              <span>km/s</span>
            </div>
          </div>
          <div className="telemetry-field telemetry-field--wide">
            <div className="telemetry-field__label">Latitude</div>
            <div className="telemetry-field__value">
              {liveTelemetry ? liveTelemetry.lat.toFixed(3) : '—'}
              <span>deg</span>
            </div>
          </div>
          <div className="telemetry-field telemetry-field--wide">
            <div className="telemetry-field__label">Longitude</div>
            <div className="telemetry-field__value">
              {liveTelemetry ? liveTelemetry.lon.toFixed(3) : '—'}
              <span>deg</span>
            </div>
          </div>
        </div>
        <div className="telemetry-panel__footer">
          <span>{apiMeta.dataSource.split(' / ')[0]}</span>
          <span>{clockLabel || '—'}</span>
        </div>
      </aside>

      {/* ---------------------------------------------------------------- */}
      {/* Timeline & playback (bottom)                                     */}
      {/* ---------------------------------------------------------------- */}
      <footer className="hud-glass playback-bar">
        <button
          type="button"
          className="playback-bar__btn"
          onClick={() => setIsPlaying((prev) => !prev)}
          aria-label={isPlaying ? 'Pause playback' : 'Play trajectory'}
        >
          {isPlaying ? <IconPause /> : <IconPlay />}
        </button>

        <span className="playback-bar__time">{clockLabel || '—'}</span>

        <div className="playback-bar__scrub">
          <input
            type="range"
            min={0}
            max={1}
            step={0.001}
            value={scrubFraction}
            onChange={handleScrub}
            aria-label="Trajectory timeline scrubber"
          />
        </div>

        <div className="playback-bar__speeds">
          {SPEED_OPTIONS.map((speed) => (
            <button
              key={speed}
              type="button"
              className={speed === speedMultiplier ? 'is-active' : ''}
              onClick={() => setSpeedMultiplier(speed)}
            >
              {speed}x
            </button>
          ))}
        </div>
      </footer>
    </div>
  );
}