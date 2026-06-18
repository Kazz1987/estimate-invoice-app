import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { testConnection } from './config/database.js';
import customersRouter from './routes/customers.js';
import itemCategoriesRouter from './routes/itemCategories.js';
import estimatesRouter from './routes/estimates.js';
import invoicesRouter from './routes/invoices.js';
import printRouter from './routes/print.js';
import dashboardRouter from './routes/dashboard.js';
import settingsRouter from './routes/settings.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:5173' }));
app.use(express.json());

app.get('/api/health', async (req, res) => {
  try {
    const db = await testConnection();
    res.json({
      status: 'ok',
      message: '見積〜請求管理API',
      database: { connected: db.connected, name: db.dbName },
    });
  } catch (error) {
    res.status(503).json({
      status: 'error',
      message: '見積〜請求管理API',
      database: { connected: false, error: error.message },
    });
  }
});

app.use('/api/customers', customersRouter);
app.use('/api/item-categories', itemCategoriesRouter);
app.use('/api/estimates', estimatesRouter);
app.use('/api/invoices', invoicesRouter);
app.use('/api/print', printRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/settings', settingsRouter);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
