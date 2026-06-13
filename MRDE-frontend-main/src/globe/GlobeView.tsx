import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import type { MutableRefObject } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Billboard, Html, Line, OrbitControls, useTexture } from '@react-three/drei';
import { AnimatePresence, motion } from 'framer-motion';
import * as THREE from 'three';
import type { OrbitControls as OrbitControlsType } from 'three-stdlib';
import { SatelliteSummary } from '../api/types';
import { LEVEL_COLORS } from '../api/risk';
import { useDashboard } from '../state/DashboardContext';
import LevelBadge from '../components/LevelBadge';

const EARTH_RADIUS = 1.5;
const TEXTURE_URL = 'https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg';
const DEFAULT_CAM = new THREE.Vector3(0, 0.7, 5.4);

const AXIS_Z = new THREE.Vector3(0, 0, 1);
const AXIS_Y = new THREE.Vector3(0, 1, 0);

const ORBIT_GEOMETRY: Record<string, { inclination: number; raan: number; phase: number }> = {
  sat1: { inclination: 0.9, raan: 0.3, phase: 0 },
  sat2: { inclination: 0.5, raan: 2.2, phase: 2.1 },
  sat3: { inclination: 1.3, raan: 4.1, phase: 4.2 },
};

const geomFor = (key: string) => ORBIT_GEOMETRY[key] ?? { inclination: 0.8, raan: 1.0, phase: 1.0 };

const radiusFor = (priority: number) => EARTH_RADIUS + 0.4 + (priority - 1) * 0.38;
const speedFor = (r: number) => 0.45 / Math.pow(r / (EARTH_RADIUS + 0.4), 1.5);

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
  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.y += dt * 0.02;
  });
  return (
    <mesh ref={ref}>
      <sphereGeometry args={[EARTH_RADIUS, 64, 64]} />
      <meshStandardMaterial map={texture} roughness={1} metalness={0} />
    </mesh>
  );
}

function Atmosphere() {
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: ATMO_VERT,
        fragmentShader: ATMO_FRAG,
        side: THREE.BackSide,
        blending: THREE.AdditiveBlending,
        transparent: true,
        depthWrite: false,
      }),
    []
  );
  return (
    <mesh material={material} scale={1.14}>
      <sphereGeometry args={[EARTH_RADIUS, 48, 48]} />
    </mesh>
  );
}

function GlobeLoadingFallback() {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="flex flex-col items-center gap-2">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent-blue border-t-transparent" />
        <span className="font-mono text-[10px] text-txt-secondary">Loading globe…</span>
      </div>
    </div>
  );
}

function Stars() {
  const positions = useMemo(() => {
    const n = 450;
    const arr = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const v = new THREE.Vector3().randomDirection().multiplyScalar(16 + Math.random() * 10);
      arr.set([v.x, v.y, v.z], i * 3);
    }
    return arr;
  }, []);
  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.04} color="#9aa0a6" transparent opacity={0.65} sizeAttenuation />
    </points>
  );
}

type SatPositions = MutableRefObject<Record<string, THREE.Vector3>>;

function SatDot({
  sat,
  focusedKey,
  onFocus,
  satPositions,
}: {
  sat: SatelliteSummary;
  focusedKey: string | null;
  onFocus: (key: string) => void;
  satPositions: SatPositions;
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const orbitPoints = useMemo(() => {
    const r = radiusFor(sat.priority);
    const v = new THREE.Vector3();
    return Array.from({ length: 129 }, (_, i) => {
      orbitPoint(sat.key, (i / 128) * Math.PI * 2, r, v);
      return [v.x, v.y, v.z] as [number, number, number];
    });
  }, [sat.key, sat.priority]);

  useFrame((_, dt) => {
    radius.current = THREE.MathUtils.damp(radius.current, radiusFor(sat.priority), 2, dt);
    theta.current += dt * speedFor(radius.current) * 0.5;
    orbitPoint(sat.key, theta.current, radius.current, tmp);
    group.current?.position.copy(tmp);
    const store = satPositions.current[sat.key] ?? (satPositions.current[sat.key] = new THREE.Vector3());
    store.copy(tmp);

    const target = focused ? 2.1 : hovered ? 1.6 : 1;
    if (dot.current) {
      const s = THREE.MathUtils.damp(dot.current.scale.x, target, 8, dt);
      dot.current.scale.setScalar(s);
    }

    for (let i = 0; i <= 32; i++) {
      orbitPoint(sat.key, theta.current - (i / 32) * 1.2, radius.current, tmp);
      trailPositions[i * 3] = tmp.x;
      trailPositions[i * 3 + 1] = tmp.y;
      trailPositions[i * 3 + 2] = tmp.z;
    }
    trail.geometry.attributes.position.needsUpdate = true;
    (trail.material as THREE.LineBasicMaterial).color.set(color);
    (trail.material as THREE.LineBasicMaterial).opacity = hovered || focused ? 0.8 : 0.45;
  });

  return (
    <>
      <Line points={orbitPoints} color={color} lineWidth={1} transparent opacity={focused ? 0.5 : 0.18} />
      <primitive object={trail} />
      <group ref={group}>
        <group ref={dot}>
          <mesh
            onClick={(e) => {
              e.stopPropagation();
              onFocus(sat.key);
            }}
            onPointerOver={(e) => {
              e.stopPropagation();
              setHovered(true);
            }}
            onPointerOut={() => {
              setHovered(false);
            }}
          >
            <sphereGeometry args={[0.05, 16, 16]} />
            <meshBasicMaterial color={color} />
          </mesh>
          <mesh>
            <sphereGeometry args={[0.1, 16, 16]} />
            <meshBasicMaterial color={color} transparent opacity={hovered || focused ? 0.3 : 0.12} depthWrite={false} />
          </mesh>
          <Billboard>
            <mesh>
              <ringGeometry args={[0.13, 0.145, 48]} />
              <meshBasicMaterial color={color} transparent opacity={0.9} side={THREE.DoubleSide} />
            </mesh>
          </Billboard>
          {(hovered || focused) && (
            <Html center distanceFactor={7} position={[0, 0.24, 0]} style={{ pointerEvents: 'none' }}>
              <div className="whitespace-nowrap rounded border border-line bg-bg-secondary/95 px-2 py-1 font-mono text-[10px] text-txt-primary">
                {sat.name} &middot; UMRS {sat.umrs.toFixed(1)}
              </div>
            </Html>
          )}
        </group>
      </group>
    </>
  );
}

function CameraRig({
  focusedKey,
  satPositions,
  returningRef,
}: {
  focusedKey: string | null;
  satPositions: SatPositions;
  returningRef: MutableRefObject<boolean>;
}) {
  const { camera } = useThree();
  const desired = useMemo(() => new THREE.Vector3(), []);
  useFrame((_, dt) => {
    if (focusedKey) {
      const p = satPositions.current[focusedKey];
      if (!p) return;
      desired.copy(p).multiplyScalar(1 + 1.5 / Math.max(p.length(), 0.001));
      desired.y += 0.35;
      camera.position.x = THREE.MathUtils.damp(camera.position.x, desired.x, 2.5, dt);
      camera.position.y = THREE.MathUtils.damp(camera.position.y, desired.y, 2.5, dt);
      camera.position.z = THREE.MathUtils.damp(camera.position.z, desired.z, 2.5, dt);
      camera.lookAt(0, 0, 0);
    } else if (returningRef.current) {
      camera.position.x = THREE.MathUtils.damp(camera.position.x, DEFAULT_CAM.x, 2.5, dt);
      camera.position.y = THREE.MathUtils.damp(camera.position.y, DEFAULT_CAM.y, 2.5, dt);
      camera.position.z = THREE.MathUtils.damp(camera.position.z, DEFAULT_CAM.z, 2.5, dt);
      camera.lookAt(0, 0, 0);
      if (camera.position.distanceTo(DEFAULT_CAM) < 0.08) returningRef.current = false;
    }
  });
  return null;
}

function GlobeCursorOverlay() {
  const [hovering, setHovering] = useState(false);
  useEffect(() => {
    document.body.style.cursor = hovering ? 'pointer' : 'auto';
    return () => { document.body.style.cursor = 'auto'; };
  }, [hovering]);
  return null;
}

export default function GlobeView() {
  const { state, dashboard, select } = useDashboard();
  const sats = state?.satellites ?? [];
  const [focusedKey, setFocusedKey] = useState<string | null>(null);
  const satPositions = useRef<Record<string, THREE.Vector3>>({});
  const returningRef = useRef(false);
  const controlsRef = useRef<OrbitControlsType>(null);
  const resumeTimer = useRef<number | null>(null);

  const focus = (key: string) => {
    setFocusedKey(key);
    select(key);
  };
  const unfocus = () => {
    setFocusedKey((prev) => {
      if (prev) returningRef.current = true;
      return null;
    });
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') unfocus();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const focusedSat = sats.find((s) => s.key === focusedKey) ?? null;

  return (
    <section className="relative h-[420px] overflow-hidden rounded-xl border border-line bg-bg-secondary md:h-[480px]">
      <Canvas camera={{ position: [0, 0.7, 5.4], fov: 42 }} dpr={[1, 2]} onPointerMissed={unfocus}>
        <ambientLight intensity={0.55} />
        <directionalLight position={[6, 3, 5]} intensity={1.6} />
        <Stars />
        <Suspense fallback={null}>
          <Earth />
        </Suspense>
        <Atmosphere />
        {sats.map((s) => (
          <SatDot key={s.key} sat={s} focusedKey={focusedKey} onFocus={focus} satPositions={satPositions} />
        ))}
        <CameraRig focusedKey={focusedKey} satPositions={satPositions} returningRef={returningRef} />
        <OrbitControls
          ref={controlsRef}
          enabled={!focusedKey}
          enablePan={false}
          autoRotate
          autoRotateSpeed={0.5}
          minDistance={2.6}
          maxDistance={10}
          onStart={() => {
            if (controlsRef.current) controlsRef.current.autoRotate = false;
            if (resumeTimer.current) window.clearTimeout(resumeTimer.current);
          }}
          onEnd={() => {
            resumeTimer.current = window.setTimeout(() => {
              if (controlsRef.current) controlsRef.current.autoRotate = true;
            }, 5000);
          }}
        />
      </Canvas>
      <div className="pointer-events-none absolute left-4 top-3 font-mono text-[10px] uppercase tracking-widest text-txt-secondary">
        Orbital View &mdash; click a satellite
      </div>
      <AnimatePresence>
        {focusedSat && (
          <motion.div
            key={focusedSat.key}
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0, transition: { delay: 1.5, duration: 0.4, ease: 'easeOut' } }}
            exit={{ opacity: 0, x: 16, transition: { duration: 0.25 } }}
            className="absolute right-4 top-4 w-64 rounded-xl border border-line bg-bg-secondary/95 p-4 backdrop-blur"
          >
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-mono text-sm text-txt-primary">{focusedSat.name}</h3>
              <LevelBadge level={focusedSat.level} />
            </div>
            <p className="mt-1 text-[11px] text-txt-secondary">{focusedSat.label}</p>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="font-mono text-2xl text-txt-primary">{focusedSat.umrs.toFixed(1)}</span>
              <span className="text-[10px] uppercase tracking-widest text-txt-secondary">UMRS</span>
            </div>
            {dashboard?.sat_key === focusedSat.key && (
              <p className="mt-2 text-[11px] leading-relaxed text-txt-secondary">{dashboard.profile.desc}</p>
            )}
            <p className="mt-2 font-mono text-[9px] text-txt-secondary/60">ESC or click empty space to release camera</p>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
