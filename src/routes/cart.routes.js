import express from 'express'
import { prisma } from '../prisma.js'
import { authMiddleware } from '../middleware/auth.middleware.js'

const router = express.Router()

// Récupérer le panier de l'utilisateur connecté
router.get('/my', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id

    let cart = await prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    })

    if (!cart) {
      // si pas encore de panier, on renvoie un panier vide
      cart = await prisma.cart.create({
        data: { userId },
        include: {
          items: {
            include: { product: true },
          },
        },
      })
    }

    // calcul du total
    const total = cart.items.reduce((sum, item) => {
      return sum + item.quantity * item.product.price
    }, 0)

    res.json({
      cartId: cart.id,
      userId: cart.userId,
      items: cart.items,
      total,
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

// Ajouter un produit au panier
router.post('/add', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id
    const { productId, quantity } = req.body || {}

    if (!productId || !quantity) {
      return res.status(400).json({ error: 'productId et quantity sont obligatoires' })
    }

    // vérifier que le produit existe
    const product = await prisma.product.findUnique({
      where: { id: productId },
    })

    if (!product) {
      return res.status(404).json({ error: 'Produit introuvable' })
    }

    // trouver ou créer le panier
    let cart = await prisma.cart.findUnique({
      where: { userId },
    })

    if (!cart) {
      cart = await prisma.cart.create({
        data: { userId },
      })
    }

    // voir si un item existe déjà pour ce produit
    const existingItem = await prisma.cartItem.findFirst({
      where: {
        cartId: cart.id,
        productId: productId,
      },
    })

    let updatedItem

    if (existingItem) {
      updatedItem = await prisma.cartItem.update({
        where: { id: existingItem.id },
        data: {
          quantity: existingItem.quantity + quantity,
        },
      })
    } else {
      updatedItem = await prisma.cartItem.create({
        data: {
          cartId: cart.id,
          productId,
          quantity,
        },
      })
    }

    res.status(201).json({ message: 'Produit ajouté au panier', item: updatedItem })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

// Retirer un produit du panier
router.post('/remove', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id
    const { productId } = req.body || {}

    if (!productId) {
      return res.status(400).json({ error: 'productId est obligatoire' })
    }

    const cart = await prisma.cart.findUnique({
      where: { userId },
    })

    if (!cart) {
      return res.status(404).json({ error: 'Panier introuvable' })
    }

    const item = await prisma.cartItem.findFirst({
      where: {
        cartId: cart.id,
        productId,
      },
    })

    if (!item) {
      return res.status(404).json({ error: 'Produit non présent dans le panier' })
    }

    await prisma.cartItem.delete({
      where: { id: item.id },
    })

    res.json({ message: 'Produit retiré du panier' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

// Vider le panier
router.post('/clear', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id

    const cart = await prisma.cart.findUnique({
      where: { userId },
    })

    if (!cart) {
      return res.status(404).json({ error: 'Panier introuvable' })
    }

    await prisma.cartItem.deleteMany({
      where: { cartId: cart.id },
    })

    res.json({ message: 'Panier vidé' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

export default router
