import express from 'express'
import cors from 'cors'
import morgan from 'morgan'
import dotenv from 'dotenv'
import { prisma } from './prisma.js'
import { authMiddleware } from './middleware/auth.middleware.js'
import authRouter from './routes/auth.routes.js'  
import productsRouter from './routes/products.routes.js'
import cartRouter from './routes/cart.routes.js'
import ordersRouter from './routes/orders.routes.js'


dotenv.config()

const app = express()

app.use(cors())
app.use(express.json())
app.use(morgan('dev'))

app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Ecommerce API running' })
})

app.get('/users', async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true },
    })
    res.json(users)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

// Route protégée : renvoie l'utilisateur connecté
app.get('/me', authMiddleware, (req, res) => {
  // grâce au middleware, req.user est défini
  res.json({ user: req.user })
})

app.use('/auth', authRouter)
app.use('/products', productsRouter)
app.use('/cart', cartRouter)
app.use('/orders', ordersRouter) 

export default app
