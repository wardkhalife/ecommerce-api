import { useState } from "react";
import axiosClient from "../api/axiosClient";

export default function RegisterAdmin() {
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    try {
      await axiosClient.post("/auth/register-admin", form);
      setSuccess("Nouvel admin créé avec succès ✅");
      setForm({ name: "", email: "", password: "" });
    } catch (err) {
      console.error(err);
      setError("Erreur lors de la création de l'admin");
    }
  };

  return (
    <div className="auth-container">
      <h1 className="auth-title">Créer un nouvel admin</h1>

      {error && <p className="auth-error">{error}</p>}
      {success && (
        <p style={{ color: "green", marginBottom: "10px" }}>{success}</p>
      )}

      <form className="auth-form" onSubmit={handleSubmit}>
        <input
          type="text"
          name="name"
          placeholder="Nom complet"
          value={form.name}
          onChange={handleChange}
        />

        <input
          type="email"
          name="email"
          placeholder="Adresse email"
          value={form.email}
          onChange={handleChange}
        />

        <input
          type="password"
          name="password"
          placeholder="Mot de passe"
          value={form.password}
          onChange={handleChange}
        />

        <button type="submit">Créer l’admin</button>
      </form>
    </div>
  );
}
