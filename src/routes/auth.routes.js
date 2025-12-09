import express from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { prisma } from '../prisma.js'

const router = express.Router()

// REGISTER USER normal (CUSTOMER)
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body || {}

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email et password sont obligatoires' })
    }

    const existing = await prisma.user.findUnique({
      where: { email },
    })

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
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    })

    return res.status(201).json(user)
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Erreur serveur' })
  }
})

// REGISTER ADMIN (dev only)
router.post('/register-admin', async (req, res) => {
  try {
    const { name, email, password, adminSecret } = req.body || {}

    // sécurité : seule une personne avec le secret peut créer un admin
    if (adminSecret !== process.env.ADMIN_SECRET) {
      return res.status(403).json({ error: 'Clé admin invalide' })
    }

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email et password sont obligatoires' })
    }

    const existing = await prisma.user.findUnique({
      where: { email },
    })

    if (existing) {
      return res.status(409).json({ error: 'Un compte existe déjà avec cet email' })
    }

    const hashed = await bcrypt.hash(password, 10)

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashed,
        role: 'ADMIN',   // ici admin direct
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    })

    return res.status(201).json(user)
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Erreur serveur' })
  }
})

// LOGIN
router.post('/login', async (req, res) => {
  try {
    console.log('BODY RECU DANS /login :', req.body)

    const { email, password } = req.body || {}

    if (!email || !password) {
      return res.status(400).json({ error: 'Email et password sont obligatoires' })
    }

    const user = await prisma.user.findUnique({
      where: { email },
    })

    if (!user) {
      return res.status(401).json({ error: 'Identifiants invalides' })
    }

    const match = await bcrypt.compare(password, user.password)
    if (!match) {
      return res.status(401).json({ error: 'Identifiants invalides' })
    }

    const token = jwt.sign(
      { sub: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    )

    const { password: _, ...safeUser } = user

    return res.json({ token, user: safeUser })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Erreur serveur' })
  }
})

export default router
