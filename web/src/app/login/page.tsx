'use client';
import Link from 'next/link';
import { useState } from 'react';
import { Brain, Shield, Mail, Lock, ArrowRight, Eye, EyeOff } from 'lucide-react';
import styles from './page.module.css';

export default function LoginPage() {
    const [showPassword, setShowPassword] = useState(false);

    return (
        <div className={styles.page}>
            <div className={styles.left}>
                <div className={styles.ecgBg} />
                <div className={styles.leftContent}>
                    <div className={styles.logo}>
                        <div className={styles.logoIcon}><Brain size={24} /><Shield size={12} className={styles.shieldSm} /></div>
                        <span className={styles.logoText}>NeuroGuard</span>
                    </div>
                    <h2 className={styles.leftTitle}>Monitor Your Health<br /><span className="text-gradient">In Real Time</span></h2>
                    <p className={styles.leftSub}>AI-powered burnout detection using ECG & EMG biosignals with machine learning.</p>
                    <div className={styles.leftStats}>
                        <div><span>9+</span><small>Bio Features</small></div>
                        <div><span>Real-time</span><small>Monitoring</small></div>
                        <div><span>ML</span><small>Predictions</small></div>
                    </div>
                </div>
            </div>
            <div className={styles.right}>
                <div className={styles.form}>
                    <h2>Welcome Back</h2>
                    <p className={styles.formSub}>Sign in to access your health dashboard</p>
                    <div className={styles.field}>
                        <label>Email</label>
                        <div className={styles.inputWrap}>
                            <Mail size={16} className={styles.inputIcon} />
                            <input type="email" className="input" placeholder="you@example.com" style={{ paddingLeft: 38 }} />
                        </div>
                    </div>
                    <div className={styles.field}>
                        <div className={styles.labelRow}>
                            <label>Password</label>
                            <a href="#" className={styles.forgot}>Forgot?</a>
                        </div>
                        <div className={styles.inputWrap}>
                            <Lock size={16} className={styles.inputIcon} />
                            <input type={showPassword ? 'text' : 'password'} className="input" placeholder="••••••••" style={{ paddingLeft: 38, paddingRight: 38 }} />
                            <button className={styles.eyeBtn} onClick={() => setShowPassword(!showPassword)} type="button">
                                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                    </div>
                    <Link href="/dashboard" className="btn btn-primary btn-lg" style={{ width: '100%', marginTop: 8 }}>
                        Sign In <ArrowRight size={16} />
                    </Link>
                    <p className={styles.switchAuth}>
                        Don&apos;t have an account? <Link href="/register">Create one</Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
