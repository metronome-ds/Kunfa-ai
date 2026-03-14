'use client';
import styles from './BottomBar.module.css';
import { Sparkline } from './Charts';
import { ncemaAlerts, trendData } from '@/lib/mock-data';

export default function BottomBar() {
  const maxDuration = 50;

  return (
    <div className={styles.bar}>
      <div className={styles.alertTimeline}>
        <div className={styles.timelineHeader}>
          <span className={styles.timelineTitle}>NCEMA Alert History</span>
          <span className={styles.timelineAvg}>avg 33min</span>
        </div>
        <div className={styles.barsContainer}>
          {ncemaAlerts.map((alert, i) => (
            <div key={i} className={styles.barGroup}>
              {alert.active ? (
                <div
                  className={styles.barActive}
                  style={{ background: '#ff3344' }}
                />
              ) : (
                <div
                  className={styles.barFill}
                  style={{
                    height: `${(alert.duration / maxDuration) * 100}%`,
                    background: alert.type === 'missile' ? '#ff3344' : '#ffaa00',
                  }}
                />
              )}
              <span className={styles.barLabel}>{alert.date}</span>
              <span className={styles.barDuration}>
                {alert.active ? 'ACTIVE' : `${alert.duration}m`}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className={styles.trends}>
        {Object.values(trendData).map((trend, i) => (
          <div key={i} className={styles.trendItem}>
            <span className={styles.trendLabel}>{trend.label}</span>
            <Sparkline data={trend.data} color={trend.color} />
            <span className={styles.trendValue} style={{ color: trend.color }}>
              {trend.current}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
