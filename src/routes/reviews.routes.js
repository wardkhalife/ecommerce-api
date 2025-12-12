import express from 'express'
import { prisma } from '../prisma.js'
import { authMiddleware } from '../middleware/auth.middleware.js'

const router = express.Router()

// POST /reviews : Permet à un utilisateur authentifié de laisser un avis
router.post('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id
    const { productId, rating, comment } = req.body

    // Validation
    if (!productId || rating == null || !comment) {
      return res.status(400).json({ error: 'ProductId, rating et comment sont obligatoires.' })
    }
    if (rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'La note doit être entre 1 et 5.' })
    }

    // Vérifier si le produit existe
    const productExists = await prisma.product.findUnique({
      where: { id: productId },
    })

    if (!productExists) {
      return res.status(404).json({ error: 'Produit introuvable.' })
    }

    // OPTIONNEL : Vérifier si l'utilisateur a déjà laissé un avis pour ce produit
    const existingReview = await prisma.review.findFirst({
      where: {
        userId,
        productId,
      },
    })

    if (existingReview) {
      return res.status(409).json({ error: 'Vous avez déjà laissé un avis pour ce produit.' })
    }

    // Création de l'avis
    const newReview = await prisma.review.create({
      data: {
        userId,
        productId,
        rating: parseInt(rating, 10),
        comment,
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    })

    res.status(201).json(newReview)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Erreur serveur lors de la soumission de l\'avis.' })
  }
})

export default router