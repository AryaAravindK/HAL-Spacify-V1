import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import CompanySetup from './pages/CompanySetup';
import Dashboard from './pages/Dashboard';
import BranchManagement from './pages/BranchManagement';
import Profile from './pages/Profile';
import EmployeeManagement from './pages/EmployeeManagement';
import { useCompanyCheck } from './hooks/useCompanyCheck';
import BranchDetails from './pages/BranchDetails';

const PrivateRoute = ({ children }: { children: React.ReactNode }) => {
  const { session } = useAuth();
  const { hasCompany, loading } = useCompanyCheck();

  if (!session) {
    return <Navigate to="/login" />;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!hasCompany && window.location.pathname !== '/company-setup') {
    return <Navigate to="/company-setup" />;
  }

  if (hasCompany && window.location.pathname === '/company-setup') {
    return <Navigate to="/dashboard" />;
  }

  return <>{children}</>;
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route
            path="/company-setup"
            element={
              <PrivateRoute>
                <CompanySetup />
              </PrivateRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <PrivateRoute>
                <Dashboard />
              </PrivateRoute>
            }
          />
          <Route
            path="/branch-management"
            element={
              <PrivateRoute>
                <BranchManagement />
              </PrivateRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <PrivateRoute>
                <Profile />
              </PrivateRoute>
            }
          />
          <Route
            path="/employee-management"
            element={
              <PrivateRoute>
                <EmployeeManagement />
              </PrivateRoute>
            }
          />
          <Route
            path="/branch/:branchId"
            element={
              <PrivateRoute>
                <BranchDetails />
              </PrivateRoute>
            }
          />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;