import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { AuthenticationError, ForbiddenError } from 'apollo-server-express'
import { prisma } from '../prisma.js'

export const resolvers = {
  Query: {
    // Renvoie l'utilisateur connecté
    me: async (_, __, ctx) => {
      return ctx.user || null
    },

    // Liste de tous les produits
    products: async () => {
      return prisma.product.findMany()
    },

    // Détail d'un produit
    product: async (_, { id }) => {
      return prisma.product.findUnique({
        where: { id: parseInt(id, 10) },
      })
    },

    // 🔍 Recherche de produits par mot-clé
    searchProducts: async (_, { keyword }) => {
      return prisma.product.findMany({
        where: {
          OR: [
            { name: { contains: keyword, mode: 'insensitive' } },
            { description: { contains: keyword, mode: 'insensitive' } },
          ],
        },
      })
    },

    // Panier de l'utilisateur connecté
    myCart: async (_, __, ctx) => {
      if (!ctx.user) {
        throw new AuthenticationError(
          'Vous devez être connecté pour voir votre panier'
        )
      }

      let cart = await prisma.cart.findUnique({
        where: { userId: ctx.user.id },
        include: {
          items: {
            include: { product: true },
          },
        },
      })

      // Si pas de panier → on le crée
      if (!cart) {
        cart = await prisma.cart.create({
          data: { userId: ctx.user.id },
          include: {
            items: { include: { product: true } },
          },
        })
      }

      const total = cart.items.reduce(
        (sum, item) => sum + item.quantity * item.product.price,
        0
      )

      return {
        id: cart.id,
        items: cart.items,
        total,
      }
    },

    // Commandes de l'utilisateur connecté
    myOrders: async (_, __, ctx) => {
      if (!ctx.user) {
        throw new AuthenticationError(
          'Vous devez être connecté pour voir vos commandes'
        )
      }

      return prisma.order.findMany({
        where: { userId: ctx.user.id },
        orderBy: { createdAt: 'desc' },
        include: {
          items: { include: { product: true } },
        },
      })
    },
  },

  Mutation: {
    // Inscription d'un utilisateur
    register: async (_, { name, email, password }) => {
      const existing = await prisma.user.findUnique({ where: { email } })
      if (existing) {
        throw new Error('Un compte existe déjà avec cet email')
      }

      const hashed = await bcrypt.hash(password, 10)

      const user = await prisma.user.create({
        data: {
          name,
          email,
          password: hashed,
          role: 'CUSTOMER',
        },
      })

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      }
    },

    // Connexion d'un utilisateur
    login: async (_, { email, password }) => {
      const user = await prisma.user.findUnique({ where: { email } })
      if (!user) {
        throw new Error('Identifiants invalides')
      }

      const match = await bcrypt.compare(password, user.password)
      if (!match) {
        throw new Error('Identifiants invalides')
      }

      const token = jwt.sign(
        { sub: user.id, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      )

      return {
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      }
    },

    // Ajouter un produit au panier
    addToCart: async (_, { productId, quantity }, ctx) => {
      if (!ctx.user) {
        throw new AuthenticationError(
          'Vous devez être connecté pour ajouter au panier'
        )
      }

      const product = await prisma.product.findUnique({
        where: { id: parseInt(productId, 10) },
      })
      if (!product) {
        throw new Error('Produit introuvable')
      }

      // Récupérer ou créer le panier
      let cart = await prisma.cart.findUnique({
        where: { userId: ctx.user.id },
      })

      if (!cart) {
        cart = await prisma.cart.create({
          data: { userId: ctx.user.id },
        })
      }

      const existingItem = await prisma.cartItem.findFirst({
        where: {
          cartId: cart.id,
          productId: product.id,
        },
      })

      if (existingItem) {
        await prisma.cartItem.update({
          where: { id: existingItem.id },
          data: { quantity: existingItem.quantity + quantity },
        })
      } else {
        await prisma.cartItem.create({
          data: {
            cartId: cart.id,
            productId: product.id,
            quantity,
          },
        })
      }

      // Renvoi du panier mis à jour
      cart = await prisma.cart.findUnique({
        where: { userId: ctx.user.id },
        include: {
          items: { include: { product: true } },
        },
      })

      const total = cart.items.reduce(
        (sum, item) => sum + item.quantity * item.product.price,
        0
      )

      return {
        id: cart.id,
        items: cart.items,
        total,
      }
    },

    // Valider une commande (checkout)
    checkout: async (_, __, ctx) => {
      if (!ctx.user) {
        throw new AuthenticationError(
          'Vous devez être connecté pour valider une commande'
        )
      }

      const cart = await prisma.cart.findUnique({
        where: { userId: ctx.user.id },
        include: {
          items: {
            include: { product: true },
          },
        },
      })

      if (!cart || cart.items.length === 0) {
        throw new Error('Panier vide')
      }

      const totalAmount = cart.items.reduce(
        (sum, item) => sum + item.quantity * item.product.price,
        0
      )

      const order = await prisma.$transaction(async (tx) => {
        const newOrder = await tx.order.create({
          data: {
            userId: ctx.user.id,
            totalAmount,
            status: 'PENDING',
          },
        })

        const orderItemsData = cart.items.map((item) => ({
          orderId: newOrder.id,
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.product.price,
        }))

        await tx.orderItem.createMany({
          data: orderItemsData,
        })

        await tx.cartItem.deleteMany({
          where: { cartId: cart.id },
        })

        return newOrder
      })

      return prisma.order.findUnique({
        where: { id: order.id },
        include: {
          items: { include: { product: true } },
        },
      })
    },

    // Création de produit (ADMIN seulement)
    createProduct: async (
      _,
      { name, description, price, stockQuantity },
      ctx
    ) => {
      if (!ctx.user) {
        throw new AuthenticationError('Vous devez être connecté')
      }

      if (ctx.user.role !== 'ADMIN') {
        throw new ForbiddenError('Accès réservé aux admins')
      }

      const product = await prisma.product.create({
        data: {
          name,
          description,
          price,
          stockQuantity,
        },
      })

      return product
    },
  },

  // Resolvers pour les types imbriqués
  Cart: {
    items: (parent) => parent.items,
    total: (parent) => parent.total,
  },
}
