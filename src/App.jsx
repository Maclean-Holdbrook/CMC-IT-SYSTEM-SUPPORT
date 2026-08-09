import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthProvider';
import { ToastProvider } from './components/common/Toast';
import ProtectedRoute from './components/ProtectedRoute';
import ScrollToTop from './components/ScrollToTop';

// Pages
import Home from './pages/Home';
import TrackReport from './pages/TrackReport';
import StaffComplaintForm from './pages/staff/StaffComplaintForm';
import AdminLogin from './pages/admin/AdminLogin';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminComplaints from './pages/admin/AdminComplaints';
import AdminWorkers from './pages/admin/AdminWorkers';
import AdminSettings from './pages/admin/AdminSettings';
import WorkerLogin from './pages/worker/WorkerLogin';
import WorkerSetup from './pages/worker/WorkerSetup';
import WorkerDashboard from './pages/worker/WorkerDashboard';

function App() {
  return (
    <Router>
      <ScrollToTop />
      <AuthProvider>
        <ToastProvider>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Home />} />
          <Route path="/submit-complaint" element={<StaffComplaintForm />} />
          <Route path="/track-report" element={<TrackReport />} />

          {/* Admin Routes */}
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route
            path="/admin/dashboard"
            element={
              <ProtectedRoute requiredRole="ADMIN">
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/complaints"
            element={
              <ProtectedRoute requiredRole="ADMIN">
                <AdminComplaints />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/workers"
            element={
              <ProtectedRoute requiredRole="ADMIN">
                <AdminWorkers />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/settings"
            element={
              <ProtectedRoute requiredRole="ADMIN">
                <AdminSettings />
              </ProtectedRoute>
            }
          />

          {/* Worker Routes */}
          <Route path="/worker/login" element={<WorkerLogin />} />
          <Route path="/worker/setup" element={<WorkerSetup />} />
          <Route
            path="/worker/dashboard"
            element={
              <ProtectedRoute requiredRole="WORKER">
                <WorkerDashboard />
              </ProtectedRoute>
            }
          />

          {/* 404 Route */}
          <Route path="*" element={<Home />} />
        </Routes>
        </ToastProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
