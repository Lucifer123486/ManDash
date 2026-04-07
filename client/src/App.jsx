import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';
import Sidebar from './components/Sidebar';
import Login from './pages/Login';

// Admin pages
import DashboardLayout from './components/layout/DashboardLayout';
import AdminDashboard from './pages/admin/Dashboard';
import Users from './pages/admin/Users';
import Drones from './pages/admin/Drones';
import Orders from './pages/admin/Orders';
import Forms from './pages/admin/Forms';
import Approvals from './pages/admin/Approvals';
import ActivationSheet from './pages/admin/ActivationSheet';
import Notifications from './pages/admin/Notifications';
import SupportTickets from './pages/admin/SupportTickets';

// Staff pages
import StaffDashboard from './pages/staff/Dashboard';
import StaffForms from './pages/staff/Forms';
import StaffOrders from './pages/staff/Orders';
import StaffDrones from './pages/staff/Drones';
import StaffUsers from './pages/staff/Users';
import ActivationForm from './pages/staff/ActivationForm';
import StaffSupportBot from './pages/staff/SupportBot';
import StaffPrebooking from './pages/staff/Prebooking';
import MaintenanceFormPage from './pages/staff/MaintenanceFormPage';

// Client pages
import ClientDashboard from './pages/client/Dashboard';
import ClientSupport from './pages/client/Support';
import ServiceRequest from './pages/client/ServiceRequest';
import ClientFAQ from './pages/client/FAQ';
import ClientOrderDetail from './pages/client/OrderDetail';
import ClientTracking from './pages/client/Tracking';

// Shared pages
import DroneDetail from './pages/DroneDetail';
import FormRenderer from './components/FormRenderer';
import FormSubmissionView from './pages/FormSubmissionView';
import ManufacturingRecordView from './pages/ManufacturingRecordView';

import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import './index.css';
import './assets/sidebar.css';

/* -------------------- PROTECTED ROUTE -------------------- */
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
    const redirectPath =
      user?.role === 'admin'
        ? '/admin'
        : user?.role === 'staff' || user?.role === 'qi'
          ? (['call_centre_staff', 'sales_staff'].includes(user?.staffType) ? '/staff/users' : '/staff')
          : '/client';

    return <Navigate to={redirectPath} replace />;
  }

  return <Outlet />;
};

/* -------------------- APP -------------------- */
function App() {
  return (
    <AuthProvider>
      <LanguageProvider>
        <ToastContainer />
        <BrowserRouter>
          <Routes>
            {/* Public */}
            <Route path="/login" element={<Login />} />

            {/* Admin */}
            <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
              <Route element={<DashboardLayout />}>
                <Route path="/admin" element={<AdminDashboard />} />
                <Route path="/admin/users" element={<Users />} />
                <Route path="/admin/drones" element={<Drones />} />
                <Route path="/admin/drones/:id" element={<DroneDetail />} />
                <Route path="/admin/orders" element={<Orders />} />
                <Route path="/admin/forms" element={<Forms />} />
                <Route path="/admin/approvals" element={<Approvals />} />
                <Route path="/admin/activations" element={<ActivationSheet />} />
                <Route path="/admin/notifications" element={<Notifications />} />
                <Route path="/admin/prebooking" element={<StaffPrebooking />} />
                <Route path="/admin/support" element={<SupportTickets />} />
              </Route>
            </Route>

            {/* Staff / QI */}
            <Route element={<ProtectedRoute allowedRoles={['staff', 'qi', 'admin']} />}>
              <Route element={<DashboardLayout />}>
                <Route path="/staff" element={<StaffDashboard />} />
                <Route path="/staff/users" element={<StaffUsers />} />
                <Route path="/staff/orders" element={<StaffOrders />} />
                <Route path="/staff/drones" element={<StaffDrones />} />
                <Route path="/staff/drones/:id" element={<DroneDetail />} />
                <Route path="/staff/forms" element={<StaffForms />} />
                <Route path="/staff/forms/:formCode" element={<FormRenderer />} />
                <Route path="/staff/activation/:id" element={<ActivationForm />} />
                <Route path="/staff/support" element={<SupportTickets />} />
                <Route path="/staff/chatbot" element={<StaffSupportBot />} />
                <Route path="/staff/prebooking" element={<StaffPrebooking />} />
                <Route path="/staff/maintenance" element={<MaintenanceFormPage />} />
              </Route>
            </Route>

            {/* Client */}
            <Route element={<ProtectedRoute allowedRoles={['client']} />}>
              <Route element={<DashboardLayout />}>
                <Route path="/client" element={<ClientDashboard />} />
                <Route path="/client/orders" element={<ClientTracking />} />
                <Route path="/client/orders/:id" element={<ClientOrderDetail />} />
                <Route path="/client/tracking" element={<ClientTracking />} />
                <Route path="/client/service" element={<ServiceRequest />} />
                <Route path="/client/faq" element={<ClientFAQ />} />
                <Route path="/client/support" element={<ClientSupport />} />
              </Route>
            </Route>

            {/* Submission / Print */}
            <Route element={<ProtectedRoute allowedRoles={['admin', 'staff', 'qi']} />}>
              <Route element={<DashboardLayout />}>
                <Route path="/submission/:id" element={<FormSubmissionView />} />
                <Route path="/manufacturing-record/:id" element={<ManufacturingRecordView />} />
                <Route path="/form/:id" element={<FormRenderer />} />
              </Route>
            </Route>

            {/* Default */}
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="*" element={<Navigate to="/login" replace />} />

          </Routes>
        </BrowserRouter>
      </LanguageProvider>
    </AuthProvider>
  );
}

export default App;
