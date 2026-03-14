'use client';
import { useRef, useEffect, useState, useCallback } from 'react';
import styles from './GulfMap.module.css';
import { mapMarkers, shelterMarkers, shipMarkers, flightPaths, debrisZones, mapLayers as defaultLayers } from '@/lib/mock-data';

export default function GulfMap({ layers, onToggleLayer }) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);

  const clearMarkers = useCallback(() => {
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];
  }, []);

  useEffect(() => {
    let map;
    let canceled = false;

    async function initMap() {
      const maplibregl = (await import('maplibre-gl')).default;
      if (canceled) return;

      map = new maplibregl.Map({
        container: mapContainerRef.current,
        style: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
        center: [55.27, 25.20],
        zoom: 7,
        attributionControl: false,
      });

      mapRef.current = map;

      map.on('load', () => {
        if (canceled) return;

        // Debris zones as circles
        debrisZones.forEach((zone, i) => {
          const center = [zone.lng, zone.lat];
          const points = 64;
          const km = 2;
          const coords = [];
          for (let j = 0; j <= points; j++) {
            const angle = (j / points) * 2 * Math.PI;
            const dx = km * Math.cos(angle);
            const dy = km * Math.sin(angle);
            const lng = center[0] + (dx / (111.32 * Math.cos(center[1] * Math.PI / 180)));
            const lat = center[1] + (dy / 110.574);
            coords.push([lng, lat]);
          }

          map.addSource(`debris-${i}`, {
            type: 'geojson',
            data: { type: 'Feature', geometry: { type: 'Polygon', coordinates: [coords] } },
          });

          map.addLayer({
            id: `debris-fill-${i}`,
            type: 'fill',
            source: `debris-${i}`,
            paint: { 'fill-color': '#ffaa00', 'fill-opacity': 0.05 },
          });

          map.addLayer({
            id: `debris-line-${i}`,
            type: 'line',
            source: `debris-${i}`,
            paint: {
              'line-color': '#ffaa00',
              'line-width': 1.5,
              'line-dasharray': [4, 4],
              'line-opacity': 0.6,
            },
          });
        });

        // Flight paths
        flightPaths.forEach((fp, i) => {
          map.addSource(`flight-${i}`, {
            type: 'geojson',
            data: {
              type: 'Feature',
              geometry: { type: 'LineString', coordinates: [fp.from, fp.to] },
            },
          });

          map.addLayer({
            id: `flight-line-${i}`,
            type: 'line',
            source: `flight-${i}`,
            paint: {
              'line-color': '#00bbff',
              'line-width': 1,
              'line-dasharray': [3, 3],
              'line-opacity': 0.5,
            },
          });
        });

        addMarkers(maplibregl);
      });
    }

    function addMarkers(maplibregl) {
      clearMarkers();
      const map = mapRef.current;
      if (!map) return;

      // Incident markers
      if (layers.find(l => l.id === 'incidents')?.visible) {
        mapMarkers.forEach((m) => {
          const el = document.createElement('div');
          el.className = styles.marker;

          const pulse = document.createElement('div');
          pulse.className = styles.markerPulse;
          pulse.style.background = m.color;
          el.appendChild(pulse);

          const core = document.createElement('div');
          core.className = styles.markerCore;
          core.style.background = m.color;
          core.style.boxShadow = `0 0 6px ${m.color}`;
          el.appendChild(core);

          const tip = document.createElement('div');
          tip.className = styles.tooltip;
          tip.textContent = m.label;
          el.appendChild(tip);

          const marker = new maplibregl.Marker({ element: el }).setLngLat([m.lng, m.lat]).addTo(map);
          markersRef.current.push(marker);
        });
      }

      // Shelter markers
      if (layers.find(l => l.id === 'shelters')?.visible) {
        shelterMarkers.forEach((s) => {
          const el = document.createElement('div');
          el.className = styles.shelterMarker;

          const cross = document.createElement('div');
          cross.className = styles.shelterCross;
          el.appendChild(cross);

          const tip = document.createElement('div');
          tip.className = styles.tooltip;
          tip.textContent = s.label;
          el.appendChild(tip);

          const marker = new maplibregl.Marker({ element: el }).setLngLat([s.lng, s.lat]).addTo(map);
          markersRef.current.push(marker);
        });
      }

      // Ship markers
      if (layers.find(l => l.id === 'maritime')?.visible) {
        shipMarkers.forEach((s) => {
          const color = s.type === 'tanker' ? '#00ddcc' : s.type === 'military' ? '#ff3344' : '#888';
          const el = document.createElement('div');
          el.className = styles.shipMarker;
          el.style.background = color;

          const tip = document.createElement('div');
          tip.className = styles.tooltip;
          tip.textContent = s.label;
          el.appendChild(tip);

          const marker = new maplibregl.Marker({ element: el }).setLngLat([s.lng, s.lat]).addTo(map);
          markersRef.current.push(marker);
        });
      }

      // Toggle layer visibility for map sources
      const debrisVisible = layers.find(l => l.id === 'debris')?.visible;
      const flightVisible = layers.find(l => l.id === 'flights')?.visible;

      debrisZones.forEach((_, i) => {
        if (map.getLayer(`debris-fill-${i}`)) {
          map.setLayoutProperty(`debris-fill-${i}`, 'visibility', debrisVisible ? 'visible' : 'none');
          map.setLayoutProperty(`debris-line-${i}`, 'visibility', debrisVisible ? 'visible' : 'none');
        }
      });

      flightPaths.forEach((_, i) => {
        if (map.getLayer(`flight-line-${i}`)) {
          map.setLayoutProperty(`flight-line-${i}`, 'visibility', flightVisible ? 'visible' : 'none');
        }
      });
    }

    initMap();

    return () => {
      canceled = true;
      clearMarkers();
      if (map) map.remove();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update markers when layers change
  useEffect(() => {
    if (!mapRef.current) return;

    async function updateMarkers() {
      const maplibregl = (await import('maplibre-gl')).default;
      const map = mapRef.current;
      if (!map || !map.loaded()) return;

      clearMarkers();

      // Re-add markers based on layer state
      if (layers.find(l => l.id === 'incidents')?.visible) {
        mapMarkers.forEach((m) => {
          const el = document.createElement('div');
          el.className = styles.marker;
          const pulse = document.createElement('div');
          pulse.className = styles.markerPulse;
          pulse.style.background = m.color;
          el.appendChild(pulse);
          const core = document.createElement('div');
          core.className = styles.markerCore;
          core.style.background = m.color;
          core.style.boxShadow = `0 0 6px ${m.color}`;
          el.appendChild(core);
          const tip = document.createElement('div');
          tip.className = styles.tooltip;
          tip.textContent = m.label;
          el.appendChild(tip);
          const marker = new maplibregl.Marker({ element: el }).setLngLat([m.lng, m.lat]).addTo(map);
          markersRef.current.push(marker);
        });
      }

      if (layers.find(l => l.id === 'shelters')?.visible) {
        shelterMarkers.forEach((s) => {
          const el = document.createElement('div');
          el.className = styles.shelterMarker;
          const cross = document.createElement('div');
          cross.className = styles.shelterCross;
          el.appendChild(cross);
          const tip = document.createElement('div');
          tip.className = styles.tooltip;
          tip.textContent = s.label;
          el.appendChild(tip);
          const marker = new maplibregl.Marker({ element: el }).setLngLat([s.lng, s.lat]).addTo(map);
          markersRef.current.push(marker);
        });
      }

      if (layers.find(l => l.id === 'maritime')?.visible) {
        shipMarkers.forEach((s) => {
          const color = s.type === 'tanker' ? '#00ddcc' : s.type === 'military' ? '#ff3344' : '#888';
          const el = document.createElement('div');
          el.className = styles.shipMarker;
          el.style.background = color;
          const tip = document.createElement('div');
          tip.className = styles.tooltip;
          tip.textContent = s.label;
          el.appendChild(tip);
          const marker = new maplibregl.Marker({ element: el }).setLngLat([s.lng, s.lat]).addTo(map);
          markersRef.current.push(marker);
        });
      }

      // Toggle MapLibre layers
      const debrisVisible = layers.find(l => l.id === 'debris')?.visible;
      const flightVisible = layers.find(l => l.id === 'flights')?.visible;

      debrisZones.forEach((_, i) => {
        if (map.getLayer(`debris-fill-${i}`)) {
          map.setLayoutProperty(`debris-fill-${i}`, 'visibility', debrisVisible ? 'visible' : 'none');
          map.setLayoutProperty(`debris-line-${i}`, 'visibility', debrisVisible ? 'visible' : 'none');
        }
      });

      flightPaths.forEach((_, i) => {
        if (map.getLayer(`flight-line-${i}`)) {
          map.setLayoutProperty(`flight-line-${i}`, 'visibility', flightVisible ? 'visible' : 'none');
        }
      });
    }

    updateMarkers();
  }, [layers, clearMarkers]);

  return (
    <div className={styles.wrapper}>
      <div ref={mapContainerRef} className={styles.map} />
      <div className={styles.scanlines} />
      <div className={styles.vignette} />
      <div className={styles.gridOverlay} />
      <div className={styles.coordReadout}>25.2048°N 55.2708°E — Persian Gulf Theater</div>
      <div className={styles.classifiedBadge}>CLASSIFIED // SITREP</div>
      <div className={styles.layerToggle}>
        <div className={styles.layerTitle}>Layers</div>
        {layers.map((layer) => (
          <div key={layer.id} className={styles.layerItem} onClick={() => onToggleLayer(layer.id)}>
            <div
              className={styles.layerDot}
              style={{ background: layer.visible ? layer.color : 'var(--text-dim)', opacity: layer.visible ? 1 : 0.3 }}
            />
            <span className={layer.visible ? styles.layerLabel : styles.layerLabelOff}>
              {layer.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
