'use client';
import { useState } from 'react';
import styles from './CommunityReports.module.css';
import { communityReports } from '@/lib/mock-data';

export default function CommunityReports() {
  const [reports, setReports] = useState(communityReports);

  const handleVote = (id) => {
    setReports(prev => prev.map(r => r.id === id ? { ...r, votes: r.votes + 1 } : r));
  };

  return (
    <div className={styles.panel}>
      <div className={styles.title}>Ground Reports</div>
      {reports.map((report) => (
        <div key={report.id} className={styles.reportCard}>
          <div className={styles.voteCol}>
            <button className={styles.voteBtn} onClick={() => handleVote(report.id)}>+</button>
            <span className={styles.voteCount}>{report.votes}</span>
          </div>
          <div className={styles.reportContent}>
            <div className={styles.reportText}>{report.text}</div>
            <div className={styles.reportMeta}>{report.location} · {report.time}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
