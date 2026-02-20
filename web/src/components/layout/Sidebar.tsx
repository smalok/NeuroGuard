'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import {
    LayoutDashboard, Heart, Zap, History, FileText, Bell,
    Plug, User, ChevronLeft, ChevronRight, Brain, Shield
} from 'lucide-react';
import styles from './Sidebar.module.css';

const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard' },
    { icon: Heart, label: 'ECG Monitor', href: '/dashboard/ecg' },
    { icon: Zap, label: 'EMG Monitor', href: '/dashboard/emg' },
    { icon: History, label: 'History', href: '/dashboard/history' },
    { icon: FileText, label: 'Reports', href: '/dashboard/reports' },
    { icon: Bell, label: 'Alerts', href: '/dashboard/alerts', badge: 3 },
    { icon: Plug, label: 'Device', href: '/dashboard/device' },
    { icon: User, label: 'Profile', href: '/dashboard/profile' },
];

export default function Sidebar() {
    const [collapsed, setCollapsed] = useState(false);
    const pathname = usePathname();

    return (
        <aside className={`${styles.sidebar} ${collapsed ? styles.collapsed : ''}`}>
            <div className={styles.logo}>
                <div className={styles.logoIcon}>
                    <Brain size={24} />
                    <Shield size={14} className={styles.shieldOverlay} />
                </div>
                {!collapsed && <span className={styles.logoText}>NeuroGuard</span>}
            </div>

            <nav className={styles.nav}>
                {navItems.map((item) => {
                    const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname?.startsWith(item.href));
                    const Icon = item.icon;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`${styles.navItem} ${isActive ? styles.active : ''}`}
                            title={collapsed ? item.label : undefined}
                        >
                            <Icon size={20} />
                            {!collapsed && <span>{item.label}</span>}
                            {item.badge && item.badge > 0 && (
                                <span className={styles.badge}>{item.badge}</span>
                            )}
                        </Link>
                    );
                })}
            </nav>

            <div className={styles.bottom}>
                <div className={styles.userInfo}>
                    <div className={styles.avatar}>MR</div>
                    {!collapsed && (
                        <div className={styles.userText}>
                            <span className={styles.userName}>Manish Rai</span>
                            <span className={styles.userRole}>Student</span>
                        </div>
                    )}
                </div>
                <button
                    className={styles.collapseBtn}
                    onClick={() => setCollapsed(!collapsed)}
                    aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                >
                    {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
                </button>
            </div>
        </aside>
    );
}
