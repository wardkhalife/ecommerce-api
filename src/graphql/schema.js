import { gql } from 'apollo-server-express'

export const typeDefs = gql`
  "Rôle de l'utilisateur (client ou admin)"
  enum Role {
    CUSTOMER
    ADMIN
  }

  "Mode de livraison"
enum DeliveryMode {
  HOME
  PICKUP_POINT
}


  "Statut d'une commande"
  enum OrderStatus {
    PENDING
    PAID
    SHIPPED
    DELIVERED
    CANCELLED
  }

  "Statut d'un paiement"
  enum PaymentStatus {
    SUCCESS
    FAILED
  }

  "Utilisateur de la plateforme"
  type User {
    id: ID!
    name: String!
    email: String!
    role: Role!
  }

  "Produit vendu sur le site"
  type Product {
    id: ID!
    name: String!
    description: String
    price: Float!
    stockQuantity: Int!
    createdAt: String
    updatedAt: String
    reviews: [Review!]!
  }

  "Élément du panier"
  type CartItem {
    id: ID!
    quantity: Int!
    product: Product!
  }

  "Panier d'un utilisateur"
  type Cart {
    id: ID!
    items: [CartItem!]!
    total: Float!
  }

  "Ligne d'une commande"
  type OrderItem {
    id: ID!
    quantity: Int!
    unitPrice: Float!
    product: Product!
  }

  "Paiement associé à une commande"
  type Payment {
    id: ID!
    amount: Float!
    status: PaymentStatus!
    method: String!
    createdAt: String!
  }

 "Commande passée par un utilisateur"
type Order {
  id: ID!
  totalAmount: Float!
  status: OrderStatus!
  createdAt: String
  items: [OrderItem!]!
  payments: [Payment!]!
  deliveryMode: DeliveryMode!
  shippingAddress: String
  shippingCity: String
  shippingPostalCode: String
}

  "Un avis client sur un produit"
  type Review {
    id: ID!
    rating: Int!
    comment: String
    createdAt: String
    user: User!
    product: Product!
  }

  "Infos de taux de change (API externe)"
  type ExchangeRate {
    base: String!
    target: String!
    rate: Float!
    date: String!
  }

  "Suggestion d'adresse via OpenStreetMap / Nominatim"
type AddressSuggestion {
  displayName: String!
  lat: Float!
  lon: Float!
}

  "Payload de connexion"
  type AuthPayload {
    token: String!
    user: User!
  }

  "Point relais / lieu de livraison"
type PickupPoint {
  name: String!
  address: String!
  city: String!
  postalCode: String!
}

  type Query {
    "Utilisateur actuellement connecté (via JWT)"
    me: User

    "Liste de tous les produits"
    products: [Product!]!

    "Détail d'un produit"
    product(id: ID!): Product

    "Recherche de produits par mot-clé (nom ou description)"
    searchProducts(keyword: String!): [Product!]!

    "Panier de l'utilisateur connecté"
    myCart: Cart

    "Commandes de l'utilisateur connecté"
    myOrders: [Order!]!

    "Liste des avis pour un produit"
    productReviews(productId: ID!): [Review!]!

    "Taux de change EUR -> target (API externe)"
    exchangeRate(target: String!): ExchangeRate!

    "Produits recommandés basés sur l'historique d'achat"
    recommendedProducts(limit: Int = 5): [Product!]!

    "Recherche d'adresses via OpenStreetMap (Nominatim)"
  searchAddress(keyword: String!, limit: Int = 5): [AddressSuggestion!]!

    "Points relais proches d'un code postal (API externe)"
    pickupPoints(postalCode: String!, limit: Int = 5): [PickupPoint!]!

  }

  type Mutation {
    "Créer un compte client"
    register(name: String!, email: String!, password: String!): User!

    "Se connecter et récupérer un token JWT"
    login(email: String!, password: String!): AuthPayload!

    "Ajouter un produit au panier"
    addToCart(productId: ID!, quantity: Int!): Cart!

"Valider le panier et créer une commande"
checkout(
  deliveryMode: DeliveryMode! = HOME
  address: String
  city: String
  postalCode: String
): Order!

    "Créer un produit (ADMIN seulement)"
    createProduct(
      name: String!
      description: String
      price: Float!
      stockQuantity: Int!
    ): Product!

    "Mettre à jour un produit (ADMIN seulement)"
    updateProduct(
      id: ID!
      name: String
      description: String
      price: Float
      stockQuantity: Int
    ): Product!

    "Supprimer un produit (ADMIN seulement)"
    deleteProduct(id: ID!): Boolean!

    "Ajouter un avis sur un produit (utilisateur connecté)"
    addReview(productId: ID!, rating: Int!, comment: String): Review!

    "Supprimer un avis (auteur ou admin)"
    deleteReview(reviewId: ID!): Boolean!

    "Mettre à jour le statut d'une commande (ADMIN = livraisons/paiements)"
    updateOrderStatus(orderId: ID!, status: OrderStatus!): Order!

    "Annuler une commande (utilisateur ou admin)"
    cancelOrder(orderId: ID!): Order!

    "Modifier le profil de l'utilisateur connecté"
    updateProfile(
      name: String
      email: String
      password: String
    ): User!

    "Supprimer le compte de l'utilisateur connecté"
    deleteAccount: Boolean!
  }
`
