import express from "express";
import { prisma } from "../prisma.js";
import { authMiddleware } from "../middleware/auth.middleware.js";

const router = express.Router();

// Vérifie le rôle ADMIN
function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== "ADMIN") {
    return res.status(403).json({ error: "Accès réservé aux admins" });
  }
  next();
}

// -----------------------------
// POST /products  → créer produit
// -----------------------------
router.post("/", authMiddleware, requireAdmin, async (req, res) => {
  try {
    let { name, description, price, stockQuantity, categoryId } = req.body;

    if (!name || !description || price == null || stockQuantity == null) {
      return res.status(400).json({
        error: "name, description, price, stockQuantity sont obligatoires",
      });
    }

    // Convertir types correctement
    price = parseFloat(price);
    stockQuantity = parseInt(stockQuantity, 10);

    if (isNaN(price) || isNaN(stockQuantity)) {
      return res.status(400).json({ error: "Prix et stock doivent être numériques" });
    }

    // Catégorie optionnelle
    if (!categoryId || categoryId === "") {
      categoryId = null;
    } else {
      categoryId = parseInt(categoryId, 10);
    }

    const product = await prisma.product.create({
      data: {
        name,
        description,
        price,
        stockQuantity,
        categoryId,
      },
    });

    return res.status(201).json(product);
  } catch (err) {
    console.error("Erreur création produit :", err);
    return res.status(500).json({ error: "Erreur serveur interne" });
  }
});

// -----------------------------
// PUT /products/:id  → modifier produit
// -----------------------------
router.put("/:id", authMiddleware, requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);

    let { name, description, price, stockQuantity, categoryId } = req.body;

    if (price !== undefined) price = parseFloat(price);
    if (stockQuantity !== undefined) stockQuantity = parseInt(stockQuantity, 10);

    if (!categoryId || categoryId === "") categoryId = null;

    const updated = await prisma.product.update({
      where: { id },
      data: { name, description, price, stockQuantity, categoryId },
    });

    res.json(updated);
  } catch (err) {
    console.error("Erreur mise à jour produit :", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// -----------------------------
// DELETE /products/:id  → supprimer produit
// -----------------------------
router.delete("/:id", authMiddleware, requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);

    await prisma.product.delete({ where: { id } });

    res.json({ message: "Produit supprimé" });
  } catch (err) {
    console.error("Erreur suppression produit :", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// -----------------------------
// GET /products → liste produits
// -----------------------------
router.get("/", async (req, res) => {
  try {
    const products = await prisma.product.findMany({
      include: { category: true },
    });
    res.json(products);
  } catch (err) {
    console.error("Erreur chargement produits :", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

export default router;
