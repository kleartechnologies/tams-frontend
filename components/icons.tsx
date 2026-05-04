import React from 'react';

interface IcoProps {
  d: React.ReactNode;
  size?: number;
  stroke?: number;
}

const Ico = ({ d, size = 18, stroke = 1.6, ...rest }: IcoProps & Omit<React.SVGProps<SVGSVGElement>, 'd'|'size'|'stroke'>) => (
  <svg
    width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth={stroke}
    strokeLinecap="round" strokeLinejoin="round"
    {...rest}
  >
    {typeof d === 'string' ? <path d={d} /> : d}
  </svg>
);

interface IconProps { size?: number; stroke?: number; style?: React.CSSProperties; className?: string; }

export const IconDashboard = (p: IconProps) => <Ico {...p} d={<><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></>} />;
export const IconCustomers = (p: IconProps) => <Ico {...p} d={<><circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><circle cx="17" cy="9" r="2.4"/><path d="M15.5 14.2c3.2.3 5.5 2.7 5.5 5.8"/></>} />;
export const IconPackages = (p: IconProps) => <Ico {...p} d={<><path d="M3 7.5 12 3l9 4.5v9L12 21 3 16.5v-9Z"/><path d="M3 7.5 12 12l9-4.5"/><path d="M12 12v9"/></>} />;
export const IconBookings = (p: IconProps) => <Ico {...p} d={<><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18"/><path d="M8 3v4M16 3v4"/></>} />;
export const IconPayments = (p: IconProps) => <Ico {...p} d={<><rect x="2.5" y="6" width="19" height="13" rx="2"/><path d="M2.5 10h19"/><path d="M6 15h4"/></>} />;
export const IconReports = (p: IconProps) => <Ico {...p} d={<><path d="M4 20V10"/><path d="M10 20V4"/><path d="M16 20v-7"/><path d="M22 20H2"/></>} />;
export const IconSearch = (p: IconProps) => <Ico {...p} d={<><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></>} />;
export const IconBell = (p: IconProps) => <Ico {...p} d={<><path d="M6 9a6 6 0 1 1 12 0c0 5 2 6 2 6H4s2-1 2-6Z"/><path d="M10 19a2 2 0 0 0 4 0"/></>} />;
export const IconCollapse = (p: IconProps) => <Ico {...p} d={<><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16"/><path d="m14 10-2 2 2 2"/></>} />;
export const IconChevron = (p: IconProps) => <Ico {...p} d="m6 9 6 6 6-6" />;
export const IconArrowUp = (p: IconProps) => <Ico {...p} d="M12 19V5M6 11l6-6 6 6" />;
export const IconArrowDown = (p: IconProps) => <Ico {...p} d="M12 5v14M6 13l6 6 6-6" />;
export const IconPlus = (p: IconProps) => <Ico {...p} d="M12 5v14M5 12h14" />;
export const IconFilter = (p: IconProps) => <Ico {...p} d="M3 5h18l-7 9v6l-4-2v-4L3 5Z" />;
export const IconExport = (p: IconProps) => <Ico {...p} d={<><path d="M12 3v12"/><path d="m7 8 5-5 5 5"/><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/></>} />;
export const IconSettings = (p: IconProps) => <Ico {...p} d={<><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 0 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z"/></>} />;
export const IconLogout = (p: IconProps) => <Ico {...p} d={<><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/></>} />;
export const IconUser = (p: IconProps) => <Ico {...p} d={<><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8"/></>} />;
export const IconCheck = (p: IconProps) => <Ico {...p} d="m5 12 5 5L20 7" />;
export const IconGlobe = (p: IconProps) => <Ico {...p} d={<><circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3a14 14 0 0 1 0 18"/><path d="M12 3a14 14 0 0 0 0 18"/></>} />;
export const IconMoreH = (p: IconProps) => <Ico {...p} d={<><circle cx="5" cy="12" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="19" cy="12" r="1.2"/></>} />;
