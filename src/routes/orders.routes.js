import express from 'express'
import { prisma } from '../prisma.js'
import { authMiddleware } from '../middleware/auth.middleware.js'

const router = express.Router()

// Créer une commande à partir du panier (checkout)
// Créer une commande à partir du panier (checkout)
router.post('/checkout', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id
    
    // --- 1. RÉCUPÉRATION DES CHAMPS D'ADRESSE REQUIS ---
    const { 
      shippingAddress, 
      shippingCity, 
      shippingPostalCode, 
      deliveryMode 
    } = req.body || {}

    // --- 2. VALIDATION DES CHAMPS D'ADRESSE (SIMPLIFIÉE) ---
    // Vous pouvez ajouter des validations plus strictes ici
    if (!shippingAddress || !shippingCity || !shippingPostalCode) {
      return res.status(400).json({ 
        error: 'L\'adresse de livraison complète (adresse, ville, code postal) est obligatoire.' 
      })
    }
    
    // --- 3. DÉBUT DE LA LOGIQUE EXISTANTE ---
    const cart = await prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    })

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ error: 'Panier vide, impossible de passer commande' })
    }

    const totalAmount = cart.items.reduce((sum, item) => {
      return sum + item.quantity * item.product.price
    }, 0)

    // créer la commande + items dans une transaction
    const order = await prisma.$transaction(async (tx) => {
      const newOrder = await tx.order.create({
        data: {
          userId,
          totalAmount,
          status: 'PENDING',
          // --- 4. INCLUSION DES ADRESSES ET DU MODE DE LIVRAISON ---
          shippingAddress: shippingAddress,
          shippingCity: shippingCity,
          shippingPostalCode: shippingPostalCode,
          // Utilisez le deliveryMode fourni, ou le défaut de Prisma si non fourni
          deliveryMode: deliveryMode, 
        },
      })

      // créer les OrderItem
      const orderItemsData = cart.items.map((item) => ({
        orderId: newOrder.id,
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.product.price,
      }))

      await tx.orderItem.createMany({
        data: orderItemsData,
      })

      // vider le panier
      await tx.cartItem.deleteMany({
        where: { cartId: cart.id },
      })

      return newOrder
    })

    // recharger la commande avec les détails
    const fullOrder = await prisma.order.findUnique({
      where: { id: order.id },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    })

    res.status(201).json(fullOrder)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Erreur lors du checkout' })
  }
})

// Lister les commandes de l'utilisateur connecté
router.get('/my', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id

    const orders = await prisma.order.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        items: {
          include: { product: true },
        },
      },
    })

    res.json(orders)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Erreur lors de la récupération des commandes' })
  }
})

// Détail d'une commande précise (sécurisée : doit être la commande du user)
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id
    const id = parseInt(req.params.id, 10)

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        items: {
          include: { product: true },
        },
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    })

    if (!order) {
      return res.status(404).json({ error: 'Commande introuvable' })
    }

    if (order.userId !== userId && req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Vous ne pouvez pas voir cette commande' })
    }

    res.json(order)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Erreur lors de la récupération de la commande' })
  }
})

export default router
