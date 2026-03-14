'use client';
import styles from './HormuzPanel.module.css';
import { hormuzStats } from '@/lib/mock-data';

export default function HormuzPanel() {
  return (
    <div className={styles.panel}>
      <div className={styles.title}>Strait of Hormuz</div>
      <div className={styles.grid}>
        {hormuzStats.map((stat, i) => (
          <div key={i} className={styles.statCard}>
            <div className={styles.statLabel}>{stat.label}</div>
            <div className={styles.statValue} style={{ color: stat.color }}>{stat.value}</div>
            <div className={styles.statSub}>{stat.sub}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
