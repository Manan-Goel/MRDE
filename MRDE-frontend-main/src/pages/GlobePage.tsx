import { Suspense, useMemo, useRef, useState } from 'react';
import type { MutableRefObject } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Billboard, Html, Line, OrbitControls, useTexture } from '@react-three/drei';
import { AnimatePresence, motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import * as THREE from 'three';
import type { OrbitControls as OrbitControlsType } from 'three-stdlib';
import {
  ArrowLeft,
  BrainCircuit,
  MapPin,
  Radio,
  Satellite,
  SkipForward,
  Timer,
} from 'lucide-react';
import { LEVEL_COLORS, TIME_BADGE } from '../api/risk';
import { useDashboard } from '../state/DashboardContext';
import { useTheme } from '../state/ThemeContext';
import LevelBadge from '../components/LevelBadge';
import ForecastChart from '../components/ForecastChart';
import RiskBars from '../components/RiskBars';
import LiveEvents from '../components/LiveEvents';
import type { SatelliteSummary } from '../api/types';

const EARTH_RADIUS = 1.6;
const TEXTURE_URL = 'https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg';
const DEFAULT_CAM = new THREE.Vector3(0, 0.9, 5.8);

const AXIS_Z = new THREE.Vector3(0, 0, 1);
const AXIS_Y = new THREE.Vector3(0, 1, 0);

const ORBIT_GEOMETRY: Record<string, { inclination: number; raan: number; phase: number }> = {
  sat1: { inclination: 0.9, raan: 0.3, phase: 0 },
  sat2: { inclination: 0.5, raan: 2.2, phase: 2.1 },
  sat3: { inclination: 1.3, raan: 4.1, phase: 4.2 },
};

const geomFor = (key: string) => ORBIT_GEOMETRY[key] ?? { inclination: 0.8, raan: 1.0, phase: 1.0 };
const radiusFor = (priority: number) => EARTH_RADIUS + 0.4 + (priority - 1) * 0.4;
const speedFor = (r: number) => 0.1 / Math.pow(r / (EARTH_RADIUS + 0.4), 1.5);

function orbitPoint(key: string, theta: number, r: number, out: THREE.Vector3) {
  const g = geomFor(key);
  out.set(Math.cos(theta) * r, 0, Math.sin(theta) * r);
  out.applyAxisAngle(AXIS_Z, g.inclination);
  out.applyAxisAngle(AXIS_Y, g.raan);
  return out;
}

const ATMO_VERT = `
varying vec3 vNormal;
varying vec3 vViewDir;
void main() {
  vec4 worldPos = modelMatrix * vec4(position, 1.0);
  vNormal = normalize(normalMatrix * normal);
  vViewDir = normalize(cameraPosition - worldPos.xyz);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;
const ATMO_FRAG = `
varying vec3 vNormal;
varying vec3 vViewDir;
void main() {
  float rim = 1.0 - abs(dot(normalize(vViewDir), normalize(vNormal)));
  float intensity = pow(rim, 3.5);
  gl_FragColor = vec4(vec3(0.31, 0.76, 0.97) * intensity, intensity);
}
`;

function Earth() {
  const texture = useTexture(TEXTURE_URL);
  texture.colorSpace = THREE.SRGBColorSpace;
  const ref = useRef<THREE.Mesh>(null);
  useFrame((_, dt) => { if (ref.current) ref.current.rotation.y += dt * 0.01; });
  return (
    <mesh ref={ref}>
      <sphereGeometry args={[EARTH_RADIUS, 64, 64]} />
      <meshStandardMaterial map={texture} roughness={1} metalness={0} />
    </mesh>
  );
}

function Atmosphere() {
  const material = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: ATMO_VERT, fragmentShader: ATMO_FRAG,
    side: THREE.BackSide, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false,
  }), []);
  return (
    <mesh material={material} scale={1.14}>
      <sphereGeometry args={[EARTH_RADIUS, 48, 48]} />
    </mesh>
  );
}

function Stars() {
  const positions = useMemo(() => {
    const n = 600;
    const arr = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const v = new THREE.Vector3().randomDirection().multiplyScalar(16 + Math.random() * 12);
      arr.set([v.x, v.y, v.z], i * 3);
    }
    return arr;
  }, []);
  return (
    <points>
      <bufferGeometry><bufferAttribute attach="attributes-position" args={[positions, 3]} /></bufferGeometry>
      <pointsMaterial size={0.06} color="#ffffff" transparent opacity={0.8} sizeAttenuation />
    </points>
  );
}

type SatPositions = MutableRefObject<Record<string, THREE.Vector3>>;

function SatDot({
  sat, focusedKey, onFocus, satPositions,
}: {
  sat: SatelliteSummary; focusedKey: string | null; onFocus: (key: string) => void; satPositions: SatPositions;
}) {
  const group = useRef<THREE.Group>(null);
  const dot = useRef<THREE.Group>(null);
  const theta = useRef(geomFor(sat.key).phase);
  const radius = useRef(radiusFor(sat.priority));
  const [hovered, setHovered] = useState(false);
  const tmp = useMemo(() => new THREE.Vector3(), []);
  const focused = focusedKey === sat.key;
  const color = LEVEL_COLORS[sat.level];
  const trailPositions = useMemo(() => new Float32Array(33 * 3), []);
  const trail = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(trailPositions, 3));
    const m = new THREE.LineBasicMaterial({ transparent: true, opacity: 0.45, depthWrite: false });
    return new THREE.Line(g, m);
  }, []);
  const orbitPoints = useMemo(() => {
    const r = radiusFor(sat.priority);
    const v = new THREE.Vector3();
    return Array.from({ length: 129 }, (_, i) => { orbitPoint(sat.key, (i / 128) * Math.PI * 2, r, v); return [v.x, v.y, v.z] as [number, number, number]; });
  }, [sat.key, sat.priority]);

  useFrame((_, dt) => {
    radius.current = THREE.MathUtils.damp(radius.current, radiusFor(sat.priority), 2, dt);
    theta.current += dt * speedFor(radius.current) * 0.5;
    orbitPoint(sat.key, theta.current, radius.current, tmp);
    group.current?.position.copy(tmp);
    const store = satPositions.current[sat.key] ?? (satPositions.current[sat.key] = new THREE.Vector3());
    store.copy(tmp);
    const target = focused ? 1.08 : hovered ? 1.04 : 1;
    if (dot.current) { const s = THREE.MathUtils.damp(dot.current.scale.x, target, 6, dt); dot.current.scale.setScalar(s); }
    for (let i = 0; i <= 32; i++) {
      orbitPoint(sat.key, theta.current - (i / 32) * 1.2, radius.current, tmp);
      trailPositions[i * 3] = tmp.x; trailPositions[i * 3 + 1] = tmp.y; trailPositions[i * 3 + 2] = tmp.z;
    }
    trail.geometry.attributes.position.needsUpdate = true;
    (trail.material as THREE.LineBasicMaterial).color.set(color);
    (trail.material as THREE.LineBasicMaterial).opacity = hovered || focused ? 0.7 : 0.35;
  });

  return (
    <>
      <Line points={orbitPoints} color={color} lineWidth={1} transparent opacity={focused ? 0.4 : 0.12} />
      <primitive object={trail} />
      <group ref={group}>
        <group ref={dot}>
          <mesh
            onClick={(e) => { e.stopPropagation(); onFocus(sat.key); }}
            onPointerOver={(e) => { e.stopPropagation(); setHovered(true); }}
            onPointerOut={() => { setHovered(false); }}
          >
            <sphereGeometry args={[0.05, 16, 16]} />
            <meshBasicMaterial color={color} />
          </mesh>
          <mesh>
            <sphereGeometry args={[0.1, 16, 16]} />
            <meshBasicMaterial color={color} transparent opacity={hovered || focused ? 0.25 : 0.1} depthWrite={false} />
          </mesh>
          <Billboard>
            <mesh><ringGeometry args={[0.1, 0.115, 48]} /><meshBasicMaterial color={color} transparent opacity={0.8} side={THREE.DoubleSide} /></mesh>
          </Billboard>
          {(hovered || focused) && (
            <Html center distanceFactor={6} position={[0, 0.2, 0]} style={{ pointerEvents: 'none' }}>
              <div className="whitespace-nowrap rounded border border-gray-700 bg-gray-900/95 px-2 py-1 font-mono text-[10px] text-gray-100 shadow-lg">
                {sat.name} &middot; UMRS {sat.umrs.toFixed(1)}
              </div>
            </Html>
          )}
        </group>
      </group>
    </>
  );
}

function CameraRig({ focusedKey, satPositions, returningRef }: {
  focusedKey: string | null; satPositions: SatPositions; returningRef: MutableRefObject<boolean>;
}) {
  const { camera } = useThree();
  const desired = useMemo(() => new THREE.Vector3(), []);
  useFrame((_, dt) => {
    if (focusedKey) {
      const p = satPositions.current[focusedKey];
      if (!p) return;
      desired.copy(p).multiplyScalar(1 + 1.0 / Math.max(p.length(), 0.001));
      desired.y += 0.25;
      camera.position.x = THREE.MathUtils.damp(camera.position.x, desired.x, 2, dt);
      camera.position.y = THREE.MathUtils.damp(camera.position.y, desired.y, 2, dt);
      camera.position.z = THREE.MathUtils.damp(camera.position.z, desired.z, 2, dt);
      camera.lookAt(0, 0, 0);
    } else if (returningRef.current) {
      camera.position.x = THREE.MathUtils.damp(camera.position.x, DEFAULT_CAM.x, 2, dt);
      camera.position.y = THREE.MathUtils.damp(camera.position.y, DEFAULT_CAM.y, 2, dt);
      camera.position.z = THREE.MathUtils.damp(camera.position.z, DEFAULT_CAM.z, 2, dt);
      camera.lookAt(0, 0, 0);
      if (camera.position.distanceTo(DEFAULT_CAM) < 0.08) returningRef.current = false;
    }
  });
  return null;
}

const STATION_LOCATIONS: Record<string, string> = {
  Svalbard: '78N,15E', Fairbanks: '64N,147W', Kourou: '5N,52W',
  Wallops: '37N,75W', Mauritius: '20S,57E', Santiago: '33S,70W',
};

export default function GlobePage() {
  const { state, dashboard, forecast, select, forceTick, paused, setPaused } = useDashboard();
  const navigate = useNavigate();
  const { toggle: toggleTheme, theme } = useTheme();
  const sats = state?.satellites ?? [];
  const [focusedKey, setFocusedKey] = useState<string | null>(null);
  const satPositions = useRef<Record<string, THREE.Vector3>>({});
  const returningRef = useRef(false);
  const controlsRef = useRef<OrbitControlsType>(null);
  const resumeTimer = useRef<number | null>(null);
  const detailSat = sats.find((s) => s.key === focusedKey) ?? null;
  const currentHour = state ? Math.floor(state.clock_min / 60) : 0;

  const forecastHours = forecast?.hours ?? [];
  const timelineHours = forecastHours.filter(h => h.events.length > 0 || h.hour % 3 === 0);

  const focus = (key: string) => { setFocusedKey(key); select(key); };
  const unfocus = () => { setFocusedKey((prev) => { if (prev) returningRef.current = true; return null; }); };

  return (
    <div className="h-screen overflow-hidden bg-black flex flex-col">
      {/* Top bar */}
      <div className="flex h-10 shrink-0 items-center gap-2 border-b border-gray-800 bg-gray-950 px-3 z-20">
        <button onClick={() => navigate('/')} className="flex items-center gap-1 rounded border border-gray-700 bg-gray-900/70 px-2 py-1 font-mono text-[10px] text-gray-400 hover:border-accent-blue/50 hover:text-accent-blue transition">
          <ArrowLeft size={11} /> Back
        </button>
        <span className="font-mono text-[10px] text-gray-500">{state?.clock_str ?? ''}</span>
        <button onClick={() => void forceTick()} className="flex items-center gap-1 rounded border border-gray-700 bg-gray-900/70 px-2 py-1 font-mono text-[10px] text-gray-400 hover:border-accent-blue/50 hover:text-accent-blue transition">
          <SkipForward size={9} /> Tick
        </button>
        <button onClick={() => setPaused(!paused)} className="flex items-center gap-1 rounded border border-gray-700 bg-gray-900/70 px-2 py-1 font-mono text-[10px] text-gray-400 hover:border-accent-blue/50 hover:text-accent-blue transition">
          {paused ? '>' : '||'}
        </button>
        <div className="ml-auto flex items-center gap-2">
          {sats.map((s) => (
            <button key={s.key} onClick={() => focus(s.key)}
              className={`flex items-center gap-1 rounded border px-2 py-1 font-mono text-[9px] transition ${
                focusedKey === s.key ? 'border-accent-blue/50 bg-accent-blue/10 text-accent-blue' : 'border-gray-700 bg-gray-900/70 text-gray-400 hover:border-gray-500'
              }`}>
              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: LEVEL_COLORS[s.level] }} />
              {s.name.split(' ')[0]}
            </button>
          ))}
          <button onClick={toggleTheme} className="rounded border border-gray-700 bg-gray-900/70 px-2 py-1 text-gray-400 hover:border-accent-blue/50 hover:text-accent-blue transition text-[10px]">
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
          {focusedKey && (
            <button onClick={unfocus} className="rounded border border-gray-700 bg-gray-900/70 px-2 py-1 font-mono text-[10px] text-gray-400 hover:text-risk-critical transition">
              Deselect
            </button>
          )}
        </div>
      </div>

      {/* Main: globe left, detail panel right */}
      <div className="flex flex-1 min-h-0">
        <div className={`${focusedKey ? 'w-[55%]' : 'flex-1'} min-w-0 relative bg-black ${focusedKey ? 'border-r border-gray-800' : ''}`}>
          <Canvas camera={{ position: [0, 0.9, 5.8], fov: 40 }} dpr={[1, 1.5]} onPointerMissed={unfocus}>
            <ambientLight intensity={0.55} />
            <directionalLight position={[6, 3, 5]} intensity={1.6} />
            <Stars />
            <Suspense fallback={null}><Earth /></Suspense>
            <Atmosphere />
            {sats.map((s) => <SatDot key={s.key} sat={s} focusedKey={focusedKey} onFocus={focus} satPositions={satPositions} />)}
            <CameraRig focusedKey={focusedKey} satPositions={satPositions} returningRef={returningRef} />
            <OrbitControls
              ref={controlsRef} enablePan={false} autoRotate autoRotateSpeed={0.25}
              minDistance={3.5} maxDistance={8}
              onStart={() => { if (controlsRef.current) controlsRef.current.autoRotate = false; if (resumeTimer.current) window.clearTimeout(resumeTimer.current); }}
              onEnd={() => { resumeTimer.current = window.setTimeout(() => { if (controlsRef.current) controlsRef.current.autoRotate = true; }, 5000); }}
            />
          </Canvas>
          <div className="absolute left-2.5 top-2.5 font-mono text-[9px] text-gray-600 uppercase tracking-widest pointer-events-none">
            Orbital View
          </div>
        </div>

        {/* Right detail panel */}
        <AnimatePresence>
          {focusedKey && detailSat ? (
            <motion.div
              key={detailSat.key}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ type: 'spring', stiffness: 200, damping: 26 }}
              className="w-[45%] overflow-y-auto bg-gray-950 border-l border-gray-800"
            >
              <div className="p-4 space-y-3">
                {/* Satellite header */}
                <div className="flex items-center gap-2">
                  <Satellite size={14} className="text-accent-blue shrink-0" />
                  <h2 className="font-mono text-sm text-gray-100 truncate">{detailSat.name}</h2>
                  <LevelBadge level={detailSat.level} />
                  <span className="ml-auto font-mono text-[9px] text-gray-500">#{detailSat.priority}</span>
                </div>
                <p className="text-xs text-gray-400">{dashboard?.sat_key === detailSat.key ? dashboard.profile.desc : ''}</p>

                {/* UMRS score */}
                {dashboard?.sat_key === detailSat.key && (
                  <section className="rounded-lg border border-gray-800 bg-gray-900/50 p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-500">UMRS</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-2xl text-gray-100">{dashboard.scores.umrs.toFixed(1)}</span>
                        <LevelBadge level={dashboard.scores.level} />
                      </div>
                    </div>
                  </section>
                )}

                {/* Risk breakdown */}
                <RiskBars dark={true} />

                {/* Ground stations */}
                {dashboard?.sat_key === detailSat.key && (
                  <section className="rounded-lg border border-gray-800 bg-gray-900/50 p-3">
                    <h3 className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-gray-500 mb-2">
                      <MapPin size={11} className="text-accent-cyan" /> Stations
                    </h3>
                    <div className="space-y-1">
                      {Object.entries(dashboard.stations).map(([name, status]) => (
                        <div key={name} className="flex items-center gap-2 text-[11px]">
                          <div className={`h-1.5 w-1.5 rounded-full ${status === 'Online' ? 'bg-risk-low' : status === 'Testing' ? 'bg-risk-moderate' : 'bg-risk-critical'}`} />
                          <span className="font-mono text-gray-300">{name}</span>
                          <span className="ml-auto font-mono text-[9px] text-gray-600">{STATION_LOCATIONS[name] ?? ''}</span>
                          <span className={`font-mono text-[9px] ${status === 'Online' ? 'text-risk-low' : status === 'Testing' ? 'text-risk-moderate' : 'text-risk-critical'}`}>{status}</span>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {/* Timeline with live forecast data */}
                {timelineHours.length > 0 && (
                  <section className="rounded-lg border border-gray-800 bg-gray-900/50 p-3">
                    <h3 className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-gray-500 mb-2">
                      <Timer size={11} className="text-accent-cyan" /> Schedule
                    </h3>
                    <div className="space-y-1 max-h-48 overflow-y-auto">
                      {timelineHours.map((h) => {
                        const isPast = h.hour < currentHour;
                        const isNow = h.hour === currentHour;
                        return (
                          <div key={h.hour} className={`flex items-center gap-2 rounded px-2 py-1 text-[10px] ${
                            isNow ? 'bg-accent-blue/10 border border-accent-blue/30' : isPast ? 'opacity-40' : ''
                          }`}>
                            <span className={`w-8 font-mono ${isNow ? 'text-accent-blue' : 'text-gray-600'}`}>h{h.hour}</span>
                            <div className="flex-1 min-w-0">
                              {h.events.length > 0 ? (
                                <span className={`font-mono ${isNow ? 'text-gray-100' : 'text-gray-400'}`}>{h.events.join(', ')}</span>
                              ) : (
                                <span className="font-mono text-gray-600">UMRS {h.umrs.toFixed(1)}</span>
                              )}
                            </div>
                            <span className="font-mono text-[9px] text-gray-500">{h.umrs.toFixed(0)}</span>
                            {isNow && <span className="flex items-center gap-1 rounded bg-accent-blue/20 px-1 py-0.5 text-[8px] text-accent-blue"><span className="h-1 w-1 rounded-full bg-accent-blue animate-pulseSoft" />NOW</span>}
                          </div>
                        );
                      })}
                    </div>
                  </section>
                )}

                {/* Priority compact */}
                {dashboard?.sat_key === detailSat.key && dashboard.priority.length > 0 && (
                  <section className="rounded-lg border border-gray-800 bg-gray-900/50 p-3">
                    <h3 className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-gray-500 mb-2">
                      <Radio size={11} className="text-accent-cyan" /> Priority
                    </h3>
                    <div className="space-y-1">
                      {[...dashboard.priority].sort((a, b) => a.priority - b.priority).map((p) => (
                        <div key={p.component} className="flex items-center gap-2 text-[10px]">
                          <span className="w-4 font-mono text-gray-600">#{p.priority}</span>
                          <span className="flex-1 font-mono text-gray-300">{p.component}</span>
                          <span className="font-mono" style={{ color: LEVEL_COLORS[p.level ?? 'MODERATE'] }}>{p.score.toFixed(0)}</span>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {/* Recommendations compact (max 2) */}
                {dashboard?.sat_key === detailSat.key && dashboard.recommendations.length > 0 && (
                  <section className="rounded-lg border border-gray-800 bg-gray-900/50 p-3">
                    <h3 className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-gray-500 mb-2">
                      <BrainCircuit size={11} className="text-accent-blue" /> Recommendations
                    </h3>
                    <div className="space-y-2">
                      {[...dashboard.recommendations].sort((a, b) => a.priority - b.priority).slice(0, 2).map((r) => (
                        <div key={`${r.priority}-${r.component}`} className="text-[10px]">
                          <div className="flex items-center gap-1">
                            <span className="font-mono text-gray-600">#{r.priority}</span>
                            <span className="font-medium text-gray-200">{r.component}</span>
                            <span className={`rounded border px-1 py-0.5 text-[8px] ${TIME_BADGE[r.time_sensitivity]}`}>{r.time_sensitivity}</span>
                          </div>
                          <p className="mt-0.5 text-gray-400">{r.headline}</p>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {/* 24h Forecast */}
                <ForecastChart dark={true} compact={true} />

                {/* Live Events */}
                <LiveEvents dark={true} />

                <div className="text-center text-[9px] text-gray-700 pb-2">Click empty space to close</div>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  );
}
