'use client';
import { useState } from 'react';
import Header from '@/components/layout/Header';
import { BurnoutPrediction, Report } from '@/types';
import { Brain } from 'lucide-react';
import styles from './page.module.css';

export default function ReportsPage() {
    const [prediction, setPrediction] = useState<BurnoutPrediction | null>(null);
    const [reports, setReports] = useState<Report[] | null>(null);

    // Future: Load real reports from local storage or API
    // For now, show empty state to comply with "no dummy data"

    return (
        <>
            <Header breadcrumbs={[{ label: 'Dashboard' }, { label: 'Reports & Assessments' }]} />
            <div className={styles.content}>
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h2 style={{ fontSize: '1.5rem', fontWeight: 600 }}>Health Reports</h2>
                        <p className="text-secondary">AI-generated burnout assessments</p>
                    </div>
                    <button className="btn btn-primary" disabled>
                        <Brain size={16} /> Generate Assessment
                    </button>
                </div>

                {/* Empty State */}
                <div className={styles.reportCard} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 400, gap: 16, border: '1px dashed var(--border)' }}>
                    <div style={{ padding: 24, background: 'var(--bg-primary)', borderRadius: '50%' }}>
                        <span style={{ fontSize: 32 }}>📋</span>
                    </div>
                    <h3>No Reports Generated</h3>
                    <p className="text-secondary text-center" style={{ maxWidth: 400 }}>
                        Reports will appear here once you have collected enough session data.
                    </p>
                </div>
            </div>
        </>
    );
}
