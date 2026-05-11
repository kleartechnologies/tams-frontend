import { SkeletonKpiRow, SkeletonChartArea, SkeletonCard } from '@/components/Skeleton';

export default function ReportsLoading() {
  return (
    <div style={{ maxWidth: 1400 }}>
      <SkeletonCard height={56} />
      <div style={{ marginTop: 20 }}>
        <SkeletonKpiRow />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
        <div style={{ padding: '20px 24px', background: 'var(--surface)', borderRadius: 16 }}>
          <div className="skeleton" style={{ width: 160, height: 16, borderRadius: 4, marginBottom: 16 }} />
          <SkeletonChartArea />
        </div>
        <div style={{ padding: '20px 24px', background: 'var(--surface)', borderRadius: 16 }}>
          <div className="skeleton" style={{ width: 160, height: 16, borderRadius: 4, marginBottom: 16 }} />
          <SkeletonChartArea />
        </div>
      </div>
    </div>
  );
}
