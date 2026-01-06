import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../../components/ui/Card';
import { ICONS } from '../../constants';
import * as api from '../../services/api';
import { Buyer, Supplier, CashFlowTransaction, TransactionType, PaymentMethod, ExpenseCategory, SupplierInvoice, SupplierInvoiceStatus, Feature } from '../../types';
import { useAuth, usePermissions } from '../../contexts/AuthContext';
import SearchableSelect from '../../components/ui/SearchableSelect';
import { formatDate, formatCurrency } from '../../utils/formatters';
import Spinner from '../../components/ui/Spinner';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import DateRangePicker from '../../components/ui/DateRangePicker';
import { SkeletonRow } from '../../components/ui/SkeletonRow';

const CashFlowManager = () => {
    const [activeTab, setActiveTab] = useState('income');
    const [loading, setLoading] = useState({ global: true, form: false, transactions: false });

    // Data stores
    const [buyers, setBuyers] = useState<Buyer[]>([]);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [transactions, setTransactions] = useState<CashFlowTransaction[]>([]);
    const [unpaidInvoices, setUnpaidInvoices] = useState<SupplierInvoice[]>([]);
    const [openingBalance, setOpeningBalance] = useState({ total: 0, cash: 0, bank: 0 });
    const [dailyTotals, setDailyTotals] = useState({ income: 0, expense: 0 });

    // Filter state
    const todayStr = new Date().toISOString().split('T')[0];
    const [startDate, setStartDate] = useState(todayStr);
    const [endDate, setEndDate] = useState(todayStr);
    const [searchTerm, setSearchTerm] = useState('');
    const [typeFilter, setTypeFilter] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('');

    // Income form state
    const [incomeBuyerId, setIncomeBuyerId] = useState('');
    const [incomeAmount, setIncomeAmount] = useState<number | ''>('');
    const [incomeDiscount, setIncomeDiscount] = useState<number | ''>('');
    const [incomeMethod, setIncomeMethod] = useState<PaymentMethod>(PaymentMethod.Cash);
    const [incomeRef, setIncomeRef] = useState('');
    const [incomeDesc, setIncomeDesc] = useState('');

    // Supplier Payment form state
    const [paymentSupplierId, setPaymentSupplierId] = useState('');
    const [selectedInvoiceIds, setSelectedInvoiceIds] = useState<Set<string>>(new Set());
    const [paymentAmount, setPaymentAmount] = useState<number | ''>('');
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.Cash);
    const [paymentRef, setPaymentRef] = useState('');
    const [paymentDesc, setPaymentDesc] = useState('');

    // Other Expense form state
    const [expenseName, setExpenseName] = useState('');
    const [expenseAmount, setExpenseAmount] = useState<number | ''>('');
    const [expenseMethod, setExpenseMethod] = useState<PaymentMethod>(PaymentMethod.Cash);
    const [expenseRef, setExpenseRef] = useState('');
    const [expenseDesc, setExpenseDesc] = useState('');
    // Transfer form state
    const [transferAmount, setTransferAmount] = useState<number | ''>('');
    const [transferFrom, setTransferFrom] = useState<PaymentMethod>(PaymentMethod.Cash);
    const [transferTo, setTransferTo] = useState<PaymentMethod>(PaymentMethod.Bank);
    const [transferDesc, setTransferDesc] = useState('');

    // Edit Modal State
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingTransaction, setEditingTransaction] = useState<CashFlowTransaction | null>(null);
    const [editFormState, setEditFormState] = useState<Omit<Partial<CashFlowTransaction>, 'date'> & { date: string }>({ date: '' });

    const { user } = useAuth();
    const { canView, canCreate, canDelete, canUpdate } = usePermissions();
    const canManage = useMemo(() =>
        canCreate(Feature.CashFlow, 'add_income') || canCreate(Feature.CashFlow, 'add_expense'),
        [canCreate]
    );
    const navigate = useNavigate();

    useEffect(() => {
        if (!canView(Feature.CashFlow, 'view')) {
            navigate('/unauthorized', { replace: true });
        }
    }, [canView, navigate]);

    const updateDailyTotals = useCallback(async () => {
        const today = new Date().toISOString().split('T')[0];
        try {
            const todaysTransactions = await api.fetchCashFlowTransactions(today, today);
            setDailyTotals({
                income: (todaysTransactions || []).filter(t => t.type === TransactionType.Income).reduce((sum, t) => sum + t.amount, 0),
                expense: (todaysTransactions || []).filter(t => t.type === TransactionType.Expense).reduce((sum, t) => sum + t.amount, 0),
            });
        } catch (error) {
            console.error("Failed to load daily totals", error);
        }
    }, []);

    const loadInitialData = useCallback(async () => {
        setLoading(l => ({ ...l, global: true }));
        try {
            const [buyersData, suppliersData] = await Promise.all([api.fetchBuyers(), api.fetchSuppliers()]);
            setBuyers(buyersData);
            setSuppliers(suppliersData);
            await updateDailyTotals();
        } catch (error) {
            console.error("Failed to load initial data", error);
        } finally {
            setLoading(l => ({ ...l, global: false }));
        }
    }, [updateDailyTotals]);

    const loadTransactions = useCallback(async () => {
        setLoading(l => ({ ...l, transactions: true }));
        try {
            const [transData, openingData] = await Promise.all([
                api.fetchCashFlowTransactions(startDate, endDate),
                api.fetchOpeningBalance(startDate)
            ]);
            setTransactions(transData || []);
            setOpeningBalance(openingData || { total: 0, cash: 0, bank: 0 });
        } catch (error) {
            console.error("Failed to load transactions", error);
        } finally {
            setLoading(l => ({ ...l, transactions: false }));
        }
    }, [startDate, endDate]);

    useEffect(() => {
        loadInitialData();
    }, [loadInitialData]);

    useEffect(() => {
        loadTransactions();
    }, [loadTransactions]);

    const selectedBuyer = useMemo(() => buyers.find(b => b.id === incomeBuyerId), [buyers, incomeBuyerId]);
    const selectedSupplier = useMemo(() => suppliers.find(s => s.id === paymentSupplierId), [suppliers, paymentSupplierId]);

    useEffect(() => {
        if (paymentSupplierId) {
            api.fetchSupplierInvoicesForSupplier(paymentSupplierId).then(invoices => {
                const unpaid = invoices.filter(inv => inv.status !== SupplierInvoiceStatus.Paid);
                setUnpaidInvoices(unpaid);
            });
        } else {
            setUnpaidInvoices([]);
        }
        setSelectedInvoiceIds(new Set());
        setPaymentAmount('');
    }, [paymentSupplierId]);

    const handleClearFilters = () => {
        setStartDate(todayStr);
        setEndDate(todayStr);
        setSearchTerm('');
        setTypeFilter('');
        setCategoryFilter('');
    };

    const filteredTransactions = useMemo(() => {
        let results = [...transactions];

        if (typeFilter) {
            results = results.filter(t => t.type === typeFilter);
        }

        if (categoryFilter) {
            results = results.filter(t => t.type === 'Expense' && t.category === categoryFilter);
        }

        if (searchTerm) {
            const lowercasedTerm = searchTerm.toLowerCase();
            results = results.filter(t =>
                t.entityName.toLowerCase().includes(lowercasedTerm) ||
                (t.description && t.description.toLowerCase().includes(lowercasedTerm)) ||
                (t.reference && t.reference.toLowerCase().includes(lowercasedTerm))
            );
        }

        return results;
    }, [transactions, searchTerm, typeFilter, categoryFilter]);


    const periodTotals = useMemo(() => {
        const income = transactions.filter(t => t.type === TransactionType.Income).reduce((sum, t) => sum + t.amount, 0);
        const expense = transactions.filter(t => t.type === TransactionType.Expense).reduce((sum, t) => sum + t.amount, 0);

        let incomeCash = transactions.filter(t => t.type === TransactionType.Income && t.method === PaymentMethod.Cash).reduce((sum, t) => sum + t.amount, 0);
        let incomeBank = transactions.filter(t => t.type === TransactionType.Income && t.method === PaymentMethod.Bank).reduce((sum, t) => sum + t.amount, 0);

        let expenseCash = transactions.filter(t => t.type === TransactionType.Expense && t.method === PaymentMethod.Cash).reduce((sum, t) => sum + t.amount, 0);
        let expenseBank = transactions.filter(t => t.type === TransactionType.Expense && t.method === PaymentMethod.Bank).reduce((sum, t) => sum + t.amount, 0);

        // Adjust for Transfers
        const transfers = transactions.filter(t => t.type === TransactionType.Transfer);
        transfers.forEach(t => {
            if (t.method === PaymentMethod.Cash) expenseCash += t.amount; // Cash Out
            else if (t.method === PaymentMethod.Bank) expenseBank += t.amount; // Bank Out

            if (t.toMethod === PaymentMethod.Cash) incomeCash += t.amount; // Cash In
            else if (t.toMethod === PaymentMethod.Bank) incomeBank += t.amount; // Bank In
        });

        return {
            income,
            expense,
            incomeCash,
            incomeBank,
            expenseCash,
            expenseBank,
            // We don't add transfers to total income/expense as they are neutral, 
            // but we use "incomeCash" and "expenseCash" as proxies for Inflow and Outflow in the closing balance calc.
        };
    }, [transactions]);

    const closingBalance = useMemo(() => {
        const openingCash = openingBalance.cash;
        const openingBank = openingBalance.bank;
        const totalOpening = openingBalance.total;

        const closingCash = openingCash + periodTotals.incomeCash - periodTotals.expenseCash;
        const closingBank = openingBank + periodTotals.incomeBank - periodTotals.expenseBank;

        return {
            total: totalOpening + periodTotals.income - periodTotals.expense,
            cash: closingCash,
            bank: closingBank
        };
    }, [openingBalance, periodTotals]);

    const { incomeTransactions, expenseTransactions, transferTransactions } = useMemo(() => {
        const income: CashFlowTransaction[] = [];
        const expense: CashFlowTransaction[] = [];
        const transfer: CashFlowTransaction[] = [];

        filteredTransactions.forEach(t => {
            if (t.type === TransactionType.Income) {
                income.push(t);
            } else if (t.type === TransactionType.Expense) {
                expense.push(t);
            } else if (t.type === TransactionType.Transfer) {
                transfer.push(t);
            }
        });
        return { incomeTransactions: income, expenseTransactions: expense, transferTransactions: transfer };
    }, [filteredTransactions]);


    const handleAddIncome = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        if (!incomeBuyerId || (!incomeAmount && !incomeDiscount) || ((incomeAmount || 0) <= 0 && (incomeDiscount || 0) <= 0)) {
            alert("Please select a buyer and enter a valid amount or discount.");
            return;
        }
        setLoading(l => ({ ...l, form: true }));
        try {
            await api.addIncome({
                date: new Date(),
                entityId: incomeBuyerId,
                entityName: selectedBuyer?.buyerName || 'Unknown Buyer',
                amount: incomeAmount || 0,
                discount: incomeDiscount || 0,
                method: incomeMethod,
                reference: incomeRef,
                description: incomeDesc
            }, user);
            // Reset form
            setIncomeBuyerId('');
            setIncomeAmount('');
            setIncomeDiscount('');
            setIncomeRef('');
            setIncomeDesc('');
            // Reload data
            await loadTransactions();
            await loadInitialData();
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(l => ({ ...l, form: false }));
        }
    };

    const handleAddSupplierPayment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        if (!paymentSupplierId || !paymentAmount || paymentAmount <= 0) {
            alert("Please select a supplier and enter a valid amount.");
            return;
        }
        setLoading(l => ({ ...l, form: true }));
        try {
            await api.addSupplierPayment({
                date: new Date(),
                category: ExpenseCategory.SupplierPayment,
                entityId: paymentSupplierId,
                entityName: selectedSupplier?.supplierName || 'Unknown Supplier',
                amount: paymentAmount,
                method: paymentMethod,
                reference: paymentRef,
                description: paymentDesc,
                relatedInvoiceIds: Array.from(selectedInvoiceIds),
            }, user);
            setPaymentSupplierId('');
            setPaymentAmount('');
            setPaymentRef('');
            setPaymentDesc('');
            setSelectedInvoiceIds(new Set());
            await loadTransactions();
            await loadInitialData();
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(l => ({ ...l, form: false }));
        }
    };

    const handleAddOtherExpense = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        if (!expenseName || !expenseAmount || expenseAmount <= 0) {
            alert("Please enter a valid expense name and amount.");
            return;
        }
        setLoading(l => ({ ...l, form: true }));
        try {
            await api.addOtherExpense({
                date: new Date(),
                category: ExpenseCategory.Other,
                entityName: expenseName,
                amount: expenseAmount,
                method: expenseMethod,
                reference: expenseRef,
                description: expenseDesc,
            }, user);
            setExpenseName('');
            setExpenseAmount('');
            setExpenseRef('');
            setExpenseDesc('');
            await loadTransactions();
            await loadInitialData();
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(l => ({ ...l, form: false }));
        }
    };

    const handleAddTransfer = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        if (!transferAmount || transferAmount <= 0) {
            alert("Please enter a valid amount.");
            return;
        }
        if (transferFrom === transferTo) {
            alert("Source and Destination cannot be the same.");
            return;
        }

        setLoading(l => ({ ...l, form: true }));
        try {
            await api.addCashFlowTransaction({
                date: new Date(),
                type: TransactionType.Transfer,
                category: null,
                entityId: null,
                entityName: 'Internal Transfer',
                amount: transferAmount,
                method: transferFrom,
                toMethod: transferTo,
                reference: 'Transfer',
                description: transferDesc || `Transfer from ${transferFrom} to ${transferTo}`,
            } as any, user);

            setTransferAmount('');
            setTransferDesc('');
            // Optional: reset methods to defaults or keep them

            await loadTransactions();
            await updateDailyTotals();
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(l => ({ ...l, form: false }));
        }
    };

    const handleDeleteTransaction = useCallback(async (transactionId: string) => {
        if (!user || !canDelete(Feature.CashFlow, 'delete_transaction')) return;
        if (window.confirm("Are you sure you want to delete this transaction? This action is irreversible.")) {
            setLoading(l => ({ ...l, transactions: true }));
            try {
                await api.deleteCashFlowTransaction(transactionId, user);
                await loadTransactions();
                await updateDailyTotals();
            } catch (error: any) {
                alert(`Failed to delete transaction: ${error.message}`);
            } finally {
                setLoading(l => ({ ...l, transactions: false }));
            }
        }
    }, [user, canDelete, loadTransactions, updateDailyTotals]);

    const handleOpenEditModal = useCallback((transaction: CashFlowTransaction) => {
        setEditingTransaction(transaction);
        setEditFormState({
            ...transaction,
            date: new Date(transaction.date).toISOString().split('T')[0], // Format for date input
        });
        setIsEditModalOpen(true);
    }, []);

    const handleCloseEditModal = useCallback(() => {
        setIsEditModalOpen(false);
        setEditingTransaction(null);
        setEditFormState({ date: '' });
    }, []);

    const handleEditFormChange = useCallback((field: keyof typeof editFormState, value: any) => {
        setEditFormState(prev => ({ ...prev, [field]: value }));
    }, []);

    const handleUpdateTransaction = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !editingTransaction) return;

        setLoading(l => ({ ...l, form: true }));
        try {
            const payload = {
                ...editingTransaction,
                ...editFormState,
                date: new Date(editFormState.date as string),
            } as CashFlowTransaction;

            await api.updateCashFlowTransaction(payload, user);

            await loadTransactions();
            await updateDailyTotals();
            handleCloseEditModal();
        } catch (error: any) {
            alert(`Failed to update transaction: ${error.message}`);
        } finally {
            setLoading(l => ({ ...l, form: false }));
        }
    };


    const TabButton: React.FC<{ tabId: string; children: React.ReactNode }> = ({ tabId, children }) => (
        <button
            onClick={() => setActiveTab(tabId)}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${activeTab === tabId ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
        >
            {children}
        </button>
    );

    const TransactionMobileCard: React.FC<{ t: CashFlowTransaction }> = ({ t }) => {
        const isIncome = t.type === TransactionType.Income;
        const isTransfer = t.type === TransactionType.Transfer;

        let icon = isIncome ? ICONS.arrow_down : ICONS.arrow_up;
        let colorClass = isIncome ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600';
        let amountClass = isIncome ? 'text-success' : 'text-danger';

        if (isTransfer) {
            icon = <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path fillRule="evenodd" d="M1 11.5a.5.5 0 0 0 .5.5h11.793l-3.147 3.146a.5.5 0 0 0 .708.708l4-4a.5.5 0 0 0 0-.708l-4-4a.5.5 0 0 0-.708.708L13.293 11H1.5a.5.5 0 0 0-.5.5zm14-7a.5.5 0 0 0-.5-.5H2.707l3.147 3.146a.5.5 0 1 0-.708.708l-4-4a.5.5 0 0 0 0-.708l4-4a.5.5 0 1 0 .708.708L2.707 4H14.5a.5.5 0 0 0 .5-.5z" /></svg>;
            colorClass = 'bg-blue-100 text-blue-600';
            amountClass = 'text-blue-600';
        }

        return (
            <div className="p-3 border rounded-lg bg-white shadow-sm">
                <div className="flex justify-between items-start gap-2">
                    <div className="flex items-start gap-3">
                        <div className={`w-8 h-8 flex-shrink-0 flex items-center justify-center ${colorClass} rounded-full`}>
                            {icon}
                        </div>
                        <div>
                            <p className="font-bold text-dark">{t.entityName}</p>
                            <p className="text-xs text-muted">{formatDate(t.date)}</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className={`font-semibold text-lg ${amountClass}`}>{formatCurrency(t.amount)}</p>
                        {isIncome && t.discount ? <p className="text-xs text-muted">Discount: {formatCurrency(t.discount)}</p> : null}
                        {!isIncome && !isTransfer && <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-red-100 text-red-800">{t.category}</span>}
                        {isTransfer && <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">{t.method} &rarr; {t.toMethod}</span>}
                    </div>
                </div>
                <p className="text-sm text-muted pl-11 mt-1">{t.description}</p>
                <div className="flex justify-between items-center pl-11 mt-2">
                    <p className="text-xs text-muted">Method: <span className="font-medium text-dark">{t.method}</span></p>
                    <div className="flex items-center justify-end gap-2">
                        {canUpdate(Feature.CashFlow, 'update_transaction') && <Button size="sm" variant="ghost" onClick={() => handleOpenEditModal(t)}>Edit</Button>}
                        {canDelete(Feature.CashFlow, 'delete_transaction') && <Button size="sm" variant="danger" onClick={() => handleDeleteTransaction(t.id)}>Delete</Button>}
                    </div>
                </div>
            </div>
        );
    };

    if (loading.global) {
        return <div>Loading...</div>;
    }

    const showIncome = typeFilter === '' || typeFilter === TransactionType.Income;
    const showExpense = typeFilter === '' || typeFilter === TransactionType.Expense;

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="bg-green-50 border border-green-200">
                    <p className="text-sm font-medium text-green-700">Today's Income</p>
                    <p className="text-3xl font-bold text-green-800">{formatCurrency(dailyTotals.income)}</p>
                </Card>
                <Card className="bg-red-50 border border-red-200">
                    <p className="text-sm font-medium text-red-700">Today's Expenses</p>
                    <p className="text-3xl font-bold text-red-800">{formatCurrency(dailyTotals.expense)}</p>
                </Card>
            </div>

            <Card className="relative z-10">
                <div className="border-b border-gray-200">
                    <nav className="-mb-px flex gap-2" aria-label="Tabs">
                        <TabButton tabId="income">Record Income</TabButton>
                        <TabButton tabId="supplier">Supplier Payments</TabButton>
                        <TabButton tabId="expense">Other Expenses</TabButton>
                        <TabButton tabId="transfer">Transfer</TabButton> {/* New Tab */}
                    </nav>
                </div>
                <div className="pt-6">
                    {!canManage ? (
                        <div className="p-6 text-center text-muted bg-gray-50 rounded-b-lg">
                            You do not have permission to add new transactions.
                        </div>
                    ) : (
                        <>
                            {/* Income Form */}
                            {activeTab === 'income' && (
                                <form onSubmit={handleAddIncome} className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-muted mb-1">Buyer</label>
                                            <SearchableSelect
                                                options={buyers.map(b => ({ value: b.id, label: b.buyerName }))}
                                                value={incomeBuyerId || null}
                                                onChange={val => setIncomeBuyerId(val || '')}
                                                placeholder="Select a buyer"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-muted">Outstanding Balance</label>
                                            <div className={`mt-1 p-2 h-[42px] flex items-center border rounded-md ${selectedBuyer && selectedBuyer.outstanding > 0 ? 'text-danger' : 'text-success'}`}>{selectedBuyer ? formatCurrency(selectedBuyer.outstanding) : '-'}</div>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-muted">Payment Amount</label>
                                            <input type="number" value={incomeAmount} onChange={e => setIncomeAmount(e.target.value === '' ? '' : Number(e.target.value))} className="mt-1 block w-full p-2 border border-gray-300 rounded-md bg-white" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-muted">Discount</label>
                                            <input type="number" value={incomeDiscount} onChange={e => setIncomeDiscount(e.target.value === '' ? '' : Number(e.target.value))} className="mt-1 block w-full p-2 border border-gray-300 rounded-md bg-white" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-muted">Payment Method</label>
                                            <select value={incomeMethod} onChange={e => setIncomeMethod(e.target.value as PaymentMethod)} className="mt-1 block w-full p-2 border border-gray-300 rounded-md bg-white" required>
                                                <option value={PaymentMethod.Cash}>Cash</option>
                                                <option value={PaymentMethod.Bank}>Bank</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-muted">Reference / Description</label>
                                        <input type="text" value={incomeDesc} onChange={e => setIncomeDesc(e.target.value)} className="mt-1 block w-full p-2 border border-gray-300 rounded-md bg-white" placeholder="e.g. Cleared pending dues" />
                                    </div>
                                    <div className="text-right">
                                        <button type="submit" className="bg-primary text-white font-bold py-2 px-6 rounded-lg hover:bg-primary-hover" disabled={loading.form}>{loading.form ? 'Saving...' : 'Add Income'}</button>
                                    </div>
                                </form>
                            )}
                            {activeTab === 'supplier' && (
                                <form onSubmit={handleAddSupplierPayment} className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-muted mb-1">Supplier</label>
                                            <SearchableSelect
                                                options={suppliers.map(s => ({ value: s.id, label: s.supplierName }))}
                                                value={paymentSupplierId || null}
                                                onChange={val => setPaymentSupplierId(val || '')}
                                                placeholder="Select a supplier"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-muted">Amount Payable to Supplier</label>
                                            <div className={`mt-1 p-2 h-[42px] flex items-center border rounded-md ${selectedSupplier && selectedSupplier.outstanding < 0 ? 'text-danger' : 'text-success'}`}>{selectedSupplier ? formatCurrency(Math.abs(selectedSupplier.outstanding)) : '-'}</div>
                                        </div>
                                    </div>
                                    {unpaidInvoices.length > 0 && (
                                        <div className="max-h-40 overflow-y-auto border rounded-lg">
                                            <table className="min-w-full text-sm">
                                                <thead className="bg-gray-50"><tr className="text-left text-xs text-muted uppercase">
                                                    <th className="p-2 w-8"></th><th className="p-2">Invoice #</th><th className="p-2">Date</th><th className="p-2 text-right">Balance Due</th>
                                                </tr></thead>
                                                <tbody>{unpaidInvoices.map(inv => <tr key={inv.id} className="border-t">
                                                    <td className="p-2"><input type="checkbox" checked={selectedInvoiceIds.has(inv.id)} onChange={() => setSelectedInvoiceIds(prev => { const next = new Set(prev); next.has(inv.id) ? next.delete(inv.id) : next.add(inv.id); return next; })} /></td>
                                                    <td className="p-2 font-medium">{inv.invoiceNumber}</td><td className="p-2">{new Date(inv.createdAt).toLocaleDateString()}</td><td className="p-2 text-right">{formatCurrency(inv.nettAmount - inv.paidAmount)}</td>
                                                </tr>)}</tbody>
                                            </table>
                                        </div>
                                    )}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-muted">Payment Amount</label>
                                            <input type="number" value={paymentAmount} onChange={e => setPaymentAmount(e.target.value === '' ? '' : Number(e.target.value))} className="mt-1 block w-full p-2 border border-gray-300 rounded-md bg-white" placeholder="Enter amount or select invoices" required />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-muted">Payment Method</label>
                                            <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value as PaymentMethod)} className="mt-1 block w-full p-2 border border-gray-300 rounded-md bg-white h-[42px]" required>
                                                <option value={PaymentMethod.Cash}>Cash</option>
                                                <option value={PaymentMethod.Bank}>Bank</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-muted">Reference / Description</label>
                                        <input type="text" value={paymentDesc} onChange={e => setPaymentDesc(e.target.value)} className="mt-1 block w-full p-2 border border-gray-300 rounded-md bg-white" placeholder="e.g. Advance payment" />
                                    </div>
                                    <div className="text-right">
                                        <button type="submit" className="bg-primary text-white font-bold py-2 px-6 rounded-lg hover:bg-primary-hover" disabled={loading.form}>{loading.form ? 'Saving...' : 'Make Payment'}</button>
                                    </div>
                                </form>
                            )}
                            {activeTab === 'expense' && (
                                <form onSubmit={handleAddOtherExpense} className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-muted">Expense Name</label>
                                            <input type="text" value={expenseName} onChange={e => setExpenseName(e.target.value)} className="mt-1 block w-full p-2 border border-gray-300 rounded-md bg-white" placeholder="e.g. Office Rent, Electricity Bill" required />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-muted">Amount</label>
                                            <input type="number" value={expenseAmount} onChange={e => setExpenseAmount(e.target.value === '' ? '' : Number(e.target.value))} className="mt-1 block w-full p-2 border border-gray-300 rounded-md bg-white" required />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-muted">Payment Method</label>
                                            <select value={expenseMethod} onChange={e => setExpenseMethod(e.target.value as PaymentMethod)} className="mt-1 block w-full p-2 border border-gray-300 rounded-md bg-white" required>
                                                <option value={PaymentMethod.Cash}>Cash</option>
                                                <option value={PaymentMethod.Bank}>Bank</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-muted">Reference / Description</label>
                                            <input type="text" value={expenseDesc} onChange={e => setExpenseDesc(e.target.value)} className="mt-1 block w-full p-2 border border-gray-300 rounded-md bg-white" placeholder="e.g. Bill #123" />
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <button type="submit" className="bg-primary text-white font-bold py-2 px-6 rounded-lg hover:bg-primary-hover" disabled={loading.form}>{loading.form ? 'Saving...' : 'Add Expense'}</button>
                                    </div>
                                </form>
                            )}
                            {activeTab === 'transfer' && (
                                <form onSubmit={handleAddTransfer} className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-muted">Amount</label>
                                            <input type="number" value={transferAmount} onChange={e => setTransferAmount(e.target.value === '' ? '' : Number(e.target.value))} className="mt-1 block w-full p-2 border border-gray-300 rounded-md bg-white" required />
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className="flex-1">
                                                <label className="block text-sm font-medium text-muted">From</label>
                                                <select value={transferFrom} onChange={e => setTransferFrom(e.target.value as PaymentMethod)} className="mt-1 block w-full p-2 border border-gray-300 rounded-md bg-white" required>
                                                    <option value={PaymentMethod.Cash}>Cash</option>
                                                    <option value={PaymentMethod.Bank}>Bank</option>
                                                </select>
                                            </div>
                                            <div className="pt-6 font-bold text-muted">&rarr;</div>
                                            <div className="flex-1">
                                                <label className="block text-sm font-medium text-muted">To</label>
                                                <select value={transferTo} onChange={e => setTransferTo(e.target.value as PaymentMethod)} className="mt-1 block w-full p-2 border border-gray-300 rounded-md bg-white" required>
                                                    <option value={PaymentMethod.Cash}>Cash</option>
                                                    <option value={PaymentMethod.Bank}>Bank</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-muted">Description</label>
                                        <input type="text" value={transferDesc} onChange={e => setTransferDesc(e.target.value)} className="mt-1 block w-full p-2 border border-gray-300 rounded-md bg-white" placeholder="e.g. Cash deposit to bank" />
                                    </div>
                                    <div className="text-right">
                                        <button type="submit" className="bg-primary text-white font-bold py-2 px-6 rounded-lg hover:bg-primary-hover" disabled={loading.form}>{loading.form ? 'Saving...' : 'Transfer'}</button>
                                    </div>
                                </form>
                            )}
                        </>
                    )}
                </div>
            </Card>

            <Card>
                <div className="mb-4">
                    <h2 className="text-xl font-bold">Transactions</h2>
                </div>

                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
                    <h3 className="text-lg font-semibold mb-2 text-center md:text-left">Period Summary</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                        <div className="p-2 bg-white rounded-lg shadow-sm">
                            <p className="text-sm text-muted">Opening Balance</p>
                            <p className="text-xl font-bold text-dark">{formatCurrency(openingBalance.total)}</p>
                            <div className="flex justify-center gap-2 mt-1 text-xs text-muted">
                                <span>Cash: {formatCurrency(openingBalance.cash)}</span>
                                <span>Bank: {formatCurrency(openingBalance.bank)}</span>
                            </div>
                        </div>
                        <div className="p-2 bg-white rounded-lg shadow-sm">
                            <p className="text-sm text-green-700">Period Income</p>
                            <p className="text-xl font-bold text-green-800">{formatCurrency(periodTotals.income)}</p>
                            <div className="flex justify-center gap-2 mt-1 text-xs text-muted">
                                <span>Cash: {formatCurrency(periodTotals.incomeCash)}</span>
                                <span>Bank: {formatCurrency(periodTotals.incomeBank)}</span>
                            </div>
                        </div>
                        <div className="p-2 bg-white rounded-lg shadow-sm">
                            <p className="text-sm text-red-700">Period Expense</p>
                            <p className="text-xl font-bold text-red-800">{formatCurrency(periodTotals.expense)}</p>
                            <div className="flex justify-center gap-2 mt-1 text-xs text-muted">
                                <span>Cash: {formatCurrency(periodTotals.expenseCash)}</span>
                                <span>Bank: {formatCurrency(periodTotals.expenseBank)}</span>
                            </div>
                        </div>
                        <div className="p-2 bg-white rounded-lg shadow-sm">
                            <p className="text-sm text-muted">Closing Balance</p>
                            <p className="text-xl font-bold text-dark">{formatCurrency(closingBalance.total)}</p>
                            <div className="flex justify-center gap-2 mt-1 text-xs text-muted">
                                <span>Cash: {formatCurrency(closingBalance.cash)}</span>
                                <span>Bank: {formatCurrency(closingBalance.bank)}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex flex-wrap items-end gap-4 mb-4">
                    <div className="flex-grow">
                        <DateRangePicker
                            startDate={startDate}
                            endDate={endDate}
                            onStartDateChange={setStartDate}
                            onEndDateChange={setEndDate}
                        />
                    </div>
                    <div className="flex-grow">
                        <label htmlFor="cashflow-type-filter" className="block text-sm font-medium text-gray-700">Type</label>
                        <select id="cashflow-type-filter" value={typeFilter} onChange={e => { setTypeFilter(e.target.value); if (e.target.value !== 'Expense') setCategoryFilter(''); }} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm h-[42px]">
                            <option value="">All Types</option>
                            <option value={TransactionType.Income}>Income</option>
                            <option value={TransactionType.Expense}>Expense</option>
                        </select>
                    </div>
                    <div className="flex-grow">
                        <label htmlFor="cashflow-category-filter" className="block text-sm font-medium text-gray-700">Category</label>
                        <select id="cashflow-category-filter" value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} disabled={typeFilter === TransactionType.Income} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm h-[42px] disabled:bg-gray-100">
                            <option value="">All Categories</option>
                            {Object.values(ExpenseCategory).map(cat => <option key={cat} value={cat}>{cat}</option>)}
                        </select>
                    </div>
                    <div className="flex-grow">
                        <label htmlFor="cashflow-search" className="block text-sm font-medium text-gray-700">Search</label>
                        <div className="relative mt-1">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted">{ICONS.search}</div>
                            <input type="text" id="cashflow-search" placeholder="Search details..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm bg-white h-[42px]" />
                        </div>
                    </div>
                    <div>
                        <button onClick={handleClearFilters} className="bg-gray-200 text-gray-800 font-bold py-2 px-4 rounded-lg h-[42px] hover:bg-gray-300">Clear</button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {showIncome && (
                        <div>
                            <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><span className="text-green-500">{ICONS.arrow_down}</span> Income Transactions</h2>
                            <div className="overflow-x-auto hidden md:block">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50 sticky top-0">
                                        <tr>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-muted uppercase"></th>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-muted uppercase">Date</th>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-muted uppercase">Details</th>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-muted uppercase">Method</th>
                                            <th className="px-4 py-2 text-right text-xs font-medium text-muted uppercase">Amount</th>
                                            <th className="px-4 py-2 text-right text-xs font-medium text-muted uppercase">Discount</th>
                                            <th className="px-4 py-2 text-right text-xs font-medium text-muted uppercase">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {loading.transactions ? (
                                            [...Array(5)].map((_, i) => <SkeletonRow key={i} columns={7} />)
                                        ) : incomeTransactions.length > 0 ? (
                                            incomeTransactions.map(t => (
                                                <tr key={t.id}>
                                                    <td className="px-4 py-2 whitespace-nowrap text-sm"><span className="text-green-500">{ICONS.arrow_down}</span></td>
                                                    <td className="px-4 py-2 whitespace-nowrap text-sm">{formatDate(t.date)}</td>
                                                    <td className="px-4 py-2 whitespace-nowrap text-sm">
                                                        <p className="font-medium text-dark">{t.entityName}</p>
                                                        <p className="text-xs text-muted">{t.description}</p>
                                                    </td>
                                                    <td className="px-4 py-2 whitespace-nowrap text-sm">{t.method}</td>
                                                    <td className="px-4 py-2 whitespace-nowrap text-sm font-bold text-right text-success">{formatCurrency(t.amount)}</td>
                                                    <td className="px-4 py-2 whitespace-nowrap text-sm text-right">{t.discount ? formatCurrency(t.discount) : '-'}</td>
                                                    <td className="px-4 py-2 whitespace-nowrap text-sm text-right">
                                                        <div className="flex items-center justify-end gap-2">
                                                            {canUpdate(Feature.CashFlow, 'update_transaction') && <button onClick={() => handleOpenEditModal(t)} className="text-primary p-1 hover:bg-blue-100 rounded-full" title="Edit">{React.cloneElement(ICONS.edit, { className: "h-4 w-4" })}</button>}
                                                            {canDelete(Feature.CashFlow, 'delete_transaction') && <button onClick={() => handleDeleteTransaction(t.id)} className="text-danger p-1 hover:bg-red-100 rounded-full" title="Delete">{React.cloneElement(ICONS.trash, { className: "h-4 w-4" })}</button>}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr><td colSpan={7} className="text-center p-4 text-muted">
                                                {transactions.length > 0 ? 'No matching income transactions found.' : 'No income transactions in this period.'}
                                            </td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                            <div className="md:hidden space-y-2">
                                {loading.transactions ? <Spinner /> : incomeTransactions.length > 0 ? incomeTransactions.map(t => (
                                    <TransactionMobileCard key={t.id} t={t} />
                                )) : <p className="text-center p-4 text-muted">{transactions.length > 0 ? 'No matching income transactions found.' : 'No income transactions in this period.'}</p>}
                            </div>
                        </div>
                    )}
                    {showExpense && (
                        <div>
                            <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><span className="text-red-500">{ICONS.arrow_up}</span> Expense Transactions</h2>
                            <div className="overflow-x-auto hidden md:block">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50 sticky top-0">
                                        <tr>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-muted uppercase"></th>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-muted uppercase">Date</th>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-muted uppercase">Details</th>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-muted uppercase">Method</th>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-muted uppercase">Category</th>
                                            <th className="px-4 py-2 text-right text-xs font-medium text-muted uppercase">Amount</th>
                                            <th className="px-4 py-2 text-right text-xs font-medium text-muted uppercase">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {loading.transactions ? (
                                            [...Array(5)].map((_, i) => <SkeletonRow key={i} columns={7} />)
                                        ) : expenseTransactions.length > 0 ? (
                                            expenseTransactions.map(t => (
                                                <tr key={t.id}>
                                                    <td className="px-4 py-2 whitespace-nowrap text-sm"><span className="text-red-500">{ICONS.arrow_up}</span></td>
                                                    <td className="px-4 py-2 whitespace-nowrap text-sm">{formatDate(t.date)}</td>
                                                    <td className="px-4 py-2 whitespace-nowrap text-sm">
                                                        <p className="font-medium text-dark">{t.entityName}</p>
                                                        <p className="text-xs text-muted">{t.description}</p>
                                                    </td>
                                                    <td className="px-4 py-2 whitespace-nowrap text-sm">{t.method}</td>
                                                    <td className="px-4 py-2 whitespace-nowrap text-sm">
                                                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">{t.category}</span>
                                                    </td>
                                                    <td className="px-4 py-2 whitespace-nowrap text-sm font-bold text-right text-danger">{formatCurrency(t.amount)}</td>
                                                    <td className="px-4 py-2 whitespace-nowrap text-sm text-right">
                                                        <div className="flex items-center justify-end gap-2">
                                                            {canUpdate(Feature.CashFlow, 'update_transaction') && <button onClick={() => handleOpenEditModal(t)} className="text-primary p-1 hover:bg-blue-100 rounded-full" title="Edit">{React.cloneElement(ICONS.edit, { className: "h-4 w-4" })}</button>}
                                                            {canDelete(Feature.CashFlow, 'delete_transaction') && <button onClick={() => handleDeleteTransaction(t.id)} className="text-danger p-1 hover:bg-red-100 rounded-full" title="Delete">{React.cloneElement(ICONS.trash, { className: "h-4 w-4" })}</button>}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr><td colSpan={7} className="text-center p-4 text-muted">
                                                {transactions.length > 0 ? 'No matching expense transactions found.' : 'No expense transactions in this period.'}
                                            </td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                            <div className="md:hidden space-y-2">
                                {loading.transactions ? <Spinner /> : expenseTransactions.length > 0 ? expenseTransactions.map(t => (
                                    <TransactionMobileCard key={t.id} t={t} />
                                )) : <p className="text-center p-4 text-muted">{transactions.length > 0 ? 'No matching expense transactions found.' : 'No expense transactions in this period.'}</p>}
                            </div>
                        </div>
                    )}
                    {(typeFilter === '' || typeFilter === TransactionType.Transfer) && (
                        <div className={typeFilter === TransactionType.Transfer ? "col-span-1 lg:col-span-2" : "col-span-1 lg:col-span-2 mt-8"}>
                            <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><span className="text-blue-500">{ICONS.arrow_up}</span> Internal Transfers</h2>
                            <div className="overflow-x-auto hidden md:block">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50 sticky top-0">
                                        <tr>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-muted uppercase"></th>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-muted uppercase">Date</th>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-muted uppercase">Details</th>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-muted uppercase">From</th>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-muted uppercase">To</th>
                                            <th className="px-4 py-2 text-right text-xs font-medium text-muted uppercase">Amount</th>
                                            <th className="px-4 py-2 text-right text-xs font-medium text-muted uppercase">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {loading.transactions ? (
                                            [...Array(3)].map((_, i) => <SkeletonRow key={i} columns={7} />)
                                        ) : transferTransactions.length > 0 ? (
                                            transferTransactions.map(t => (
                                                <tr key={t.id}>
                                                    <td className="px-4 py-2 whitespace-nowrap text-sm"><span className="text-blue-500">{ICONS.arrow_up}</span></td>
                                                    <td className="px-4 py-2 whitespace-nowrap text-sm">{formatDate(t.date)}</td>
                                                    <td className="px-4 py-2 whitespace-nowrap text-sm">
                                                        <p className="font-medium text-dark">{t.description}</p>
                                                    </td>
                                                    <td className="px-4 py-2 whitespace-nowrap text-sm"><span className="px-2 py-0.5 rounded-full bg-red-100 text-red-800">{t.method}</span></td>
                                                    <td className="px-4 py-2 whitespace-nowrap text-sm"><span className="px-2 py-0.5 rounded-full bg-green-100 text-green-800">{t.toMethod}</span></td>
                                                    <td className="px-4 py-2 whitespace-nowrap text-sm font-bold text-right text-blue-600">{formatCurrency(t.amount)}</td>
                                                    <td className="px-4 py-2 whitespace-nowrap text-sm text-right">
                                                        <div className="flex items-center justify-end gap-2">
                                                            {canUpdate(Feature.CashFlow, 'update_transaction') && <button onClick={() => handleOpenEditModal(t)} className="text-primary p-1 hover:bg-blue-100 rounded-full" title="Edit">{React.cloneElement(ICONS.edit, { className: "h-4 w-4" })}</button>}
                                                            {canDelete(Feature.CashFlow, 'delete_transaction') && <button onClick={() => handleDeleteTransaction(t.id)} className="text-danger p-1 hover:bg-red-100 rounded-full" title="Delete">{React.cloneElement(ICONS.trash, { className: "h-4 w-4" })}</button>}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr><td colSpan={7} className="text-center p-4 text-muted">
                                                {transactions.length > 0 ? 'No matching transfers found.' : 'No transfers in this period.'}
                                            </td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                            <div className="md:hidden space-y-2">
                                {loading.transactions ? <Spinner /> : transferTransactions.length > 0 ? transferTransactions.map(t => (
                                    <TransactionMobileCard key={t.id} t={t} />
                                )) : <p className="text-center p-4 text-muted">{transactions.length > 0 ? 'No matching transfers found.' : 'No transfers in this period.'}</p>}
                            </div>
                        </div>
                    )}
                </div>
            </Card>

            <Modal isOpen={isEditModalOpen} onClose={handleCloseEditModal} title="Edit Transaction">
                {editingTransaction && (
                    <form onSubmit={handleUpdateTransaction} className="space-y-4">
                        <Input label="Date" type="date" value={editFormState.date} onChange={e => handleEditFormChange('date', e.target.value)} />

                        {editingTransaction.type === 'Income' && (
                            <div className="grid grid-cols-2 gap-4">
                                <Input label="Amount" type="number" value={editFormState.amount} onChange={e => handleEditFormChange('amount', Number(e.target.value))} />
                                <Input label="Discount" type="number" value={editFormState.discount || ''} onChange={e => handleEditFormChange('discount', Number(e.target.value))} />
                            </div>
                        )}
                        {(editingTransaction.type === 'Expense' || editingTransaction.type === TransactionType.Transfer) && (
                            <Input label="Amount" type="number" value={editFormState.amount} onChange={e => handleEditFormChange('amount', Number(e.target.value))} />
                        )}

                        {editingTransaction.type === TransactionType.Transfer ? null : editingTransaction.category === 'Other' ? (
                            <Input label="Expense Name" type="text" value={editFormState.entityName} onChange={e => handleEditFormChange('entityName', e.target.value)} />
                        ) : (
                            <div>
                                <label className="block text-sm font-medium text-muted">{editingTransaction.type === 'Income' ? 'Buyer' : 'Supplier'}</label>
                                <p className="mt-1 p-2 border rounded-md bg-gray-100">{editingTransaction.entityName}</p>
                            </div>
                        )}

                        {editingTransaction.type === TransactionType.Transfer ? (
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-muted mb-1">From</label>
                                    <select value={editFormState.method} onChange={e => handleEditFormChange('method', e.target.value)} className="w-full p-2 border border-gray-300 rounded-md bg-white">
                                        <option value={PaymentMethod.Cash}>Cash</option>
                                        <option value={PaymentMethod.Bank}>Bank</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-muted mb-1">To</label>
                                    <select value={editFormState.toMethod || PaymentMethod.Bank} onChange={e => handleEditFormChange('toMethod', e.target.value)} className="w-full p-2 border border-gray-300 rounded-md bg-white">
                                        <option value={PaymentMethod.Cash}>Cash</option>
                                        <option value={PaymentMethod.Bank}>Bank</option>
                                    </select>
                                </div>
                            </div>
                        ) : (
                            <div>
                                <label className="block text-sm font-medium text-muted mb-1">Method</label>
                                <select value={editFormState.method} onChange={e => handleEditFormChange('method', e.target.value)} className="w-full p-2 border border-gray-300 rounded-md bg-white">
                                    <option value={PaymentMethod.Cash}>Cash</option>
                                    <option value={PaymentMethod.Bank}>Bank</option>
                                </select>
                            </div>
                        )}

                        <Input label="Description" value={editFormState.description} onChange={e => handleEditFormChange('description', e.target.value)} />

                        <div className="flex justify-end pt-4 gap-2">
                            <Button type="button" variant="secondary" onClick={handleCloseEditModal}>Cancel</Button>
                            <Button type="submit" isLoading={loading.form}>Save Changes</Button>
                        </div>
                    </form>
                )}
            </Modal>
        </div >
    );
};

export default CashFlowManager;
