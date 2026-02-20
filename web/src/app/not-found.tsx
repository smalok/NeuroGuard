'use client';
import Link from 'next/link';
import { Brain, Shield, Activity, ArrowLeft, Home } from 'lucide-react';
import styles from './not-found.module.css';

export default function NotFound() {
    return (
        <div className={styles.page}>
            <div className={styles.bg} />
            <div className={styles.content}>
                <div className={styles.logo}>
                    <div className={styles.logoIcon}><Brain size={20} /></div>
                    <span className={styles.logoText}>NeuroGuard</span>
                </div>
                <div className={styles.signalLine}>
                    <Activity size={80} strokeWidth={1.5} />
                </div>
                <h1 className={styles.title}>
                    <span className={styles.code}>404</span>
                    <br />Signal Lost
                </h1>
                <p className={styles.desc}>
                    The biosignal path you&apos;re looking for doesn&apos;t exist or
                    has been disconnected from the monitoring system.
                </p>
                <div className={styles.actions}>
                    <Link href="/dashboard" className="btn btn-primary btn-lg">
                        <Home size={18} /> Go to Dashboard
                    </Link>
                    <Link href="/" className="btn btn-outline btn-lg">
                        <ArrowLeft size={18} /> Home Page
                    </Link>
                </div>
                <div className={styles.diagnostics} suppressHydrationWarning>
                    <p className="mono" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        Error: PATH_NOT_FOUND | Signal: NULL | Timestamp: {new Date().toISOString()}
                    </p>
                </div>
            </div>
        </div>
    );
}
