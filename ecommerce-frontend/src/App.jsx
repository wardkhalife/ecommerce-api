import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";

import Layout from "./components/Layout";

// Pages user
import ProductList from "./pages/ProductList";
import Cart from "./pages/Cart";
import Orders from "./pages/Orders";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Checkout from "./pages/Checkout";
import ProductDetails from "./pages/ProductDetails";
import MapPoint from "./pages/MapPoint";

// Admin
import AdminRoute from "./components/AdminRoute";
import AdminDashboard from "./pages/AdminDashboard";
import RegisterAdmin from "./pages/RegisterAdmin";
import AdminProducts from "./pages/AdminProducts";

function AppRoutes() {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";

  return (
    <Layout>
      <Routes>
        {/* ACCUEIL : redirection automatique */}
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

        {/* LOGIN */}
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

        {/* REGISTER */}
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

        {/* ROUTES ADMIN */}
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <AdminDashboard />
            </AdminRoute>
          }
        />

        <Route
          path="/admin/products"
          element={
            <AdminRoute>
              <AdminProducts />
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

        {/* ROUTES USER */}
        <Route
          path="/products"
          element={user ? <ProductList /> : <Navigate to="/login" />}
        />

        <Route
          path="/product/:id"
          element={user ? <ProductDetails /> : <Navigate to="/login" />}
        />

        <Route path="/cart" element={user ? <Cart /> : <Navigate to="/login" />} />
        <Route
          path="/orders"
          element={user ? <Orders /> : <Navigate to="/login" />}
        />
        <Route
          path="/checkout"
          element={user ? <Checkout /> : <Navigate to="/login" />}
        />
        <Route path="/map" element={user ? <MapPoint /> : <Navigate to="/login" />} />
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
