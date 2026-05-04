'use client';

import React from 'react';

interface CardData {
  icon: React.ReactNode;
  label: string;
  value: string;
  iconBg?: string;
}

export interface LeftPanelProps {
  badge: string;
  headline: React.ReactNode;
  subtext: string;
  features: string[];
  card1: CardData;
  card2: CardData;
  bottomStat: string;
  bottomRight: string;
}

function CheckIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function StarIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="#FBBF24" stroke="none">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  );
}

export function LeftPanel({ badge, headline, subtext, features, card1, card2, bottomStat, bottomRight }: LeftPanelProps) {
  return (
    <div
      className="hidden lg:flex w-1/2 flex-shrink-0 flex-col relative overflow-hidden"
      style={{ background: 'linear-gradient(160deg, #0B2C33 0%, #0F3F47 100%)' }}
    >
      {/* Dot grid overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.1) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      />

      {/* Curved dotted paths */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        viewBox="0 0 600 900"
        preserveAspectRatio="xMidYMid slice"
      >
        {/* First arc */}
        <path
          d="M -80 820 Q 150 380 580 510"
          fill="none"
          stroke="rgba(255,255,255,0.14)"
          strokeWidth="1.5"
          strokeDasharray="4 12"
          strokeLinecap="round"
        />
        <circle cx="576" cy="510" r="6" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" />
        <circle cx="576" cy="510" r="2.5" fill="rgba(255,255,255,0.35)" />

        {/* Second arc */}
        <path
          d="M 40 900 Q 220 640 600 680"
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth="1.5"
          strokeDasharray="4 12"
          strokeLinecap="round"
        />
        <circle cx="596" cy="680" r="6" fill="none" stroke="rgba(255,255,255,0.14)" strokeWidth="1.5" />
        <circle cx="596" cy="680" r="2.5" fill="rgba(255,255,255,0.22)" />
      </svg>

      {/* Content */}
      <div className="relative z-10 flex flex-col h-full px-10 py-10 xl:px-14 xl:py-12">

        {/* Logo */}
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl text-white font-extrabold text-lg shadow-lg"
            style={{ background: 'linear-gradient(135deg, #1e8a9a 0%, #0e6070 100%)' }}
          >
            T
          </div>
          <div>
            <div className="text-white font-bold text-[15px] leading-tight">TAMS</div>
            <div style={{ color: 'rgba(255,255,255,0.45)' }} className="text-[11px] font-medium">
              Travel Agency Management System
            </div>
          </div>
        </div>

        {/* Badge */}
        <div className="mt-10">
          <span
            className="inline-flex items-center gap-2 rounded-full px-4 py-1.5"
            style={{
              background: 'rgba(34,197,94,0.12)',
              border: '1px solid rgba(34,197,94,0.25)',
            }}
          >
            <span className="h-2 w-2 rounded-full bg-green-400" />
            <span className="text-green-300 text-[13px] font-medium">{badge}</span>
          </span>
        </div>

        {/* Headline */}
        <h1 className="mt-6 text-[32px] xl:text-[36px] font-extrabold text-white leading-[1.15] tracking-tight">
          {headline}
        </h1>

        {/* Subtext */}
        <p style={{ color: 'rgba(255,255,255,0.55)' }} className="mt-4 text-[14px] leading-relaxed">
          {subtext}
        </p>

        {/* Features */}
        <div className="mt-8 flex flex-col gap-4">
          {features.map((f) => (
            <div key={f} className="flex items-start gap-3">
              <div
                className="flex h-[22px] w-[22px] flex-shrink-0 items-center justify-center rounded-md text-green-400 mt-0.5"
                style={{ background: 'rgba(34,197,94,0.2)' }}
              >
                <CheckIcon />
              </div>
              <span style={{ color: 'rgba(255,255,255,0.8)' }} className="text-[13.5px] leading-relaxed">
                {f}
              </span>
            </div>
          ))}
        </div>

        {/* Floating cards */}
        <div className="mt-10 flex gap-3">
          <div
            className="flex items-center gap-3 rounded-2xl px-4 py-3 shadow-xl"
            style={{
              background: 'rgba(0,0,0,0.32)',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(255,255,255,0.1)',
            }}
          >
            <div
              className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl ${card1.iconBg ?? 'bg-green-500/20'}`}
            >
              {card1.icon}
            </div>
            <div>
              <div style={{ color: 'rgba(255,255,255,0.48)' }} className="text-[11px] leading-tight">
                {card1.label}
              </div>
              <div className="text-white font-semibold text-[14px] leading-tight mt-0.5">{card1.value}</div>
            </div>
          </div>

          <div
            className="flex items-center gap-3 rounded-2xl px-4 py-3 shadow-xl"
            style={{
              background: 'rgba(0,0,0,0.32)',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(255,255,255,0.1)',
            }}
          >
            <div
              className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl ${card2.iconBg ?? 'bg-blue-500/20'}`}
            >
              {card2.icon}
            </div>
            <div>
              <div style={{ color: 'rgba(255,255,255,0.48)' }} className="text-[11px] leading-tight">
                {card2.label}
              </div>
              <div className="text-white font-semibold text-[14px] leading-tight mt-0.5">{card2.value}</div>
            </div>
          </div>
        </div>

        {/* Bottom stats */}
        <div className="mt-auto pt-8 flex items-center justify-between">
          <div className="flex items-center gap-1">
            {[...Array(5)].map((_, i) => <StarIcon key={i} />)}
            <span style={{ color: 'rgba(255,255,255,0.55)' }} className="text-[12px] ml-1.5">
              {bottomStat}
            </span>
          </div>
          <span style={{ color: 'rgba(255,255,255,0.35)' }} className="text-[12px]">
            {bottomRight}
          </span>
        </div>
      </div>
    </div>
  );
}
