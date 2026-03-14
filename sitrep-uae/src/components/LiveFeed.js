'use client';
import styles from './LiveFeed.module.css';
import { intelEvents } from '@/lib/mock-data';

const severityColors = {
  critical: '#ff3344',
  high: '#ff6644',
  elevated: '#ffaa00',
  moderate: '#ffcc44',
  info: '#00ff88',
};

const typeBg = {
  conflict: 'rgba(255,51,68,0.03)',
  warning: 'rgba(255,170,0,0.03)',
  maritime: 'rgba(0,187,255,0.03)',
  cooperation: 'rgba(0,255,136,0.03)',
};

export default function LiveFeed() {
  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <span className={styles.title}>Live Intel Feed</span>
        <span className={styles.source}>GDELT + WAM + NCEMA</span>
      </div>
      <div className={styles.feed}>
        {intelEvents.map((event) => (
          <div
            key={event.id}
            className={styles.card}
            style={{
              borderLeftColor: severityColors[event.severity],
              background: typeBg[event.type] || 'transparent',
            }}
          >
            <div className={styles.cardTop}>
              <span
                className={styles.sourceBadge}
                style={{ borderColor: event.sourceColor, color: event.sourceColor }}
              >
                {event.source}
              </span>
              <span className={styles.locationTag}>{event.location}</span>
              <span className={styles.timestamp}>{event.timestamp}</span>
            </div>
            <div className={styles.headline}>{event.headline}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
