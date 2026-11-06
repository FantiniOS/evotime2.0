"use client";

import React from "react";
import { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionButton?: React.ReactNode;
  className?: string;
}

export default function EmptyState({
  icon: Icon,
  title,
  description,
  actionButton,
  className = "",
}: EmptyStateProps) {
  return (
    <div
      className={`w-full py-12 px-6 flex flex-col items-center justify-center text-center bg-white/70 rounded-2xl border border-dashed border-slate-200/90 shadow-2xs ${className}`}
    >
      <div className="w-16 h-16 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-300 mb-3 shadow-2xs">
        <Icon className="w-8 h-8 stroke-[1.5]" />
      </div>
      <h3 className="text-sm font-bold text-slate-800 mb-1">{title}</h3>
      <p className="text-xs text-slate-500 max-w-sm leading-relaxed">
        {description}
      </p>
      {actionButton && <div className="mt-4">{actionButton}</div>}
    </div>
  );
}
