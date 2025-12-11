import Navbar from "./Navbar";

export default function Layout({ children }) {
  return (
    <div style={{ padding: "20px" }}>
      <Navbar />
      <main style={{ marginTop: "40px" }}>
        {children}
      </main>
    </div>
  );
}
