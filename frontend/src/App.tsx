import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoginPage from './pages/LoginPage';
import AdminLoginPage from './pages/AdminLoginPage';
import DashboardPage from './pages/DashboardPage';
import EventsPage from './pages/EventsPage';
import EventFormPage from './pages/EventFormPage';
import EventDetailPage from './pages/EventDetailPage';
import AdminEventDetailPage from './pages/AdminEventDetailPage';
import OnboardingPage from './pages/OnboardingPage';
import OnboardingSuccessPage from './pages/OnboardingSuccessPage';
import AuthCallbackPage from './pages/AuthCallbackPage';
import AdminPage from './pages/AdminPage';
import TeamInvitationPage from './pages/TeamInvitationPage';
import CommuneInfoPage from './pages/CommuneInfoPage';
import LoadingSpinner from './components/LoadingSpinner';
import Navigation from './components/Navigation';

const SUPERADMIN_ID = '39d145c4-20d9-495a-9a57-5c4cd3553089';

// Composant pour les routes protégées
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

// Layout principal avec header fixe
const MainLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header fixe */}
      <Navigation />
      
      {/* Contenu dynamique */}
      <main className="pt-16">
        {children}
      </main>
    </div>
  );
};

// Composant principal de l'application
const AppContent: React.FC = () => {
  const { isAuthenticated, user, isOnboardingComplete, onboardingStatus } = useAuth();

  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <div className="min-h-screen bg-gray-50">
        <Routes>
          {/* Route publique */}
          <Route 
            path="/login" 
            element={
              isAuthenticated ? 
                (isOnboardingComplete ? 
                  <Navigate to="/dashboard" replace /> : 
                  <Navigate to="/onboarding" replace />
                ) : 
                <LoginPage />
            } 
          />
          
          <Route 
            path="/admin-login" 
            element={
              isAuthenticated && user?.role === 'admin' ? 
                <Navigate to="/aploadmin" replace /> : 
                isAuthenticated ? 
                  <Navigate to="/dashboard" replace /> : 
                  <AdminLoginPage />
            } 
          />
          
          <Route 
            path="/onboarding" 
            element={
              isAuthenticated && isOnboardingComplete ? 
                <Navigate to="/dashboard" replace /> : 
                <OnboardingPage />
            } 
          />

          <Route 
            path="/onboarding/success" 
            element={<OnboardingSuccessPage />} 
          />
          
          <Route 
            path="/auth/callback" 
            element={<AuthCallbackPage />} 
          />
          
          {/* Routes protégées avec layout principal */}
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute>
                {isOnboardingComplete ? (
                  <MainLayout>
                    <DashboardPage />
                  </MainLayout>
                ) : onboardingStatus === 'checking' ? (
                  <LoadingSpinner />
                ) : (
                  <Navigate to="/onboarding" replace />
                )}
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/events" 
            element={
              <ProtectedRoute>
                {isOnboardingComplete ? (
                  <MainLayout>
                    <EventsPage />
                  </MainLayout>
                ) : onboardingStatus === 'checking' ? (
                  <LoadingSpinner />
                ) : (
                  <Navigate to="/onboarding" replace />
                )}
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/events/new" 
            element={
              <ProtectedRoute>
                {isOnboardingComplete ? (
                  <MainLayout>
                    <EventFormPage />
                  </MainLayout>
                ) : onboardingStatus === 'checking' ? (
                  <LoadingSpinner />
                ) : (
                  <Navigate to="/onboarding" replace />
                )}
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/events/:id/edit" 
            element={
              <ProtectedRoute>
                {isOnboardingComplete ? (
                  <MainLayout>
                    <EventFormPage />
                  </MainLayout>
                ) : onboardingStatus === 'checking' ? (
                  <LoadingSpinner />
                ) : (
                  <Navigate to="/onboarding" replace />
                )}
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/events/:id" 
            element={
              <ProtectedRoute>
                {isOnboardingComplete ? (
                  <MainLayout>
                    <EventDetailPage />
                  </MainLayout>
                ) : onboardingStatus === 'checking' ? (
                  <LoadingSpinner />
                ) : (
                  <Navigate to="/onboarding" replace />
                )}
              </ProtectedRoute>
            } 
          />
          
          {/* Route publique pour voir les détails d'un événement (depuis l'admin) */}
          <Route 
            path="/admin/events/:id" 
            element={<AdminEventDetailPage />}
          />
          
          <Route 
            path="/commune-info" 
            element={
              <ProtectedRoute>
                {isOnboardingComplete ? (
                  <MainLayout>
                    <CommuneInfoPage />
                  </MainLayout>
                ) : onboardingStatus === 'checking' ? (
                  <LoadingSpinner />
                ) : (
                  <Navigate to="/onboarding" replace />
                )}
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/aploadmin" 
            element={
              isAuthenticated
                ? (user?.id === SUPERADMIN_ID
                    ? <AdminPage />
                    : <div style={{ padding: 40, textAlign: 'center', color: 'red' }}>
                        Accès non autorisé
                      </div>)
                : <AdminLoginPage />
            }
          />
          
          {/* Redirection par défaut */}
          <Route 
            path="/" 
            element={
              isAuthenticated ? 
                (isOnboardingComplete ? 
                  <Navigate to="/dashboard" replace /> : 
                  <Navigate to="/onboarding" replace />
                ) : 
                <Navigate to="/login" replace />
            } 
          />
          
          {/* Route 404 */}
          <Route 
            path="*" 
            element={
              <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                  <h1 className="text-4xl font-bold text-gray-900 mb-4">404</h1>
                  <p className="text-gray-600 mb-8">Page non trouvée</p>
                  <button 
                    onClick={() => window.history.back()}
                    className="btn btn-primary"
                  >
                    Retour
                  </button>
                </div>
              </div>
            } 
          />
        </Routes>
        
        {/* Notifications toast */}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#363636',
              color: '#fff',
            },
            success: {
              duration: 3000,
              iconTheme: {
                primary: '#22c55e',
                secondary: '#fff',
              },
            },
            error: {
              duration: 5000,
              iconTheme: {
                primary: '#ef4444',
                secondary: '#fff',
              },
            },
          }}
        />
      </div>
    </Router>
  );
};

// Composant racine avec providers
const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App; 