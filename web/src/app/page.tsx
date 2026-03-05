'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import {
  Brain, Shield, Heart, Zap, BarChart3, Activity,
  Cpu, ArrowRight, Wifi, Lock, ChevronRight,
  Github, Twitter, Mail, Users, Signal, Clock,
  Gauge, TrendingUp, Bell, Database, Menu,
} from 'lucide-react';

import NeuralWeb3D from '@/components/effects/NeuralWeb3D';
import TiltCard from '@/components/effects/TiltCard';
import ECGWaveform from '@/components/effects/ECGWaveform';
import CountUpStats from '@/components/effects/CountUpStats';
import SignalSyncLoader from '@/components/effects/SignalSyncLoader';

gsap.registerPlugin(ScrollTrigger);

/* ─── inline style objects ─── */
const s = {
  page: { minHeight: '100vh', background: '#050a18', color: '#e2e8f0', fontFamily: "'Inter', 'Space Grotesk', system-ui, sans-serif", overflowX: 'hidden' as const },
  nav: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 32px', border: '1px solid rgba(255,255,255,0.1)', position: 'fixed' as const, top: 24, left: '50%', transform: 'translateX(-50%)', width: '90%', maxWidth: '1200px', borderRadius: 24, background: 'rgba(15,23,42,0.75)', backdropFilter: 'blur(16px)', zIndex: 100, boxShadow: '0 20px 40px -10px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)', transition: 'all 0.5s cubic-bezier(0.22, 1, 0.36, 1)' },
  navBrand: { display: 'flex', alignItems: 'center', gap: '10px' },
  navLogo: { width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg,#3b82f6,#a855f7)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' },
  navTitle: { fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: '1.15rem', background: 'linear-gradient(to right,#60a5fa,#c084fc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' },
  navLinks: { display: 'flex', alignItems: 'center', gap: '28px' },
  navLink: { fontSize: '0.875rem', fontWeight: 500, color: '#94a3b8', textDecoration: 'none', transition: 'color 0.2s' },
  navCta: { display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 24px', borderRadius: 12, background: 'linear-gradient(135deg,#3b82f6,#a855f7)', color: '#fff', fontWeight: 600, fontSize: '0.875rem', textDecoration: 'none', boxShadow: '0 4px 20px rgba(59,130,246,0.3)' },
  hero: { position: 'relative' as const, paddingTop: '180px', paddingBottom: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  heroContent: { position: 'relative' as const, zIndex: 10, textAlign: 'center' as const, maxWidth: '50rem', margin: '0 auto', padding: '0 24px' },
  badge: { display: 'inline-block', padding: '8px 20px', borderRadius: 9999, background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)', fontSize: '0.8rem', fontWeight: 600, color: '#60a5fa', marginBottom: 32, letterSpacing: '0.02em' },
  heroH1: { fontFamily: "'Space Grotesk', sans-serif", fontSize: 'clamp(2.4rem,5.5vw,4.5rem)', fontWeight: 800, lineHeight: 1.08, marginBottom: 20, letterSpacing: '-0.025em' },
  gradient: { background: 'linear-gradient(to right,#60a5fa,#c084fc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' },
  heroP: { fontSize: '1.125rem', color: '#94a3b8', lineHeight: 1.7, maxWidth: '40rem', margin: '0 auto 40px' },
  heroCtas: { display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' as const, marginBottom: 56 },
  btnPrimary: { display: 'inline-flex', alignItems: 'center', gap: 8, padding: '14px 32px', borderRadius: 14, background: 'linear-gradient(135deg,#3b82f6,#a855f7)', color: '#fff', fontWeight: 600, fontSize: '1rem', textDecoration: 'none', boxShadow: '0 8px 30px rgba(59,130,246,0.35)', transition: 'all 0.3s' },
  btnSecondary: { display: 'inline-flex', alignItems: 'center', gap: 8, padding: '14px 32px', borderRadius: 14, border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontWeight: 500, fontSize: '1rem', textDecoration: 'none', background: 'transparent', transition: 'all 0.3s' },
  statsRow: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 40 },
  statItem: { display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: 4 },
  statVal: { fontFamily: "'JetBrains Mono', monospace", fontSize: '2rem', fontWeight: 700 },
  statLabel: { fontSize: '0.75rem', color: '#64748b', fontWeight: 500 },
  divider: { width: 1, height: 40, background: 'rgba(255,255,255,0.08)' },
  section: { padding: '100px 24px', maxWidth: '72rem', margin: '0 auto' },
  sectionNarrow: { padding: '100px 24px', maxWidth: '64rem', margin: '0 auto' },
  sectionH2: { fontFamily: "'Space Grotesk', sans-serif", fontSize: 'clamp(1.6rem,3vw,2.4rem)', fontWeight: 700, textAlign: 'center' as const, marginBottom: 12 },
  sectionP: { textAlign: 'center' as const, color: '#94a3b8', maxWidth: '34rem', margin: '0 auto 56px', fontSize: '1rem', lineHeight: 1.7 },
  grid3: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 },
  grid4: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20 },
  grid2: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 20 },
  card: { padding: 28, borderRadius: 18, background: 'rgba(17,24,39,0.65)', border: '1px solid rgba(255,255,255,0.06)', backdropFilter: 'blur(8px)' },
  cardIcon: { width: 48, height: 48, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  cardTitle: { fontFamily: "'Space Grotesk', sans-serif", fontSize: '1rem', fontWeight: 600, marginBottom: 8 },
  cardDesc: { fontSize: '0.875rem', color: '#94a3b8', lineHeight: 1.6 },
  orb1: { position: 'absolute' as const, top: '15%', left: '15%', width: 500, height: 400, background: 'rgba(59,130,246,0.08)', borderRadius: '50%', filter: 'blur(120px)', pointerEvents: 'none' as const },
  orb2: { position: 'absolute' as const, bottom: '15%', right: '15%', width: 400, height: 300, background: 'rgba(168,85,247,0.06)', borderRadius: '50%', filter: 'blur(100px)', pointerEvents: 'none' as const },
  floatingLabel: { position: 'absolute' as const, padding: '6px 14px', borderRadius: 9999, background: 'rgba(17,24,39,0.7)', border: '1px solid rgba(255,255,255,0.06)', fontSize: '0.75rem', fontFamily: "'JetBrains Mono', monospace", backdropFilter: 'blur(8px)' },
  epidemicCard: { padding: '40px 32px', borderRadius: 18, background: 'rgba(17,24,39,0.65)', border: '1px solid rgba(255,255,255,0.06)', textAlign: 'center' as const },
  epidemicVal: { fontFamily: "'JetBrains Mono', monospace", fontSize: '2.5rem', fontWeight: 800, marginBottom: 8 },
  epidemicLabel: { fontSize: '1rem', fontWeight: 600, marginBottom: 8 },
  epidemicDesc: { fontSize: '0.85rem', color: '#94a3b8', lineHeight: 1.6 },
  pipelineStep: { textAlign: 'center' as const, padding: 28, borderRadius: 18, background: 'rgba(17,24,39,0.65)', border: '1px solid rgba(255,255,255,0.06)', position: 'relative' as const },
  stepNum: { width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg,#3b82f6,#a855f7)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.8rem', color: '#fff', margin: '0 auto 14px' },
  ctaBox: { position: 'relative' as const, textAlign: 'center' as const, padding: '72px 48px', borderRadius: 28, background: 'linear-gradient(135deg,rgba(59,130,246,0.08),rgba(168,85,247,0.08))', border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden' },
  footer: { borderTop: '1px solid rgba(255,255,255,0.06)', maxWidth: '72rem', margin: '0 auto', padding: '0 32px' },
  footerGrid: { display: 'flex', justifyContent: 'space-between', gap: 48, padding: '48px 0' },
  footerCol: { display: 'flex', flexDirection: 'column' as const, gap: 10 },
  footerHead: { fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.12em', color: '#e2e8f0', marginBottom: 4 },
  footerLink: { fontSize: '0.85rem', color: '#64748b', textDecoration: 'none', transition: 'color 0.2s' },
  footerBottom: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 0', borderTop: '1px solid rgba(255,255,255,0.06)', fontSize: '0.75rem', color: '#64748b' },
  footerIcons: { display: 'flex', gap: 16 },
  ecgBox: { borderRadius: 18, background: 'rgba(17,24,39,0.5)', border: '1px solid rgba(255,255,255,0.06)', padding: 28, backdropFilter: 'blur(8px)' },
  ecgPills: { display: 'flex', flexWrap: 'wrap' as const, justifyContent: 'center', gap: 20, marginTop: 24 },
  ecgPill: { display: 'flex', alignItems: 'center', gap: 8, padding: '8px 18px', borderRadius: 9999, background: '#111827', border: '1px solid rgba(255,255,255,0.06)' },
  dot: (c: string) => ({ width: 8, height: 8, borderRadius: '50%', background: c, animation: 'pulse 2s ease infinite' }),
  hwCard: { padding: 28, borderRadius: 18, background: 'rgba(17,24,39,0.65)', border: '1px solid rgba(255,255,255,0.06)' },
};

export default function LandingPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isScrolled, setIsScrolled] = useState(false);
  const heroRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  const featuresRef = useRef<HTMLElement>(null);
  const pipelineRef = useRef<HTMLElement>(null);
  const ctaRef = useRef<HTMLElement>(null);

  const features = [
    { icon: Heart, title: 'ECG/EMG Monitoring', desc: 'Continuous heart rate variability and muscular tension tracking for a complete autonomic nervous system profile.', color: '#3b82f6' },
    { icon: Brain, title: 'Burnout Prediction', desc: 'AI algorithms predict exhaustion levels up to 48 hours before they become clinically significant.', color: '#a855f7' },
    { icon: Gauge, title: 'Stress Gauge', desc: 'Real-time visual dashboard showing current cortisol-surrogate metrics and cognitive load levels.', color: '#22c55e' },
    { icon: TrendingUp, title: 'Trend Analysis', desc: 'Weekly and monthly biological reports highlighting environmental triggers and recovery efficiency.', color: '#eab308' },
    { icon: Bell, title: 'Smart Alerts', desc: 'Adaptive notification system that suggests breaks or interventions based on bio-feedback loops.', color: '#06b6d4' },
    { icon: Database, title: 'Secure Data Vault', desc: 'HIPAA-compliant end-to-end encrypted storage for all physiological data streams.', color: '#ef4444' },
  ];

  const pipeline = [
    { label: 'Sensors', sub: 'Non-invasive ECG & EMG skin electrodes capture micro-voltages.', icon: Wifi },
    { label: 'Capture', sub: 'BioAmp EXG technology amplifies and filters raw biological noise.', icon: Cpu },
    { label: 'AI Analysis', sub: 'Random Forest models process HRV and muscle tension patterns.', icon: Brain },
    { label: 'Alerts', sub: 'Predictive warnings sent before physiological fatigue manifests.', icon: Bell },
  ];

  const stats = [
    { value: 2847, label: 'Active Users', icon: <Users size={20} /> },
    { value: 1.2, suffix: 'M', label: 'Signals Processed', icon: <Signal size={20} /> },
    { value: 99.7, suffix: '%', label: 'Accuracy Rate', icon: <Brain size={20} /> },
    { value: 24, suffix: '/7', label: 'Monitoring', icon: <Clock size={20} /> },
  ];

  const hardware = [
    { title: 'Arduino Nano RP2040', desc: 'Powerful dual-core processor with integrated IMU for motion-artifact cancellation.' },
    { title: 'BioAmp EXG Pill', desc: 'High-gain, ultra-low noise analog front-end for pristine biological signal capture.' },
    { title: 'Gel-Pill Electrodes', desc: 'Medical-grade Ag/AgCl disposable sensors for consistent skin-impedance matching.' },
  ];

  useEffect(() => {
    const ctx = gsap.context(() => {
      const heroTl = gsap.timeline({ defaults: { ease: 'power3.out' } });
      heroTl
        .from('[data-hero-badge]', { y: 30, opacity: 0, duration: 0.8 })
        .from('[data-hero-title]', { y: 50, opacity: 0, duration: 1 }, '-=0.4')
        .from('[data-hero-sub]', { y: 30, opacity: 0, duration: 0.8 }, '-=0.5')
        .from('[data-hero-ctas]', { y: 30, opacity: 0, duration: 0.7 }, '-=0.4')
        .from('[data-hero-stats] > *', { y: 20, opacity: 0, duration: 0.5, stagger: 0.1 }, '-=0.3')
        .from('[data-floating]', { opacity: 0, scale: 0.5, duration: 0.6, stagger: 0.15 }, '-=0.3');

      gsap.from('[data-feature-card]', {
        scrollTrigger: { trigger: featuresRef.current, start: 'top 75%' },
        y: 60, opacity: 0, duration: 0.7, stagger: 0.12, ease: 'power2.out',
      });

      gsap.from('[data-epidemic-card]', {
        scrollTrigger: { trigger: '[data-epidemic]', start: 'top 75%' },
        y: 50, opacity: 0, duration: 0.7, stagger: 0.15, ease: 'power2.out',
      });

      gsap.from('[data-pipeline-step]', {
        scrollTrigger: { trigger: pipelineRef.current, start: 'top 75%' },
        y: 40, opacity: 0, duration: 0.6, stagger: 0.15, ease: 'power2.out',
      });

      gsap.from('[data-hw-card]', {
        scrollTrigger: { trigger: '[data-hw]', start: 'top 75%' },
        y: 40, opacity: 0, duration: 0.6, stagger: 0.15, ease: 'power2.out',
      });

      gsap.from('[data-cta-card]', {
        scrollTrigger: { trigger: ctaRef.current, start: 'top 80%' },
        y: 40, opacity: 0, scale: 0.97, duration: 0.8, ease: 'power2.out',
      });
    });
    return () => ctx.revert();
  }, []);

  return (
    <>
      {isLoading && <SignalSyncLoader onComplete={() => setIsLoading(false)} />}

      <div style={{ ...s.page, opacity: isLoading ? 0 : 1, transition: 'opacity 1s ease-in-out' }}>
        <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
          <NeuralWeb3D />
        </div>

        {/* NAVBAR */}
        <nav style={{
          ...s.nav,
          width: isScrolled ? '140px' : '90%',
          padding: isScrolled ? '10px 18px' : '14px 32px',
          borderRadius: isScrolled ? 40 : 24,
        }}>
          <div style={s.navBrand}>
            <div style={s.navLogo}><Brain size={20} /><Shield size={10} style={{ position: 'absolute', bottom: -1, right: -1 }} /></div>
            <span style={{
              ...s.navTitle,
              opacity: isScrolled ? 0 : 1,
              width: isScrolled ? 0 : '110px',
              overflow: 'hidden',
              whiteSpace: 'nowrap',
              transition: 'all 0.4s cubic-bezier(0.22, 1, 0.36, 1)',
              display: 'block'
            }}>NeuroGuard</span>
          </div>

          <div style={{
            ...s.navLinks,
            opacity: isScrolled ? 0 : 1,
            pointerEvents: isScrolled ? 'none' : 'auto',
            position: isScrolled ? 'absolute' : 'static',
            right: 32,
            transition: 'all 0.4s cubic-bezier(0.22, 1, 0.36, 1)',
            visibility: isScrolled ? 'hidden' : 'visible'
          }}>
            <a href="#features" style={s.navLink}>Technology</a>
            <a href="#pipeline" style={s.navLink}>Solutions</a>
            <a href="#hardware" style={s.navLink}>Hardware</a>
            <Link href="/about" style={s.navLink}>Research</Link>
            <Link href="/login" style={{ ...s.navLink, color: '#60a5fa' }}>Log In</Link>
            <Link href="/dashboard" style={s.navCta}>Get Started <ArrowRight size={16} /></Link>
          </div>

          {/* Compact Menu Icon for Scrolled State */}
          <div style={{
            opacity: isScrolled ? 1 : 0,
            pointerEvents: isScrolled ? 'auto' : 'none',
            position: isScrolled ? 'static' : 'absolute',
            right: 18,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#94a3b8',
            transition: 'all 0.4s cubic-bezier(0.22, 1, 0.36, 1)',
            cursor: 'pointer'
          }}>
            <Menu size={24} />
          </div>
        </nav>

        {/* HERO */}
        <section ref={heroRef} style={s.hero}>
          <div style={s.orb1} />
          <div style={s.orb2} />

          {/* Floating labels */}
          <div data-floating style={{ ...s.floatingLabel, top: '22%', left: '8%', color: '#60a5fa' }}>72 BPM</div>
          <div data-floating style={{ ...s.floatingLabel, top: '32%', right: '10%', color: '#c084fc' }}>0.8 mV</div>
          <div data-floating style={{ ...s.floatingLabel, bottom: '28%', left: '12%', color: '#4ade80' }}>Normal</div>
          <div data-floating style={{ ...s.floatingLabel, bottom: '38%', right: '7%', color: '#22d3ee' }}>128 Hz</div>

          <div style={s.heroContent}>
            <span data-hero-badge style={s.badge}>AI-Powered Burnout Detection System</span>
            <h1 data-hero-title style={s.heroH1}>
              Detect <span style={s.gradient}>Burnout</span> Before
              <br />It Hits.
            </h1>
            <p data-hero-sub style={s.heroP}>
              NeuroGuard uses clinical-grade ECG & EMG sensors paired with advanced AI to predict fatigue and prevent mental exhaustion in high-performance environments.
            </p>
            <div data-hero-ctas style={s.heroCtas}>
              <Link href="/dashboard" style={s.btnPrimary}>Launch Dashboard <ArrowRight size={18} /></Link>
              <Link href="/about" style={s.btnSecondary}>Research Papers</Link>
            </div>
            <div data-hero-stats style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, maxWidth: '44rem', margin: '0 auto' }}>
              {[
                { val: '500+', label: 'Organizations', color: '#60a5fa' },
                { val: '99.7%', label: 'Accuracy', color: '#c084fc' },
                { val: '<2s', label: 'Latency', color: '#4ade80' },
                { val: '9', label: 'Bio Features', color: '#22d3ee' },
              ].map((st, i) => (
                <div key={i} style={{ textAlign: 'center', padding: '14px 12px', borderRadius: 14, background: 'rgba(17,24,39,0.5)', border: '1px solid rgba(255,255,255,0.06)', backdropFilter: 'blur(8px)' }}>
                  <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '1.5rem', fontWeight: 700, color: st.color, marginBottom: 2 }}>{st.val}</div>
                  <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 500 }}>{st.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* THE INVISIBLE EPIDEMIC */}
        <section data-epidemic style={s.sectionNarrow}>
          <h2 style={s.sectionH2}>The Invisible <span style={s.gradient}>Epidemic</span></h2>
          <p style={s.sectionP}>Burnout costs organizations billions, yet goes undetected until it&apos;s too late.</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
            {[
              { val: '$322B', label: 'Annual Economic Cost', desc: 'Estimated annual cost to the global economy due to burnout-related productivity loss and turnover.', color: '#ef4444' },
              { val: '76%', label: 'Worker Prevalence', desc: 'Three out of four employees report experiencing symptoms of burnout at least once during their career.', color: '#eab308' },
              { val: '2.4×', label: 'Risk Escalation', desc: 'Workers experiencing high stress are 2.4 times more likely to develop long-term chronic health issues.', color: '#a855f7' },
            ].map((item, i) => (
              <div key={i} data-epidemic-card style={s.epidemicCard}>
                <div style={{ ...s.epidemicVal, color: item.color }}>{item.val}</div>
                <div style={s.epidemicLabel}>{item.label}</div>
                <p style={s.epidemicDesc}>{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ECG WAVEFORM */}
        <section style={s.sectionNarrow}>
          <h2 style={s.sectionH2}>Real-Time <span style={s.gradient}>Signal Processing</span></h2>
          <p style={s.sectionP}>Watch the ECG waveform come alive as you scroll</p>
          <div style={s.ecgBox}>
            <ECGWaveform />
            <div style={s.ecgPills}>
              <div style={s.ecgPill}><span style={s.dot('#4ade80')} /><span style={{ fontSize: '0.85rem', fontFamily: "'JetBrains Mono', monospace", color: '#4ade80' }}>Heart Rate: 72 BPM</span></div>
              <div style={s.ecgPill}><span style={s.dot('#60a5fa')} /><span style={{ fontSize: '0.85rem', fontFamily: "'JetBrains Mono', monospace", color: '#60a5fa' }}>HRV: 45ms</span></div>
              <div style={s.ecgPill}><span style={s.dot('#c084fc')} /><span style={{ fontSize: '0.85rem', fontFamily: "'JetBrains Mono', monospace", color: '#c084fc' }}>Signal Quality: 98%</span></div>
            </div>
          </div>
        </section>

        {/* FEATURES */}
        <section ref={featuresRef} id="features" style={s.section}>
          <h2 style={s.sectionH2}>Comprehensive Health <span style={s.gradient}>Intelligence</span></h2>
          <p style={s.sectionP}>From physiological signal to actionable intelligence.</p>
          <div style={s.grid3}>
            {features.map((f, i) => (
              <div key={i} data-feature-card>
                <TiltCard glowColor={`${f.color}66`} maxTilt={12}>
                  <div style={s.card}>
                    <div style={{ ...s.cardIcon, background: `${f.color}15`, color: f.color }}><f.icon size={24} /></div>
                    <h3 style={s.cardTitle}>{f.title}</h3>
                    <p style={s.cardDesc}>{f.desc}</p>
                  </div>
                </TiltCard>
              </div>
            ))}
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section ref={pipelineRef} id="pipeline" style={s.sectionNarrow}>
          <h2 style={s.sectionH2}>How <span style={s.gradient}>NeuroGuard</span> Works</h2>
          <p style={s.sectionP}>From physiological signal to actionable intelligence.</p>
          <div style={{ position: 'relative' }}>
            {/* Connector line */}
            <div style={{ position: 'absolute', top: 16, left: '12.5%', right: '12.5%', height: 2, background: 'linear-gradient(to right, #3b82f6, #a855f7)', opacity: 0.3, zIndex: 0 }} />
            <div style={s.grid4}>
              {pipeline.map((p, i) => (
                <div key={i} data-pipeline-step style={{ ...s.pipelineStep, zIndex: 1 }}>
                  <div style={s.stepNum}>{i + 1}</div>
                  <div style={{ color: '#60a5fa', marginBottom: 14, display: 'flex', justifyContent: 'center' }}><p.icon size={28} /></div>
                  <h4 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '0.95rem', fontWeight: 600, marginBottom: 8 }}>{p.label}</h4>
                  <p style={{ fontSize: '0.8rem', color: '#64748b', lineHeight: 1.5 }}>{p.sub}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* STATS */}
        <section style={s.sectionNarrow}>
          <h2 style={s.sectionH2}>Trusted by <span style={s.gradient}>Organizations</span></h2>
          <p style={s.sectionP}>Join 500+ forward-thinking organizations using NeuroGuard to sustain peak performance and well-being.</p>
          <CountUpStats stats={stats} />
        </section>

        {/* HARDWARE */}
        <section data-hw id="hardware" style={s.sectionNarrow}>
          <h2 style={s.sectionH2}>The <span style={s.gradient}>Hardware</span></h2>
          <p style={s.sectionP}>Low-power, precision instruments for clinical accuracy.</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
            {hardware.map((hw, i) => (
              <div key={i} data-hw-card style={s.hwCard}>
                <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(59,130,246,0.1)', color: '#60a5fa', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                  <Cpu size={24} />
                </div>
                <h4 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '1rem', fontWeight: 600, marginBottom: 8 }}>{hw.title}</h4>
                <p style={{ fontSize: '0.85rem', color: '#94a3b8', lineHeight: 1.6 }}>{hw.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section ref={ctaRef} style={s.sectionNarrow}>
          <div data-cta-card style={{ position: 'relative', textAlign: 'center', padding: '72px 48px', borderRadius: 28, background: 'linear-gradient(135deg, #1e3a8a 0%, #3b0764 50%, #6d28d9 100%)', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'radial-gradient(ellipse at 30% 50%, rgba(59,130,246,0.15), transparent 70%), radial-gradient(ellipse at 70% 50%, rgba(168,85,247,0.15), transparent 70%)', pointerEvents: 'none' }} />
            <div style={{ position: 'relative', zIndex: 10 }}>
              <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 'clamp(1.6rem,3vw,2.4rem)', fontWeight: 700, marginBottom: 16, color: '#fff' }}>Ready to Protect Your Team?</h2>
              <p style={{ color: 'rgba(226,232,240,0.8)', marginBottom: 36, maxWidth: 480, margin: '0 auto 36px', fontSize: '1rem', lineHeight: 1.7 }}>
                Join 500+ forward-thinking organizations using NeuroGuard to sustain peak performance and well-being.
              </p>
              <div style={{ display: 'flex', gap: 16, justifyContent: 'center' }}>
                <Link href="/dashboard" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '14px 32px', borderRadius: 14, background: '#fff', color: '#1e1b4b', fontWeight: 600, fontSize: '1rem', textDecoration: 'none', boxShadow: '0 4px 20px rgba(255,255,255,0.15)' }}>Launch Dashboard <ArrowRight size={18} /></Link>
                <Link href="/about" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '14px 32px', borderRadius: 14, border: '1px solid rgba(255,255,255,0.25)', color: '#fff', fontWeight: 500, fontSize: '1rem', textDecoration: 'none', background: 'transparent' }}>Request Demo</Link>
              </div>
            </div>
          </div>
        </section>

        {/* FOOTER */}
        <footer style={s.footer}>
          <div style={{ height: 1, width: '100%', background: 'linear-gradient(to right,transparent,rgba(59,130,246,0.3),transparent)' }} />
          <div style={s.footerGrid}>
            <div style={{ maxWidth: 320 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <div style={{ ...s.navLogo, width: 32, height: 32 }}><Brain size={18} /></div>
                <span style={s.navTitle}>NeuroGuard</span>
              </div>
              <p style={{ fontSize: '0.85rem', color: '#64748b', lineHeight: 1.6 }}>
                Advancing human potential through ethical physiological monitoring and predictive AI.
              </p>
            </div>
            <div style={s.footerCol}>
              <span style={s.footerHead}>Product</span>
              <a href="#pipeline" style={s.footerLink}>How it works</a>
              <a href="#features" style={s.footerLink}>Features</a>
              <a href="#hardware" style={s.footerLink}>Hardware</a>
              <Link href="/dashboard" style={s.footerLink}>Dashboard</Link>
            </div>
            <div style={s.footerCol}>
              <span style={s.footerHead}>Science</span>
              <Link href="/about" style={s.footerLink}>Whitepapers</Link>
              <Link href="/about" style={s.footerLink}>Clinical Studies</Link>
              <Link href="/about" style={s.footerLink}>Methodology</Link>
              <Link href="/about" style={s.footerLink}>Ethics & Privacy</Link>
            </div>
            <div style={s.footerCol}>
              <span style={s.footerHead}>Company</span>
              <Link href="/about" style={s.footerLink}>About Us</Link>
              <a href="#" style={s.footerLink}>Careers</a>
              <a href="#" style={s.footerLink}>Contact</a>
              <a href="#" style={s.footerLink}>Partners</a>
            </div>
          </div>
          <div style={s.footerBottom}>
            <span>© 2026 NeuroGuard System. All rights reserved.</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <a href="#" style={s.footerLink}>Privacy Policy</a>
              <span>·</span>
              <a href="#" style={s.footerLink}>Terms of Service</a>
              <span>·</span>
              <a href="#" style={s.footerLink}>Security</a>
            </div>
            <div style={s.footerIcons}>
              <a href="#" style={{ color: '#64748b' }}><Github size={18} /></a>
              <a href="#" style={{ color: '#64748b' }}><Twitter size={18} /></a>
              <a href="#" style={{ color: '#64748b' }}><Mail size={18} /></a>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
