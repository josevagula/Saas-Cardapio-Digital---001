import React from 'react';

interface IconProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string;
  className?: string;
  color?: string;
}

// 1. HashiIcon (Pauzinhos de sushi cruzados)
export function HashiIcon({ size = 20, className = '', color = 'currentColor', ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      {/* Chopstick 1 */}
      <path d="M4 20L19 4" />
      {/* Chopstick 2 */}
      <path d="M7 21L21 6" />
      {/* Chopstick tip details */}
      <path d="M4 20L3 21" strokeWidth="1.5" />
      <path d="M7 21L6 22" strokeWidth="1.5" />
    </svg>
  );
}

// 2. SushiRollIcon (Rolo de Maki visto de cima - círculo de nori + arroz + recheio)
export function SushiRollIcon({ size = 20, className = '', color = 'currentColor', ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      {/* Outer Nori Ring */}
      <circle cx="12" cy="12" r="9" strokeWidth="2.2" />
      {/* Inner Rice Ring */}
      <circle cx="12" cy="12" r="5.5" strokeDasharray="2 1.5" strokeWidth="1.5" />
      {/* Salmon Filling Core */}
      <circle cx="10.5" cy="11.5" r="2" fill={color} stroke="none" />
      {/* Accent Dot */}
      <circle cx="13.5" cy="13" r="1" fill="#F97316" stroke="none" />
    </svg>
  );
}

// 3. NoriLeafIcon (Folha de nori / alga estilizada com rolo)
export function NoriLeafIcon({ size = 20, className = '', color = 'currentColor', ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2z" />
      <path d="M12 6v12" />
      <path d="M12 6c3 2.5 5 2.5 8 0" />
      <path d="M12 12c-3 2.5-5 2.5-8 0" />
      <path d="M12 15c3 2.5 5 2.5 8 0" />
    </svg>
  );
}

// Official Zushy logo image, used for every logo/emblem in the app. Built
// from import.meta.env.BASE_URL (not a hardcoded "/") so it still resolves
// correctly if the app is ever deployed under a sub-path, matching how Vite
// itself rewrites public/ asset references in index.html.
export const SUSHIOS_LOGO_DATA_URL = `${import.meta.env.BASE_URL}logo-zushy.png`;

// 5. Logo Emblem Container with the official Zushy logo image
export function SushiLogoEmblem({ size = 32, className = '' }: { size?: number; className?: string }) {
  return (
    <div
      className={`relative rounded-xl bg-[#FF4D00] shadow-md shadow-orange-600/30 overflow-hidden shrink-0 ${className}`}
      style={{ width: size, height: size }}
    >
      <img src={SUSHIOS_LOGO_DATA_URL} alt="Zushy" className="w-full h-full object-cover" />
    </div>
  );
}

// 5. Wasabi Tag Badge (Orange Accent Tag)
export function WasabiTag({ text = "Fresh Sushi", className = "" }: { text?: string; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 bg-[#F97316]/15 text-[#FB923C] border border-[#F97316]/30 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${className}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-[#F97316] animate-pulse"></span>
      <span>{text}</span>
    </span>
  );
}

// 6. Subtle Rice Grain Divider
export function SubtleSushiDivider({ className = '' }: { className?: string }) {
  return (
    <div className={`relative w-full flex items-center justify-center py-4 my-2 ${className}`}>
      <div className="absolute inset-0 flex items-center">
        <div className="w-full border-t border-[#2A211A]"></div>
      </div>
      <div className="relative bg-[#0C0A08] px-3 flex items-center gap-2 opacity-40 hover:opacity-75 transition-opacity">
        <span className="w-1.5 h-1 rounded-full bg-[#F97316]/60 transform -rotate-45"></span>
        <span className="w-2 h-1 rounded-full bg-[#F5F0EA]/60 transform rotate-12"></span>
        <span className="w-1.5 h-1 rounded-full bg-[#FB923C]/80 transform -rotate-12"></span>
      </div>
    </div>
  );
}
