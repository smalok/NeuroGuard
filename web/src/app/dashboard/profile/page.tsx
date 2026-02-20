'use client';
import { useEffect, useState } from 'react';
import Header from '@/components/layout/Header';
import { getUserProfile } from '@/lib/mockData';
import { UserProfile } from '@/types';
import { Edit3, Download, Trash2, Lock, Smartphone, Monitor, Moon, Sun } from 'lucide-react';
import styles from './page.module.css';

export default function ProfilePage() {
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [theme, setTheme] = useState('dark');

    useEffect(() => {
        setProfile(getUserProfile());
    }, []);

    if (!profile) return <div className={styles.content}>Loading profile...</div>;

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

                <div className="grid-2">
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
                            <button className="btn btn-outline"><Download size={14} /> Export All Data</button>
                            <select className="input" style={{ width: 100 }}><option>JSON</option><option>CSV</option></select>
                        </div>
                    </div>
                    <button className="btn btn-danger" style={{ marginTop: 'var(--space-4)' }}>
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
