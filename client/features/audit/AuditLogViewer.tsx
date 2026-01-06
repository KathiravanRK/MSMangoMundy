import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { AuditLog, User, Feature, AuditAction } from '../../types';
import * as api from '../../services/api';
import Card from '../../components/ui/Card';
import SearchableSelect from '../../components/ui/SearchableSelect';
import { ICONS } from '../../constants';
import PageHeader from '../../components/ui/PageHeader';
import { SortableTable, Column } from '../../components/ui/SortableTable';
import Button from '../../components/ui/Button';
import { formatDate } from '../../utils/formatters';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { usePermissions } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import DateRangePicker from '../../components/ui/DateRangePicker';
import StatCard from '../../components/ui/StatCard';

const featureLabels: Record<string, string> = {
    [Feature.Dashboard]: 'Dashboard',
    [Feature.Entries]: 'Entries',
    [Feature.Auction]: 'Auction',
    [Feature.Buyers]: 'Buyers',
    [Feature.Suppliers]: 'Suppliers',
    [Feature.Products]: 'Products',
    [Feature.BuyerInvoices]: 'Buyer Invoices',
    [Feature.SupplierInvoices]: 'Supplier Invoices',
    [Feature.CashFlow]: 'Cash Flow',
    [Feature.Reports]: 'Reports',
    [Feature.Users]: 'User Management',
    [Feature.Roles]: 'Role Management',
    [Feature.AuditLog]: 'Audit Log',
};

const AuditLogViewer: React.FC = () => {
    const [allLogs, setAllLogs] = useState<AuditLog[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const { canView } = usePermissions();
    const navigate = useNavigate();
    const todayStr = new Date().toISOString().split('T')[0];

    const [filters, setFilters] = useState<{
        startDate: string;
        endDate: string;
        userId: string;
        feature: string;
        action: string;
    }>({
        startDate: todayStr,
        endDate: todayStr,
        userId: '',
        feature: '',
        action: '',
    });

    useEffect(() => {
        if (!canView(Feature.AuditLog, 'view')) {
            navigate('/unauthorized', { replace: true });
        }
    }, [canView, navigate]);

    const loadData = useCallback(() => {
        setLoading(true);
        const apiFilters = {
            startDate: filters.startDate || undefined,
            endDate: filters.endDate || undefined,
            userId: filters.userId || undefined,
            feature: filters.feature as Feature || undefined,
            action: filters.action as AuditAction || undefined,
        };
        Promise.all([
            api.fetchAuditLogs(apiFilters),
            api.fetchUsers()
        ]).then(([logsData, usersData]) => {
            setAllLogs(logsData);
            setUsers(usersData);
        }).finally(() => setLoading(false));
    }, [filters]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleFilterChange = (field: keyof typeof filters, value: string) => {
        setFilters(prev => ({ ...prev, [field]: value }));
    };

    const handleClearFilters = () => {
        setFilters({
            startDate: todayStr,
            endDate: todayStr,
            userId: '',
            feature: '',
            action: '',
        });
    };

    const summaryStats = useMemo(() => {
        const today = new Date().toISOString().split('T')[0];
        const eventsToday = allLogs.filter(log => new Date(log.timestamp).toISOString().split('T')[0] === today).length;
        const uniqueUsers = new Set(allLogs.map(log => log.actorId)).size;

        const actionCounts = allLogs.reduce((acc, log) => {
            acc[log.action] = (acc[log.action] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        const mostFrequentAction = Object.entries(actionCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';

        return {
            totalEvents: allLogs.length,
            eventsToday,
            uniqueUsers,
            mostFrequentAction,
        };
    }, [allLogs]);

    const columns: Column<AuditLog>[] = useMemo(() => [
        { key: 'timestamp', header: 'Timestamp', accessor: (l) => new Date(l.timestamp).toLocaleString(), sortable: true, sortAccessor: 'timestamp', isDefault: true },
        { key: 'actorName', header: 'User', accessor: 'actorName', sortable: true, isDefault: true },
        { key: 'feature', header: 'Feature', accessor: (l) => featureLabels[l.feature] || l.feature, sortable: true, sortAccessor: 'feature', isDefault: true },
        { key: 'action', header: 'Action', accessor: 'action', sortable: true, isDefault: true },
        { key: 'description', header: 'Description', accessor: (l) => <span className="truncate block max-w-lg" title={l.description}>{l.description}</span>, isDefault: true },
    ], []);

    const [visibleColumns, setVisibleColumns] = useLocalStorage<string[]>(
        'table-cols-audit-log',
        columns.filter(c => c.isDefault).map(c => c.key)
    );

    const renderMobileCard = (log: AuditLog) => (
        <div className="p-4 space-y-2">
            <div className="flex justify-between items-start">
                <div>
                    <p className="font-bold text-on-surface">{log.actorName}</p>
                    <p className="text-sm text-muted">{new Date(log.timestamp).toLocaleString()}</p>
                </div>
                <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">{log.action}</span>
            </div>
            <p className="text-sm"><strong className="text-muted">Feature:</strong> {featureLabels[log.feature] || log.feature}</p>
            <p className="text-sm border-t pt-2 mt-2 truncate">{log.description}</p>
        </div>
    );

    return (
        <div className="space-y-6">
            <PageHeader title="Audit Log" subtitle="Track all user actions across the system" />

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard title="Total Events (Filtered)" value={summaryStats.totalEvents} icon={ICONS.audit} className="bg-blue-50 text-blue-800" />
                <StatCard title="Events Today" value={summaryStats.eventsToday} icon={ICONS.entries} className="bg-green-50 text-green-800" />
                <StatCard title="Unique Users" value={summaryStats.uniqueUsers} icon={ICONS.users} className="bg-purple-50 text-purple-800" />
                <StatCard title="Top Action" value={summaryStats.mostFrequentAction} icon={ICONS.auction} className="bg-yellow-50 text-yellow-800" />
            </div>

            <Card className="relative z-10">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 items-end">
                    <div className="flex-grow">
                        <label className="block text-sm font-medium text-muted mb-1">User</label>
                        <SearchableSelect
                            options={users.map(u => ({ value: u.id, label: u.name }))}
                            value={filters.userId || null}
                            onChange={val => handleFilterChange('userId', val || '')}
                            placeholder="All Users"
                        />
                    </div>
                    <div className="flex-grow">
                        <label className="block text-sm font-medium text-muted mb-1">Feature</label>
                        <select value={filters.feature} onChange={e => handleFilterChange('feature', e.target.value)} className="w-full p-2 border border-gray-300 rounded-md bg-white h-[42px]">
                            <option value="">All Features</option>
                            {Object.entries(featureLabels).map(([key, label]) => (<option key={key} value={key}>{label}</option>))}
                        </select>
                    </div>
                    <div className="flex-grow">
                        <label className="block text-sm font-medium text-muted mb-1">Action</label>
                        <select value={filters.action} onChange={e => handleFilterChange('action', e.target.value)} className="w-full p-2 border border-gray-300 rounded-md bg-white h-[42px]">
                            <option value="">All Actions</option>
                            {Object.values(AuditAction).map(action => (<option key={action} value={action}>{action}</option>))}
                        </select>
                    </div>
                    <div className="flex-grow xl:col-span-2">
                        <DateRangePicker
                            startDate={filters.startDate}
                            endDate={filters.endDate}
                            onStartDateChange={date => handleFilterChange('startDate', date)}
                            onEndDateChange={date => handleFilterChange('endDate', date)}
                            startLabel="Start Date"
                            endLabel="End Date"
                        />
                    </div>
                    <div className="flex gap-2">
                        <Button onClick={loadData} icon={ICONS.search} className="h-[42px]">Filter</Button>
                        <Button onClick={handleClearFilters} variant="secondary" className="h-[42px]">Clear</Button>
                    </div>
                </div>
            </Card>

            <SortableTable
                columns={columns}
                data={allLogs}
                tableId="audit-log-table"
                defaultSortField="timestamp"
                loading={loading}
                renderMobileCard={renderMobileCard}
                searchPlaceholder="Search descriptions..."
                visibleColumns={visibleColumns}
                onColumnToggle={(key) => setVisibleColumns(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key])}
            />
        </div>
    );
};

export default AuditLogViewer;
