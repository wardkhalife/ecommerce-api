import jwt from 'jsonwebtoken'
import { prisma } from '../prisma.js'

export async function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token manquant' })
    }

    const token = authHeader.split(' ')[1]

    // vérification du token
    const payload = jwt.verify(token, process.env.JWT_SECRET)

    // payload.sub = userId (cf. login)
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, name: true, email: true, role: true },
    })

    if (!user) {
      return res.status(401).json({ error: 'Utilisateur non trouvé' })
    }

    // on attache l'utilisateur à la requête
    req.user = user
    req.tokenPayload = payload

    next()
  } catch (err) {
    console.error(err)
    return res.status(401).json({ error: 'Token invalide ou expiré' })
  }
}
