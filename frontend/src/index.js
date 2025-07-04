import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";

import "assets/plugins/nucleo/css/nucleo.css";
import "@fortawesome/fontawesome-free/css/all.min.css";
import "assets/scss/argon-dashboard-react.scss";
// import "assets/css/custom-styles.css";
import AdminLayout from "layouts/Admin.js";
import AuthLayout from "layouts/Auth.js";
import StandaloneLayout from "./views/buisness/StandaloneLayout";
import BusinessRegistrationGuard from "./views/buisness/BusinessRegistrationGuard";

import TTSProvider from './components/TTS/TTSProvider.jsx';

const root = ReactDOM.createRoot(document.getElementById("root"));

root.render(
  <BrowserRouter>
  <TTSProvider>
    <Routes>
      <Route
        path="/admin/*"
        element={
          <BusinessRegistrationGuard>
            <AdminLayout />
          </BusinessRegistrationGuard>
        }
      />
      <Route path="/auth/*" element={<AuthLayout />} />
      <Route path="/standalone/*" element={<StandaloneLayout />} />
      <Route path="*" element={<Navigate to="/auth/login" replace />} />
    </Routes>
    </TTSProvider>
  </BrowserRouter>
);