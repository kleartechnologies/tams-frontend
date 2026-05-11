import { SkeletonKpiRow, SkeletonChartArea, SkeletonCard } from '@/components/Skeleton';

export default function DashboardLoading() {
  return (
    <div style={{ maxWidth: 1200 }}>
      <div className="skeleton" style={{ width: 220, height: 28, borderRadius: 6, marginBottom: 8 }} />
      <div className="skeleton" style={{ width: 300, height: 14, borderRadius: 4, marginBottom: 28 }} />
      <SkeletonKpiRow />
      <SkeletonCard height={120} />
      <div style={{ marginTop: 24, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <SkeletonCard height={260} />
        <SkeletonCard height={260} />
      </div>
    </div>
  );
}
