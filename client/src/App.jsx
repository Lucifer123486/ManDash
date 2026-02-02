import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Sidebar from './components/Sidebar';
import Login from './pages/Login';
import AdminDashboard from './pages/admin/Dashboard';
import StaffDashboard from './pages/staff/Dashboard';
import ClientDashboard from './pages/client/Dashboard';
import FormRenderer from './components/FormRenderer';
import Forms from './pages/admin/Forms';
import FormSubmissionView from './pages/FormSubmissionView';
// Admin pages
import Users from './pages/admin/Users';
import Drones from './pages/admin/Drones';
import Orders from './pages/admin/Orders';
import Approvals from './pages/admin/Approvals';
import Notifications from './pages/admin/Notifications';
// Staff pages
import StaffForms from './pages/staff/Forms';
import StaffOrders from './pages/staff/Orders';
import StaffDrones from './pages/staff/Drones';
import StaffWorkflow from './pages/staff/Workflow';
import DroneDetail from './pages/DroneDetail';
import './index.css';

// Protected Route Component
const ProtectedRoute = ({ allowedRoles }) => {
  const { isAuthenticated, user, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-container" style={{ minHeight: '100vh' }}>
        <div className="loading-spinner"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    const redirectPath = user?.role === 'admin' ? '/admin' :
      user?.role === 'staff' ? '/staff' : '/client';
    return <Navigate to={redirectPath} replace />;
  }

  return <Outlet />;
};

// Layout with Sidebar
const DashboardLayout = () => {
  return (
    <div style={{ display: 'flex' }}>
      <Sidebar />
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Route */}
          <Route path="/login" element={<Login />} />

          {/* Admin Routes */}
          <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
            <Route element={<DashboardLayout />}>
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/admin/users" element={<Users />} />
              <Route path="/admin/drones" element={<Drones />} />
              <Route path="/admin/drones/:id" element={<DroneDetail />} />
              <Route path="/admin/orders" element={<Orders />} />
              <Route path="/admin/forms" element={<Forms />} />
              <Route path="/admin/approvals" element={<Approvals />} />
              <Route path="/admin/notifications" element={<Notifications />} />
            </Route>
          </Route>

          {/* Staff Routes */}
          <Route element={<ProtectedRoute allowedRoles={['staff', 'qi', 'admin']} />}>
            <Route element={<DashboardLayout />}>
              <Route path="/staff" element={<StaffDashboard />} />
              <Route path="/staff/orders" element={<StaffOrders />} />
              <Route path="/staff/drones" element={<StaffDrones />} />
              <Route path="/staff/drones/:id" element={<DroneDetail />} />
              <Route path="/staff/workflow" element={<StaffWorkflow />} />
              <Route path="/staff/forms" element={<StaffForms />} />
              <Route path="/staff/forms/:formCode" element={<FormRenderer />} />
            </Route>
          </Route>

          {/* Client Routes */}
          <Route element={<ProtectedRoute allowedRoles={['client']} />}>
            <Route element={<DashboardLayout />}>
              <Route path="/client" element={<ClientDashboard />} />
              <Route path="/client/orders" element={<div><h1>My Orders</h1><p>Coming soon...</p></div>} />
              <Route path="/client/orders/:id" element={<div><h1>Order Details</h1><p>Coming soon...</p></div>} />
              <Route path="/client/tracking" element={<div><h1>Track Order</h1><p>Coming soon...</p></div>} />
              <Route path="/client/support" element={<div><h1>Support</h1><p>Coming soon...</p></div>} />
              <Route path="/client/faq" element={<div><h1>FAQs</h1><p>Coming soon...</p></div>} />
              <Route path="/client/service" element={<div><h1>Service</h1><p>Coming soon...</p></div>} />
            </Route>
          </Route>

          {/* Submission View (accessible after form submit) */}
          <Route element={<ProtectedRoute allowedRoles={['admin', 'staff', 'qi']} />}>
            <Route element={<DashboardLayout />}>
              <Route path="/submission/:id" element={<FormSubmissionView />} />
              <Route path="/form/:id" element={<FormRenderer />} />
            </Route>
          </Route>

          {/* Default Redirect */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
