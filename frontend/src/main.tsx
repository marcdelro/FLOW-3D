import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";

import App from "./App.tsx";
import { AuthProvider } from "./auth/AuthContext.tsx";
import { ProtectedRoute } from "./auth/ProtectedRoute.tsx";
import "./index.css";
import { Landing } from "./pages/Landing";
import { Login } from "./pages/Login";
import { ChangePassword } from "./pages/ChangePassword";
import { AdminDashboard } from "./pages/AdminDashboard";
import { TourProvider } from "./tour/TourContext.tsx";
import { TourOverlay, TourPromptModal, TourRestartButton, TourCompletedToast } from "./tour/TourOverlay.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <TourProvider>
          <Routes>
            <Route path="/"               element={<Landing />} />
            <Route path="/app/*"          element={<App />} />
            <Route path="/login"          element={<Login />} />
            <Route path="/change-password" element={
              <ProtectedRoute>
                <ChangePassword />
              </ProtectedRoute>
            } />
            <Route path="/admin"          element={
              <ProtectedRoute requireAdmin>
                <AdminDashboard />
              </ProtectedRoute>
            } />
            <Route path="*"               element={<Landing />} />
          </Routes>
          <TourPromptModal />
          <TourOverlay />
          <TourRestartButton />
          <TourCompletedToast />
        </TourProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);

