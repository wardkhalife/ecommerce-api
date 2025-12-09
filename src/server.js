import app from './app.js'
import { setupGraphQL } from './graphql/graphqlServer.js'

const PORT = process.env.PORT || 4000

async function start() {
  await setupGraphQL(app)

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
  console.log(`GraphQL endpoint ready at http://localhost:${PORT}/graphql`)
})

}

start()
