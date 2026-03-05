'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';

export default function SignalSyncLoader({ onComplete }: { onComplete: () => void }) {
    const containerRef = useRef<HTMLDivElement>(null);
    const svgGroupRef = useRef<SVGGElement>(null);
    const centerNodeRef = useRef<SVGCircleElement>(null);
    const linesRef = useRef<SVGLineElement[]>([]);
    const nodesRef = useRef<SVGCircleElement[]>([]);
    const textRef = useRef<HTMLHeadingElement>(null);
    const taglineRef = useRef<HTMLParagraphElement>(null);

    useEffect(() => {
        const tl = gsap.timeline();

        // Reset initial states
        gsap.set(centerNodeRef.current, { scale: 0, transformOrigin: '50% 50%' });
        gsap.set(nodesRef.current, { opacity: 0, scale: 0, transformOrigin: '50% 50%' });
        gsap.set(textRef.current, { opacity: 0 });
        gsap.set(taglineRef.current, { opacity: 0 });

        // 1. (0–0.6s) A single teal circle pulses in
        tl.to(centerNodeRef.current, {
            scale: 1,
            opacity: 1,
            duration: 0.6,
            ease: 'back.out(1.7)'
        }, 0);

        // 2. (0.6–1.6s) 6 lines extend outward like dendrites
        tl.to(linesRef.current, {
            strokeDashoffset: 0,
            duration: 1.0,
            ease: 'power2.out',
            stagger: 0.05
        }, 0.6);

        // 3. (1.6–2.4s) Small nodes appear at tips and flash (0 -> 1 -> 0.7)
        tl.to(nodesRef.current, {
            opacity: 1,
            scale: 1,
            duration: 0.2,
            stagger: 0.05,
            ease: 'power1.out'
        }, 1.6)
            .to(nodesRef.current, {
                opacity: 0.7,
                duration: 0.2,
                stagger: 0.05,
                ease: 'power1.inOut'
            }, 1.8);

        // 4. (2.4–3.0s) Collapse inward and morph into the text "NeuroGuard"
        tl.to(svgGroupRef.current, {
            scale: 0,
            opacity: 0,
            duration: 0.4,
            transformOrigin: '50% 50%',
            ease: 'power2.inOut'
        }, 2.4);

        tl.fromTo(textRef.current,
            { opacity: 0, letterSpacing: '0.8em', scale: 0.9 },
            { opacity: 1, letterSpacing: '0.05em', scale: 1, duration: 0.6, ease: 'power3.out' },
            2.4
        );

        // 5. (3.0–3.2s) Tagline fades in below
        tl.fromTo(taglineRef.current,
            { opacity: 0, y: 10 },
            { opacity: 1, y: 0, duration: 0.2, ease: 'power2.out' },
            3.0
        );

        // 6. Entire loader fades out at 3.2s
        tl.to(containerRef.current, {
            opacity: 0,
            duration: 0.5,
            ease: 'power2.inOut',
            onComplete
        }, 3.2);

        return () => {
            tl.kill();
        };
    }, [onComplete]);

    // Geometry configuration
    const size = 300;
    const center = size / 2;
    const radius = 100;
    const dendriteCount = 6;
    const angles = Array.from({ length: dendriteCount }, (_, i) => (i * Math.PI * 2) / dendriteCount);

    return (
        <div
            ref={containerRef}
            style={{
                position: 'fixed', inset: 0, zIndex: 9999,
                background: '#050810',
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                overflow: 'hidden'
            }}
        >
            <div style={{ position: 'relative', width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>

                {/* SVG Synapse Animation */}
                <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ position: 'absolute', inset: 0, zIndex: 1 }}>
                    <g ref={svgGroupRef} style={{ transformOrigin: '150px 150px' }}>
                        {/* Lines (Dendrites) */}
                        {angles.map((angle, i) => {
                            const x2 = +(center + Math.cos(angle) * radius).toFixed(3);
                            const y2 = +(center + Math.sin(angle) * radius).toFixed(3);
                            const color = i % 2 === 0 ? '#00d4ff' : '#c026d3';

                            return (
                                <line
                                    key={`line-${i}`}
                                    ref={(el) => { if (el) linesRef.current[i] = el; }}
                                    x1={center} y1={center} x2={x2} y2={y2}
                                    stroke={color}
                                    strokeWidth="3"
                                    strokeLinecap="round"
                                    style={{
                                        strokeDasharray: radius,
                                        strokeDashoffset: radius, // Starts hidden, GSAP animates to 0
                                        filter: `drop-shadow(0 0 6px ${color})`
                                    }}
                                />
                            );
                        })}

                        {/* Connective Nodes at Tips */}
                        {angles.map((angle, i) => {
                            const cx = +(center + Math.cos(angle) * radius).toFixed(3);
                            const cy = +(center + Math.sin(angle) * radius).toFixed(3);
                            const color = i % 2 === 0 ? '#00d4ff' : '#c026d3';

                            return (
                                <circle
                                    key={`node-${i}`}
                                    ref={(el) => { if (el) nodesRef.current[i] = el; }}
                                    cx={cx} cy={cy} r="6"
                                    fill={color}
                                    style={{
                                        filter: `drop-shadow(0 0 8px ${color})`,
                                        transformOrigin: `${cx}px ${cy}px`
                                    }}
                                />
                            );
                        })}

                        {/* Central Node */}
                        <circle
                            ref={centerNodeRef}
                            cx={center} cy={center} r="14"
                            fill="#00d4ff"
                            style={{ filter: 'drop-shadow(0 0 12px #00d4ff)' }}
                        />
                    </g>
                </svg>

                {/* Text Container (Revealed as SVG collapses) */}
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 2 }}>
                    <h1
                        ref={textRef}
                        style={{
                            color: '#ffffff',
                            fontSize: '2.5rem',
                            fontWeight: 800,
                            fontFamily: "'Space Grotesk', sans-serif",
                            margin: 0,
                            whiteSpace: 'nowrap'
                        }}
                    >
                        NeuroGuard
                    </h1>
                    <p
                        ref={taglineRef}
                        style={{
                            color: '#00d4ff',
                            fontSize: '0.875rem',
                            letterSpacing: '0.2em',
                            marginTop: '8px',
                            fontFamily: "'Inter', sans-serif",
                            whiteSpace: 'nowrap'
                        }}
                    >
                        AI BURNOUT DETECTION SYSTEM
                    </p>
                </div>
            </div>
        </div>
    );
}
