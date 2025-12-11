import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import xss from 'xss'
import { AuthenticationError, ForbiddenError } from 'apollo-server-express'
import { prisma } from '../prisma.js'

export const resolvers = {
  // ======================
  //        QUERIES
  // ======================
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
          payments: true,
        },
      })
    },

    // Liste des avis pour un produit
    productReviews: async (_, { productId }) => {
      return prisma.review.findMany({
        where: { productId: parseInt(productId, 10) },
        include: {
          user: true,
          product: true,
        },
        orderBy: { id: 'desc' },
      })
    },

    // API externe simulée (tu peux la remplacer par un vrai fetch plus tard)
  exchangeRate: async (_, { target }) => {
  const upper = target.toUpperCase()

  // Petit contrôle d’entrée
  if (!/^[A-Z]{3}$/.test(upper)) {
    throw new Error('Code devise invalide (ex: USD, GBP, JPY)')
  }

  // API publique : https://api.frankfurter.app
  const url = `https://api.frankfurter.app/latest?from=EUR&to=${upper}`

  try {
    const res = await fetch(url)

    if (!res.ok) {
      throw new Error(`Erreur API externe (status ${res.status})`)
    }

    const data = await res.json()

    const rate = data.rates[upper]
    if (!rate) {
      throw new Error(`Devise ${upper} non supportée par l'API externe`)
    }

    return {
      base: 'EUR',
      target: upper,
      rate,
      date: data.date,
    }
  } catch (err) {
    console.error('Erreur exchangeRate API externe:', err.message)
    throw new Error("Impossible de récupérer le taux de change pour l'instant")
  }
},

searchAddress: async (_, { keyword, limit = 5 }) => {
  const q = keyword.trim()
  if (!q) {
    throw new Error('Le mot-clé ne peut pas être vide')
  }

  // API Nominatim (OpenStreetMap)
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
    q
  )}&limit=${limit}`

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'ecommerce-api-demo/1.0 (contact@example.com)',
      },
    })

    if (!res.ok) {
      throw new Error(`Erreur API OpenStreetMap (status ${res.status})`)
    }

    const data = await res.json()

    // On mappe vers notre type AddressSuggestion
    return data.map((item) => ({
      displayName: item.display_name || 'Adresse',
      lat: parseFloat(item.lat),
      lon: parseFloat(item.lon),
    }))
  } catch (err) {
    console.error('Erreur searchAddress OSM:', err.message)
    throw new Error("Impossible de récupérer les adresses pour l'instant")
  }
},

pickupPoints: async (_, { postalCode, limit = 5 }) => {
  const trimmed = postalCode.trim()

  // simple validation du code postal
  if (!/^\d{5}$/.test(trimmed)) {
    throw new Error(
      'Code postal invalide (format attendu : 5 chiffres, ex: 75001)'
    )
  }

  // Requête Overpass API basée sur OpenStreetMap
  // On cherche des points de type :
  // - parcel_locker (lockers de colis)
  // - post_office (La Poste)
  // - parcel_pickup
  // dans le même code postal
  const overpassQuery = `
    [out:json][timeout:25];
    (
      node["amenity"="parcel_locker"]["addr:postcode"="${trimmed}"];
      node["amenity"="post_office"]["addr:postcode"="${trimmed}"];
      node["amenity"="parcel_pickup"]["addr:postcode"="${trimmed}"];
      node["shop"="parcel_locker"]["addr:postcode"="${trimmed}"];
    );
    out ${limit};
  `

  const url = 'https://overpass-api.de/api/interpreter'

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain',
      },
      body: overpassQuery,
    })

    if (!res.ok) {
      throw new Error(`Erreur Overpass (status ${res.status})`)
    }

    const data = await res.json()

    if (!data.elements || data.elements.length === 0) {
      return []
    }

    // Mapping → type GraphQL PickupPoint
    return data.elements.slice(0, limit).map((e) => {
      const tags = e.tags || {}
      const street = tags['addr:street'] || ''
      const num = tags['addr:housenumber'] || ''
      const address =
        [num, street].filter((part) => part && part.trim() !== '').join(' ') ||
        street ||
        ''

      return {
        name: tags.name || 'Point relais',
        address,
        city: tags['addr:city'] || '',
        postalCode: tags['addr:postcode'] || trimmed,
      }
    })
  } catch (err) {
    console.error('Erreur pickupPoints (OSM / Overpass):', err.message)
    throw new Error("Impossible de récupérer les points relais pour l'instant")
  }
},



    // Recommandation simple basée sur l'historique d'achat
    recommendedProducts: async (_, { limit = 5 }) => {
      const items = await prisma.orderItem.findMany({
        include: { product: true },
      })

      if (items.length === 0) {
        return prisma.product.findMany({ take: limit })
      }

      const stats = new Map() // productId -> { product, count }

      for (const item of items) {
        const existing = stats.get(item.productId) || {
          product: item.product,
          count: 0,
        }
        existing.count += item.quantity
        stats.set(item.productId, existing)
      }

      const sorted = Array.from(stats.values())
        .sort((a, b) => b.count - a.count)
        .slice(0, limit)
        .map((entry) => entry.product)

      return sorted
    },
  },

  // ======================
  //       MUTATIONS
  // ======================
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

checkout: async (_, { deliveryMode = 'HOME', address, city, postalCode }, ctx) => {
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

  // On peut imposer une adresse pour HOME
  if (deliveryMode === 'HOME') {
    if (!address || !city || !postalCode) {
      throw new Error(
        "Pour une livraison à domicile, address, city et postalCode sont obligatoires."
      )
    }
  }

  const order = await prisma.$transaction(async (tx) => {
    const newOrder = await tx.order.create({
      data: {
        userId: ctx.user.id,
        totalAmount,
        status: 'PENDING',
        deliveryMode,
        shippingAddress: address || null,
        shippingCity: city || null,
        shippingPostalCode: postalCode || null,
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


     await tx.payment.create({
    data: {
      orderId: newOrder.id,
      amount: totalAmount,
      status: 'SUCCESS',
      method: 'CARD',
    },
  })
  
    // ici tu peux aussi créer un Payment comme avant si tu l'avais déjà
    return newOrder
  })

  return prisma.order.findUnique({
    where: { id: order.id },
    include: {
      items: { include: { product: true } },
      payments: true,
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

    // Mise à jour produit (ADMIN)
    updateProduct: async (
      _,
      { id, name, description, price, stockQuantity },
      ctx
    ) => {
      if (!ctx.user || ctx.user.role !== 'ADMIN') {
        throw new ForbiddenError('Accès réservé aux admins')
      }

      const data = {}
      if (name !== undefined) data.name = name
      if (description !== undefined) data.description = description
      if (price !== undefined) data.price = price
      if (stockQuantity !== undefined) data.stockQuantity = stockQuantity

      return prisma.product.update({
        where: { id: parseInt(id, 10) },
        data,
      })
    },

    // Suppression de produit (ADMIN)
    deleteProduct: async (_, { id }, ctx) => {
      if (!ctx.user || ctx.user.role !== 'ADMIN') {
        throw new ForbiddenError('Accès réservé aux admins')
      }

      await prisma.product.delete({
        where: { id: parseInt(id, 10) },
      })

      return true
    },

    // Ajouter un avis
    addReview: async (_, { productId, rating, comment }, ctx) => {
      if (!ctx.user) {
        throw new AuthenticationError(
          'Vous devez être connecté pour ajouter un avis'
        )
      }

      if (rating < 1 || rating > 5) {
        throw new Error('La note doit être entre 1 et 5')
      }

      const product = await prisma.product.findUnique({
        where: { id: parseInt(productId, 10) },
      })
      if (!product) {
        throw new Error('Produit introuvable')
      }

      const safeComment = comment ? xss(comment) : ''

      const review = await prisma.review.create({
        data: {
          rating,
          comment: safeComment,
          productId: product.id,
          userId: ctx.user.id,
        },
        include: {
          user: true,
          product: true,
        },
      })

      return review
    },

    // Supprimer un avis
    deleteReview: async (_, { reviewId }, ctx) => {
      if (!ctx.user) {
        throw new AuthenticationError('Vous devez être connecté')
      }

      const id = parseInt(reviewId, 10)

      const review = await prisma.review.findUnique({
        where: { id },
      })

      if (!review) {
        throw new Error('Avis introuvable')
      }

      const isOwner = review.userId === ctx.user.id
      const isAdmin = ctx.user.role === 'ADMIN'

      if (!isOwner && !isAdmin) {
        throw new ForbiddenError('Vous ne pouvez pas supprimer cet avis')
      }

      await prisma.review.delete({
        where: { id },
      })

      return true
    },

    // Mettre à jour le statut d'une commande (ADMIN)
    updateOrderStatus: async (_, { orderId, status }, ctx) => {
      if (!ctx.user) {
        throw new AuthenticationError('Vous devez être connecté')
      }
      if (ctx.user.role !== 'ADMIN') {
        throw new ForbiddenError('Accès réservé aux admins')
      }

      const id = parseInt(orderId, 10)

      const order = await prisma.order.update({
        where: { id },
        data: { status },
        include: {
          items: { include: { product: true } },
          payments: true,
        },
      })

      return order
    },

    // Annuler une commande
    cancelOrder: async (_, { orderId }, ctx) => {
      if (!ctx.user) {
        throw new AuthenticationError('Vous devez être connecté')
      }

      const id = parseInt(orderId, 10)

      const order = await prisma.order.findUnique({
        where: { id },
      })

      if (!order) {
        throw new Error('Commande introuvable')
      }

      const isOwner = order.userId === ctx.user.id
      const isAdmin = ctx.user.role === 'ADMIN'

      if (!isOwner && !isAdmin) {
        throw new ForbiddenError('Vous ne pouvez pas annuler cette commande')
      }

      if (
        order.status === 'SHIPPED' ||
        order.status === 'DELIVERED' ||
        order.status === 'CANCELLED'
      ) {
        throw new Error(
          "Cette commande ne peut plus être annulée (déjà expédiée, livrée ou annulée)."
        )
      }

      const updated = await prisma.order.update({
        where: { id },
        data: { status: 'CANCELLED' },
        include: {
          items: { include: { product: true } },
          payments: true,
        },
      })

      return updated
    },

    // Modifier le profil de l'utilisateur connecté
    updateProfile: async (_, { name, email, password }, ctx) => {
      if (!ctx.user) {
        throw new AuthenticationError('Vous devez être connecté')
      }

      const data = {}

      if (name !== undefined) data.name = name

      if (email !== undefined) {
        const existing = await prisma.user.findUnique({ where: { email } })
        if (existing && existing.id !== ctx.user.id) {
          throw new Error("Cet email est déjà utilisé par un autre compte")
        }
        data.email = email
      }

      if (password !== undefined && password !== '') {
        const hashed = await bcrypt.hash(password, 10)
        data.password = hashed
      }

      const updated = await prisma.user.update({
        where: { id: ctx.user.id },
        data,
      })

      return {
        id: updated.id,
        name: updated.name,
        email: updated.email,
        role: updated.role,
      }
    },

    // Supprimer le compte utilisateur
    deleteAccount: async (_, __, ctx) => {
      if (!ctx.user) {
        throw new AuthenticationError('Vous devez être connecté')
      }

      const orderCount = await prisma.order.count({
        where: { userId: ctx.user.id },
      })

      if (orderCount > 0) {
        throw new Error(
          "Impossible de supprimer un compte ayant déjà des commandes (on conserve l'historique)."
        )
      }

      await prisma.user.delete({
        where: { id: ctx.user.id },
      })

      return true
    },
  },

  // ======================
  //  TYPE-LEVEL RESOLVERS
  // ======================
  Cart: {
    items: (parent) => parent.items,
    total: (parent) => parent.total,
  },

  Product: {
    reviews: (parent) => {
      return prisma.review.findMany({
        where: { productId: parent.id },
        orderBy: { id: 'desc' },
      })
    },
  },

  Review: {
    user: (parent) => {
      return prisma.user.findUnique({
        where: { id: parent.userId },
      })
    },
    product: (parent) => {
      return prisma.product.findUnique({
        where: { id: parent.productId },
      })
    },
  },

  Order: {
    payments: (parent) => {
      return prisma.payment.findMany({
        where: { orderId: parent.id },
        orderBy: { createdAt: 'desc' },
      })
    },
  },
}
