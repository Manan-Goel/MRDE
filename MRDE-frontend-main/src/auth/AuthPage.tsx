import { useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Loader2, Lock, Mail, Satellite } from 'lucide-react';
import { login } from './auth';
import { useTheme } from '../state/ThemeContext';

function ParticleField() {
  const count = 120;
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 20;
      arr[i * 3 + 1] = (Math.random() - 0.5) * 20;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 20;
    }
    return arr;
  }, []);
  const ref = useRef<THREE.Points>(null);
  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.y += dt * 0.02;
  });
  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.05} color="#4fc3f7" transparent opacity={0.4} sizeAttenuation />
    </points>
  );
}

export default function AuthPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await login(email.trim(), password);
      navigate('/');
    } catch {
      setError('Invalid credentials. Use admin / admin.');
    } finally {
      setLoading(false);
    }
  };

  const inputClass = 'w-full rounded-lg border border-line py-2.5 pl-9 pr-3 text-sm outline-none transition focus:border-accent-blue/60 focus:ring-1 focus:ring-accent-blue/30 bg-bg-tertiary text-txt-primary placeholder:text-txt-secondary/60';

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-bg-primary p-4">
      {/* 3D background */}
      <div className="absolute inset-0 opacity-30">
        <Canvas camera={{ position: [0, 0, 8], fov: 60 }} dpr={[1, 1.5]}>
          <ParticleField />
        </Canvas>
      </div>
      <div className="absolute inset-0" style={{
        background: theme === 'dark'
          ? 'radial-gradient(ellipse at 50% 30%, rgba(79,195,247,0.08), transparent 60%)'
          : 'radial-gradient(ellipse at 50% 30%, rgba(79,195,247,0.06), transparent 60%)'
      }} />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 100, damping: 16 }}
        className="relative w-full max-w-sm rounded-2xl border border-line bg-bg-secondary/80 p-8 shadow-2xl backdrop-blur-xl"
      >
        <motion.div
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 180, damping: 14 }}
          className="text-center"
        >
          <motion.div
            animate={{ rotate: mounted ? [0, 10, -10, 0] : 0 }}
            transition={{ delay: 0.6, duration: 1.2, ease: 'easeInOut' }}
            className="inline-flex items-center justify-center"
          >
            <Satellite size={26} className="text-accent-blue" />
          </motion.div>
          <h1 className="mt-3 text-2xl font-semibold tracking-[0.25em] text-accent-blue">MRDE</h1>
          <p className="mt-1 text-xs text-txt-secondary">Mission Risk &amp; Decision Engine</p>
        </motion.div>

        <motion.form
          onSubmit={submit}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mt-8 space-y-4"
        >
          <motion.div
            initial={{ x: -12, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="relative"
          >
            <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-txt-secondary" />
            <input
              type="text"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Username"
              className={inputClass}
            />
          </motion.div>
          <motion.div
            initial={{ x: -12, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="relative"
          >
            <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-txt-secondary" />
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className={inputClass}
            />
          </motion.div>
          <motion.button
            type="submit"
            disabled={loading}
            initial={{ y: 12, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.7 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-accent-blue/90 py-2.5 text-sm font-semibold text-bg-primary transition hover:bg-accent-blue disabled:opacity-60"
          >
            {loading && <Loader2 size={14} className="animate-spin" />}
            Sign In
          </motion.button>
          {error && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center text-xs text-risk-critical"
            >
              {error}
            </motion.p>
          )}
        </motion.form>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="mt-6 text-center font-mono text-[10px] text-txt-secondary/50"
        >
          demo credentials: admin / admin
        </motion.p>
      </motion.div>
    </div>
  );
}
