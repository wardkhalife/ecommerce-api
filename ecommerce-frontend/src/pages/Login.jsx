import { useState } from "react";
import axiosClient from "../api/axiosClient";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleLogin(e) {
    e.preventDefault();
    setError("");

    try {
      const response = await axiosClient.post("/auth/login", {
        email,
        password,
      });

      // On récupère user + token depuis l'API
      const { user, token } = response.data;

      // On construit un objet complet pour le contexte
      const userWithToken = { ...user, token };

      // On le stocke dans le contexte + localStorage
      login(userWithToken);

      // Redirection selon le rôle
      if (user.role === "ADMIN") {
        navigate("/admin");
      } else {
        navigate("/products");
      }
    } catch (err) {
      console.error(err);
      setError("Identifiants incorrects");
    }
  }

  return (
    <div className="auth-container">
      <h1 className="auth-title">Connexion</h1>

      {error && <p className="auth-error">{error}</p>}

      <form className="auth-form" onSubmit={handleLogin}>
        <input
          type="email"
          placeholder="Adresse email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          type="password"
          placeholder="Mot de passe"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button type="submit">Se connecter</button>
      </form>
    </div>
  );
}
