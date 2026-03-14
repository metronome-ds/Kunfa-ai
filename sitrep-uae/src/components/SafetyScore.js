'use client';
import { useState } from 'react';
import styles from './SafetyScore.module.css';
import { RadialGauge } from './Charts';
import { safetyMockResult } from '@/lib/mock-data';

export default function SafetyScore() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleRun = () => {
    if (!query.trim()) return;
    setLoading(true);
    setResult(null);
    // TODO: Replace with Claude API call for safety scoring
    setTimeout(() => {
      setLoading(false);
      setResult(safetyMockResult);
    }, 1200);
  };

  return (
    <div className={styles.panel}>
      <div className={styles.title}>AI Safety Assessment</div>
      <input
        className={styles.input}
        placeholder="e.g. outdoor brunch in JBR at 2pm..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && handleRun()}
      />
      <button className={styles.runBtn} onClick={handleRun}>RUN</button>

      {loading && <div className={styles.loading}>Aggregating threat vectors...</div>}

      {result && (
        <div className={styles.results}>
          <RadialGauge score={result.score} />
          <div className={styles.subtitle}>{result.subtitle}</div>

          <div className={styles.sectionTitle}>Risk Factors</div>
          {result.riskFactors.map((r, i) => (
            <div key={i} className={styles.riskItem}>{r}</div>
          ))}

          <div className={styles.sectionTitle}>Recommendations</div>
          {result.recommendations.map((r, i) => (
            <div key={i} className={styles.recItem}>{r}</div>
          ))}
        </div>
      )}
    </div>
  );
}
