import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { prisma } from '../prisma.js'

export const resolvers = {
  Query: {
    me: async (_, __, ctx) => {
      return ctx.user || null
    },

    products: async () => {
      return prisma.product.findMany()
    },

    product: async (_, { id }) => {
      return prisma.product.findUnique({
        where: { id: parseInt(id, 10) },
      })
    },

    myCart: async (_, __, ctx) => {
      if (!ctx.user) return null

      let cart = await prisma.cart.findUnique({
        where: { userId: ctx.user.id },
        include: {
          items: {
            include: { product: true },
          },
        },
      })

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

    myOrders: async (_, __, ctx) => {
      if (!ctx.user) {
        throw new Error('Non authentifié')
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

    addToCart: async (_, { productId, quantity }, ctx) => {
      if (!ctx.user) {
        throw new Error('Non authentifié')
      }

      const product = await prisma.product.findUnique({
        where: { id: parseInt(productId, 10) },
      })
      if (!product) {
        throw new Error('Produit introuvable')
      }

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

      // renvoyer le panier mis à jour
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

    checkout: async (_, __, ctx) => {
      if (!ctx.user) {
        throw new Error('Non authentifié')
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

    createProduct: async (_, { name, description, price, stockQuantity }, ctx) => {
      if (!ctx.user || ctx.user.role !== 'ADMIN') {
        throw new Error('Accès réservé aux admins')
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

  // Resolvers pour imbriquer les types
  Cart: {
    items: (parent) => parent.items,
    total: (parent) => parent.total,
  },
}
