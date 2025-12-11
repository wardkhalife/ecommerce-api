import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
  const { user, logout } = useAuth();

  return (
    <nav
      style={{
        background: "white",
        padding: "15px 25px",
        boxShadow: "0 2px 5px rgba(0,0,0,0.1)",
        marginBottom: "20px",
      }}
    >
      <div
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >

        {/* Logo */}
        <Link
          to="/products"
          style={{
            fontSize: "22px",
            fontWeight: 600,
            color: "#007bff",
            textDecoration: "none",
          }}
        >
          ShopEZ
        </Link>

        {/* Liens */}
        <div style={{ display: "flex", gap: "20px" }}>
          {user && (
            <>
              <Link to="/products">Produits</Link>
              <Link to="/cart">Panier</Link>
              <Link to="/orders">Commandes</Link>
            </>
          )}

          {!user ? (
            <>
              <Link to="/login">Login</Link>
              <Link to="/register">Register</Link>
            </>
          ) : (
            <button onClick={logout}>Déconnexion</button>
          )}
        </div>
      </div>
    </nav>
  );
}
