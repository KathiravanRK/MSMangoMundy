import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import helmet from 'helmet';

const app = express();

// Middleware
app.use(cors({
  origin: true, // Allow all origins for network access
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  maxAge: 86400 // 24 hours
}));
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json());



// Routes
import authRoutes from './routes/authRoutes';
import userRoutes from './routes/userRoutes';
import roleRoutes from './routes/roleRoutes';
import auditRoutes from './routes/auditRoutes';
import buyerRoutes from './routes/buyerRoutes';
import supplierRoutes from './routes/supplierRoutes';
import productRoutes from './routes/productRoutes';
import entryRoutes from './routes/entryRoutes';
import invoiceRoutes from './routes/invoiceRoutes';
import supplierInvoiceRoutes from './routes/supplierInvoiceRoutes';
import cashFlowRoutes from './routes/cashFlowRoutes';
import reportRoutes from './routes/reportRoutes';

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/audit-logs', auditRoutes);
app.use('/api/buyers', buyerRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/products', productRoutes);
app.use('/api/entries', entryRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/supplier-invoices', (req, res, next) => {
  if (req.method === 'POST' || req.method === 'PUT') {
    console.log(`[SUPPLIER INVOICE ${req.method}] Payload:`, JSON.stringify(req.body, null, 2));
    console.log(`[SUPPLIER INVOICE ${req.method}] entryIds type:`, typeof req.body.entryIds, 'isArray:', Array.isArray(req.body.entryIds));
    console.log(`[SUPPLIER INVOICE ${req.method}] entryIds value:`, req.body.entryIds);
  }
  const originalJson = res.json;
  res.json = function (body) {
    if (res.statusCode >= 400) {
      console.error(`[SUPPLIER INVOICE ERROR ${res.statusCode}]`, JSON.stringify(body, null, 2));
    }
    return originalJson.call(this, body);
  };
  next();
}, supplierInvoiceRoutes);
app.use('/api/cash-flow', cashFlowRoutes);
app.use('/api/reports', reportRoutes);

app.get('/', (req, res) => {
  res.send('API is running...');
});

// Final Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled Error:', err);
  res.status(500).json({
    message: err.message || 'Something went wrong',
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

export default app;
