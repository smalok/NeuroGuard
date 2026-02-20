'use client';
import Link from 'next/link';
import { Brain, Shield, Heart, Zap, Cpu, ArrowRight, Github, Twitter, Mail, Activity, BarChart3 } from 'lucide-react';
import styles from './page.module.css';

export default function AboutPage() {
    const team = [
        { name: 'Manish Rai', role: 'Lead Developer & Researcher', dept: 'Biomedical Engineering' },
    ];

    const techStack = [
        { name: 'Arduino Uno R3', desc: 'Microcontroller for signal acquisition', icon: Cpu, color: '#eab308' },
        { name: 'BioAmp EXG Pill', desc: 'Biopotential amplifier for ECG/EMG', icon: Activity, color: '#22c55e' },
        { name: 'Random Forest ML', desc: '3-class burnout classification model', icon: Brain, color: '#3b82f6' },
        { name: 'Next.js Dashboard', desc: 'Real-time monitoring web interface', icon: BarChart3, color: '#a855f7' },
    ];

    return (
        <div className={styles.page}>
            <nav className={styles.navbar}>
                <Link href="/" className={styles.navLogo}>
                    <div className={styles.logoIcon}><Brain size={20} /></div>
                    <span className={styles.logoText}>NeuroGuard</span>
                </Link>
                <Link href="/dashboard" className="btn btn-primary btn-sm">Go to Dashboard</Link>
            </nav>

            <section className={styles.hero}>
                <span className={styles.heroBadge}>About NeuroGuard</span>
                <h1 className={styles.heroTitle}>AI-Powered <span className="text-gradient">Burnout Detection</span> System</h1>
                <p className={styles.heroSub}>
                    NeuroGuard is a real-time health monitoring system that uses ECG and EMG biosignals
                    combined with machine learning to predict and prevent occupational burnout.
                </p>
            </section>

            <section className={styles.section}>
                <h2 className={styles.sectionTitle}>The <span className="text-gradient">Problem</span></h2>
                <div className={styles.problemGrid}>
                    <div className={styles.statCard}>
                        <span className={styles.bigStat}>76%</span>
                        <p>of workers experience burnout at least sometimes</p>
                    </div>
                    <div className={styles.statCard}>
                        <span className={styles.bigStat}>$322B</span>
                        <p>annual cost of workplace stress globally</p>
                    </div>
                    <div className={styles.statCard}>
                        <span className={styles.bigStat}>2.5x</span>
                        <p>higher healthcare costs for burned-out employees</p>
                    </div>
                </div>
            </section>

            <section className={styles.section}>
                <h2 className={styles.sectionTitle}>Technology <span className="text-gradient">Stack</span></h2>
                <div className={styles.techGrid}>
                    {techStack.map((t, i) => (
                        <div key={i} className={styles.techCard}>
                            <div className={styles.techIcon} style={{ color: t.color, background: `${t.color}15` }}>
                                <t.icon size={28} />
                            </div>
                            <h3>{t.name}</h3>
                            <p>{t.desc}</p>
                        </div>
                    ))}
                </div>
            </section>

            <section className={styles.section}>
                <h2 className={styles.sectionTitle}>ML <span className="text-gradient">Features</span></h2>
                <div className={styles.featuresList}>
                    {[
                        { group: 'ECG Features', items: ['Heart Rate (HR)', 'RR Interval', 'RMSSD', 'SDNN', 'LF/HF Ratio'] },
                        { group: 'EMG Features', items: ['RMS', 'Mean Absolute Value', 'Median Frequency', 'Variance'] },
                        { group: 'Output Classes', items: ['Normal', 'High Stress', 'Burnout Risk'] },
                    ].map((g, i) => (
                        <div key={i} className={styles.featureGroup}>
                            <h4>{g.group}</h4>
                            {g.items.map((item, j) => <span key={j} className="badge badge-blue">{item}</span>)}
                        </div>
                    ))}
                </div>
            </section>

            <section className={styles.section}>
                <h2 className={styles.sectionTitle}>Team</h2>
                {team.map((t, i) => (
                    <div key={i} className={styles.teamCard}>
                        <div className={styles.teamAvatar}>{t.name.split(' ').map(n => n[0]).join('')}</div>
                        <div>
                            <h4>{t.name}</h4>
                            <p className="text-secondary">{t.role}</p>
                            <p className="text-muted" style={{ fontSize: '0.8rem' }}>{t.dept}</p>
                        </div>
                    </div>
                ))}
            </section>

            <footer className={styles.footer}>
                <span>© 2026 NeuroGuard System</span>
                <div className={styles.footerLinks}>
                    <a href="#"><Github size={16} /></a>
                    <a href="#"><Twitter size={16} /></a>
                    <a href="#"><Mail size={16} /></a>
                </div>
            </footer>
        </div>
    );
}
