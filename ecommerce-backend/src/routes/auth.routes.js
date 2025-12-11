import express from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { prisma } from '../prisma.js'
import { authMiddleware } from '../middleware/auth.middleware.js'

const router = express.Router()

// ---------------------------
// REGISTER USER (CUSTOMER)
// ---------------------------
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body || {}

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email et password sont obligatoires' })
    }

    const existing = await prisma.user.findUnique({ where: { email } })

    if (existing) {
      return res.status(409).json({ error: 'Un compte existe déjà avec cet email' })
    }

    const hashed = await bcrypt.hash(password, 10)

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashed,
        role: 'CUSTOMER',
      },
      select: { id: true, name: true, email: true, role: true },
    })

    return res.status(201).json(user)
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Erreur serveur' })
  }
})


// ---------------------------
// REGISTER ADMIN (ADMIN AUTH SEULEMENT)
// ---------------------------
router.post('/register-admin', authMiddleware, async (req, res) => {
  try {
    console.log("Requête reçue pour register-admin par :", req.user)

    // 1️⃣ Vérifier que l’utilisateur connecté est ADMIN
    if (!req.user || req.user.role !== "ADMIN") {
      return res.status(403).json({ error: "Accès refusé : seuls les admins peuvent créer un admin" })
    }

    const { name, email, password } = req.body || {}

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email et password sont obligatoires' })
    }

    // 2️⃣ Vérifier si l'email existe déjà
    const existing = await prisma.user.findUnique({ where: { email } })

    if (existing) {
      return res.status(409).json({ error: 'Un compte existe déjà avec cet email' })
    }

    const hashed = await bcrypt.hash(password, 10)

    // 3️⃣ Créer le nouvel admin
    const newAdmin = await prisma.user.create({
      data: {
        name,
        email,
        password: hashed,
        role: 'ADMIN',
      },
      select: { id: true, name: true, email: true, role: true },
    })

    return res.status(201).json(newAdmin)
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Erreur serveur' })
  }
})


// ---------------------------
// LOGIN
// ---------------------------
router.post('/login', async (req, res) => {
  try {
    console.log('BODY RECU DANS /login :', req.body)

    const { email, password } = req.body || {}

    if (!email || !password) {
      return res.status(400).json({ error: 'Email et password sont obligatoires' })
    }

    const user = await prisma.user.findUnique({ where: { email } })

    if (!user) {
      return res.status(401).json({ error: 'Identifiants invalides' })
    }

    const match = await bcrypt.compare(password, user.password)
    if (!match) {
      return res.status(401).json({ error: 'Identifiants invalides' })
    }

    // JWT avec rôle et id
    const token = jwt.sign(
      { sub: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    )

    // on retire le mot de passe avant de renvoyer
    const { password: _, ...safeUser } = user

    return res.json({ token, user: safeUser })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Erreur serveur' })
  }
})

export default router
