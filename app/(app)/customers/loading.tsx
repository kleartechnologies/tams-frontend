import { SkeletonTable } from '@/components/Skeleton';

export default function CustomersLoading() {
  return (
    <div style={{ maxWidth: 1200 }}>
      <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
        <div className="skeleton" style={{ flex: 1, height: 36, borderRadius: 10 }} />
        <div className="skeleton" style={{ width: 130, height: 36, borderRadius: 10 }} />
      </div>
      <div className="skeleton" style={{ height: 40, borderRadius: 12, marginBottom: 2 }} />
      <SkeletonTable rows={8} cols={7} />
    </div>
  );
}
