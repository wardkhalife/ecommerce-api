import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";

import Layout from "./components/Layout";

import ProductList from "./pages/ProductList";
import Cart from "./pages/Cart";
import Orders from "./pages/Orders";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Checkout from "./pages/Checkout";
import ProductDetails from "./pages/ProductDetails";
import MapPoint from "./pages/MapPoint";

import AdminRoute from "./components/AdminRoute";
import AdminDashboard from "./pages/AdminDashboard";
import RegisterAdmin from "./pages/RegisterAdmin";

function AppRoutes() {
  const { user } = useAuth();

  const isAdmin = user?.role === "ADMIN";

  return (
    <Layout>
      <Routes>
        {/* Page d'accueil → selon rôle */}
        <Route
          path="/"
          element={
            !user ? (
              <Navigate to="/login" />
            ) : isAdmin ? (
              <Navigate to="/admin" />
            ) : (
              <Navigate to="/products" />
            )
          }
        />

        {/* Pages publiques */}
        <Route
          path="/login"
          element={
            !user ? (
              <Login />
            ) : isAdmin ? (
              <Navigate to="/admin" />
            ) : (
              <Navigate to="/products" />
            )
          }
        />

        <Route
          path="/register"
          element={
            !user ? (
              <Register />
            ) : isAdmin ? (
              <Navigate to="/admin" />
            ) : (
              <Navigate to="/products" />
            )
          }
        />

        {/* PAGES ADMIN (protégées) */}
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <AdminDashboard />
            </AdminRoute>
          }
        />

        <Route
          path="/admin/register"
          element={
            <AdminRoute>
              <RegisterAdmin />
            </AdminRoute>
          }
        />

        {/* Pages protégées UTILISATEUR */}
        <Route
          path="/products"
          element={user ? <ProductList /> : <Navigate to="/login" />}
        />
        <Route
          path="/product/:id"
          element={user ? <ProductDetails /> : <Navigate to="/login" />}
        />
        <Route
          path="/cart"
          element={user ? <Cart /> : <Navigate to="/login" />}
        />
        <Route
          path="/orders"
          element={user ? <Orders /> : <Navigate to="/login" />}
        />
        <Route
          path="/checkout"
          element={user ? <Checkout /> : <Navigate to="/login" />}
        />
        <Route
          path="/map"
          element={user ? <MapPoint /> : <Navigate to="/login" />}
        />
      </Routes>
    </Layout>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
