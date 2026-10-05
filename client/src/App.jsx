import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ScrollToTop from './components/ScrollToTop';
import PageLoader from './components/PageLoader';
import Navbar from './components/common/Navbar';

// User pages
import HomePage from './pages/HomePage';
import CampCentersPage from './pages/CampCentersPage';
import CampCenterDetailPage from './pages/CampCenterDetailPage';
import ReservationPage from './pages/ReservationPage';
import ReservationSuccessPage from './pages/ReservationSuccessPage';
import DocumentUploadPage from './pages/DocumentUploadPage';

// Admin pages
import AdminLoginPage from './pages/admin/AdminLoginPage';
import AdminLayout from './layouts/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminReservations from './pages/admin/AdminReservations';
import AdminManualReservation from './pages/admin/AdminManualReservation';
import AdminReservationDetail from './pages/admin/AdminReservationDetail';
import AdminCalendar from './pages/admin/AdminCalendar';
import AdminDocuments from './pages/admin/AdminDocuments';
import AdminDocumentDetail from './pages/admin/AdminDocumentDetail';
import AdminAnalytics from './pages/admin/AdminAnalytics';
import AdminCenterRequests from './pages/admin/AdminCenterRequests';
import AdminHqQueue from './pages/admin/AdminHqQueue';
import { isHQ, isCenterAdmin, getAdminHome } from './utils/roles';

function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-700"></div>
    </div>
  );
  // SMS linkiyle gelen admin girişten sonra aynı sayfaya dönsün
  return isAuthenticated ? children : <Navigate to="/admin/login" replace state={{ from: location }} />;
}

// Yetkisi olmayan sayfada admin kendi ana sayfasına yönlendirilir.
function RoleRoute({ allow, children }) {
  const { admin } = useAuth();
  return allow(admin) ? children : <Navigate to={getAdminHome(admin)} replace />;
}

function AdminIndex() {
  const { admin } = useAuth();
  return <Navigate to={getAdminHome(admin)} replace />;
}

function AppRoutes() {
  const { pathname } = useLocation();
  const isAdminRoute = pathname.startsWith('/admin');

  return (
    <>
      <ScrollToTop />
      <PageLoader />
      {!isAdminRoute && <Navbar />}
      <Routes>
      {/* Public Routes */}
      <Route path="/" element={<HomePage />} />
      <Route path="/merkezlerimiz" element={<CampCentersPage />} />
      <Route path="/kamp-merkezi/:slug" element={<CampCenterDetailPage />} />
      <Route path="/rezervasyon" element={<ReservationPage />} />
      <Route path="/rezervasyon/basarili" element={<ReservationSuccessPage />} />
      <Route path="/rezervasyon-belgeleri/:token" element={<DocumentUploadPage />} />

      {/* Admin Routes */}
      <Route path="/admin/login" element={<AdminLoginPage />} />
      <Route path="/admin" element={
        <ProtectedRoute>
          <AdminLayout />
        </ProtectedRoute>
      }>
        <Route index element={<AdminIndex />} />
        <Route path="dashboard" element={<RoleRoute allow={isHQ}><AdminDashboard /></RoleRoute>} />
        <Route path="onay-bekleyenler" element={<RoleRoute allow={isHQ}><AdminHqQueue /></RoleRoute>} />
        <Route path="gelen-talepler" element={<RoleRoute allow={isCenterAdmin}><AdminCenterRequests /></RoleRoute>} />
        <Route path="rezervasyonlar" element={<AdminReservations />} />
        <Route path="rezervasyonlar/manuel-ekle" element={<RoleRoute allow={isHQ}><AdminManualReservation /></RoleRoute>} />
        <Route path="rezervasyonlar/:id" element={<AdminReservationDetail />} />
        <Route path="takvim" element={<RoleRoute allow={isHQ}><AdminCalendar /></RoleRoute>} />
        <Route path="belgeler" element={<AdminDocuments />} />
        <Route path="belgeler/:reservationId" element={<AdminDocumentDetail />} />
        <Route path="analiz" element={<RoleRoute allow={isHQ}><AdminAnalytics /></RoleRoute>} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
