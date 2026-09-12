import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
  totalItems: number;
  pageSize: number;
}

// Shared row-pagination footer for the Ativos/Inativos/Ranking VIP tables —
// no table in the app paginated before this module, so this is new but
// styled to match the existing border/text conventions exactly.
export default function Pagination({ page, totalPages, onChange, totalItems, pageSize }: PaginationProps) {
  if (totalItems === 0) return null;
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalItems);

  return (
    <div className="flex items-center justify-between px-6 py-3 border-t border-[#2A211A] text-[11px] text-[#A8A29A]">
      <span>
        {start}–{end} de {totalItems}
      </span>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onChange(Math.max(1, page - 1))}
          disabled={page <= 1}
          className="p-1.5 rounded-lg border border-[#2A211A] bg-[#181512] text-[#A8A29A] hover:text-[#F5F0EA] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>
        <span className="font-mono font-semibold text-[#F5F0EA]">{page} / {totalPages}</span>
        <button
          onClick={() => onChange(Math.min(totalPages, page + 1))}
          disabled={page >= totalPages}
          className="p-1.5 rounded-lg border border-[#2A211A] bg-[#181512] text-[#A8A29A] hover:text-[#F5F0EA] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
