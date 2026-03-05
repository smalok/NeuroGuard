'use client';
import { useEffect, useState } from 'react';

interface CursorGlowProps {
    color?: string;
    size?: number;
}

export default function CursorGlow({
    color = 'rgba(59,130,246,0.08)',
    size = 600,
}: CursorGlowProps) {
    const [pos, setPos] = useState({ x: -1000, y: -1000 });

    useEffect(() => {
        const handleMouse = (e: MouseEvent) => {
            setPos({ x: e.clientX, y: e.clientY });
        };

        window.addEventListener('mousemove', handleMouse);
        return () => window.removeEventListener('mousemove', handleMouse);
    }, []);

    return (
        <div
            className="fixed pointer-events-none z-[1] transition-transform duration-100"
            style={{
                width: size,
                height: size,
                borderRadius: '50%',
                background: `radial-gradient(circle, ${color}, transparent 70%)`,
                transform: `translate(${pos.x - size / 2}px, ${pos.y - size / 2}px)`,
                willChange: 'transform',
            }}
        />
    );
}
