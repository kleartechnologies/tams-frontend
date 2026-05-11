import { SkeletonTable, SkeletonCard } from '@/components/Skeleton';

export default function BookingsLoading() {
  return (
    <div style={{ maxWidth: 1400 }}>
      <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
        <div className="skeleton" style={{ flex: 1, height: 36, borderRadius: 10 }} />
        <div className="skeleton" style={{ width: 120, height: 36, borderRadius: 10 }} />
      </div>
      <SkeletonCard height={48} />
      <div style={{ marginTop: 8 }}>
        <SkeletonTable rows={8} cols={6} />
      </div>
    </div>
  );
}
