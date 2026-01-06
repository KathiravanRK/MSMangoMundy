import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChartDataItem } from '../../types';
import Card from '../../components/ui/Card';
import { formatCurrency } from '../../utils/formatters';

const AnalyticsCard: React.FC<{ title: string; data: (ChartDataItem & { id?: string })[]; linkPrefix: string; }> = ({ title, data, linkPrefix }) => {
    const navigate = useNavigate();
    const maxValue = React.useMemo(() => Math.max(...data.map(d => d.value), 0), [data]);

    return (
        <Card className="h-full flex flex-col">
            <h3 className="font-bold text-lg mb-4 flex-shrink-0">{title}</h3>
            {data.length > 0 ? (
                <ul className="space-y-4 flex-grow">
                    {data.map((item, index) => (
                        <li key={item.id || `${item.name}-${index}`} onClick={() => item.id && navigate(`${linkPrefix}${item.id}`)} className="cursor-pointer group">
                            <div className="flex justify-between items-center text-sm mb-1 gap-2">
                                <span className="flex-1 min-w-0 font-medium text-on-surface truncate group-hover:text-primary" title={item.name}>{item.name}</span>
                                <span className="font-semibold text-on-surface flex-shrink-0">{formatCurrency(item.value)}</span>
                            </div>
                            <div className="bg-secondary-light rounded-full h-2 w-full">
                                <div
                                    className="bg-primary h-2 rounded-full transition-all duration-500 ease-out group-hover:bg-primary-hover"
                                    style={{ width: maxValue > 0 ? `${(item.value / maxValue) * 100}%` : '0%' }}
                                ></div>
                            </div>
                        </li>
                    ))}
                </ul>
            ) : (
                <div className="flex items-center justify-center h-full text-muted">
                    No data available.
                </div>
            )}
        </Card>
    );
};

export default AnalyticsCard;
