import { api } from './client';
import {
  AlertsResponse,
  ForecastResponse,
  GlobalState,
  ResetResponse,
  SatelliteDashboard,
  TickResponse,
} from './types';

export const getState = () => api.get<GlobalState>('/api/state').then((r) => r.data);

export const tick = (ticks = 1) => api.post<TickResponse>('/api/tick', { ticks }).then((r) => r.data);

export const resetSim = () => api.post<ResetResponse>('/api/reset').then((r) => r.data);

export const getSatellite = (key: string) =>
  api.get<SatelliteDashboard>(`/api/satellites/${key}`).then((r) => r.data);

export const getForecast = (key: string) =>
  api.get<ForecastResponse>(`/api/satellites/${key}/forecast`).then((r) => r.data);

export const getAlerts = () => api.get<AlertsResponse>('/api/alerts').then((r) => r.data);

export const resolveAlert = (alertId: number) =>
  api.post(`/api/alerts/${alertId}/resolve`).then((r) => r.data);
