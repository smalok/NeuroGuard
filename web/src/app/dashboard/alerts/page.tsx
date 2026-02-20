'use client';
import { useEffect, useState } from 'react';
import Header from '@/components/layout/Header';
import { generateAlerts, generateAlertRules, formatTime } from '@/lib/mockData';
import { Alert, AlertRule } from '@/types';
import { AlertTriangle, X, Clock, ChevronRight, Bell, BellOff, Mail, Volume2, Plus } from 'lucide-react';
import {
    Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend,
} from 'chart.js';
import { Doughnut, Bar } from 'react-chartjs-2';
import styles from './page.module.css';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend);

export default function AlertsPage() {
    const [alerts, setAlerts] = useState<Alert[] | null>(null);
    const [rules, setRules] = useState<AlertRule[] | null>(null);
    const [thresholds, setThresholds] = useState({ hr: 100, hrv: 25, burnout: 70, emg: 70 });

    useEffect(() => {
        setAlerts(generateAlerts(8));
        setRules(generateAlertRules());
    }, []);

    if (!alerts || !rules) return <div className={styles.content}>Loading alerts...</div>;

    const criticalCount = alerts.filter(a => a.severity === 'critical').length;

    const severityBg = { critical: '#ef4444', warning: '#eab308', info: '#3b82f6', success: '#22c55e' };
    const sourceColors = { ECG: 'badge-blue', EMG: 'badge-purple', ML: 'badge-green', System: 'badge-yellow', Device: 'badge-blue' };

    const donutData = { labels: ['Critical', 'Warning', 'Info', 'Success'], datasets: [{ data: [8, 15, 22, 5], backgroundColor: ['#ef4444', '#eab308', '#3b82f6', '#22c55e'], borderWidth: 0 }] };
    const donutOpts = { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' as const, labels: { color: '#94a3b8', padding: 16, usePointStyle: true } } }, cutout: '65%' };

    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const barData = {
        labels: days,
        datasets: [
            { label: 'Critical', data: days.map(() => Math.floor(Math.random() * 3)), backgroundColor: '#ef444480' },
            { label: 'Warning', data: days.map(() => Math.floor(Math.random() * 5)), backgroundColor: '#eab30880' },
            { label: 'Info', data: days.map(() => Math.floor(Math.random() * 6)), backgroundColor: '#3b82f680' },
        ],
    };
    const barOpts = {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { labels: { color: '#94a3b8', usePointStyle: true, padding: 12 } } },
        scales: { x: { stacked: true, grid: { display: false }, ticks: { color: '#64748b' } }, y: { stacked: true, grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#64748b' } } },
    };

    return (
        <>
            <Header breadcrumbs={[{ label: 'Dashboard' }, { label: 'Alert Center' }]} />
            <div className={styles.content}>
                {criticalCount > 0 && (
                    <div className={styles.criticalBanner}>
                        <AlertTriangle size={18} />
                        <span>{criticalCount} Critical Alerts Require Attention</span>
                        <a href="#feed" className={styles.bannerLink}>View Details →</a>
                    </div>
                )}

                <div className={styles.mainGrid}>
                    {/* Alert Feed */}
                    <div id="feed" className={styles.feedCard}>
                        <h4>Alert Feed</h4>
                        <div className={styles.feed}>
                            {alerts.map(a => (
                                <div key={a.id} className={`${styles.alertItem} ${!a.read ? styles.unread : ''}`}>
                                    <div className={styles.alertDot} style={{ background: severityBg[a.severity] }} />
                                    <div className={styles.alertBody}>
                                        <p className={styles.alertMsg}>{a.message}</p>
                                        <div className={styles.alertMeta}>
                                            <span className={`badge ${sourceColors[a.source]}`}>{a.source}</span>
                                            <span className={styles.alertTime}>{formatTime(a.timestamp)}</span>
                                        </div>
                                    </div>
                                    <div className={styles.alertActions}>
                                        <button className={styles.actionBtn} title="Snooze"><Clock size={14} /></button>
                                        <button className={styles.actionBtn} title="Dismiss"><X size={14} /></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Settings Panel */}
                    <div className={styles.settingsPanel}>
                        <div className={styles.settingsCard}>
                            <h4>Alert Thresholds</h4>
                            {Object.entries(thresholds).map(([key, val]) => {
                                const labels: Record<string, string> = { hr: 'Heart Rate (BPM)', hrv: 'HRV (ms)', burnout: 'Burnout Score (%)', emg: 'EMG Freq (Hz)' };
                                return (
                                    <div key={key} className={styles.sliderRow}>
                                        <label>{labels[key]}: <strong className="mono">{val}</strong></label>
                                        <input type="range" min={key === 'hr' ? 60 : key === 'hrv' ? 10 : 20} max={key === 'hr' ? 140 : 100} value={val}
                                            onChange={e => setThresholds(prev => ({ ...prev, [key]: +e.target.value }))}
                                            className={styles.slider}
                                        />
                                    </div>
                                );
                            })}
                        </div>

                        <div className={styles.settingsCard}>
                            <h4>Notifications</h4>
                            {[
                                { icon: Mail, label: 'Email Alerts', on: true },
                                { icon: Bell, label: 'Push Notifications', on: true },
                                { icon: Volume2, label: 'Sound Alerts', on: false },
                            ].map((n, i) => (
                                <div key={i} className={styles.toggleRow}>
                                    <n.icon size={16} />
                                    <span>{n.label}</span>
                                    <label className={styles.switch}>
                                        <input type="checkbox" defaultChecked={n.on} />
                                        <span className={styles.switchSlider} />
                                    </label>
                                </div>
                            ))}
                            <button className="btn btn-primary btn-sm" style={{ width: '100%', marginTop: 'var(--space-4)' }}>Save Settings</button>
                        </div>
                    </div>
                </div>

                {/* Charts */}
                <div className="grid-2">
                    <div className={styles.chartCard}>
                        <h4>Alerts by Severity</h4>
                        <div className={styles.donutWrap}><Doughnut data={donutData} options={donutOpts} /></div>
                    </div>
                    <div className={styles.chartCard}>
                        <h4>7-Day Alert Frequency</h4>
                        <div className={styles.chartWrap}><Bar data={barData} options={barOpts} /></div>
                    </div>
                </div>

                {/* Smart Rules */}
                <div className={styles.rulesCard}>
                    <div className={styles.rulesHeader}>
                        <h4>Custom Alert Rules</h4>
                        <button className="btn btn-outline btn-sm"><Plus size={14} /> Create Rule</button>
                    </div>
                    {rules.map(r => (
                        <div key={r.id} className={styles.ruleRow}>
                            <span>{r.condition}</span>
                            <label className={styles.switch}>
                                <input type="checkbox" defaultChecked={r.active} />
                                <span className={styles.switchSlider} />
                            </label>
                        </div>
                    ))}
                </div>
            </div>
        </>
    );
}
