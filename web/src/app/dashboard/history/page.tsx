'use client';
import { useState } from 'react';
import Header from '@/components/layout/Header';
import { DailyTrend } from '@/types';
import styles from './page.module.css';

export default function HistoryPage() {
    const [range, setRange] = useState('7D');
    // Initialize with null to indicate "No Data" until real persistence is added
    const [trends, setTrends] = useState<DailyTrend[] | null>(null);
    const [sessions, setSessions] = useState<unknown[] | null>(null);

    return (
        <>
            <Header breadcrumbs={[{ label: 'Dashboard' }, { label: 'History & Trends' }]} />
            <div className={styles.content}>
                <div className="flex justify-between items-center mb-4">
                    <h2>Session History</h2>
                    <div className={styles.rangeBar}>
                        {['Today', '7D', '30D', '90D', 'All'].map(r => (
                            <button key={r} className={range === r ? 'btn btn-sm btn-primary' : 'btn btn-sm btn-ghost'} onClick={() => setRange(r)}>{r}</button>
                        ))}
                    </div>
                </div>

                {/* Empty State */}
                <div className={styles.chartCard} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 400, gap: 16 }}>
                    <div style={{ padding: 24, background: 'var(--bg-elevated)', borderRadius: '50%' }}>
                        <span style={{ fontSize: 32 }}>📊</span>
                    </div>
                    <h3>No History Recorded</h3>
                    <p className="text-secondary text-center" style={{ maxWidth: 400 }}>
                        Connect your NeuroGuard device and complete a monitoring session to start building your history.
                    </p>
                    <button className="btn btn-primary">Start New Session</button>
                </div>
            </div>
        </>
    );
}
