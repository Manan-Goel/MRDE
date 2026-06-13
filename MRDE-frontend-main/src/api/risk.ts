import { Confidence, RiskLevel, TimeSensitivity } from './types';

export const LEVEL_COLORS: Record<RiskLevel, string> = {
  CRITICAL: '#ef5350',
  HIGH: '#ffa726',
  MODERATE: '#ffd54f',
  LOW: '#66bb6a',
};

export const LEVEL_BADGE: Record<RiskLevel, string> = {
  CRITICAL: 'bg-risk-critical/15 text-risk-critical border-risk-critical/40',
  HIGH: 'bg-risk-high/15 text-risk-high border-risk-high/40',
  MODERATE: 'bg-risk-moderate/15 text-risk-moderate border-risk-moderate/40',
  LOW: 'bg-risk-low/15 text-risk-low border-risk-low/40',
};

export function levelOf(score: number): RiskLevel {
  if (score >= 75) return 'CRITICAL';
  if (score >= 50) return 'HIGH';
  if (score >= 25) return 'MODERATE';
  return 'LOW';
}

export const TIME_BADGE: Record<TimeSensitivity, string> = {
  Immediate: 'bg-risk-critical/15 text-risk-critical border-risk-critical/40',
  Soon: 'bg-risk-high/15 text-risk-high border-risk-high/40',
  Monitor: 'bg-accent-blue/15 text-accent-blue border-accent-blue/40',
};

export const CONF_BADGE: Record<Confidence, string> = {
  High: 'bg-risk-low/15 text-risk-low border-risk-low/40',
  Medium: 'bg-risk-moderate/15 text-risk-moderate border-risk-moderate/40',
  Low: 'bg-risk-critical/15 text-risk-critical border-risk-critical/40',
};
