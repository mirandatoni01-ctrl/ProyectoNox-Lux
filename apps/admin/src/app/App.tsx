import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from '../auth/AuthProvider';
import { AdminLayout } from './AdminLayout';
import { ProtectedRoute } from '../routes/ProtectedRoute';
import { LoginPage } from '../routes/LoginPage';
import { ProductsPage } from '../features/products/ProductsPage';
import { NewProductPage } from '../features/products/NewProductPage';
import { InventarioPage } from '../features/inventory/InventarioPage';
import { MediaPage } from '../features/media/MediaPage';
import { PedidosPage } from '../features/orders/PedidosPage';
import { UsersPage } from '../features/users/UsersPage';
import { TicketsPage } from '../features/tickets/TicketsPage';
import { PlaceholderPage } from '../features/placeholders/PlaceholderPage';

/**
 * NOX & LUX — Admin Panel. Aplicación react-router independiente (ADR-NL-002,
 * ADR-NL-006): login autenticado + módulos de productos (NL-06), inventario
 * (NL-08), media (NL-09), pedidos (NL-10), usuarios y tickets (NL-13) +
 * placeholders para los bloques futuros.
 */
export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route element={<ProtectedRoute />}>
            <Route element={<AdminLayout />}>
              <Route index element={<Navigate to="/productos" replace />} />
              <Route path="/productos" element={<ProductsPage />} />
              <Route path="/productos/nuevo" element={<NewProductPage />} />
              <Route path="/inventario" element={<InventarioPage />} />
              <Route path="/pedidos" element={<PedidosPage />} />
              <Route path="/clientes" element={<PlaceholderPage module="clientes" />} />
              <Route path="/media" element={<MediaPage />} />
              <Route path="/usuarios" element={<UsersPage />} />
              <Route path="/tickets" element={<TicketsPage />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/productos" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}