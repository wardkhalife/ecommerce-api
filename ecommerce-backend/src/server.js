// src/server.js
import app from './app.js'
import bodyParser from 'body-parser'
import { setupGraphQL } from './graphql/graphqlServer.js'

const PORT = process.env.PORT || 4000

async function start() {
  // Monte le serveur GraphQL sur l'app Express
  app.use('/graphql', bodyParser.json())
  await setupGraphQL(app)

  app.listen(PORT, () => {
    console.log(`REST server running on http://localhost:${PORT}`)
    console.log(`GraphQL endpoint ready at http://localhost:${PORT}/graphql`)
  })
}

start().catch((err) => {
  console.error('Erreur au démarrage du serveur :', err)
})
