import express from 'express';
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import prismaPkg from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const { PrismaClient } = prismaPkg;
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const app = express();

app.use(express.json());

// ROUTE D'INSCRIPTION
app.post('/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;

    // 1. Hacher le mot de passe
    const hashedPassword = await bcrypt.hash(password, 10);

    // 2. Créer l'utilisateur dans Postgres
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name
      }
    });

    res.status(201).json({ message: "Utilisateur créé !", userId: user.id });
  } catch (error) {
    res.status(400).json({ error: "L'email existe peut-être déjà ou les données sont invalides." });
  }
});

// ROUTE DE CONNEXION
app.post('/login', async (req, res) => {
    try {
      const { email, password } = req.body;
  
      // 1. Trouver l'utilisateur par son email
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        return res.status(401).json({ error: "Identifiants invalides" });
      }
  
      // 2. Comparer le mot de passe envoyé avec le hash en base
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({ error: "Identifiants invalides" });
      }
  
      // 3. Générer le Token JWT (Le badge d'accès)
      const token = jwt.sign(
        { userId: user.id, email: user.email },
        process.env.JWT_SECRET || 'secret_par_defaut',
        { expiresIn: '24h' }
      );
  
      res.json({ message: "Connexion réussie", token });
    } catch (error) {
      res.status(500).json({ error: "Erreur lors de la connexion" });
    }
  });

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Auth Service tourne sur http://localhost:${PORT}`);
});