'use client';
import { useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import styles from './page.module.css';
import StatusBar from '@/components/StatusBar';
import LiveFeed from '@/components/LiveFeed';
import BottomBar from '@/components/BottomBar';
import SafetyScore from '@/components/SafetyScore';
import MarketWatch from '@/components/MarketWatch';
import HormuzPanel from '@/components/HormuzPanel';
import CommunityReports from '@/components/CommunityReports';
import { mapLayers } from '@/lib/mock-data';

const GulfMap = dynamic(() => import('@/components/GulfMap'), { ssr: false });

const TABS = ['Safety', 'Markets', 'Hormuz', 'Reports'];

export default function Home() {
  const [activeTab, setActiveTab] = useState('Safety');
  const [layers, setLayers] = useState(mapLayers);

  const handleToggleLayer = useCallback((id) => {
    setLayers(prev => prev.map(l => l.id === id ? { ...l, visible: !l.visible } : l));
  }, []);

  const renderTabContent = () => {
    switch (activeTab) {
      case 'Safety': return <SafetyScore />;
      case 'Markets': return <MarketWatch />;
      case 'Hormuz': return <HormuzPanel />;
      case 'Reports': return <CommunityReports />;
      default: return null;
    }
  };

  return (
    <div className={styles.layout}>
      <StatusBar />
      <div className={styles.main}>
        <LiveFeed />
        <div className={styles.center}>
          <GulfMap layers={layers} onToggleLayer={handleToggleLayer} />
          <BottomBar />
        </div>
        <div className={styles.rightPanel}>
          <div className={styles.tabs}>
            {TABS.map(tab => (
              <button
                key={tab}
                className={activeTab === tab ? styles.tabActive : styles.tab}
                onClick={() => setActiveTab(tab)}
              >
                {tab}
              </button>
            ))}
          </div>
          <div className={styles.tabContent}>
            {renderTabContent()}
          </div>
        </div>
      </div>
    </div>
  );
}
