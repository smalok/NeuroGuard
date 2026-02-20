'use client';
import Link from 'next/link';
import { Brain, Shield, Heart, Zap, BarChart3, Activity, Cpu, ArrowRight, Wifi, Lock, ChevronRight, Github, Twitter, Mail } from 'lucide-react';
import styles from './page.module.css';

export default function LandingPage() {
  const features = [
    { icon: Heart, title: 'ECG Analysis', desc: 'Real-time heart rate variability monitoring with RMSSD, SDNN, and frequency domain analysis', color: '#3b82f6' },
    { icon: Zap, title: 'EMG Detection', desc: 'Muscle fatigue tracking through median frequency shifts and RMS envelope analysis', color: '#a855f7' },
    { icon: Brain, title: 'AI Prediction', desc: 'Random Forest classifier with 3-class burnout risk assessment and feature importance', color: '#22c55e' },
    { icon: BarChart3, title: 'Live Dashboard', desc: 'Real-time streaming waveforms, gauges, and trend analytics on a premium dark interface', color: '#eab308' },
    { icon: Activity, title: 'Historical Trends', desc: 'Track burnout patterns over weeks with calendar heatmaps and session logs', color: '#06b6d4' },
    { icon: Lock, title: 'Smart Alerts', desc: 'Customizable threshold-based notifications for ECG, EMG, and burnout score anomalies', color: '#ef4444' },
  ];

  const pipeline = [
    { label: 'ECG + EMG Signals', sub: 'Arduino + BioAmp EXG Pill', icon: Wifi },
    { label: 'Feature Extraction', sub: 'HR, HRV, RMSSD, SDNN, LF/HF, RMS, MAV, MF', icon: Cpu },
    { label: 'Random Forest ML', sub: '3-Class Classifier', icon: Brain },
    { label: 'Web Dashboard', sub: 'Real-time Visualization', icon: BarChart3 },
  ];

  return (
    <div className={styles.page}>
      {/* Navbar */}
      <nav className={styles.navbar}>
        <div className={styles.navLogo}>
          <div className={styles.logoIcon}>
            <Brain size={20} />
            <Shield size={10} className={styles.shieldSm} />
          </div>
          <span className={styles.logoText}>NeuroGuard</span>
        </div>
        <div className={styles.navLinks}>
          <a href="#features">Features</a>
          <a href="#pipeline">How It Works</a>
          <Link href="/about">About</Link>
          <Link href="/login" className={styles.navLogin}>Log In</Link>
          <Link href="/dashboard" className="btn btn-primary">
            Get Started <ArrowRight size={16} />
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className={styles.hero}>
        <div className={styles.heroBg} />
        <div className={styles.heroContent}>
          <span className={styles.heroBadge}>AI-Powered Health Monitoring</span>
          <h1 className={styles.heroTitle}>
            Detect <span className="text-gradient">Burnout</span> Before
            <br />It Happens
          </h1>
          <p className={styles.heroSub}>
            Real-time ECG & EMG biosignal analysis powered by machine learning.
            Monitor stress, track fatigue, and receive early warnings — all from a single dashboard.
          </p>
          <div className={styles.heroCTAs}>
            <Link href="/dashboard" className="btn btn-primary btn-lg">
              Open Dashboard <ArrowRight size={18} />
            </Link>
            <Link href="/about" className="btn btn-outline btn-lg">
              Learn More
            </Link>
          </div>
          <div className={styles.heroStats}>
            <div className={styles.heroStat}>
              <span className={styles.heroStatVal}>9</span>
              <span className={styles.heroStatLabel}>Bio Features</span>
            </div>
            <div className={styles.heroStatDivider} />
            <div className={styles.heroStat}>
              <span className={styles.heroStatVal}>3</span>
              <span className={styles.heroStatLabel}>Risk Classes</span>
            </div>
            <div className={styles.heroStatDivider} />
            <div className={styles.heroStat}>
              <span className={styles.heroStatVal}>&lt;2s</span>
              <span className={styles.heroStatLabel}>Latency</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className={styles.features}>
        <h2 className={styles.sectionTitle}>Comprehensive Health <span className="text-gradient">Intelligence</span></h2>
        <p className={styles.sectionSub}>From raw biosignals to actionable insights — everything you need for proactive health monitoring.</p>
        <div className={styles.featuresGrid}>
          {features.map((f, i) => (
            <div key={i} className={styles.featureCard}>
              <div className={styles.featureIcon} style={{ background: `${f.color}15`, color: f.color }}>
                <f.icon size={24} />
              </div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pipeline */}
      <section id="pipeline" className={styles.pipeline}>
        <h2 className={styles.sectionTitle}>How <span className="text-gradient">NeuroGuard</span> Works</h2>
        <p className={styles.sectionSub}>From electrode to insight in under 2 seconds</p>
        <div className={styles.pipelineSteps}>
          {pipeline.map((p, i) => (
            <div key={i} className={styles.pipelineStep}>
              <div className={styles.stepNum}>{i + 1}</div>
              <div className={styles.stepIcon}><p.icon size={28} /></div>
              <h4>{p.label}</h4>
              <p className={styles.stepSub}>{p.sub}</p>
              {i < pipeline.length - 1 && <ChevronRight className={styles.stepArrow} size={20} />}
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className={styles.ctaSection}>
        <div className={styles.ctaCard}>
          <h2>Ready to monitor your health?</h2>
          <p>Start tracking your burnout risk with real-time ECG & EMG analysis.</p>
          <Link href="/dashboard" className="btn btn-primary btn-lg">
            Launch Dashboard <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className={styles.footer}>
        <div className={styles.footerTop}>
          <div className={styles.footerBrand}>
            <div className={styles.navLogo}>
              <div className={styles.logoIcon}><Brain size={20} /></div>
              <span className={styles.logoText}>NeuroGuard</span>
            </div>
            <p className={styles.footerDesc}>AI-powered burnout detection using ECG & EMG biosignals with machine learning.</p>
          </div>
          <div className={styles.footerLinks}>
            <div>
              <h5>Product</h5>
              <Link href="/dashboard">Dashboard</Link>
              <Link href="#features">Features</Link>
              <Link href="#pipeline">How It Works</Link>
            </div>
            <div>
              <h5>Resources</h5>
              <Link href="/about">About</Link>
              <Link href="/dashboard/reports">Reports</Link>
              <Link href="/dashboard/alerts">Alerts</Link>
            </div>
          </div>
        </div>
        <div className={styles.footerBottom}>
          <span>© 2026 NeuroGuard System. All rights reserved.</span>
          <div className={styles.footerSocials}>
            <a href="#"><Github size={18} /></a>
            <a href="#"><Twitter size={18} /></a>
            <a href="#"><Mail size={18} /></a>
          </div>
        </div>
      </footer>
    </div>
  );
}
