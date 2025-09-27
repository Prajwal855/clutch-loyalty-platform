import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import  SignupPage  from "./components/auth/SignupPage";
import { useAuth } from './contexts/AuthContext';
import LoginPage from "./components/auth/LoginPage";
import Dashboard from "./components/feat/DashboardPage";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  
  if (loading) return <div>Loading...</div>;
  
  return user ? <>{children}</> : <Navigate to="/" replace /> ;
}


function App() {
  return (
    <Routes>
      <Route path="/" element={<SignupPage />} />
      <Route path="/login" element={<LoginPage/>}/>
      <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } 
          />
    </Routes>
  );
}

export default App;
