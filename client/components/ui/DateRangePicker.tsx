import React from 'react';
import DatePicker from './DatePicker';

interface DateRangePickerProps {
  startDate: string;
  endDate: string;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
  startLabel?: string;
  endLabel?: string;
  className?: string;
}

const DateRangePicker: React.FC<DateRangePickerProps> = ({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  startLabel = 'From',
  endLabel = 'To',
  className = '',
}) => {
  return (
    <div className={`flex items-end gap-2 ${className}`}>
      <div className="flex-grow">
        <DatePicker
          label={startLabel}
          value={startDate}
          onChange={onStartDateChange}
        />
      </div>
      <div className="flex-grow">
        <DatePicker
          label={endLabel}
          value={endDate}
          onChange={onEndDateChange}
        />
      </div>
    </div>
  );
};

export default DateRangePicker;
