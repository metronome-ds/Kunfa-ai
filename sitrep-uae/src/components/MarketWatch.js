'use client';
import styles from './MarketWatch.module.css';
import { MiniSparkline } from './Charts';
import { marketData } from '@/lib/mock-data';

export default function MarketWatch() {
  return (
    <div className={styles.panel}>
      <div className={styles.title}>Market Watch</div>
      <div className={styles.alertBanner}>5% circuit breaker active on ADX &amp; DFM</div>

      {marketData.indices.map((idx, i) => (
        <div key={i} className={styles.indexCard}>
          <div className={styles.indexName}>{idx.name}</div>
          <div className={styles.indexRow}>
            <span className={styles.indexValue}>{idx.value}</span>
            <MiniSparkline data={idx.sparkline} color={idx.change < 0 ? '#ff3344' : '#00ff88'} />
            <span className={styles.indexChange} style={{ color: idx.change < 0 ? 'var(--red)' : 'var(--green)' }}>
              {idx.change > 0 ? '+' : ''}{idx.change}%
            </span>
          </div>
        </div>
      ))}

      <div className={styles.commoditiesRow}>
        {marketData.commodities.map((c, i) => (
          <div key={i} className={styles.commodity}>
            <span className={styles.commodityName}>{c.name}</span>
            <span className={styles.commodityValue}>{c.value}</span>
            <span className={styles.commodityChange} style={{
              color: c.change > 0 ? 'var(--green)' : c.change < 0 ? 'var(--red)' : 'var(--text-muted)'
            }}>
              {c.change > 0 ? '+' : ''}{c.change}%
            </span>
          </div>
        ))}
      </div>

      <div className={styles.moversTitle}>Biggest Movers</div>
      {marketData.movers.map((m, i) => (
        <div key={i} className={styles.moverRow}>
          <span className={styles.moverName}>{m.name}</span>
          <div className={styles.moverValues}>
            <span className={styles.moverPrice}>{m.value}</span>
            <span className={styles.moverChange} style={{ color: m.change < 0 ? 'var(--red)' : 'var(--green)' }}>
              {m.change > 0 ? '+' : ''}{m.change.toFixed(2)}%
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
