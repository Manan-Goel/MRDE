import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Loader2, Lock, Mail, Satellite } from 'lucide-react';
import { login } from './auth';

export default function AuthPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

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

  return (
    <div className="grid-bg flex min-h-screen items-center justify-center bg-bg-primary p-4">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 120, damping: 18 }}
        className="w-full max-w-sm rounded-2xl border border-line bg-bg-secondary/70 p-8 shadow-2xl backdrop-blur-xl"
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.15, type: 'spring', stiffness: 200, damping: 16 }}
          className="flex items-center justify-center gap-2"
        >
          <Satellite size={20} className="text-accent-blue" />
          <span className="text-xl font-semibold tracking-[0.2em] text-accent-blue">MRDE</span>
        </motion.div>
        <p className="mt-2 text-center text-xs text-txt-secondary">Sign In to Mission Dashboard</p>
        <form onSubmit={submit} className="mt-6 space-y-3">
          <div className="relative">
            <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-txt-secondary" />
            <input
              type="text"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email or username"
              className="w-full rounded-lg border border-line py-2 pl-9 pr-3 text-sm outline-none transition focus:border-accent-blue/60"
            />
          </div>
          <div className="relative">
            <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-txt-secondary" />
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="w-full rounded-lg border border-line py-2 pl-9 pr-3 text-sm outline-none transition focus:border-accent-blue/60"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-accent-blue/90 py-2 text-sm font-semibold text-bg-primary transition hover:bg-accent-blue disabled:opacity-60"
          >
            {loading && <Loader2 size={14} className="animate-spin" />}
            Sign In
          </button>
          {error && <p className="text-center text-xs text-risk-critical">{error}</p>}
        </form>
        <p className="mt-4 text-center font-mono text-[10px] text-txt-secondary/60">demo: admin / admin</p>
      </motion.div>
    </div>
  );
}
