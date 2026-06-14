export type RiskLevel = 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW';
export type Movement = 'up' | 'down' | null;
export type TimeSensitivity = 'Immediate' | 'Soon' | 'Monitor';
export type Confidence = 'High' | 'Medium' | 'Low';

export interface SatelliteSummary {
  key: string;
  name: string;
  label: string;
  desc: string;
  umrs: number;
  level: RiskLevel;
  collision: number;
  weather: number;
  ground: number;
  health: number;
  priority: number;
  movement: Movement;
}

export interface GlobalState {
  clock_min: number;
  clock_str: string;
  kp_val: number;
  kp_idx: number;
  alerts: AlertItem[];
  alert_summary: string;
  satellites: SatelliteSummary[];
}

export interface TickResponse {
  clock_min: number;
  clock_str: string;
  satellites: SatelliteSummary[];
}

export interface ResetResponse {
  status: string;
  clock_str: string;
}

export interface PriorityItem {
  priority: number;
  component: string;
  score: number;
  critical: boolean;
  level: RiskLevel;
  context: Record<string, unknown>;
}

export interface RecommendationItem {
  priority: number;
  component: string;
  headline: string;
  explanation: string;
  recommended_action: string;
  time_sensitivity: TimeSensitivity;
  confidence: Confidence;
}

export interface ForecastHour {
  hour: number;
  collision: number;
  weather: number;
  ground: number;
  health: number;
  umrs: number;
  level: RiskLevel;
  events: string[];
}

export interface SatelliteProfile {
  id?: string | number;
  name: string;
  label: string;
  desc: string;
  stations?: string[];
}

export interface HealthInfo {
  battery_percentage: number;
  eclipse_duration_minutes: number;
  payload_utilization: number;
  solar_panel_efficiency: number;
  temperature_status: string;
}

export interface SatelliteDashboard {
  sat_key: string;
  profile: SatelliteProfile;
  scores: {
    collision: number;
    weather: number;
    ground: number;
    health: number;
    umrs: number;
    level: RiskLevel;
  };
  priority: PriorityItem[];
  recommendations: RecommendationItem[];
  forecast: ForecastHour[];
  health: HealthInfo;
  stations: Record<string, string>;
  cdms: { pc: number; min_rng_m: number }[];
  movement: Movement;
  recent_events: string[];
  all_summaries: SatelliteSummary[];
}

export interface AlertItem {
  id: number;
  sat_key: string;
  sat_name: string;
  type: string;
  message: string;
  severity: string;
  timestamp: string;
  clock_min: number;
  resolved: boolean;
}

export interface AlertsResponse {
  alerts: AlertItem[];
  active: AlertItem[];
  resolved: AlertItem[];
}

export interface ForecastResponse {
  sat_key: string;
  name: string;
  hours: ForecastHour[];
  umrs_series: number[];
  collision_series: number[];
  health_series: number[];
  ground_series: number[];
  weather_series: number[];
}
