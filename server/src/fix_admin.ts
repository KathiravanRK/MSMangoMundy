import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Role from './models/Role';
import User from './models/User';

dotenv.config();

const ALL_PERMISSIONS = {
    "dashboard.view_page.view": true,
    "dashboard.kpis.view": true,
    "dashboard.at_a_glance.view": true,
    "dashboard.charts.view": true,
    "dashboard.operations.view": true,
    "entries.list.view": true,
    "entries.list.create": true,
    "entries.list.update": true,
    "entries.list.delete": true,
    "entries.auction_action.view": true,
    "entries.auction_action.update": true,
    "entries.invoice_action.view": true,
    "entries.invoice_action.create": true,
    "entries.quick_create_supplier.create": true,
    "entries.quick_create_product.create": true,
    "auction.list.view": true,
    "auction.manage_items.view": true,
    "auction.manage_items.create": true,
    "auction.manage_items.update": true,
    "auction.manage_items.delete": true,
    "buyers.list.view": true,
    "buyers.list.create": true,
    "buyers.list.update": true,
    "buyers.list.delete": true,
    "buyers.details.view": true,
    "buyers.details_quick_stats.view": true,
    "buyers.details_analytics.view": true,
    "buyers.details_financial_summary.view": true,
    "buyers.details_invoice_history.view": true,
    "buyers.details_payment_history.view": true,
    "suppliers.list.view": true,
    "suppliers.list.create": true,
    "suppliers.list.update": true,
    "suppliers.list.delete": true,
    "suppliers.details.view": true,
    "suppliers.details_quick_stats.view": true,
    "suppliers.details_analytics.view": true,
    "suppliers.details_financial_summary.view": true,
    "suppliers.details_invoice_history.view": true,
    "suppliers.details_payment_history.view": true,
    "suppliers.details_bank_details.view": true,
    "products.list.view": true,
    "products.list.create": true,
    "products.list.update": true,
    "products.list.delete": true,
    "products.details.view": true,
    "products.details_quick_stats.view": true,
    "products.details_analytics.view": true,
    "products.details_recent_sales.view": true,
    "buyer_invoices.manage.view": true,
    "buyer_invoices.manage.create": true,
    "buyer_invoices.manage.update": true,
    "buyer_invoices.manage.delete": true,
    "buyer_invoices.print.view": true,
    "buyer_invoices.payment.create": true,
    "supplier_invoices.manage.view": true,
    "supplier_invoices.manage.create": true,
    "supplier_invoices.manage.update": true,
    "supplier_invoices.manage.delete": true,
    "supplier_invoices.draft.view": true,
    "supplier_invoices.draft.create": true,
    "supplier_invoices.print.view": true,
    "supplier_invoices.payment.create": true,
    "cash_flow.view.view": true,
    "cash_flow.add_income.create": true,
    "cash_flow.add_expense.create": true,
    "cash_flow.update_transaction.update": true,
    "cash_flow.delete_transaction.delete": true,
    "reports.view_page.view": true,
    "reports.analytics_kpis.view": true,
    "reports.analytics_charts.view": true,
    "reports.analytics_lists.view": true,
    "reports.sales.view": true,
    "reports.buyer_balance_sheet.view": true,
    "reports.invoice_aging.view": true,
    "reports.wages_report.view": true,
    "reports.adjustments_report.view": true,
    "reports.discount_report.view": true,
    "reports.buyer_ledger.view": true,
    "reports.purchases.view": true,
    "reports.supplier_balance_sheet.view": true,
    "reports.supplier_ledger.view": true,
    "reports.pnl.view": true,
    "reports.commission_report.view": true,
    "reports.cash_flow_details.view": true,
    "reports.income_ledger.view": true,
    "reports.expense_ledger.view": true,
    "reports.product_sales.view": true,
    "users.list.view": true,
    "users.list.create": true,
    "users.list.update": true,
    "users.list.delete": true,
    "roles.list.view": true,
    "roles.list.create": true,
    "roles.list.update": true,
    "roles.list.delete": true,
    "audit_log.view.view": true
};

const fixAdmin = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/ms-mango-mundy');
        console.log('Connected to MongoDB');

        let adminRole = await Role.findOne({ name: 'Admin' });
        if (!adminRole) {
            console.log('Admin role not found, creating...');
            adminRole = await Role.create({
                id: 'role_admin',
                name: 'Admin',
                permissions: ALL_PERMISSIONS
            });
        } else {
            console.log('Updating Admin role permissions...');
            adminRole.permissions = ALL_PERMISSIONS;
            await adminRole.save();
        }
        console.log('Admin role permissions updated.');

        // Ensure at least one user has the admin role
        const adminUser = await User.findOne({ roleId: adminRole.id });
        if (!adminUser) {
            console.log('No user with Admin role found. Please assign it manually or check your users.');
        } else {
            console.log(`Found admin user: ${adminUser.name} (${adminUser.contactNumber})`);
        }

        mongoose.disconnect();
        console.log('Disconnected');
    } catch (error) {
        console.error('Error:', error);
    }
};

fixAdmin();
