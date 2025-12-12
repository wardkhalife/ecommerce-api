import express from 'express'
import { prisma } from '../prisma.js'
import { authMiddleware } from '../middleware/auth.middleware.js'

const router = express.Router()

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

    // --- 2. VALIDATION DES CHAMPS D'ADRESSE ---
    if (!shippingAddress || !shippingCity || !shippingPostalCode) {
      return res.status(400).json({ 
        error: 'L\'adresse de livraison complète (adresse, ville, code postal) est obligatoire.' 
      })
    }
    
    // --- 3. RÉCUPÉRATION DU PANIER (avec produits) ---
    // Inclure les images n'est pas nécessaire ici, mais on s'assure d'avoir le prix et la stockQuantity
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
      // Pour être précis, on devrait ajouter le coût de livraison ici
      return sum + item.quantity * item.product.price
    }, 0)


    // Créer la commande + items + déstockage dans une TRANSACTION
    const order = await prisma.$transaction(async (tx) => {
      
      // A. VÉRIFIER ET DÉCRÉMENTER LE STOCK POUR CHAQUE ARTICLE
      for (const item of cart.items) {
        const product = item.product;
        const requestedQuantity = item.quantity;
        
        if (product.stockQuantity < requestedQuantity) {
          // Lancer une erreur qui annulera la transaction
          throw new Error(`Stock insuffisant pour le produit: ${product.name}. Stock disponible: ${product.stockQuantity}`);
        }

        // Décrémenter le stock dans la transaction (tx)
        await tx.product.update({
          where: { id: product.id },
          data: {
            stockQuantity: {
              decrement: requestedQuantity,
            },
          },
        });
      }
      // 
      

      // B. CRÉATION DE LA COMMANDE
      const newOrder = await tx.order.create({
        data: {
          userId,
          totalAmount,
          status: 'PENDING',
          shippingAddress: shippingAddress,
          shippingCity: shippingCity,
          shippingPostalCode: shippingPostalCode,
          deliveryMode: deliveryMode, 
        },
      })

      // C. CRÉATION DES ORDER ITEMS
      const orderItemsData = cart.items.map((item) => ({
        orderId: newOrder.id,
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.product.price,
      }))

      await tx.orderItem.createMany({
        data: orderItemsData,
      })

      // D. VIDAGE DU PANIER
      await tx.cartItem.deleteMany({
        where: { cartId: cart.id },
      })

      return newOrder
    })

    // recharger la commande avec les détails (hors transaction)
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
    
    // Si l'erreur provient de la transaction (comme le stock insuffisant),
    // renvoyer un message clair au front-end.
    if (err.message && err.message.includes('Stock insuffisant')) {
        return res.status(400).json({ error: err.message });
    }

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
