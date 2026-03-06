'use client';
import { useState, useEffect, useMemo, useCallback } from 'react';
import dynamic from 'next/dynamic';
import Header from '@/components/layout/Header';
import { SessionData } from '@/types';
import { getSessions } from '@/lib/sessionStore';
import { generateSessionHistory, formatDuration, getClassBadge, getClassLabel } from '@/lib/mockData';
import { FileText, TrendingUp, Heart, Activity, BarChart2, Download, Brain } from 'lucide-react';
import {
    Chart as ChartJS, CategoryScale, LinearScale, PointElement,
    LineElement, Filler, Tooltip, Legend,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import styles from './page.module.css';


ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip, Legend);

// Lazy-load the heavy ECG modal (canvas + analysis)
const ECGReportModal = dynamic(() => import('@/components/ecg/ECGReportModal'), { ssr: false });

// ─── Download helpers ──────────────────────────────────────────────────────
function downloadFile(content: string, filename: string, type: string) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function sessionToCSV(s: SessionData): string {
    const d = s.date instanceof Date ? s.date : new Date(s.date);
    let csv = 'NeuroGuard Session Data Export\n';
    csv += `Session ID,${s.id}\n`;
    csv += `Date,${d.toISOString()}\n`;
    csv += `Duration,${s.duration} seconds\n`;
    csv += `Avg HR,${s.avgHR} BPM\n`;
    csv += `Avg HRV,${s.avgHRV} ms\n`;
    csv += `Burnout Score,${s.burnoutScore}%\n`;
    csv += `Classification,${s.classification}\n`;

    if (s.rawECG && s.rawECG.length > 0) {
        csv += `\nECG Raw Data (${s.rawECG.length} samples)\n`;
        csv += `sample_index,ecg_value_mV\n`;
        s.rawECG.forEach((v, i) => { csv += `${i},${v}\n`; });
    }

    if (s.rawEEG && s.rawEEG.length > 0) {
        csv += `\nEEG Raw Data (${s.rawEEG.length} samples)\n`;
        csv += `sample_index,eeg_value_uV\n`;
        s.rawEEG.forEach((v, i) => { csv += `${i},${v}\n`; });
    }

    return csv;
}

function sessionToJSON(s: SessionData): string {
    return JSON.stringify({
        exportedAt: new Date().toISOString(),
        session: {
            id: s.id,
            date: s.date,
            duration: s.duration,
            avgHR: s.avgHR,
            avgHRV: s.avgHRV,
            burnoutScore: s.burnoutScore,
            classification: s.classification,
            rawECG: s.rawECG || [],
            rawEEG: s.rawEEG || [],
        }
    }, null, 2);
}

// ─── Range filter helpers ──────────────────────────────────────────────────────
type Range = 'Today' | '7D' | '30D' | '90D' | 'All';

function filterByRange(sessions: SessionData[], range: Range): SessionData[] {
    if (range === 'All') return sessions;
    const now = Date.now();
    const msMap: Record<string, number> = { Today: 86400000, '7D': 7 * 86400000, '30D': 30 * 86400000, '90D': 90 * 86400000 };
    const cutoff = now - msMap[range];
    return sessions.filter(s => {
        const t = s.date instanceof Date ? s.date.getTime() : new Date(s.date).getTime();
        return t >= cutoff;
    });
}

// ─── History Page ─────────────────────────────────────────────────────────────
export default function HistoryPage() {
    const [range, setRange] = useState<Range>('All');
    const [activeReport, setActiveReport] = useState<SessionData | null>(null);
    const [allSessions, setAllSessions] = useState<SessionData[]>([]);

    useEffect(() => {
        const stored = getSessions();
        setAllSessions(stored.length > 0 ? stored : generateSessionHistory(10));
    }, []);

    const sessions = useMemo(() => filterByRange(allSessions, range), [allSessions, range]);

    const openReport = useCallback((s: SessionData) => setActiveReport(s), []);
    const closeReport = useCallback(() => setActiveReport(null), []);

    // Trend chart data
    const chartLabels = useMemo(
        () => sessions.slice().reverse().map(s =>
            (s.date instanceof Date ? s.date : new Date(s.date)).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
        ),
        [sessions]
    );
    const hrData = useMemo(() => sessions.slice().reverse().map(s => s.avgHR), [sessions]);
    const hrvData = useMemo(() => sessions.slice().reverse().map(s => s.avgHRV), [sessions]);
    const burnoutData = useMemo(() => sessions.slice().reverse().map(s => s.burnoutScore), [sessions]);

    const lineOpts = {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { mode: 'index' as const, intersect: false } },
        scales: {
            x: { ticks: { color: '#64748b', font: { size: 10 } }, grid: { color: '#e2e8f0' } },
            y: { ticks: { color: '#64748b', font: { size: 10 } }, grid: { color: '#e2e8f0' } },
        },
    };

    return (
        <>
            <Header breadcrumbs={[{ label: 'Dashboard' }, { label: 'History & Trends' }]} />
            <div className={styles.content}>

                {/* ── Top bar ── */}
                <div className={styles.topBar}>
                    <div>
                        <h2 className={styles.pageTitle}>Session History</h2>
                        <p className={styles.pageSubtitle}>{sessions.length} sessions · Download data in CSV or JSON</p>
                    </div>
                    <div className={styles.rangeBar}>
                        {(['Today', '7D', '30D', '90D', 'All'] as Range[]).map(r => (
                            <button
                                key={r}
                                className={`${styles.rangeBtn} ${range === r ? styles.rangeActive : ''}`}
                                onClick={() => setRange(r)}
                            >
                                {r}
                            </button>
                        ))}
                    </div>
                </div>

                {/* ── Trend Charts ── */}
                {sessions.length > 1 && (
                    <div className={styles.trendGrid}>
                        <div className={styles.chartCard}>
                            <div className={styles.chartCardHead}>
                                <Heart size={14} className={styles.iconRed} /> <span>Heart Rate (BPM)</span>
                            </div>
                            <div className={styles.chartWrap}>
                                <Line
                                    data={{
                                        labels: chartLabels,
                                        datasets: [{
                                            data: hrData, borderColor: '#ef4444', backgroundColor: 'rgba(239,68,68,0.08)',
                                            fill: true, tension: 0.35, pointRadius: 3,
                                        }],
                                    }}
                                    options={lineOpts}
                                />
                            </div>
                        </div>

                        <div className={styles.chartCard}>
                            <div className={styles.chartCardHead}>
                                <Activity size={14} className={styles.iconBlue} /> <span>HRV · Avg (ms)</span>
                            </div>
                            <div className={styles.chartWrap}>
                                <Line
                                    data={{
                                        labels: chartLabels,
                                        datasets: [{
                                            data: hrvData, borderColor: '#3b82f6', backgroundColor: 'rgba(59,130,246,0.08)',
                                            fill: true, tension: 0.35, pointRadius: 3,
                                        }],
                                    }}
                                    options={lineOpts}
                                />
                            </div>
                        </div>

                        <div className={styles.chartCard}>
                            <div className={styles.chartCardHead}>
                                <BarChart2 size={14} className={styles.iconPurple} /> <span>Burnout Score (%)</span>
                            </div>
                            <div className={styles.chartWrap}>
                                <Line
                                    data={{
                                        labels: chartLabels,
                                        datasets: [{
                                            data: burnoutData, borderColor: '#a855f7', backgroundColor: 'rgba(168,85,247,0.08)',
                                            fill: true, tension: 0.35, pointRadius: 3,
                                        }],
                                    }}
                                    options={lineOpts}
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* ── Session Table ── */}
                <div className={styles.tableCard}>
                    <div className={styles.tableHeader}>
                        <div className={styles.tableHLeft}>
                            <TrendingUp size={16} className={styles.iconBlue} />
                            <h4>Session Log</h4>
                        </div>
                        <span className={styles.tableCount}>{sessions.length} records</span>
                    </div>

                    {sessions.length === 0 ? (
                        <div className={styles.emptyState}>
                            <span className={styles.emptyIcon}>📊</span>
                            <h3>No sessions in this range</h3>
                            <p>Try a wider date range or connect your NeuroGuard device to record a session.</p>
                        </div>
                    ) : (
                        <div className={styles.tableWrap}>
                            <table className={styles.table}>
                                <thead>
                                    <tr>
                                        <th>#</th>
                                        <th>Date & Time</th>
                                        <th>Type</th>
                                        <th>Duration</th>
                                        <th>Avg HR</th>
                                        <th>Avg HRV</th>
                                        <th>Burnout</th>
                                        <th>Classification</th>
                                        <th>Download Data</th>
                                        <th>Report</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sessions.map((s, idx) => {
                                        const d = s.date instanceof Date ? s.date : new Date(s.date);
                                        const hasECG = s.rawECG && s.rawECG.length > 0;
                                        const hasEEG = s.rawEEG && s.rawEEG.length > 0;
                                        const sessionType = hasECG && hasEEG ? 'Both' : hasECG ? 'ECG' : hasEEG ? 'EEG' : 'None';

                                        return (
                                            <tr key={s.id}>
                                                <td className={styles.tdIdx}>{idx + 1}</td>
                                                <td>
                                                    <div className={styles.dateCell}>
                                                        <span className={styles.datePrimary}>
                                                            {d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                        </span>
                                                        <span className={styles.dateSecondary}>
                                                            {d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td>
                                                    {hasECG && <span className={`${styles.badge} ${styles['badge-blue']}`} style={{ marginRight: 4 }}><Heart size={9} /> ECG</span>}
                                                    {hasEEG && <span className={`${styles.badge} ${styles['badge-purple']}`}><Brain size={9} /> EEG</span>}
                                                    {!hasECG && !hasEEG && <span className={`${styles.badge} ${styles['badge-yellow']}`}>Demo</span>}
                                                </td>
                                                <td className={styles.tdMono}>{formatDuration(s.duration)}</td>
                                                <td>
                                                    <span className={styles.vitStat}>{s.avgHR}</span>
                                                    <span className={styles.vitUnit}> BPM</span>
                                                </td>
                                                <td>
                                                    <span className={styles.vitStat}>{s.avgHRV}</span>
                                                    <span className={styles.vitUnit}> ms</span>
                                                </td>
                                                <td>
                                                    <div className={styles.burnoutBar}>
                                                        <div
                                                            className={styles.burnoutFill}
                                                            style={{
                                                                width: `${s.burnoutScore}%`,
                                                                background: s.burnoutScore > 70 ? '#ef4444' : s.burnoutScore > 40 ? '#f59e0b' : '#22c55e',
                                                            }}
                                                        />
                                                        <span className={styles.burnoutLabel}>{s.burnoutScore}%</span>
                                                    </div>
                                                </td>
                                                <td>
                                                    <span className={`${styles.badge} ${styles[getClassBadge(s.classification)]}`}>
                                                        {getClassLabel(s.classification)}
                                                    </span>
                                                </td>
                                                <td>
                                                    <div style={{ display: 'flex', gap: 4 }}>
                                                        <button
                                                            className={styles.reportBtn}
                                                            onClick={() => downloadFile(sessionToCSV(s), `session_${s.id}.csv`, 'text/csv')}
                                                            title="Download session data as CSV"
                                                            style={{ fontSize: '0.7rem', padding: '4px 8px' }}
                                                        >
                                                            <Download size={11} /> CSV
                                                        </button>
                                                        <button
                                                            className={styles.reportBtn}
                                                            onClick={() => downloadFile(sessionToJSON(s), `session_${s.id}.json`, 'application/json')}
                                                            title="Download session data as JSON"
                                                            style={{ fontSize: '0.7rem', padding: '4px 8px' }}
                                                        >
                                                            <Download size={11} /> JSON
                                                        </button>
                                                    </div>
                                                </td>
                                                <td>
                                                    <button
                                                        className={`${styles.reportBtn} ${!hasECG ? styles.reportBtnDisabled : ''}`}
                                                        onClick={() => hasECG && openReport(s)}
                                                        title={hasECG ? 'View ECG Report' : 'No ECG data'}
                                                        disabled={!hasECG}
                                                    >
                                                        <FileText size={14} />
                                                        ECG
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

            </div>

            {/* ECG Report Modal */}
            {activeReport && (
                <ECGReportModal session={activeReport} onClose={closeReport} />
            )}
        </>
    );
}
