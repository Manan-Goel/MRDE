import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { getForecast, getSatellite, getState, resetSim, tick } from '../api/endpoints';
import { ForecastResponse, GlobalState, SatelliteDashboard } from '../api/types';

interface DashboardCtx {
  state: GlobalState | null;
  dashboard: SatelliteDashboard | null;
  forecast: ForecastResponse | null;
  selected: string;
  select: (key: string) => void;
  paused: boolean;
  setPaused: (p: boolean) => void;
  tickOnce: () => Promise<void>;
  forceTick: () => Promise<void>;
  reset: () => Promise<void>;
  offline: boolean;
}

const Ctx = createContext<DashboardCtx | null>(null);

export function DashboardProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<GlobalState | null>(null);
  const [dashboard, setDashboard] = useState<SatelliteDashboard | null>(null);
  const [forecast, setForecast] = useState<ForecastResponse | null>(null);
  const [selected, setSelected] = useState('sat1');
  const [paused, setPaused] = useState(false);
  const [offline, setOffline] = useState(false);
  const generationRef = useRef(0);
  const tickingRef = useRef(false);

  const refresh = useCallback(async () => {
    const gen = ++generationRef.current;
    const key = selected;
    let anySuccess = false;
    try {
      const s = await getState();
      if (gen === generationRef.current) { setState(s); anySuccess = true; }
    } catch { /* individual call failure is OK */ }
    try {
      const d = await getSatellite(key);
      if (gen === generationRef.current) { setDashboard(d); anySuccess = true; }
    } catch { /* individual call failure is OK */ }
    try {
      const f = await getForecast(key);
      if (gen === generationRef.current) { setForecast(f); anySuccess = true; }
    } catch { /* individual call failure is OK */ }
    if (gen === generationRef.current) setOffline(!anySuccess);
  }, [selected]);

  const tickOnce = useCallback(async () => {
    if (tickingRef.current) return;
    tickingRef.current = true;
    try {
      await tick(1);
      await refresh();
    } catch {
      setOffline(true);
    } finally {
      tickingRef.current = false;
    }
  }, [refresh]);

  const forceTick = useCallback(async () => {
    try {
      await tick(1);
      await refresh();
    } catch {
      setOffline(true);
    }
  }, [refresh]);

  const reset = useCallback(async () => {
    generationRef.current++;
    tickingRef.current = true;
    try {
      await resetSim();
      await refresh();
    } catch {
      setOffline(true);
    } finally {
      tickingRef.current = false;
    }
  }, [refresh]);

  // Initial fetch
  useEffect(() => {
    refresh();
  }, [refresh]);

  // Auto-poll loop: every 2s = 2 sim minutes
  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => {
      void tickOnce();
    }, 2000);
    return () => clearInterval(id);
  }, [paused, tickOnce]);

  // Keyboard selection 1 / 2 / 3 and p for pause
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.key === '1') setSelected('sat1');
      if (e.key === '2') setSelected('sat2');
      if (e.key === '3') setSelected('sat3');
      if (e.key === 'p' || e.key === 'P') setPaused((prev) => !prev);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <Ctx.Provider
      value={{ state, dashboard, forecast, selected, select: setSelected, paused, setPaused, tickOnce, forceTick, reset, offline }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useDashboard() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useDashboard must be used within DashboardProvider');
  return ctx;
}
