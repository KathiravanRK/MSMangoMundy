import React from 'react';
import { EntryPriority } from '../../types';

interface PriorityChipProps {
  priority: EntryPriority;
}

const priorityConfig: Record<EntryPriority, { label: string; className: string }> = {
  [EntryPriority.High]: { label: "High", className: "bg-danger-light text-danger-dark" },
  [EntryPriority.Medium]: { label: "Medium", className: "bg-warning-light text-warning-dark" },
  [EntryPriority.Low]: { label: "Low", className: "bg-info-light text-info-dark" },
};

const PriorityChip: React.FC<PriorityChipProps> = ({ priority }) => {
  const config = priorityConfig[priority] || { label: priority, className: "bg-gray-100 text-gray-700" };

  return (
    <span className={`px-2.5 py-0.5 text-xs font-medium rounded-full inline-block ${config.className}`}>
      {config.label}
    </span>
  );
};

export default PriorityChip;
