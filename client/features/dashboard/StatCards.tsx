import React from 'react';
import { useNavigate } from 'react-router-dom';
import StatCard from '../../components/ui/StatCard';
import { DashboardData } from '../../types';
import { formatCurrency } from '../../utils/formatters';

interface StatCardsProps {
  kpis: DashboardData['kpis'];
}

const StatCards: React.FC<StatCardsProps> = ({ kpis }) => {
    const navigate = useNavigate();
    const todayStr = new Date().toISOString().split('T')[0];

    const cardData = [
        { title: "Total Receivables", value: formatCurrency(kpis.totalReceivables), subtext: "From all buyers", className: "bg-blue-50 border-blue-200 text-blue-800", onClick: () => navigate("/reports", { state: { reportType: 'sales' }}) },
        { title: "Total Payables", value: formatCurrency(kpis.totalPayables), subtext: "To all suppliers", className: "bg-purple-50 border-purple-200 text-purple-800", onClick: () => navigate("/reports", { state: { reportType: 'purchases' }}) },
        { title: "Today's Auction Value", value: formatCurrency(kpis.todayAuctionValue), subtext: "Value of items auctioned today", className: "bg-green-50 border-green-200 text-green-800", onClick: () => navigate("/auction") },
        { title: "Uninvoiced Sales", value: formatCurrency(kpis.uninvoicedAuctionValue), subtext: "Ready for invoicing", className: "bg-orange-50 border-orange-200 text-orange-800", onClick: () => navigate("/invoices") },
        { title: "Today's Commission", value: formatCurrency(kpis.todayCommission), subtext: "Your revenue today", className: "bg-yellow-50 border-yellow-200 text-yellow-800", onClick: () => navigate("/reports", { state: { reportType: 'pnl', startDate: todayStr, endDate: todayStr }}) },
        { title: "Today's New Entries", value: kpis.todayEntriesCount.toString(), subtext: "New arrivals from suppliers", className: "bg-teal-50 border-teal-200 text-teal-800", onClick: () => navigate("/entries") },
    ];

    return (
        <div className="grid gap-6" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
            {cardData.map((card, index) => (
                 <StatCard 
                    key={card.title}
                    {...card}
                    className={`animate-fadeInUp ${card.className}`}
                    style={{ animationDelay: `${index * 75}ms`}}
                 />
            ))}
        </div>
    );
};

export default StatCards;
