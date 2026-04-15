import React from 'react';

export default function Sparkline({ points = [], width = 120, height = 32, color = '#6366f1' }) {
  if (points.length < 2) {
    return (
      <svg width={width} height={height} className="text-slate-300">
        <line x1="0" y1={height / 2} x2={width} y2={height / 2} stroke="currentColor" strokeDasharray="2 2" />
      </svg>
    );
  }
  const waits = points.map((p) => p.wait);
  const min = Math.min(...waits);
  const max = Math.max(...waits);
  const range = max - min || 1;
  const stepX = width / (points.length - 1);
  const d = points
    .map((p, i) => {
      const x = i * stepX;
      const y = height - ((p.wait - min) / range) * (height - 4) - 2;
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
  const lastX = (points.length - 1) * stepX;
  const lastY = height - ((points[points.length - 1].wait - min) / range) * (height - 4) - 2;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <path d={d} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={lastX} cy={lastY} r="2.5" fill={color} />
    </svg>
  );
}
