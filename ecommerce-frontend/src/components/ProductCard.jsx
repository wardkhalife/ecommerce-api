import { Link } from "react-router-dom";

export default function ProductCard({ product }) {
  return (
    <div
      style={{
        background: "white",
        padding: "20px",
        borderRadius: "10px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
      }}
    >
      <img
        src="https://via.placeholder.com/300x200"
        alt={product.name}
        style={{
          width: "100%",
          borderRadius: "8px",
          marginBottom: "10px",
        }}
      />

      <h3>{product.name}</h3>
      <p style={{ color: "#555" }}>{product.description}</p>
      <p style={{ fontWeight: 600, fontSize: "18px" }}>{product.price} €</p>

      <Link
        to={`/product/${product.id}`}
        style={{
          marginTop: "10px",
          display: "inline-block",
          padding: "8px 12px",
          background: "#007bff",
          color: "white",
          borderRadius: "5px",
        }}
      >
        Voir le produit
      </Link>
    </div>
  );
}
