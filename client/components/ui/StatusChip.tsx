import React from 'react';
import { EntryStatus, SupplierInvoiceStatus } from '../../types';

type Status = EntryStatus | SupplierInvoiceStatus;

interface StatusChipProps {
  status: Status;
}

const statusConfig: Record<Status, { label: string; className: string }> = {
  // EntryStatus
  [EntryStatus.Pending]: { label: "Pending", className: "bg-blue-100 text-blue-700" },
  [EntryStatus.Draft]: { label: "Draft", className: "bg-yellow-100 text-yellow-700" },
  [EntryStatus.Auctioned]: { label: "Auctioned", className: "bg-green-100 text-green-700" },
  [EntryStatus.Invoiced]: { label: "Invoiced", className: "bg-purple-100 text-purple-700" },
  [EntryStatus.Cancelled]: { label: "Cancelled", className: "bg-danger-light text-danger-dark" },
  // SupplierInvoiceStatus
  [SupplierInvoiceStatus.Paid]: { label: "Paid", className: "bg-success-light text-success-dark" },
  [SupplierInvoiceStatus.Unpaid]: { label: "Unpaid", className: "bg-danger-light text-danger-dark" },
  [SupplierInvoiceStatus.PartiallyPaid]: { label: "Partially Paid", className: "bg-warning-light text-warning-dark" },
};

const StatusChip: React.FC<StatusChipProps> = ({ status }) => {
  const config = statusConfig[status] || { label: status, className: "bg-gray-100 text-gray-700" };

  return (
    <span className={`px-2.5 py-0.5 text-xs font-medium rounded-full inline-block ${config.className}`}>
      {config.label}
    </span>
  );
};

export default StatusChip;
