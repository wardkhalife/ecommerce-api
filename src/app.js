import express from 'express'
import cors from 'cors'
import morgan from 'morgan'
import dotenv from 'dotenv'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import xss from 'xss'
import path from 'path';

import { prisma } from './prisma.js'
import { authMiddleware } from './middleware/auth.middleware.js'
import authRouter from './routes/auth.routes.js'
import productsRouter from './routes/products.routes.js'
import cartRouter from './routes/cart.routes.js'
import ordersRouter from './routes/orders.routes.js'
import reviewRoutes from './routes/reviews.routes.js';

dotenv.config()

const app = express()

app.use(express.static(path.join(process.cwd(), 'public')));

// 🔐 Sécurisation des headers HTTP
app.use(
  helmet({
    crossOriginResourcePolicy: false,
  })
)

// ⏱️ Rate limiting global (toutes les routes)
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300,                  // 300 requêtes par 15 min par IP
  standardHeaders: true,
  legacyHeaders: false,
})
app.use(globalLimiter)

// ⏱️ Rate limiting spécifique pour /auth/login (anti brute-force)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10, // 10 tentatives de login max / 15 min
  message: {
    error:
      "Trop de tentatives de connexion, veuillez réessayer plus tard.",
  },
  standardHeaders: true,
  legacyHeaders: false,
})
app.use('/auth/login', loginLimiter)

// 🧼 Middleware anti-XSS pour les routes REST
function sanitizeObject(obj) {
  if (!obj || typeof obj !== 'object') return

  for (const key of Object.keys(obj)) {
    const value = obj[key]
    if (typeof value === 'string') {
      obj[key] = xss(value)
    } else if (Array.isArray(value)) {
      obj[key] = value.map((v) =>
        typeof v === 'string' ? xss(v) : v
      )
    } else if (typeof value === 'object') {
      sanitizeObject(value)
    }
  }
}

function xssSanitizer(req, res, next) {
  if (req.body) sanitizeObject(req.body)
  if (req.query) sanitizeObject(req.query)
  if (req.params) sanitizeObject(req.params)
  next()
}

// On applique le sanitizer sur les principales routes REST
app.use('/auth', xssSanitizer)
app.use('/products', xssSanitizer)
app.use('/cart', xssSanitizer)
app.use('/orders', xssSanitizer)

// 🌐 CORS + JSON + logs
app.use(cors())
app.use(express.json())
app.use(morgan('dev'))

// Healthcheck
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Ecommerce API running' })
})

// Liste des users (debug)
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
  res.json({ user: req.user })
})

// Routes REST principales
app.use('/auth', authRouter)
app.use('/products', productsRouter)
app.use('/cart', cartRouter)
app.use('/orders', ordersRouter)
app.use('/reviews', reviewRoutes);

export default app
