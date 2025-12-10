import { gql } from 'apollo-server-express'

export const typeDefs = gql`
  "Rôle de l'utilisateur (client ou admin)"
  enum Role {
    CUSTOMER
    ADMIN
  }

  "Statut d'une commande"
  enum OrderStatus {
    PENDING
    PAID
    SHIPPED
    DELIVERED
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

  "Commande passée par un utilisateur"
  type Order {
    id: ID!
    totalAmount: Float!
    status: OrderStatus!
    createdAt: String
    items: [OrderItem!]!
  }

  "Payload de connexion"
  type AuthPayload {
    token: String!
    user: User!
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
  }

  type Mutation {
    "Créer un compte client"
    register(name: String!, email: String!, password: String!): User!

    "Se connecter et récupérer un token JWT"
    login(email: String!, password: String!): AuthPayload!

    "Ajouter un produit au panier"
    addToCart(productId: ID!, quantity: Int!): Cart!

    "Valider le panier et créer une commande"
    checkout: Order!

    "Créer un produit (ADMIN seulement)"
    createProduct(
      name: String!
      description: String
      price: Float!
      stockQuantity: Int!
    ): Product!
  }
`
