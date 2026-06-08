import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import LoginPage from "@/pages/Login";
import CadastroPage from "@/pages/Cadastro";
import HomePage from "@/pages/Home";
import UsuariosPage from "@/pages/Usuarios";
import SemPermissaoPage from "@/pages/SemPermissao";
import AppLayout from "@/layouts/AppLayout";
import { PrivateRoute } from "@/routes/PrivateRoute";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/cadastro" element={<CadastroPage />} />
        <Route path="/sem-permissao" element={<SemPermissaoPage />} />
        <Route
          element={
            <PrivateRoute>
              <AppLayout />
            </PrivateRoute>
          }
        >
          <Route path="/" element={<HomePage />} />
          <Route
            path="/usuarios"
            element={
              <PrivateRoute perfis={["Administrador"]}>
                <UsuariosPage />
              </PrivateRoute>
            }
          />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
