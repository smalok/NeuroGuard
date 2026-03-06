'use client';
import { useEffect, useState } from 'react';
import Header from '@/components/layout/Header';
import { getUserProfile } from '@/lib/mockData';
import { UserProfile, SessionData } from '@/types';
import { getSessions } from '@/lib/sessionStore';
import { Edit3, Download, Trash2, Lock, Smartphone, Monitor, Moon, Sun, FileJson, FileSpreadsheet, Heart, Brain } from 'lucide-react';
import styles from './page.module.css';

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

function sessionsToCSV(sessions: SessionData[], dataType: 'ecg' | 'eeg' | 'all'): string {
    let csv = 'Session ID,Date,Duration (s),Avg HR,Avg HRV,Burnout Score,Classification,Has ECG,Has EEG\n';
    sessions.forEach(s => {
        csv += [
            s.id,
            new Date(s.date).toISOString(),
            s.duration,
            s.avgHR,
            s.avgHRV,
            s.burnoutScore,
            s.classification,
            s.rawECG && s.rawECG.length > 0 ? 'yes' : 'no',
            s.rawEEG && s.rawEEG.length > 0 ? 'yes' : 'no',
        ].join(',') + '\n';
    });

    // Add raw data sections
    sessions.forEach(s => {
        if ((dataType === 'ecg' || dataType === 'all') && s.rawECG && s.rawECG.length > 0) {
            csv += `\nECG Raw Data - ${s.id} (${new Date(s.date).toISOString()})\n`;
            csv += s.rawECG.join(',') + '\n';
        }
        if ((dataType === 'eeg' || dataType === 'all') && s.rawEEG && s.rawEEG.length > 0) {
            csv += `\nEEG Raw Data - ${s.id} (${new Date(s.date).toISOString()})\n`;
            csv += s.rawEEG.join(',') + '\n';
        }
    });

    return csv;
}

function sessionsToJSON(sessions: SessionData[], dataType: 'ecg' | 'eeg' | 'all'): string {
    const filtered = sessions.map(s => {
        const base: any = {
            id: s.id,
            date: s.date,
            duration: s.duration,
            avgHR: s.avgHR,
            avgHRV: s.avgHRV,
            burnoutScore: s.burnoutScore,
            classification: s.classification,
        };
        if ((dataType === 'ecg' || dataType === 'all') && s.rawECG) base.rawECG = s.rawECG;
        if ((dataType === 'eeg' || dataType === 'all') && s.rawEEG) base.rawEEG = s.rawEEG;
        return base;
    });
    return JSON.stringify({ exportedAt: new Date().toISOString(), totalSessions: filtered.length, sessions: filtered }, null, 2);
}

export default function ProfilePage() {
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [theme, setTheme] = useState('dark');
    const [sessions, setSessions] = useState<SessionData[]>([]);

    useEffect(() => {
        setProfile(getUserProfile());
        setSessions(getSessions());
    }, []);

    if (!profile) return <div className={styles.content}>Loading profile...</div>;

    const ecgSessions = sessions.filter(s => s.rawECG && s.rawECG.length > 0);
    const eegSessions = sessions.filter(s => s.rawEEG && s.rawEEG.length > 0);

    const handleExport = (format: 'json' | 'csv', dataType: 'ecg' | 'eeg' | 'all') => {
        const targetSessions = dataType === 'ecg' ? ecgSessions : dataType === 'eeg' ? eegSessions : sessions;
        if (targetSessions.length === 0) {
            alert(`No ${dataType.toUpperCase()} data to export. Record some sessions first!`);
            return;
        }
        if (format === 'json') {
            downloadFile(sessionsToJSON(targetSessions, dataType), `neuroguard_${dataType}_data.json`, 'application/json');
        } else {
            downloadFile(sessionsToCSV(targetSessions, dataType), `neuroguard_${dataType}_data.csv`, 'text/csv');
        }
    };

    const handleDeleteAll = () => {
        if (confirm('Are you sure you want to delete all data? This cannot be undone.')) {
            localStorage.clear();
            setSessions([]);
        }
    };

    return (
        <>
            <Header breadcrumbs={[{ label: 'Dashboard' }, { label: 'Profile & Settings' }]} />
            <div className={styles.content}>
                {/* Profile Card */}
                <div className={styles.profileCard}>
                    <div className={styles.profileTop}>
                        <div className={styles.avatar}>{profile.name.split(' ').map(n => n[0]).join('')}</div>
                        <div className={styles.profileInfo}>
                            <h3>{profile.name}</h3>
                            <p className="text-secondary">{profile.email}</p>
                            <p className="text-muted" style={{ fontSize: '0.8rem' }}>{profile.occupation} • Member since {profile.memberSince.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</p>
                        </div>
                        <button className="btn btn-outline"><Edit3 size={14} /> Edit Profile</button>
                    </div>
                    <div className={styles.profileStats}>
                        <div><span className="mono">{profile.totalSessions}</span><small>Total Sessions</small></div>
                        <div><span className="mono">{profile.avgScore}%</span><small>Avg Score</small></div>
                        <div><span className="mono">{profile.streak}</span><small>Day Streak</small></div>
                    </div>
                </div>

                {/* Health Baseline */}
                <div className={styles.card}>
                    <div className={styles.cardHeader}>
                        <h4>Health Baseline</h4>
                        <span className="badge badge-blue">Used by ML model for personalized predictions</span>
                    </div>
                    <div className={styles.baselineGrid}>
                        <div className={styles.field}><label>Age</label><input className="input" defaultValue={profile.age} type="number" /></div>
                        <div className={styles.field}><label>Gender</label><select className="input"><option>Male</option><option>Female</option><option>Other</option></select></div>
                        <div className={styles.field}><label>Resting HR (BPM)</label><input className="input" defaultValue={profile.restingHR} type="number" /></div>
                        <div className={styles.field}><label>Avg Sleep (hours)</label><input className="input" defaultValue={profile.avgSleep} type="number" step="0.5" /></div>
                    </div>
                    <div className={styles.sliderField}>
                        <label>Stress Self-Assessment: <strong className="mono">{profile.stressBaseline}/10</strong></label>
                        <input type="range" min="1" max="10" defaultValue={profile.stressBaseline} className={styles.slider} />
                    </div>
                    <button className="btn btn-primary" style={{ marginTop: 'var(--space-4)' }}>Update Baseline</button>
                </div>

                {/* Export Data — ECG & EEG */}
                <div className={styles.card}>
                    <div className={styles.cardHeader}>
                        <h4>Export ECG & EEG Data</h4>
                        <span className="badge badge-purple">{sessions.length} sessions · {ecgSessions.length} ECG · {eegSessions.length} EEG</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-4)', marginTop: 'var(--space-4)' }}>
                        {/* ECG Export */}
                        <div style={{ background: 'var(--bg-elevated)', padding: 'var(--space-4)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                                <Heart size={18} style={{ color: 'var(--accent-red)' }} />
                                <strong>ECG Data</strong>
                                <span className="badge badge-blue" style={{ marginLeft: 'auto' }}>{ecgSessions.length}</span>
                            </div>
                            <div style={{ display: 'flex', gap: 8 }}>
                                <button className="btn btn-outline btn-sm" onClick={() => handleExport('json', 'ecg')}>
                                    <FileJson size={14} /> JSON
                                </button>
                                <button className="btn btn-outline btn-sm" onClick={() => handleExport('csv', 'ecg')}>
                                    <FileSpreadsheet size={14} /> CSV
                                </button>
                            </div>
                        </div>

                        {/* EEG Export */}
                        <div style={{ background: 'var(--bg-elevated)', padding: 'var(--space-4)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                                <Brain size={18} style={{ color: 'var(--accent-purple)' }} />
                                <strong>EEG Data</strong>
                                <span className="badge badge-purple" style={{ marginLeft: 'auto' }}>{eegSessions.length}</span>
                            </div>
                            <div style={{ display: 'flex', gap: 8 }}>
                                <button className="btn btn-outline btn-sm" onClick={() => handleExport('json', 'eeg')}>
                                    <FileJson size={14} /> JSON
                                </button>
                                <button className="btn btn-outline btn-sm" onClick={() => handleExport('csv', 'eeg')}>
                                    <FileSpreadsheet size={14} /> CSV
                                </button>
                            </div>
                        </div>

                        {/* Export All */}
                        <div style={{ background: 'var(--bg-elevated)', padding: 'var(--space-4)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                                <Download size={18} style={{ color: 'var(--accent-green)' }} />
                                <strong>All Data</strong>
                                <span className="badge badge-green" style={{ marginLeft: 'auto' }}>{sessions.length}</span>
                            </div>
                            <div style={{ display: 'flex', gap: 8 }}>
                                <button className="btn btn-outline btn-sm" onClick={() => handleExport('json', 'all')}>
                                    <FileJson size={14} /> JSON
                                </button>
                                <button className="btn btn-outline btn-sm" onClick={() => handleExport('csv', 'all')}>
                                    <FileSpreadsheet size={14} /> CSV
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="ng-grid-2">
                    {/* Appearance */}
                    <div className={styles.card}>
                        <h4>Appearance</h4>
                        <div className={styles.themeToggle}>
                            <button className={`${styles.themeBtn} ${theme === 'dark' ? styles.themeActive : ''}`} onClick={() => setTheme('dark')}>
                                <Moon size={16} /> Dark
                            </button>
                            <button className={`${styles.themeBtn} ${theme === 'light' ? styles.themeActive : ''}`} onClick={() => setTheme('light')}>
                                <Sun size={16} /> Light
                            </button>
                        </div>
                        <div className={styles.colorPicker}>
                            <label>Accent Color</label>
                            <div className={styles.colors}>
                                {['#3b82f6', '#a855f7', '#22c55e', '#ef4444', '#f97316'].map(c => (
                                    <button key={c} className={styles.colorDot} style={{ background: c, boxShadow: c === '#3b82f6' ? `0 0 0 3px ${c}40` : 'none' }} />
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Notifications */}
                    <div className={styles.card}>
                        <h4>Notifications</h4>
                        {[
                            { label: 'Email Alerts', on: true },
                            { label: 'Daily Summary Email', on: true },
                            { label: 'Push Notifications', on: false },
                            { label: 'Sound Alerts', on: false },
                        ].map((n, i) => (
                            <div key={i} className={styles.toggleRow}>
                                <span>{n.label}</span>
                                <label className={styles.switch}>
                                    <input type="checkbox" defaultChecked={n.on} />
                                    <span className={styles.switchSlider} />
                                </label>
                            </div>
                        ))}
                        <div className={styles.quietHours}>
                            <span className="text-secondary" style={{ fontSize: '0.8rem' }}>Quiet Hours: 11 PM – 7 AM</span>
                        </div>
                    </div>
                </div>

                {/* Data Management */}
                <div className={styles.card}>
                    <h4>Data Management</h4>
                    <div className={styles.dataRow}>
                        <div>
                            <p className="text-secondary" style={{ fontSize: '0.85rem' }}>Storage Used</p>
                            <div className={styles.storageBar}>
                                <div className={styles.storageFill} style={{ width: '48%' }} />
                            </div>
                            <span className="text-muted" style={{ fontSize: '0.75rem' }}>2.4 GB of 5 GB used</span>
                        </div>
                        <div className={styles.dataActions}>
                            <button className="btn btn-outline" onClick={() => handleExport('json', 'all')}><Download size={14} /> Export All Data (JSON)</button>
                            <button className="btn btn-outline" onClick={() => handleExport('csv', 'all')}><Download size={14} /> Export All Data (CSV)</button>
                        </div>
                    </div>
                    <button className="btn btn-danger" style={{ marginTop: 'var(--space-4)' }} onClick={handleDeleteAll}>
                        <Trash2 size={14} /> Delete All Data
                    </button>
                </div>

                {/* Security */}
                <div className={styles.card}>
                    <h4>Security</h4>
                    <button className="btn btn-outline" style={{ marginBottom: 'var(--space-4)' }}><Lock size={14} /> Change Password</button>
                    <div className={styles.toggleRow} style={{ marginBottom: 'var(--space-4)' }}>
                        <span>Two-Factor Authentication</span>
                        <label className={styles.switch}>
                            <input type="checkbox" />
                            <span className={styles.switchSlider} />
                        </label>
                    </div>
                    <h5 style={{ fontSize: '0.8rem', marginBottom: 'var(--space-3)' }}>Active Sessions</h5>
                    {[
                        { device: 'Windows • Chrome', current: true, icon: Monitor },
                        { device: 'iPhone • Safari', current: false, icon: Smartphone },
                    ].map((s, i) => (
                        <div key={i} className={styles.sessionRow}>
                            <s.icon size={16} />
                            <span>{s.device}</span>
                            {s.current ? <span className="badge badge-green">Current</span> : <button className="btn btn-outline btn-sm">Disconnect</button>}
                        </div>
                    ))}
                </div>
            </div>
        </>
    );
}
