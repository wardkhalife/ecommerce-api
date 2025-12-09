import express from 'express'
import { prisma } from '../prisma.js'
import { authMiddleware } from '../middleware/auth.middleware.js'

const router = express.Router()

// GET /products : liste de tous les produits
router.get('/', async (req, res) => {
  try {
    const products = await prisma.product.findMany({
      include: {
        category: true,
      },
    })
    res.json(products)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

// GET /products/:id : détail d'un produit
router.get('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10)
    const product = await prisma.product.findUnique({
      where: { id },
      include: { category: true, reviews: true },
    })

    if (!product) {
      return res.status(404).json({ error: 'Produit non trouvé' })
    }

    res.json(product)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

// Middleware pour vérifier le rôle ADMIN
function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Accès réservé aux admins' })
  }
  next()
}

// POST /products : création produit (ADMIN seulement)
router.post('/', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { name, description, price, stockQuantity, categoryId } = req.body

    if (!name || !description || price == null || stockQuantity == null) {
      return res.status(400).json({
        error: 'name, description, price et stockQuantity sont obligatoires',
      })
    }

    const product = await prisma.product.create({
      data: {
        name,
        description,
        price: parseFloat(price),
        stockQuantity: parseInt(stockQuantity, 10),
        categoryId: categoryId ?? null,
      },
    })

    res.status(201).json(product)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

export default router
