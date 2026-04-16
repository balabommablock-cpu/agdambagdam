interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md';
}

const statusConfig: Record<string, { label: string; classes: string; dot?: string }> = {
  draft: {
    label: 'Draft',
    classes: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400',
    dot: 'bg-slate-400',
  },
  running: {
    label: 'Running',
    classes: 'bg-success-50 dark:bg-success-950 text-success-700 dark:text-success-400',
    dot: 'bg-success-500 animate-pulse',
  },
  paused: {
    label: 'Paused',
    classes: 'bg-warning-50 dark:bg-warning-950 text-warning-700 dark:text-warning-400',
    dot: 'bg-warning-500',
  },
  completed: {
    label: 'Completed',
    classes: 'bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-400',
    dot: 'bg-blue-500',
  },
  archived: {
    label: 'Archived',
    classes: 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-500',
    dot: 'bg-slate-400',
  },
};

export default function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const config = statusConfig[status] || statusConfig.draft;
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs';

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full font-medium ${sizeClasses} ${config.classes}`}>
      {config.dot && <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />}
      {config.label}
    </span>
  );
}
