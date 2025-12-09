import { gql } from 'apollo-server-express'

export const typeDefs = gql`
  enum Role {
    ADMIN
    CUSTOMER
  }

  enum OrderStatus {
    PENDING
    PAID
    SHIPPED
    DELIVERED
    CANCELLED
  }

  type User {
    id: ID!
    name: String!
    email: String!
    role: Role!
  }

  type Product {
    id: ID!
    name: String!
    description: String!
    price: Float!
    stockQuantity: Int!
    category: Category
  }

  type Category {
    id: ID!
    name: String!
    products: [Product!]!
  }

  type CartItem {
    id: ID!
    quantity: Int!
    product: Product!
  }

  type Cart {
    id: ID!
    items: [CartItem!]!
    total: Float!
  }

  type OrderItem {
    id: ID!
    quantity: Int!
    unitPrice: Float!
    product: Product!
  }

  type Order {
    id: ID!
    status: OrderStatus!
    totalAmount: Float!
    createdAt: String!
    items: [OrderItem!]!
  }

  type AuthPayload {
    token: String!
    user: User!
  }

  type Query {
    me: User
    products: [Product!]!
    product(id: ID!): Product
    myCart: Cart
    myOrders: [Order!]!
  }

  type Mutation {
    register(name: String!, email: String!, password: String!): User!
    login(email: String!, password: String!): AuthPayload!
    addToCart(productId: ID!, quantity: Int!): Cart!
    checkout: Order!
    createProduct(
      name: String!
      description: String!
      price: Float!
      stockQuantity: Int!
    ): Product!
  }
`
