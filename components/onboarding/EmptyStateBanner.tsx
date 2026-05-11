'use client';

import Link from 'next/link';

interface EmptyStateBannerProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  cta: { label: string; href?: string; onClick?: () => void };
}

export default function EmptyStateBanner({ icon, title, description, cta }: EmptyStateBannerProps) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '48px 24px',
      textAlign: 'center',
    }}>
      <div style={{ color: 'var(--ink-5)', marginBottom: 16, opacity: 0.5 }}>
        {icon}
      </div>
      <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--ink)', margin: '0 0 6px' }}>
        {title}
      </h3>
      <p style={{ fontSize: 13, color: 'var(--ink-4)', margin: '0 0 20px', maxWidth: 280 }}>
        {description}
      </p>
      {cta.href ? (
        <Link href={cta.href} className="btn-primary" style={{ fontSize: 13, padding: '8px 20px' }}>
          {cta.label}
        </Link>
      ) : (
        <button
          type="button"
          onClick={cta.onClick}
          className="btn-primary"
          style={{ fontSize: 13, padding: '8px 20px' }}
        >
          {cta.label}
        </button>
      )}
    </div>
  );
}
