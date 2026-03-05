'use client';
import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

interface ECGWaveformProps {
    color?: string;
    glowColor?: string;
}

export default function ECGWaveform({
    color = '#3b82f6',
    glowColor = 'rgba(59,130,246,0.5)',
}: ECGWaveformProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const pathRef = useRef<SVGPathElement>(null);
    const glowPathRef = useRef<SVGPathElement>(null);

    const generateECGPath = () => {
        const segments: string[] = [];
        const w = 1200;
        const h = 200;
        const mid = h / 2;
        const beatWidth = 200;
        const numBeats = Math.ceil(w / beatWidth) + 1;

        segments.push(`M 0 ${mid}`);

        for (let beat = 0; beat < numBeats; beat++) {
            const ox = beat * beatWidth;
            segments.push(`L ${ox + 20} ${mid}`);
            segments.push(`Q ${ox + 35} ${mid - 20} ${ox + 50} ${mid}`);
            segments.push(`L ${ox + 65} ${mid}`);
            segments.push(`L ${ox + 72} ${mid + 15}`);
            segments.push(`L ${ox + 85} ${mid - 80}`);
            segments.push(`L ${ox + 95} ${mid + 25}`);
            segments.push(`L ${ox + 105} ${mid}`);
            segments.push(`L ${ox + 125} ${mid}`);
            segments.push(`Q ${ox + 145} ${mid - 30} ${ox + 165} ${mid}`);
            segments.push(`L ${ox + 200} ${mid}`);
        }

        return segments.join(' ');
    };

    const ecgPath = generateECGPath();

    useEffect(() => {
        const path = pathRef.current;
        const glowPath = glowPathRef.current;
        const container = containerRef.current;
        if (!path || !glowPath || !container) return;

        const length = path.getTotalLength();
        gsap.set([path, glowPath], {
            strokeDasharray: length,
            strokeDashoffset: length,
        });

        const tl = gsap.timeline({
            scrollTrigger: {
                trigger: container,
                start: 'top 80%',
                end: 'bottom 20%',
                scrub: 1,
            },
        });

        tl.to([path, glowPath], {
            strokeDashoffset: 0,
            duration: 1,
            ease: 'none',
        });

        return () => {
            tl.kill();
            ScrollTrigger.getAll().forEach((st) => {
                if (st.trigger === container) st.kill();
            });
        };
    }, []);

    return (
        <div ref={containerRef} style={{ width: '100%', overflow: 'hidden', minHeight: 160 }}>
            <svg
                viewBox="0 0 1200 200"
                preserveAspectRatio="none"
                style={{ width: '100%', height: 160, display: 'block' }}
            >
                <defs>
                    <pattern id="ecgGrid" width="40" height="40" patternUnits="userSpaceOnUse">
                        <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
                    </pattern>
                    <filter id="ecgGlow">
                        <feGaussianBlur stdDeviation="4" result="blur" />
                        <feMerge>
                            <feMergeNode in="blur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                </defs>
                <rect width="1200" height="200" fill="url(#ecgGrid)" />
                <path
                    ref={glowPathRef}
                    d={ecgPath}
                    fill="none"
                    stroke={glowColor}
                    strokeWidth="6"
                    filter="url(#ecgGlow)"
                />
                <path
                    ref={pathRef}
                    d={ecgPath}
                    fill="none"
                    stroke={color}
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
            </svg>
        </div>
    );
}
