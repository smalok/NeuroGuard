'use client';
import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import {
    getSessions, addSession as storeAddSession, clearSessions as storeClearSessions,
    getAlerts, addAlertEntry, updateAlert, removeAlert as storeRemoveAlert, clearAlerts as storeClearAlerts,
    getProfile, saveProfile,
    getSettings, saveSettings,
    getReports, addReport as storeAddReport, clearReports as storeClearReports,
    getAlertRules, saveAlertRules,
    AppSettings,
} from '@/lib/sessionStore';
import { Alert, SessionData, UserProfile, Report, AlertRule } from '@/types';

// ─── Context shape ───────────────────────────────────────────────────
interface AppContextType {
    // Sessions
    sessions: SessionData[];
    addSession: (s: SessionData) => void;
    clearSessions: () => void;
    // Alerts
    alerts: Alert[];
    addAlert: (a: Alert) => void;
    dismissAlert: (id: string) => void;
    snoozeAlert: (id: string) => void;
    clearAlerts: () => void;
    unreadAlertCount: number;
    // Profile
    profile: UserProfile;
    updateProfile: (p: UserProfile) => void;
    // Settings
    settings: AppSettings;
    updateSettings: (s: AppSettings) => void;
    // Reports
    reports: Report[];
    addReport: (r: Report) => void;
    clearReports: () => void;
    // Alert rules
    alertRules: AlertRule[];
    updateAlertRules: (rules: AlertRule[]) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
    // ── State ────────────────────────────────────────────────────────
    const [sessions, setSessions] = useState<SessionData[]>([]);
    const [alerts, setAlerts] = useState<Alert[]>([]);
    const [profile, setProfile] = useState<UserProfile>(getProfile());
    const [settings, setSettings] = useState<AppSettings>(getSettings());
    const [reports, setReports] = useState<Report[]>([]);
    const [alertRules, setAlertRules] = useState<AlertRule[]>([]);

    // Load from localStorage on mount
    useEffect(() => {
        setSessions(getSessions());
        setAlerts(getAlerts());
        setProfile(getProfile());
        setSettings(getSettings());
        setReports(getReports());
        setAlertRules(getAlertRules());
    }, []);

    // ── Sessions ─────────────────────────────────────────────────────
    const addSessionCb = useCallback((s: SessionData) => {
        const updated = storeAddSession(s);
        setSessions(updated);
    }, []);

    const clearSessionsCb = useCallback(() => {
        storeClearSessions();
        setSessions([]);
    }, []);

    // ── Alerts ───────────────────────────────────────────────────────
    const addAlertCb = useCallback((a: Alert) => {
        const updated = addAlertEntry(a);
        setAlerts(updated);
    }, []);

    const dismissAlertCb = useCallback((id: string) => {
        const updated = storeRemoveAlert(id);
        setAlerts(updated);
    }, []);

    const snoozeAlertCb = useCallback((id: string) => {
        const updated = updateAlert(id, { read: true });
        setAlerts(updated);
    }, []);

    const clearAlertsCb = useCallback(() => {
        storeClearAlerts();
        setAlerts([]);
    }, []);

    const unreadAlertCount = alerts.filter(a => !a.read).length;

    // ── Profile ──────────────────────────────────────────────────────
    const updateProfileCb = useCallback((p: UserProfile) => {
        saveProfile(p);
        setProfile(p);
    }, []);

    // ── Settings ─────────────────────────────────────────────────────
    const updateSettingsCb = useCallback((s: AppSettings) => {
        saveSettings(s);
        setSettings(s);
    }, []);

    // ── Reports ──────────────────────────────────────────────────────
    const addReportCb = useCallback((r: Report) => {
        const updated = storeAddReport(r);
        setReports(updated);
    }, []);

    const clearReportsCb = useCallback(() => {
        storeClearReports();
        setReports([]);
    }, []);

    // ── Alert Rules ──────────────────────────────────────────────────
    const updateAlertRulesCb = useCallback((rules: AlertRule[]) => {
        saveAlertRules(rules);
        setAlertRules(rules);
    }, []);

    return (
        <AppContext.Provider value={{
            sessions, addSession: addSessionCb, clearSessions: clearSessionsCb,
            alerts, addAlert: addAlertCb, dismissAlert: dismissAlertCb, snoozeAlert: snoozeAlertCb,
            clearAlerts: clearAlertsCb, unreadAlertCount,
            profile, updateProfile: updateProfileCb,
            settings, updateSettings: updateSettingsCb,
            reports, addReport: addReportCb, clearReports: clearReportsCb,
            alertRules, updateAlertRules: updateAlertRulesCb,
        }}>
            {children}
        </AppContext.Provider>
    );
}

export function useApp() {
    const context = useContext(AppContext);
    if (!context) throw new Error('useApp must be used within an AppProvider');
    return context;
}
