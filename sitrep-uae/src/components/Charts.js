'use client';

export function Sparkline({ data, color, width = 110, height = 24, strokeWidth = 1.5 }) {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 2) - 1;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg width={width} height={height} style={{ display: 'block' }}>
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function MiniSparkline({ data, color, width = 70, height = 20 }) {
  return <Sparkline data={data} color={color} width={width} height={height} strokeWidth={1} />;
}

export function RadialGauge({ score, size = 100 }) {
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;
  const color = score >= 70 ? 'var(--green)' : score >= 40 ? 'var(--amber)' : 'var(--red)';

  return (
    <svg width={size} height={size} viewBox="0 0 100 100" style={{ display: 'block', margin: '0 auto' }}>
      <circle cx="50" cy="50" r={radius} fill="none" stroke="var(--text-ghost)" strokeWidth="4" />
      <circle
        cx="50"
        cy="50"
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth="4"
        strokeDasharray={`${progress} ${circumference}`}
        strokeLinecap="round"
        transform="rotate(-90 50 50)"
        style={{ filter: `drop-shadow(0 0 4px ${color})` }}
      />
      <text x="50" y="50" textAnchor="middle" dominantBaseline="central" fill={color} fontSize="26" fontFamily="var(--mono)" fontWeight="700">
        {score}
      </text>
    </svg>
  );
}
