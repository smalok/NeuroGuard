'use client';
import { Bell, Search } from 'lucide-react';
import styles from './Header.module.css';

interface HeaderProps {
    breadcrumbs: { label: string; href?: string }[];
    liveStatus?: boolean;
}

export default function Header({ breadcrumbs, liveStatus }: HeaderProps) {
    return (
        <header className={styles.header}>
            <div className={styles.left}>
                <div className={styles.breadcrumbs}>
                    {breadcrumbs.map((b, i) => (
                        <span key={i}>
                            {i > 0 && <span className={styles.sep}>/</span>}
                            <span className={i === breadcrumbs.length - 1 ? styles.current : styles.crumb}>
                                {b.label}
                            </span>
                        </span>
                    ))}
                </div>
                {liveStatus && (
                    <span className={styles.liveBadge}>
                        <span className={styles.liveDot} />
                        Live
                    </span>
                )}
            </div>
            <div className={styles.right}>
                <div className={styles.searchWrap}>
                    <Search size={16} className={styles.searchIcon} />
                    <input className={styles.search} placeholder="Search..." />
                </div>
                <button className={styles.iconBtn} aria-label="Notifications">
                    <Bell size={20} />
                    <span className={styles.notifDot} />
                </button>
                <div className={styles.headerAvatar}>MR</div>
            </div>
        </header>
    );
}
