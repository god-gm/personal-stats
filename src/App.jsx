import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import AuthCallbackPage from './pages/AuthCallbackPage';
import AssignmentsPage from './pages/AssignmentsPage';

function PrivateRoute({ children }) {
  return localStorage.getItem('jwt_token') ? children : <Navigate to="/" replace />;
}

function AdminRoute({ children }) {
  const token = localStorage.getItem('jwt_token');
  const role  = localStorage.getItem('user_role');
  if (!token) return <Navigate to="/" replace />;
  if (role !== 'ADMIN') return <Navigate to="/dashboard" replace />;
  return children;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route
          path="/dashboard"
          element={
            <PrivateRoute>
              <DashboardPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/assignments"
          element={
            <AdminRoute>
              <AssignmentsPage />
            </AdminRoute>
          }
        />
        <Route path="/auth/callback" element={<AuthCallbackPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
