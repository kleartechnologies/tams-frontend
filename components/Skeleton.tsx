export function SkeletonLine({ width = '100%', height = 14 }: { width?: string | number; height?: number }) {
  return (
    <div
      className="skeleton"
      style={{ width, height, borderRadius: 4, display: 'block' }}
    />
  );
}

export function SkeletonCard({ height = 100 }: { height?: number }) {
  return (
    <div className="skeleton" style={{ height, borderRadius: 12 }} />
  );
}

export function SkeletonTable({ rows = 8, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div style={{ padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} style={{ display: 'flex', gap: 16 }}>
          {Array.from({ length: cols }).map((_, j) => (
            <div key={j} className="skeleton" style={{ flex: 1, height: 16, borderRadius: 4 }} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function SkeletonKpiRow() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 24 }}>
      {[1, 2, 3, 4].map((i) => (
        <SkeletonCard key={i} height={100} />
      ))}
    </div>
  );
}

export function SkeletonChartArea() {
  return (
    <div style={{ width: '100%', height: 220, display: 'flex', alignItems: 'flex-end', gap: 6, padding: '0 4px' }}>
      {[60, 85, 45, 90, 70, 100, 55].map((h, i) => (
        <div key={i} className="skeleton" style={{ flex: 1, height: `${h}%`, borderRadius: 6 }} />
      ))}
    </div>
  );
}
