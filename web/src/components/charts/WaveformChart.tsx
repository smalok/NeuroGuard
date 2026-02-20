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
}

export default function WaveformChart({
    title, color, generatePoint, unit, badgeLabel, badgeValue, height = 200, timeWindow = 10,
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

        // Clear
        ctx.fillStyle = '#0d1220';
        ctx.fillRect(0, 0, w, h);

        // Grid
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

        if (data.length < 2) { animRef.current = requestAnimationFrame(draw); return; }

        // Find Y range
        const values = data.map(d => d.v);
        const yMin = Math.min(...values) * 1.2;
        const yMax = Math.max(...values) * 1.2;
        const yRange = Math.max(Math.abs(yMax - yMin), 0.1);

        // Draw waveform
        ctx.beginPath();
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';

        data.forEach((d, i) => {
            const x = ((d.t - cutoff) / viewSeconds) * w;
            const y = h - ((d.v - yMin) / yRange) * h;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });
        ctx.stroke();

        // Glow
        ctx.shadowColor = color;
        ctx.shadowBlur = 8;
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Labels
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.font = '10px Inter';
        ctx.fillText(unit, 4, 14);
        ctx.fillText(`${viewSeconds}s`, w - 24, h - 6);

        animRef.current = requestAnimationFrame(draw);
    }, [color, generatePoint, unit, viewSeconds]);

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
