'use client';
import { useState, useEffect } from 'react';
import styles from './StatusBar.module.css';

export default function StatusBar() {
  const [time, setTime] = useState({ gst: '', utc: '' });

  useEffect(() => {
    const update = () => {
      const now = new Date();
      const gst = now.toLocaleTimeString('en-GB', { timeZone: 'Asia/Dubai', hour12: false });
      const utc = now.toLocaleTimeString('en-GB', { timeZone: 'UTC', hour12: false });
      setTime({ gst, utc });
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className={styles.bar}>
      <div className={styles.left}>
        <div className={styles.brand}>
          <span className={styles.brandMain}>SITREP</span>
          <span className={styles.brandSub}>UAE</span>
        </div>
        <div className={styles.divider} />
        <div className={styles.critical}>
          <div className={styles.pulsingDot} />
          <span className={styles.criticalLabel}>Critical</span>
        </div>
      </div>
      <div className={styles.right}>
        <div className={styles.indicator}>
          <span className={styles.indicatorLabel}>NCEMA</span>
          <span className={styles.indicatorValue} style={{ color: 'var(--red)' }}>ACTIVE</span>
        </div>
        <div className={styles.indicator}>
          <span className={styles.indicatorLabel}>Airspace</span>
          <span className={styles.indicatorValue} style={{ color: 'var(--amber)' }}>RESTRICTED</span>
        </div>
        <div className={styles.indicator}>
          <span className={styles.indicatorLabel}>Hormuz</span>
          <span className={styles.indicatorValue} style={{ color: 'var(--amber)' }}>DEGRADED</span>
        </div>
        <div className={styles.indicator}>
          <span className={styles.indicatorLabel}>Markets</span>
          <span className={styles.indicatorValue} style={{ color: 'var(--red)' }}>-5% LIMIT</span>
        </div>
        <div className={styles.divider} />
        <div className={styles.clock}>
          GST {time.gst} | UTC {time.utc}
        </div>
      </div>
    </div>
  );
}
