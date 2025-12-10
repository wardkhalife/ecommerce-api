import { ApolloServer } from 'apollo-server-express'
import jwt from 'jsonwebtoken'
import { typeDefs } from './schema.js'
import { resolvers } from './resolvers.js'
import { prisma } from '../prisma.js'

export async function setupGraphQL(app) {
  const server = new ApolloServer({
    typeDefs,
    resolvers,
    playground: true,      // active l'UI GraphQL en dev
    introspection: true,   // permet d'explorer le schéma
    context: async ({ req }) => {
      let user = null

      const auth = req.headers.authorization || ''
      if (auth.startsWith('Bearer ')) {
        const token = auth.split(' ')[1]
        try {
          const payload = jwt.verify(token, process.env.JWT_SECRET)
          user = await prisma.user.findUnique({
            where: { id: payload.sub },
            select: { id: true, name: true, email: true, role: true },
          })
        } catch (e) {
          // token invalide → user reste null
        }
      }

      return { user }
    },
  })

  await server.start()

  // Intégration classique avec Express
  server.applyMiddleware({
    app,
    path: '/graphql',
    bodyParserConfig: false,
  })

  console.log('GraphQL prêt sur /graphql')
}
