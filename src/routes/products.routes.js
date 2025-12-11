import express from 'express'
import { prisma } from '../prisma.js'
import { authMiddleware } from '../middleware/auth.middleware.js'
// NOUVEAUX IMPORTS POUR LA GESTION DES FICHIERS
import multer from 'multer';
import path from 'path'; 
// FIN NOUVEAUX IMPORTS

const router = express.Router()

// Middleware pour vérifier le rôle ADMIN
function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Accès réservé aux admins' })
  }
  next()
}

// -----------------------------------------------------------------
// CONFIGURATION MULTER POUR LE STOCKAGE LOCAL
// -----------------------------------------------------------------
const storage = multer.diskStorage({
  // Définit le répertoire de destination (doit être créé manuellement : public/uploads/products)
  destination: function (req, file, cb) {
    cb(null, path.join(process.cwd(), 'public', 'uploads', 'products'));
  },
  // Définit le nom du fichier
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  },
});

// Instance Multer pour l'upload (max 5 fichiers, champ 'images', taille limitée)
const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 } // Limite la taille des fichiers (5 Mo)
});
// -----------------------------------------------------------------


// GET /products : liste de tous les produits (PUBLIC)
router.get('/', async (req, res) => {
  try {
    const products = await prisma.product.findMany({
      include: {
        category: true,
        images: { orderBy: { position: 'asc' } }, // Inclure et trier les images
      },
    })
    res.json(products)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

// GET /products/:id : détail d'un produit (PUBLIC)
router.get('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10)
    const product = await prisma.product.findUnique({
      where: { id },
      include: { 
        category: true, 
        reviews: true, 
        images: { orderBy: { position: 'asc' } } 
      },
    })

    if (!product) {
      return res.status(404).json({ error: 'Produit non trouvé' })
    }

    res.json(product)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

// POST /products : création produit + upload d'images (ADMIN seulement)
// La route est maintenant multipart/form-data
router.post('/', 
  authMiddleware, 
  requireAdmin, 
  upload.array('images', 5), // Multer gère les fichiers ici
  async (req, res) => {
  try {
    // Les données sont dans req.body, les fichiers dans req.files
    const { name, description, price, stockQuantity, categoryId } = req.body
    const files = req.files 

    if (!name || !description || price == null || stockQuantity == null) {
      return res.status(400).json({
        error: 'name, description, price et stockQuantity sont obligatoires',
      })
    }

    // Utilisation d'une transaction pour garantir que tout réussit (produit + images) ou tout échoue
    const product = await prisma.$transaction(async (tx) => {
        // 1. Création du Produit
        const newProduct = await tx.product.create({
          data: {
            name,
            description,
            price: parseFloat(price),
            stockQuantity: parseInt(stockQuantity, 10),
            categoryId: categoryId ? parseInt(categoryId, 10) : null,
          },
        })

        // 2. Traitement et Insertion des Images (si des fichiers sont présents)
        if (files && files.length > 0) {
            const imagesData = files.map((file, index) => ({
                productId: newProduct.id,
                url: `/uploads/products/${file.filename}`,
                altText: newProduct.name,
                isPrimary: index === 0, 
                position: index,
            }))

            await tx.productImage.createMany({
                data: imagesData,
            })
        }

        return newProduct
    })
    
    // 3. Réponse complète
    const fullProduct = await prisma.product.findUnique({
        where: { id: product.id },
        include: { images: { orderBy: { position: 'asc' } } }
    })

    res.status(201).json(fullProduct)
  } catch (err) {
    console.error(err)
    // Idéalement, gérer ici la suppression des fichiers en cas d'erreur BDD
    res.status(500).json({ error: 'Erreur serveur lors de la création du produit et de l\'enregistrement des images.' })
  }
})

// PATCH /products/:id : modification produit (ADMIN seulement)
router.patch('/:id', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10)
    const { name, description, price, stockQuantity, categoryId } = req.body

    const dataToUpdate = {}
    if (name !== undefined) dataToUpdate.name = name
    if (description !== undefined) dataToUpdate.description = description
    if (price !== undefined) dataToUpdate.price = parseFloat(price)
    if (stockQuantity !== undefined) dataToUpdate.stockQuantity = parseInt(stockQuantity, 10)
    if (categoryId !== undefined) dataToUpdate.categoryId = categoryId ? parseInt(categoryId, 10) : null

    if (Object.keys(dataToUpdate).length === 0) {
        return res.status(400).json({ error: 'Au moins un champ doit être fourni pour la mise à jour.' });
    }

    const product = await prisma.product.update({
      where: { id },
      data: dataToUpdate,
    })

    res.json(product)
  } catch (err) {
    if (err.code === 'P2025') {
        return res.status(404).json({ error: 'Produit non trouvé ou ID invalide.' });
    }
    console.error(err)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

// DELETE /products/:id : suppression produit (ADMIN seulement)
router.delete('/:id', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10)

    // Note : Pensez à gérer la suppression physique des fichiers du disque ici !
    await prisma.product.delete({
      where: { id },
    })

    res.status(204).send()
  } catch (err) {
    if (err.code === 'P2025') {
        return res.status(404).json({ error: 'Produit non trouvé ou déjà supprimé.' });
    }
    console.error(err)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})


// ----------------------------------------------------
// ROUTE DÉDIÉE À L'UPLOAD POST-CRÉATION (Optionnel)
// ----------------------------------------------------
router.post(
  '/:id/images',
  authMiddleware,
  requireAdmin, 
  upload.array('images', 5), 
  async (req, res) => {
    try {
      const productId = parseInt(req.params.id, 10);
      const files = req.files; 
      
      if (!files || files.length === 0) {
        return res.status(400).json({ error: 'Aucun fichier sélectionné ou erreur d\'upload.' });
      }

      const product = await prisma.product.findUnique({ where: { id: productId } });
      if (!product) {
        return res.status(404).json({ error: 'Produit introuvable pour lier les images.' });
      }

      const existingImagesCount = await prisma.productImage.count({ where: { productId } });

      const imagesData = files.map((file, index) => ({
        productId: productId,
        url: `/uploads/products/${file.filename}`, 
        altText: product.name,
        isPrimary: existingImagesCount === 0 && index === 0, 
        position: existingImagesCount + index,
      }));

      const newImages = await prisma.productImage.createMany({
        data: imagesData,
      });

      res.status(201).json({ 
        message: `${newImages.count} images ajoutées avec succès.`, 
        count: newImages.count,
        files: files.map(f => ({ url: `/uploads/products/${f.filename}` }))
      });

    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Erreur serveur lors de l\'enregistrement des images.' });
    }
  }
);


export default router