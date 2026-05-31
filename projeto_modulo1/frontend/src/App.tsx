import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import LoginPage from "@/pages/Login";
import HomePage from "@/pages/Home";
import SemPermissaoPage from "@/pages/SemPermissao";
import AppLayout from "@/layouts/AppLayout";
import { PrivateRoute } from "@/routes/PrivateRoute";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/sem-permissao" element={<SemPermissaoPage />} />
        <Route
          element={
            <PrivateRoute>
              <AppLayout />
            </PrivateRoute>
          }
        >
          <Route path="/" element={<HomePage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
