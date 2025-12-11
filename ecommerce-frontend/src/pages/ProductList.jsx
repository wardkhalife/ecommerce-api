import { useEffect, useState } from "react";
import axiosClient from "../api/axiosClient";
import ProductCard from "../components/ProductCard";

export default function ProductList() {
  const [products, setProducts] = useState([]);

  useEffect(() => {
    axiosClient
      .get("/products")
      .then((res) => setProducts(res.data))
      .catch((err) => console.error("Erreur produits :", err));
  }, []);

  return (
    <div>
      <h1>Nos Produits</h1>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))",
          gap: "20px",
          marginTop: "30px",
        }}
      >
        {products.length > 0 ? (
          products.map((p) => <ProductCard key={p.id} product={p} />)
        ) : (
          <p>Aucun produit trouvé.</p>
        )}
      </div>
    </div>
  );
}
