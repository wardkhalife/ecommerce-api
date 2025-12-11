// src/pages/AdminProducts.jsx
import { useEffect, useState } from "react";
import axiosClient from "../api/axiosClient";
import { useAuth } from "../context/AuthContext";

export default function AdminProducts() {
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState({
    name: "",
    description: "",
    price: "",
    stockQuantity: "",
  });
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    const res = await axiosClient.get("/products");
    setProducts(res.data);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (editingId) {
      // update
      await axiosClient.put(`/products/${editingId}`, form, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
    } else {
      // create
      await axiosClient.post("/products", form, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
    }

    setForm({ name: "", description: "", price: "", stockQuantity: "" });
    setEditingId(null);
    loadProducts();
  };

  const handleEdit = (p) => {
    setForm(p);
    setEditingId(p.id);
  };

  const handleDelete = async (id) => {
    await axiosClient.delete(`/products/${id}`, {
      headers: { Authorization: `Bearer ${user.token}` },
    });
    loadProducts();
  };

  return (
    <div style={{ maxWidth: "900px", margin: "0 auto" }}>
      <h2>Gestion des Produits</h2>

      {/* Formulaire Add/Edit */}
      <form onSubmit={handleSubmit} style={{ marginBottom: "30px" }}>
        <input
          type="text"
          placeholder="Nom"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
        <input
          type="text"
          placeholder="Description"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
        <input
          type="number"
          placeholder="Prix"
          value={form.price}
          onChange={(e) => setForm({ ...form, price: e.target.value })}
        />
        <input
          type="number"
          placeholder="Stock"
          value={form.stockQuantity}
          onChange={(e) =>
            setForm({ ...form, stockQuantity: e.target.value })
          }
        />

        <button type="submit" style={{ marginTop: "10px" }}>
          {editingId ? "Modifier" : "Ajouter"} le produit
        </button>
      </form>

      {/* Tableau Produits */}
      <table width="100%" style={{ borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th>Nom</th>
            <th>Prix</th>
            <th>Stock</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {products.map((p) => (
            <tr key={p.id}>
              <td>{p.name}</td>
              <td>{p.price} €</td>
              <td>{p.stockQuantity}</td>
              <td>
                <button onClick={() => handleEdit(p)}>Modifier</button>
                <button
                  onClick={() => handleDelete(p.id)}
                  style={{ marginLeft: "10px", color: "red" }}
                >
                  Supprimer
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
