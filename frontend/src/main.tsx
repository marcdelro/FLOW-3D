import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";

import App from "./App.tsx";
import { AuthProvider } from "./auth/AuthContext.tsx";
import { ProtectedRoute } from "./auth/ProtectedRoute.tsx";
import "./index.css";
import { Landing } from "./pages/Landing";
import { Login } from "./pages/Login";
import { Register } from "./pages/Register";
import { AdminDashboard } from "./pages/AdminDashboard";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/"        element={<Landing />} />
          <Route path="/app/*"   element={<App />} />
          <Route path="/login"   element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/admin"   element={
            <ProtectedRoute requireAdmin>
              <AdminDashboard />
            </ProtectedRoute>
          } />
          <Route path="*"        element={<Landing />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
