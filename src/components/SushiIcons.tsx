import React, { useId } from 'react';

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

// 4. SushiOS Logo SVG Icon (Location Map Pin + Chopsticks & Sushi - Exact Vector)
export function SushiOSLogoIcon({ size = 24, className = '', color = 'currentColor', ...props }: IconProps) {
  const clipId = useId();

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <defs>
        {/* Clip path for the 3 interior sushi roll diagonal stripes */}
        <clipPath id={clipId}>
          <circle cx="48.5" cy="45.5" r="9.2" />
        </clipPath>
      </defs>

      {/* Ground oval line under pin */}
      <path 
        d="M 36 78 C 36 84, 64 84, 64 78" 
        stroke={color} 
        strokeWidth="5" 
        strokeLinecap="round" 
      />
      
      {/* Outer Teardrop Location Map Pin */}
      <path 
        d="M 50 75 C 31 55 25 45 25 35 C 25 21 36 15 50 15 C 64 15 75 21 75 35 C 75 45 69 55 50 75 Z" 
        stroke={color} 
        strokeWidth="5.5" 
        strokeLinejoin="round" 
        strokeLinecap="round" 
      />
      
      {/* Chopsticks extending to upper right */}
      <line x1="56" y1="38" x2="76" y2="18" stroke={color} strokeWidth="5.5" strokeLinecap="round" />
      <line x1="62" y1="44" x2="82" y2="24" stroke={color} strokeWidth="5.5" strokeLinecap="round" />
      
      {/* Central Sushi Roll Outer Ring */}
      <circle cx="48.5" cy="45.5" r="12" stroke={color} strokeWidth="5.5" />
      
      {/* 3 Parallel Diagonal Stripes inside sushi roll (top-left to bottom-right) */}
      <g clipPath={`url(#${clipId})`}>
        <line x1="13" y1="18" x2="70" y2="75" stroke={color} strokeWidth="4" />
        <line x1="20" y1="18" x2="77" y2="75" stroke={color} strokeWidth="4" />
        <line x1="27" y1="18" x2="84" y2="75" stroke={color} strokeWidth="4" />
      </g>
    </svg>
  );
}

// Data URI of the official SushiOS Logo for img src usage
export const SUSHIOS_LOGO_DATA_URL = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="%23FF4D00" rx="18"/><path d="M 36 78 C 36 84 64 84 64 78" stroke="white" stroke-width="5" stroke-linecap="round" fill="none"/><path d="M 50 75 C 31 55 25 45 25 35 C 25 21 36 15 50 15 C 64 15 75 21 75 35 C 75 45 69 55 50 75 Z" stroke="white" stroke-width="5.5" stroke-linejoin="round" stroke-linecap="round" fill="none"/><line x1="56" y1="38" x2="76" y2="18" stroke="white" stroke-width="5.5" stroke-linecap="round"/><line x1="62" y1="44" x2="82" y2="24" stroke="white" stroke-width="5.5" stroke-linecap="round"/><circle cx="48.5" cy="45.5" r="12" stroke="white" stroke-width="5.5" fill="none"/><clipPath id="c"><circle cx="48.5" cy="45.5" r="9.2"/></clipPath><g clip-path="url(%23c)"><line x1="13" y1="18" x2="70" y2="75" stroke="white" stroke-width="4"/><line x1="20" y1="18" x2="77" y2="75" stroke="white" stroke-width="4"/><line x1="27" y1="18" x2="84" y2="75" stroke="white" stroke-width="4"/></g></svg>`;

// 5. Logo Emblem Container with Exact SushiOS Icon
export function SushiLogoEmblem({ size = 32, className = '' }: { size?: number; className?: string }) {
  return (
    <div
      className={`relative rounded-xl bg-[#FF4D00] flex items-center justify-center text-white shadow-md shadow-orange-600/30 overflow-hidden shrink-0 ${className}`}
      style={{ width: size, height: size }}
    >
      <SushiOSLogoIcon size={size * 0.78} color="#FFFFFF" />
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
