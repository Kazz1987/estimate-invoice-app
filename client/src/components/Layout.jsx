import { Link, useLocation } from 'react-router-dom';

const MENU_ITEMS = [
  { label: 'ダッシュボード', path: '/dashboard' },
  { label: '顧客管理', path: '/customers' },
  { label: '品目マスタ', path: '/item-categories' },
  { label: '見積書', path: '/estimates' },
  { label: '請求書', path: '/invoices' },
  { label: '設定', path: '/settings' },
];

export default function Layout({ children }) {
  const location = useLocation();

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <aside
        style={{
          width: '200px',
          flexShrink: 0,
          background: '#1f2937',
          color: '#fff',
          padding: '24px 0',
        }}
      >
        <div style={{ padding: '0 20px', marginBottom: '24px', fontSize: '16px', fontWeight: 'bold' }}>
          見積・請求管理
        </div>
        <nav>
          {MENU_ITEMS.map((item) => {
            const isActive = location.pathname.startsWith(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                style={{
                  display: 'block',
                  padding: '12px 20px',
                  color: isActive ? '#fff' : '#9ca3af',
                  background: isActive ? '#2563eb' : 'transparent',
                  textDecoration: 'none',
                  fontSize: '14px',
                  fontWeight: isActive ? '600' : '400',
                }}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      <main style={{ flex: 1, minWidth: 0 }}>{children}</main>
    </div>
  );
}
