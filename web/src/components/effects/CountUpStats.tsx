'use client';
import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

interface StatItem {
    value: number;
    suffix?: string;
    prefix?: string;
    label: string;
    icon?: React.ReactNode;
}

interface CountUpStatsProps {
    stats: StatItem[];
}

export default function CountUpStats({ stats }: CountUpStatsProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [counts, setCounts] = useState<number[]>(stats.map(() => 0));
    const hasAnimated = useRef(false);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        ScrollTrigger.create({
            trigger: container,
            start: 'top 80%',
            onEnter: () => {
                if (hasAnimated.current) return;
                hasAnimated.current = true;

                stats.forEach((stat, index) => {
                    const obj = { val: 0 };
                    gsap.to(obj, {
                        val: stat.value,
                        duration: 2,
                        ease: 'power2.out',
                        delay: index * 0.15,
                        onUpdate: () => {
                            setCounts((prev) => {
                                const next = [...prev];
                                next[index] = Math.round(obj.val * 10) / 10;
                                return next;
                            });
                        },
                    });
                });
            },
        });

        return () => {
            ScrollTrigger.getAll().forEach((st) => {
                if (st.trigger === container) st.kill();
            });
        };
    }, [stats]);

    const formatNumber = (num: number, stat: StatItem) => {
        const formatted = num >= 1000 ? `${(num / 1000).toFixed(1)}K` :
            num % 1 !== 0 ? num.toFixed(1) : String(Math.round(num));
        return `${stat.prefix || ''}${formatted}${stat.suffix || ''}`;
    };

    return (
        <div
            ref={containerRef}
            style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24 }}
        >
            {stats.map((stat, i) => (
                <div
                    key={i}
                    style={{
                        position: 'relative',
                        textAlign: 'center',
                        padding: '32px 20px',
                        borderRadius: 18,
                        background: 'rgba(17,24,39,0.5)',
                        border: '1px solid rgba(255,255,255,0.06)',
                        backdropFilter: 'blur(8px)',
                        transition: 'all 0.3s',
                    }}
                >
                    {stat.icon && (
                        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12, color: '#60a5fa' }}>
                            {stat.icon}
                        </div>
                    )}
                    <div
                        style={{
                            fontFamily: "'JetBrains Mono', monospace",
                            fontSize: 'clamp(1.8rem, 3vw, 2.8rem)',
                            fontWeight: 700,
                            background: 'linear-gradient(to right, #60a5fa, #c084fc)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            marginBottom: 8,
                        }}
                    >
                        {formatNumber(counts[i], stat)}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                        <svg style={{ width: 12, height: 12, color: '#4ade80' }} fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                        </svg>
                        <span style={{ fontSize: '0.875rem', color: '#94a3b8', fontWeight: 500 }}>{stat.label}</span>
                    </div>
                </div>
            ))}
        </div>
    );
}
