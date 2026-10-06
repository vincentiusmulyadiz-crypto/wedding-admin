import React from 'react';

export const Skeleton: React.FC<{ className?: string }> = ({ className = 'h-4 w-full' }) => {
  return (
    <div
      className={`animate-pulse bg-[#eee5d3] rounded ${className}`}
      aria-hidden="true"
    />
  );
};

export const StatCardsSkeleton: React.FC = () => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="bg-[#fffdf9] border border-[#e3dac8] rounded-2xl p-4 space-y-2">
          <Skeleton className="h-4 w-24 bg-[#ebdfcb]" />
          <Skeleton className="h-8 w-16 bg-[#e1d3b9]" />
        </div>
      ))}
    </div>
  );
};

export const TableSkeleton: React.FC<{ rows?: number }> = ({ rows = 5 }) => {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="bg-[#fffdf9] border border-[#e3dac8] rounded-xl p-4 flex items-center justify-between gap-4">
          <div className="space-y-2 flex-1">
            <Skeleton className="h-5 w-40 bg-[#e1d3b9]" />
            <Skeleton className="h-4 w-60 bg-[#ebdfcb]" />
          </div>
          <Skeleton className="h-7 w-20 rounded-full bg-[#ebdfcb]" />
          <Skeleton className="h-8 w-16 bg-[#ebdfcb]" />
        </div>
      ))}
    </div>
  );
};
