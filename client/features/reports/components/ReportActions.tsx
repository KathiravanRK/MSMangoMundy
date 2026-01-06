import React from 'react';
import Button from '../../../components/ui/Button';
import { ICONS } from '../../../constants';

interface ReportActionsProps {
  onPrintPreview: () => void;
  onPrintSelected?: () => void;
  selectedCount?: number;
}

const ReportActions: React.FC<ReportActionsProps> = ({ onPrintPreview, onPrintSelected, selectedCount = 0 }) => {
  return (
    <div className="flex items-center gap-2">
      {onPrintSelected && (
        <Button
          variant="secondary"
          size="md"
          onClick={onPrintSelected}
          disabled={selectedCount === 0}
          icon={ICONS.print}
        >
          Print Selected ({selectedCount})
        </Button>
      )}
      <Button variant="secondary" size="md" onClick={onPrintPreview} icon={ICONS.print}>
        Print All
      </Button>
    </div>
  );
};

export default ReportActions;
