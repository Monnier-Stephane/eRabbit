import 'dotenv/config';
import amqp from 'amqplib';
import prismaPkg from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
const { PrismaClient } = prismaPkg;


const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter });

async function demarrerWorker() {
    try {
        // Connexion au serveur RabbitMQ
        const connexion = await amqp.connect('amqp://localhost');
        const canal = await connexion.createChannel();

        const fileAttente = 'order_queue';
        await canal.assertQueue(fileAttente, { durable: true });

        // Gestion du débit : traiter une seule commande à la fois
        canal.prefetch(1);

        console.log("💳 Service Paiement : En attente de commandes...");

        canal.consume(fileAttente, async (msg) => {
            if (!msg) return;

            const donneesCommande = JSON.parse(msg.content.toString());
            console.log(`[Traitement] Commande n° : ${donneesCommande.id}`);

            try {
                // Simulation d'un délai de traitement (ex: appel API bancaire)
                await new Promise(resolve => setTimeout(resolve, 3000));

                // Mise à jour du statut de la commande en base de données
                await prisma.order.update({
                    where: { id: donneesCommande.id },
                    data: { status: 'PAID' }
                });

                console.log(`✅ Commande n°${donneesCommande.id} marquée comme PAYÉE`);
                
                // Accusé de réception : le message est supprimé de la file
                canal.ack(msg);
            } catch (erreur) {
                console.error("❌ Erreur de traitement :", erreur.message);
                // En cas d'échec, on remet le message dans la file pour une nouvelle tentative
                canal.nack(msg);
            }
        });
    } catch (erreur) {
        console.error("❌ Erreur de connexion :", erreur.message);
        process.exit(1);
    }
}

demarrerWorker();