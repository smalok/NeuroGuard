'use client';
import { useEffect, useRef } from 'react';
import styles from './GaugeChart.module.css';

interface GaugeChartProps {
    value: number; // 0-100
    label: string;
    classification: 'normal' | 'high_stress' | 'burnout_risk';
    size?: number;
}

export default function GaugeChart({ value, label, classification, size = 200 }: GaugeChartProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const dpr = window.devicePixelRatio || 1;
        canvas.width = size * dpr;
        canvas.height = size * dpr;
        ctx.scale(dpr, dpr);

        const cx = size / 2;
        const cy = size / 2 + 10;
        const r = size / 2 - 20;
        const startAngle = Math.PI * 0.8;
        const endAngle = Math.PI * 2.2;
        const range = endAngle - startAngle;

        // Background arc
        ctx.beginPath();
        ctx.arc(cx, cy, r, startAngle, endAngle);
        ctx.strokeStyle = 'rgba(255,255,255,0.06)';
        ctx.lineWidth = 14;
        ctx.lineCap = 'round';
        ctx.stroke();

        // Color zones
        const zones = [
            { end: 0.4, color: '#22c55e' },
            { end: 0.7, color: '#eab308' },
            { end: 1.0, color: '#ef4444' },
        ];

        let prevEnd = startAngle;
        zones.forEach(z => {
            const zEnd = startAngle + range * z.end;
            ctx.beginPath();
            ctx.arc(cx, cy, r, prevEnd, zEnd);
            ctx.strokeStyle = z.color + '30';
            ctx.lineWidth = 14;
            ctx.lineCap = 'round';
            ctx.stroke();
            prevEnd = zEnd;
        });

        // Value arc
        const valueAngle = startAngle + range * (value / 100);
        const color = classification === 'normal' ? '#22c55e' : classification === 'high_stress' ? '#eab308' : '#ef4444';

        ctx.beginPath();
        ctx.arc(cx, cy, r, startAngle, valueAngle);
        ctx.strokeStyle = color;
        ctx.lineWidth = 14;
        ctx.lineCap = 'round';
        ctx.stroke();

        // Glow
        ctx.shadowColor = color;
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.arc(cx, cy, r, startAngle, valueAngle);
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Needle dot
        const dotX = cx + r * Math.cos(valueAngle);
        const dotY = cy + r * Math.sin(valueAngle);
        ctx.beginPath();
        ctx.arc(dotX, dotY, 6, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(dotX, dotY, 3, 0, Math.PI * 2);
        ctx.fillStyle = 'white';
        ctx.fill();

        // Center value text
        ctx.fillStyle = color;
        ctx.font = `bold ${size * 0.22}px 'JetBrains Mono', monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${value}%`, cx, cy - 8);

        // Label
        ctx.fillStyle = '#94a3b8';
        ctx.font = `500 ${size * 0.065}px 'Inter', sans-serif`;
        ctx.fillText(label, cx, cy + size * 0.15);

    }, [value, label, classification, size]);

    const classLabel = classification === 'normal' ? 'Normal' : classification === 'high_stress' ? 'High Stress' : 'Burnout Risk';
    const classColor = classification === 'normal' ? 'green' : classification === 'high_stress' ? 'yellow' : 'red';

    return (
        <div className={styles.wrapper}>
            <canvas ref={canvasRef} className={styles.canvas} style={{ width: size, height: size }} />
            <span className={`badge badge-${classColor} ${styles.classBadge}`}>{classLabel}</span>
        </div>
    );
}
