import 'dotenv/config';
import express from 'express';
import prismaPkg from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import amqp from 'amqplib';

const app = express();
const { PrismaClient } = prismaPkg;
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });


app.use(express.json());

let channel;

// Connexion à RabbitMQ
async function connectRabbit() {
    try {
        // Sur Mac avec Docker Desktop, 'localhost' fonctionne généralement
        const connection = await amqp.connect('amqp://localhost');
        channel = await connection.createChannel();
        await channel.assertQueue('order_queue');
        console.log("✅ Order Service connecté à RabbitMQ (ESM)");
    } catch (error) {
        console.error("❌ Erreur RabbitMQ:", error.message);
    }
}
connectRabbit();

app.post('/orders', async (req, res) => {
    const { productName, price, userId } = req.body;

    try {
        const order = await prisma.order.create({
            data: { productName, price, userId }
        });

        const message = JSON.stringify(order);
        channel.sendToQueue('order_queue', Buffer.from(message));

        console.log(`[Message Envoyé] Commande n°${order.id}`);
        
        res.status(201).json({ message: "Commande créée !", order });
    } catch (error) {
        res.status(500).json({ error: "Erreur lors de la création" });
    }
});

const PORT = 3002;
app.listen(PORT, () => console.log(`🚀 Order Service sur port ${PORT}`));