import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Démarrage du seed initial...");

  // -----------------------
  // 1. Création Admins
  // -----------------------
  const adminPassword = await bcrypt.hash("admin1234", 10);

  await prisma.user.createMany({
    data: [
      { name: "Admin Principal", email: "admin@test.com", password: adminPassword, role: "ADMIN" },
      { name: "Admin Secondaire", email: "admin2@test.com", password: adminPassword, role: "ADMIN" }
    ]
  });

  // -----------------------
  // 2. Création Clients
  // -----------------------
  const clientPassword = await bcrypt.hash("client1234", 10);

  await prisma.user.createMany({
    data: [
      { name: "Alice", email: "alice@test.com", password: clientPassword, role: "CUSTOMER" },
      { name: "Bob", email: "bob@test.com", password: clientPassword, role: "CUSTOMER" },
      { name: "Charlie", email: "charlie@test.com", password: clientPassword, role: "CUSTOMER" },
      { name: "David", email: "david@test.com", password: clientPassword, role: "CUSTOMER" },
      { name: "Emma", email: "emma@test.com", password: clientPassword, role: "CUSTOMER" }
    ]
  });

  // -----------------------
  // 3. Produits — Montres
  // -----------------------
  const watches = [
    {
      name: "Rolex Submariner",
      brand: "Rolex",
      description: "Montre de plongée emblématique avec lunette céramique.",
      price: 10500,
      stock: 8,
      imageUrl: "https://i.imgur.com/3S7QFQx.jpeg",
      year: 2023,
      waterproof: true,
      category: "LUXURY"
    },
    {
      name: "Rolex Daytona",
      brand: "Rolex",
      description: "Chronographe mythique apprécié des collectionneurs.",
      price: 18500,
      stock: 3,
      imageUrl: "https://i.imgur.com/fw4U4mQ.jpeg",
      year: 2022,
      waterproof: true,
      category: "LUXURY"
    },
    {
      name: "Rolex Oyster Perpetual",
      brand: "Rolex",
      description: "Montre simple et élégante, mouvement AUTOMATIC.",
      price: 6500,
      stock: 12,
      imageUrl: "https://i.imgur.com/b4FbIxe.jpeg",
      year: 2021,
      waterproof: true,
      category: "AUTOMATIC"
    },
    {
      name: "Rolex Explorer II",
      brand: "Rolex",
      description: "Montre d'exploration conçue pour conditions extrêmes.",
      price: 9800,
      stock: 6,
      imageUrl: "https://i.imgur.com/1Y69x6G.jpeg",
      year: 2020,
      waterproof: true,
      category: "SPORT"
    },

    // TAG HEUER
    {
      name: "Tag Heuer Carrera",
      brand: "Tag Heuer",
      description: "Chronographe inspiré des courses automobiles.",
      price: 3500,
      stock: 15,
      imageUrl: "https://i.imgur.com/4UYW4Wz.jpeg",
      year: 2021,
      waterproof: true,
      category: "SPORT"
    },
    {
      name: "Tag Heuer Monaco",
      brand: "Tag Heuer",
      description: "Modèle carré iconique porté par Steve McQueen.",
      price: 6200,
      stock: 4,
      imageUrl: "https://i.imgur.com/7tl7oVy.jpeg",
      year: 2023,
      waterproof: false,
      category: "LUXURY"
    },

    // CASIO
    {
      name: "Casio G-Shock GA-2100",
      brand: "Casio",
      description: "Montre ultra-résistante, best-seller.",
      price: 110,
      stock: 40,
      imageUrl: "https://i.imgur.com/uIwYOX9.jpeg",
      year: 2023,
      waterproof: true,
      category: "SPORT"
    },
    {
      name: "Casio Edifice",
      brand: "Casio",
      description: "Montre élégante à petit prix.",
      price: 180,
      stock: 25,
      imageUrl: "https://i.imgur.com/xQAx7sB.jpeg",
      year: 2022,
      waterproof: false,
      category: "SMART"
    },
  ];

  await prisma.product.createMany({ data: watches });

  // -----------------------
  // 4. Points Relais PickupPoint (Map)
  // -----------------------
  await prisma.pickupPoint.createMany({
  data: [
    {
      name: "Relais Paris 1",
      address: "12 Rue de Rivoli",
      city: "Paris",
      postalCode: "75001",
      latitude: 48.8566,
      longitude: 2.3522
    },
    {
      name: "Relais Lyon Centre",
      address: "5 Place Bellecour",
      city: "Lyon",
      postalCode: "69002",
      latitude: 45.764,
      longitude: 4.8357
    },
    {
      name: "Relais Marseille Port",
      address: "2 Quai du Port",
      city: "Marseille",
      postalCode: "13002",
      latitude: 43.2965,
      longitude: 5.3698
    },
    {
      name: "Relais Lille Flandres",
      address: "15 Rue Faidherbe",
      city: "Lille",
      postalCode: "59800",
      latitude: 50.6292,
      longitude: 3.0573
    },
    {
      name: "Relais Toulouse Capitole",
      address: "3 Place du Capitole",
      city: "Toulouse",
      postalCode: "31000",
      latitude: 43.6047,
      longitude: 1.4442
    },
    {
      name: "Relais Bordeaux Quai",
      address: "22 Quai Richelieu",
      city: "Bordeaux",
      postalCode: "33000",
      latitude: 44.8378,
      longitude: -0.5792
    }
  ]
});

  console.log("🌱 Seed terminé avec succès !");
}

main()
  .catch((e) => console.error(e))
  .finally(async () => await prisma.$disconnect());
