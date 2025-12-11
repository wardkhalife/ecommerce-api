import axios from "axios";

const axiosClient = axios.create({
  baseURL: "http://localhost:4000",
  headers: {
    "Content-Type": "application/json",
  },
});

// Ajout automatique du token dans chaque requête
axiosClient.interceptors.request.use((config) => {
  const user = JSON.parse(localStorage.getItem("authUser"));

  if (user?.token) {
    config.headers.Authorization = `Bearer ${user.token}`;
  }

  return config;
});

export default axiosClient;
