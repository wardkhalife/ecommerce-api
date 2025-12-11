import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function AdminDashboard() {
  const { user } = useAuth();

  return (
    <div className="auth-container">
      <h1 className="auth-title">Dashboard Admin</h1>

      <p style={{ marginBottom: "20px" }}>
        Bonjour <strong>{user?.name}</strong> ({user?.email})
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        <Link
          to="/admin/register"
          style={{
            padding: "10px 14px",
            background: "#007bff",
            color: "white",
            borderRadius: "6px",
            textAlign: "center",
            textDecoration: "none",
          }}
        >
          Créer un nouvel admin
        </Link>

        <Link
          to="/products"
          style={{
            padding: "10px 14px",
            background: "#28a745",
            color: "white",
            borderRadius: "6px",
            textAlign: "center",
            textDecoration: "none",
          }}
        >
          Gérer les produits
        </Link>
      </div>
    </div>
  );
}
