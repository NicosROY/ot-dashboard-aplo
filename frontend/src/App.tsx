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
import supabaseService from './services/supabase';

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
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <main className="pt-16">
        {children}
      </main>
    </div>
  );
};

// Composant principal de l'application
const AppContent: React.FC = () => {
  const { isAuthenticated, user, isOnboardingComplete, onboardingStatus, isLoading } = useAuth();

  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <div className="min-h-screen bg-gray-50">
        <Routes>
          {/* Redirection automatique vers onboarding si nécessaire */}
          <Route 
            path="/" 
            element={
              !isLoading && !isAuthenticated && onboardingStatus === 'incomplete' ? 
                <Navigate to="/onboarding" replace /> : 
                isAuthenticated ? 
                  <Navigate to="/dashboard" replace /> : 
                  <Navigate to="/login" replace />
            } 
          />
          
          {/* Route publique */}
          <Route 
            path="/login" 
            element={
              isAuthenticated ? 
                <Navigate to="/dashboard" replace /> : 
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
              isAuthenticated ? 
                <Navigate to="/dashboard" replace /> : 
                onboardingStatus === 'incomplete' || onboardingStatus === 'checking' ? 
                  <OnboardingPage /> : 
                  <Navigate to="/login" replace />
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
                <MainLayout>
                  <DashboardPage />
                </MainLayout>
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/events" 
            element={
              <ProtectedRoute>
                <MainLayout>
                  <EventsPage />
                </MainLayout>
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/events/new" 
            element={
              <ProtectedRoute>
                <MainLayout>
                  <EventFormPage />
                </MainLayout>
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/events/:id" 
            element={
              <ProtectedRoute>
                <MainLayout>
                  <EventDetailPage />
                </MainLayout>
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/events/:id/edit" 
            element={
              <ProtectedRoute>
                <MainLayout>
                  <EventFormPage />
                </MainLayout>
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/admin/events/:id" 
            element={
              <ProtectedRoute>
                <MainLayout>
                  <AdminEventDetailPage />
                </MainLayout>
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/team/invitation" 
            element={
              <ProtectedRoute>
                <MainLayout>
                  <TeamInvitationPage />
                </MainLayout>
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/commune/info" 
            element={
              <ProtectedRoute>
                <MainLayout>
                  <CommuneInfoPage />
                </MainLayout>
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