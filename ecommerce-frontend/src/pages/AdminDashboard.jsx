import { useEffect, useState } from "react";
import axiosClient from "../api/axiosClient";
import { useAuth } from "../context/AuthContext";

export default function AdminProducts() {
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [editingProduct, setEditingProduct] = useState(null);

  const [form, setForm] = useState({
    name: "",
    description: "",
    price: "",
    stockQuantity: "",
    categoryId: "",
  });

  /** Charger produits */
  const fetchProducts = async () => {
    try {
      const res = await axiosClient.get("/products");
      setProducts(res.data);
    } catch (err) {
      console.error("Erreur chargement produits :", err);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  /** Formulaire changement */
  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  /** Ajouter ou modifier produit */
  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      if (editingProduct) {
        // update
        await axiosClient.put(`/products/${editingProduct.id}`, form);
      } else {
        // create
        await axiosClient.post("/products", form);
      }

      setEditingProduct(null);
      setForm({
        name: "",
        description: "",
        price: "",
        stockQuantity: "",
        categoryId: "",
      });

      fetchProducts();
    } catch (err) {
      console.error("Erreur sauvegarde produit :", err);
    }
  };

  /** Supprimer produit */
  const deleteProduct = async (id) => {
    if (!window.confirm("Supprimer ce produit ?")) return;

    try {
      await axiosClient.delete(`/products/${id}`);
      fetchProducts();
    } catch (err) {
      console.error(err);
    }
  };

  /** Préparer édition */
  const startEdit = (product) => {
    setEditingProduct(product);
    setForm({
      name: product.name,
      description: product.description,
      price: product.price,
      stockQuantity: product.stockQuantity,
      categoryId: product.categoryId ?? "",
    });
  };

  return (
    <div className="auth-container">
      <h1 className="auth-title">Gestion des produits</h1>

      <h2 style={{ marginTop: "30px" }}>
        {editingProduct ? "Modifier produit" : "Ajouter un produit"}
      </h2>

      {/* FORMULAIRE PRODUIT */}
      <form onSubmit={handleSubmit} className="auth-form">

        <input
          type="text"
          name="name"
          placeholder="Nom du produit"
          value={form.name}
          onChange={handleChange}
          required
        />

        <textarea
          name="description"
          placeholder="Description..."
          value={form.description}
          onChange={handleChange}
          required
        />

        <input
          type="number"
          name="price"
          placeholder="Prix"
          value={form.price}
          onChange={handleChange}
          required
        />

        <input
          type="number"
          name="stockQuantity"
          placeholder="Stock"
          value={form.stockQuantity}
          onChange={handleChange}
          required
        />

        <input
          type="number"
          name="categoryId"
          placeholder="ID catégorie (optionnel)"
          value={form.categoryId}
          onChange={handleChange}
        />

        <button className="btn-primary" type="submit">
          {editingProduct ? "Enregistrer modifications" : "Ajouter produit"}
        </button>

        {editingProduct && (
          <button
            type="button"
            onClick={() => {
              setEditingProduct(null);
              setForm({
                name: "",
                description: "",
                price: "",
                stockQuantity: "",
                categoryId: "",
              });
            }}
            style={{
              marginTop: "10px",
              background: "#999",
              color: "white",
              padding: "10px",
              borderRadius: "5px",
            }}
          >
            Annuler
          </button>
        )}
      </form>

      {/* LISTE DES PRODUITS */}
      <h2 style={{ marginTop: "40px" }}>Liste des produits</h2>

      <table className="admin-table">
        <thead>
          <tr>
            <th>Nom</th>
            <th>Prix</th>
            <th>Stock</th>
            <th>Description</th>
            <th>Actions</th>
          </tr>
        </thead>

        <tbody>
          {products.map((p) => (
            <tr key={p.id}>
              <td>{p.name}</td>
              <td>{p.price} €</td>
              <td>{p.stockQuantity}</td>
              <td>{p.description}</td>

              <td>
                <button
                  onClick={() => startEdit(p)}
                  style={{ marginRight: "8px" }}
                >
                  ✏ Modifier
                </button>

                <button
                  onClick={() => deleteProduct(p.id)}
                  style={{ background: "red", color: "white" }}
                >
                  🗑 Supprimer
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
