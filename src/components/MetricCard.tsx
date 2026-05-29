/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import * as Icons from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  description: string;
  iconName: keyof typeof Icons;
  colorScheme: 'emerald' | 'amber' | 'rose' | 'indigo' | 'cyan' | 'slate';
}

export default function MetricCard({ title, value, description, iconName, colorScheme }: MetricCardProps) {
  // Dynamic color mappings based on theme setup
  const schemes = {
    emerald: {
      bg: 'bg-white border-gray-200',
      text: 'text-emerald-600',
      iconBg: 'bg-emerald-50 text-emerald-500',
    },
    amber: {
      bg: 'bg-white border-gray-200',
      text: 'text-amber-600',
      iconBg: 'bg-amber-50 text-amber-500',
    },
    rose: {
      bg: 'bg-white border-red-200',
      text: 'text-red-600',
      iconBg: 'bg-red-50 text-red-500',
      animate: 'animate-pulse',
    },
    indigo: {
      bg: 'bg-white border-gray-200',
      text: 'text-blue-600',
      iconBg: 'bg-blue-50 text-blue-500',
    },
    cyan: {
      bg: 'bg-white border-gray-200',
      text: 'text-cyan-600',
      iconBg: 'bg-cyan-50 text-cyan-500',
    },
    slate: {
      bg: 'bg-white border-gray-200',
      text: 'text-slate-800',
      iconBg: 'bg-gray-100 text-slate-500',
    },
  };

  const scheme = schemes[colorScheme] || schemes.slate;
  const IconComponent = Icons[iconName] as React.ComponentType<{ className?: string }>;

  return (
    <div className={`p-3.5 bg-white rounded-lg border ${scheme.bg} shadow-xs flex items-center justify-between transition-all duration-200 hover:border-gray-300 id-metric-card`} id={`metric-${title.replace(/\s+/g, '-').toLowerCase()}`}>
      <div className="space-y-0.5">
        <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block">{title}</span>
        <div className="flex items-baseline gap-1.5">
          <span className={`text-xl font-mono font-bold ${scheme.text}`}>{value}</span>
        </div>
        <p className="text-[11px] text-gray-400 truncate max-w-[180px]" title={description}>{description}</p>
      </div>
      <div className={`p-1.5 rounded ${scheme.iconBg} ${'animate' in scheme ? scheme.animate : ''}`}>
        {IconComponent && <IconComponent className="h-4 w-4" />}
      </div>
    </div>
  );
}
