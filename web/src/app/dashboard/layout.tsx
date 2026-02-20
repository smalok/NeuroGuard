import Sidebar from '@/components/layout/Sidebar';
import { DeviceProvider } from '@/context/DeviceContext';
import styles from './layout.module.css';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    return (
        <DeviceProvider>
            <div className={styles.layout}>
                <Sidebar />
                <main className={styles.main}>
                    {children}
                </main>
            </div>
        </DeviceProvider>
    );
}
