'use client';
import { useEffect, useState } from 'react';
import styles from './StatCard.module.css';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
    title: string;
    value: string;
    unit?: string;
    subtitle?: string;
    icon: LucideIcon;
    color: string;
    status?: { label: string; type: 'green' | 'yellow' | 'red' };
    trend?: { value: string; up: boolean };
}

export default function StatCard({ title, value, unit, subtitle, icon: Icon, color, status, trend }: StatCardProps) {
    const [visible, setVisible] = useState(false);
    useEffect(() => { setVisible(true); }, []);

    return (
        <div className={`${styles.card} ${visible ? styles.visible : ''}`}>
            <div className={styles.header}>
                <div className={styles.iconWrap} style={{ background: `${color}15`, color }}>
                    <Icon size={18} />
                </div>
                <span className={styles.title}>{title}</span>
            </div>
            <div className={styles.valueRow}>
                <span className={styles.value} style={{ color }}>{value}</span>
                {unit && <span className={styles.unit}>{unit}</span>}
            </div>
            {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
            <div className={styles.bottom}>
                {status && (
                    <span className={`badge badge-${status.type}`}>{status.label}</span>
                )}
                {trend && (
                    <span className={styles.trend} style={{ color: trend.up ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                        {trend.up ? '↑' : '↓'} {trend.value}
                    </span>
                )}
            </div>
        </div>
    );
}
