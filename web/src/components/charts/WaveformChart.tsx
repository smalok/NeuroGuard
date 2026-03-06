'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import styles from './WaveformChart.module.css';

interface WaveformChartProps {
    title: string;
    color: string;
    generatePoint: (t: number) => number;
    unit: string;
    badgeLabel?: string;
    badgeValue?: string;
    height?: number;
    timeWindow?: number; // seconds
    variant?: 'modern' | 'medical' | 'paper';
}

export default function WaveformChart({
    title, color, generatePoint, unit, badgeLabel, badgeValue, height = 200, timeWindow = 10, variant = 'modern'
}: WaveformChartProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animRef = useRef<number>(0);
    const dataRef = useRef<{ t: number; v: number }[]>([]);
    const startRef = useRef(Date.now());
    const [viewSeconds, setViewSeconds] = useState(timeWindow);

    const draw = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        ctx.scale(dpr, dpr);
        const w = rect.width;
        const h = rect.height;

        // Generate new point
        const elapsed = (Date.now() - startRef.current) / 1000;
        const val = generatePoint(elapsed);
        dataRef.current.push({ t: elapsed, v: val });

        // Trim old data
        const cutoff = elapsed - viewSeconds;
        dataRef.current = dataRef.current.filter(d => d.t > cutoff);
        const data = dataRef.current;

        // Clear background
        if (variant === 'paper') {
            ctx.fillStyle = '#fffdfd'; // Very slight pinkish-white
        } else if (variant === 'medical') {
            ctx.fillStyle = '#001a09';
        } else {
            ctx.fillStyle = '#0d1220';
        }
        ctx.fillRect(0, 0, w, h);

        // Draw Grid
        if (variant === 'paper' || variant === 'medical') {
            // Dense ECG paper grid
            ctx.lineWidth = 1;
            const gridSpacing = 15; // minor grid (1mm representation)
            const majorGridSpacing = 75; // major grid (5mm representation)

            // Minor grid lines
            ctx.strokeStyle = variant === 'paper' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(34, 197, 94, 0.15)';
            for (let x = 0; x < w; x += gridSpacing) {
                ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
            }
            for (let y = 0; y < h; y += gridSpacing) {
                ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
            }

            // Major grid lines
            ctx.strokeStyle = variant === 'paper' ? 'rgba(239, 68, 68, 0.5)' : 'rgba(34, 197, 94, 0.4)';
            for (let x = 0; x < w; x += majorGridSpacing) {
                ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
            }
            for (let y = 0; y < h; y += majorGridSpacing) {
                ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
            }
        } else {
            // Modern grid lines
            ctx.strokeStyle = 'rgba(255,255,255,0.04)';
            ctx.lineWidth = 1;
            for (let i = 0; i < 10; i++) {
                const y = (i / 10) * h;
                ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
            }
            for (let i = 0; i < 20; i++) {
                const x = (i / 20) * w;
                ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
            }
        }

        if (data.length < 2) { animRef.current = requestAnimationFrame(draw); return; }

        // Find Y range — FIXED: proper centering and padding
        const values = data.map(d => d.v);
        const rawMin = Math.min(...values);
        const rawMax = Math.max(...values);
        const range = rawMax - rawMin;

        let yMin: number, yMax: number;
        if (range < 1) {
            // All values are the same or very close — add fixed padding around center
            const center = (rawMin + rawMax) / 2;
            const padding = Math.max(Math.abs(center) * 0.1, 50); // at least ±50
            yMin = center - padding;
            yMax = center + padding;
        } else {
            // Normal case — add 10% padding
            const padding = range * 0.1;
            yMin = rawMin - padding;
            yMax = rawMax + padding;
        }
        const yRange = yMax - yMin;

        // Draw center line
        ctx.strokeStyle = variant === 'paper' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(255,255,255,0.06)';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(0, h / 2);
        ctx.lineTo(w, h / 2);
        ctx.stroke();
        ctx.setLineDash([]);

        // Draw waveform
        ctx.beginPath();
        ctx.strokeStyle = variant === 'paper' ? '#0f172a' : color; // Very dark slate for paper, else specified color
        ctx.lineWidth = variant === 'paper' ? 1.5 : 2;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';

        data.forEach((d, i) => {
            const x = ((d.t - cutoff) / viewSeconds) * w;
            const y = h - ((d.v - yMin) / yRange) * h;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });
        ctx.stroke();

        // Glow effect (only for modern)
        if (variant === 'modern') {
            ctx.shadowColor = color;
            ctx.shadowBlur = 8;
            ctx.stroke();
            ctx.shadowBlur = 0;
        }

        // Labels
        ctx.fillStyle = variant === 'paper' ? '#0f172a' : (variant === 'medical' ? 'rgba(34, 197, 94, 0.6)' : 'rgba(255,255,255,0.3)');
        ctx.font = '10px Inter';
        ctx.fillText(unit, 4, 14);
        ctx.fillText(`${viewSeconds}s`, w - 24, h - 6);

        // Y-axis range labels
        ctx.fillStyle = variant === 'paper' ? 'rgba(15, 23, 42, 0.5)' : (variant === 'medical' ? 'rgba(34, 197, 94, 0.4)' : 'rgba(255,255,255,0.2)');
        ctx.font = '9px Inter';
        ctx.fillText(yMax.toFixed(0), 4, 24);
        ctx.fillText(yMin.toFixed(0), 4, h - 4);

        // Current value label (top right)
        const lastVal = values[values.length - 1];
        ctx.fillStyle = variant === 'paper' ? '#0f172a' : (variant === 'medical' ? '#22c55e' : color);
        ctx.font = 'bold 12px Inter';
        ctx.textAlign = 'right';
        ctx.fillText(lastVal.toFixed(0), w - 8, 16);
        ctx.textAlign = 'left';

        animRef.current = requestAnimationFrame(draw);
    }, [color, generatePoint, unit, viewSeconds, variant]);

    useEffect(() => {
        startRef.current = Date.now();
        dataRef.current = [];
        animRef.current = requestAnimationFrame(draw);
        return () => cancelAnimationFrame(animRef.current);
    }, [draw]);

    const viewOptions = [10, 30, 60];

    return (
        <div className={styles.wrapper}>
            <div className={styles.header}>
                <h4 className={styles.title}>{title}</h4>
                <div className={styles.controls}>
                    {viewOptions.map(s => (
                        <button
                            key={s}
                            className={`${styles.viewBtn} ${viewSeconds === s ? styles.viewActive : ''}`}
                            onClick={() => setViewSeconds(s)}
                        >
                            {s}s
                        </button>
                    ))}
                </div>
                {badgeLabel && badgeValue && (
                    <span className={styles.badge} style={{ color, borderColor: `${color}40` }}>
                        {badgeLabel}: {badgeValue}
                    </span>
                )}
            </div>
            <canvas ref={canvasRef} className={styles.canvas} style={{ height }} />
        </div>
    );
}
