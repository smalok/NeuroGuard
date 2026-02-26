// NeuroGuard — localStorage Persistence Layer
// Provides typed get/set helpers for all app data.

import { Alert, SessionData, UserProfile, Report, AlertRule, DailyTrend } from '@/types';

// ─── Keys ────────────────────────────────────────────────────────────
const KEYS = {
    SESSIONS: 'ng_sessions',
    ALERTS: 'ng_alerts',
    PROFILE: 'ng_profile',
    SETTINGS: 'ng_settings',
    REPORTS: 'ng_reports',
    AUTH: 'ng_auth',
    ALERT_RULES: 'ng_alert_rules',
} as const;

// ─── Settings shape ──────────────────────────────────────────────────
export interface AppSettings {
    theme: 'dark' | 'light';
    accentColor: string;
    notifications: {
        email: boolean;
        push: boolean;
        sound: boolean;
        dailySummary: boolean;
    };
    thresholds: {
        hr: number;
        hrv: number;
        burnout: number;
        emg: number;
    };
}

export interface AuthState {
    loggedIn: boolean;
    email: string;
}

// ─── Defaults ────────────────────────────────────────────────────────
const defaultProfile: UserProfile = {
    name: 'Manish Rai',
    email: 'manish@neuroguard.io',
    occupation: 'Student',
    memberSince: new Date('2026-02-01'),
    age: 22,
    gender: 'Male',
    restingHR: 68,
    avgSleep: 7.5,
    stressBaseline: 4,
    totalSessions: 0,
    avgScore: 0,
    streak: 0,
};

const defaultSettings: AppSettings = {
    theme: 'dark',
    accentColor: '#3b82f6',
    notifications: { email: true, push: false, sound: false, dailySummary: true },
    thresholds: { hr: 100, hrv: 25, burnout: 70, emg: 70 },
};

const defaultRules: AlertRule[] = [
    { id: 'ar1', condition: 'HR > 100 BPM for more than 5 minutes', active: true },
    { id: 'ar2', condition: 'Burnout Score > 60% for 3 consecutive days', active: true },
    { id: 'ar3', condition: 'HRV drops 30% below baseline', active: false },
    { id: 'ar4', condition: 'EMG Median Frequency < 70 Hz', active: true },
];

// ─── Helpers ─────────────────────────────────────────────────────────
function getItem<T>(key: string, fallback: T): T {
    if (typeof window === 'undefined') return fallback;
    try {
        const raw = localStorage.getItem(key);
        if (!raw) return fallback;
        return JSON.parse(raw, (k, v) => {
            // Revive Date fields
            if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(v)) return new Date(v);
            return v;
        }) as T;
    } catch {
        return fallback;
    }
}

function setItem<T>(key: string, value: T): void {
    if (typeof window === 'undefined') return;
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
        console.warn('localStorage write failed:', e);
    }
}

// ─── Sessions ────────────────────────────────────────────────────────
export function getSessions(): SessionData[] {
    return getItem<SessionData[]>(KEYS.SESSIONS, []);
}

export function addSession(session: SessionData): SessionData[] {
    const sessions = getSessions();
    sessions.unshift(session); // newest first
    // Keep max 20 sessions (storing raw data is heavy)
    const trimmed = sessions.slice(0, 20);
    setItem(KEYS.SESSIONS, trimmed);
    return trimmed;
}

export function clearSessions(): void {
    setItem(KEYS.SESSIONS, []);
}

// ─── Alerts ──────────────────────────────────────────────────────────
export function getAlerts(): Alert[] {
    return getItem<Alert[]>(KEYS.ALERTS, []);
}

export function addAlertEntry(alert: Alert): Alert[] {
    const alerts = getAlerts();
    alerts.unshift(alert);
    const trimmed = alerts.slice(0, 100);
    setItem(KEYS.ALERTS, trimmed);
    return trimmed;
}

export function updateAlert(id: string, updates: Partial<Alert>): Alert[] {
    const alerts = getAlerts().map(a => a.id === id ? { ...a, ...updates } : a);
    setItem(KEYS.ALERTS, alerts);
    return alerts;
}

export function removeAlert(id: string): Alert[] {
    const alerts = getAlerts().filter(a => a.id !== id);
    setItem(KEYS.ALERTS, alerts);
    return alerts;
}

export function clearAlerts(): void {
    setItem(KEYS.ALERTS, []);
}

// ─── Profile ─────────────────────────────────────────────────────────
export function getProfile(): UserProfile {
    return getItem<UserProfile>(KEYS.PROFILE, defaultProfile);
}

export function saveProfile(profile: UserProfile): void {
    setItem(KEYS.PROFILE, profile);
}

// ─── Settings ────────────────────────────────────────────────────────
export function getSettings(): AppSettings {
    return getItem<AppSettings>(KEYS.SETTINGS, defaultSettings);
}

export function saveSettings(settings: AppSettings): void {
    setItem(KEYS.SETTINGS, settings);
}

// ─── Reports ─────────────────────────────────────────────────────────
export function getReports(): Report[] {
    return getItem<Report[]>(KEYS.REPORTS, []);
}

export function addReport(report: Report): Report[] {
    const reports = getReports();
    reports.unshift(report);
    setItem(KEYS.REPORTS, reports.slice(0, 50));
    return reports;
}

export function clearReports(): void {
    setItem(KEYS.REPORTS, []);
}

// ─── Alert Rules ─────────────────────────────────────────────────────
export function getAlertRules(): AlertRule[] {
    return getItem<AlertRule[]>(KEYS.ALERT_RULES, defaultRules);
}

export function saveAlertRules(rules: AlertRule[]): void {
    setItem(KEYS.ALERT_RULES, rules);
}

// ─── Auth ────────────────────────────────────────────────────────────
export function getAuth(): AuthState {
    return getItem<AuthState>(KEYS.AUTH, { loggedIn: false, email: '' });
}

export function setAuth(auth: AuthState): void {
    setItem(KEYS.AUTH, auth);
}

// ─── Export / Clear all ──────────────────────────────────────────────
export function exportAllData(): string {
    const data = {
        sessions: getSessions(),
        alerts: getAlerts(),
        profile: getProfile(),
        settings: getSettings(),
        reports: getReports(),
        alertRules: getAlertRules(),
    };
    return JSON.stringify(data, null, 2);
}

export function exportAllDataCSV(): string {
    const sessions = getSessions();
    if (sessions.length === 0) return 'No session data to export';
    const headers = ['id', 'date', 'duration', 'avgHR', 'avgHRV', 'burnoutScore', 'classification', 'hasRawData'];
    const rows = sessions.map(s =>
        [
            s.id,
            s.date instanceof Date ? s.date.toISOString() : s.date,
            s.duration,
            s.avgHR,
            s.avgHRV,
            s.burnoutScore,
            s.classification,
            (s.rawECG && s.rawECG.length > 0) ? 'yes' : 'no'
        ].join(',')
    );
    return [headers.join(','), ...rows].join('\n');
}

export function deleteAllData(): void {
    Object.values(KEYS).forEach(key => {
        try { localStorage.removeItem(key); } catch { /* ignore */ }
    });
}
