import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import CustomerList from './pages/customers/CustomerList';
import CustomerForm from './pages/customers/CustomerForm';
import CategoryList from './pages/items/CategoryList';
import CategoryForm from './pages/items/CategoryForm';
import ItemList from './pages/items/ItemList';
import ItemForm from './pages/items/ItemForm';
import EstimateList from './pages/estimates/EstimateList';
import EstimateForm from './pages/estimates/EstimateForm';
import EstimateDetail from './pages/estimates/EstimateDetail';
import InvoiceList from './pages/invoices/InvoiceList';
import InvoiceDetail from './pages/invoices/InvoiceDetail';
import InvoiceForm from './pages/invoices/InvoiceForm';
import SettingsPage from './pages/settings/SettingsPage';

function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />

          {/* ダッシュボード */}
          <Route path="/dashboard" element={<Dashboard />} />

          {/* 顧客管理 */}
          <Route path="/customers" element={<CustomerList />} />
          <Route path="/customers/new" element={<CustomerForm />} />
          <Route path="/customers/:id/edit" element={<CustomerForm />} />

          {/* 品目マスタ */}
          <Route path="/item-categories" element={<CategoryList />} />
          <Route path="/item-categories/new" element={<CategoryForm />} />
          <Route path="/item-categories/:id/edit" element={<CategoryForm />} />
          <Route path="/item-categories/:categoryId/items" element={<ItemList />} />
          <Route path="/item-categories/:categoryId/items/new" element={<ItemForm />} />
          <Route path="/item-categories/:categoryId/items/:id/edit" element={<ItemForm />} />

          {/* 見積書 */}
          <Route path="/estimates" element={<EstimateList />} />
          <Route path="/estimates/new" element={<EstimateForm />} />
          <Route path="/estimates/:id" element={<EstimateDetail />} />
          <Route path="/estimates/:id/edit" element={<EstimateForm />} />

          {/* 請求書 */}
          <Route path="/invoices" element={<InvoiceList />} />
          <Route path="/invoices/:id" element={<InvoiceDetail />} />
          <Route path="/invoices/:id/edit" element={<InvoiceForm />} />

          {/* 設定 */}
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;
