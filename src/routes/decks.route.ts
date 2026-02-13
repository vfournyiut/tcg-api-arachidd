import { Request, Response, Router } from "express";
import { prisma } from "../database";
import { authenticateToken } from "../middleware/auth.middleware";

export const decksRouter = Router()

/**
 * Route pour créer un nouveau deck
 * 
 * Permet à un utilisateur authentifié de créer un deck contenant exactement 10 cartes.
 * Toutes les cartes doivent exister en base de données.
 * 
 * @param {Request} req - Requête contenant name et cards dans le body, et userId via le token
 * @param {string} req.body.name - Nom du deck
 * @param {number[]} req.body.cards - Tableau de 10 IDs de cartes
 * @param {number} req.user.userId - ID de l'utilisateur (extrait du token JWT)
 * @param {Response} res - Réponse Express
 * 
 * @throws {400} Si le nom est manquant
 * @throws {400} Si cards n'est pas un tableau ou ne contient pas exactement 10 éléments
 * @throws {400} Si une ou plusieurs cartes n'existent pas en base
 * @throws {500} Si une erreur se produit lors de la création en base de données
 */
decksRouter.post('/', authenticateToken, async (req: Request, res: Response) => {
    try {
        const { name, cards } = req.body
        const userId = req.user?.userId

        if (!name) {
            return res.status(400).json({ error: 'Le nom du deck est requis' })
        }

        if (!cards || !Array.isArray(cards) || cards.length !== 10) {
            return res.status(400).json({ error: 'Le deck doit contenir 10 cartes' })
        }

        const existingCards = await prisma.card.findMany({
            where: { id: { in: cards } }
        })

        if (existingCards.length !== 10) {
            return res.status(400).json({ error: 'Toutes les cartes doivent exister en base' })
        }

        const newDeck = await prisma.deck.create({
            data: {
                name: name,
                userId: userId!,
                deckCards: {
                    create: cards.map((cardId) => ({ cardId: cardId }))
                }
            },
            include: {
                deckCards: {
                    include: {
                        card: true
                    }
                }
            }
        })

        return res.status(201).json(newDeck)

    } catch (error) {
        console.log(error)
        return res.status(500).json({ error: 'Erreur serveur' })
    }
})

/**
 * Route pour récupérer tous les decks de l'utilisateur connecté
 * 
 * Retourne la liste de tous les decks appartenant à l'utilisateur authentifié,
 * avec les détails complets de chaque carte incluse.
 * 
 * @param {Request} req - Requête Express avec userId via le token
 * @param {number} req.user.userId - ID de l'utilisateur (extrait du token JWT)
 * @param {Response} res - Réponse Express
 * 
 * @throws {500} Si une erreur se produit lors de la récupération en base de données
 */
decksRouter.get('/mine', authenticateToken, async (req: Request, res: Response) => {
    try {
        const userId = req.user?.userId
        const existingDecks = await prisma.deck.findMany({
            where: { userId: userId! },
            include: {
                deckCards: {
                    include: {
                        card: true
                    }
                }
            }
        })

        return res.status(200).json(existingDecks)

    } catch (error) {
        return res.status(500).json({ error: 'Erreur serveur' })
    }
})

/**
 * Route pour récupérer un deck spécifique par son ID
 * 
 * Retourne les détails complets d'un deck si l'utilisateur en est le propriétaire.
 * Inclut toutes les cartes du deck avec leurs informations détaillées.
 * 
 * @param {Request} req - Requête Express avec l'ID du deck dans les paramètres et userId via le token
 * @param {string} req.params.id - ID du deck à récupérer
 * @param {number} req.user.userId - ID de l'utilisateur (extrait du token JWT)
 * @param {Response} res - Réponse Express
 * 
 * @throws {404} Si le deck n'existe pas
 * @throws {403} Si l'utilisateur n'est pas le propriétaire du deck
 * @throws {500} Si une erreur se produit lors de la récupération en base de données
 */
decksRouter.get('/:id', authenticateToken, async (req: Request, res: Response) => {
    try {
        const deckId = parseInt(req.params.id)
        const userId = req.user?.userId
        const deck = await prisma.deck.findUnique({
            where: { id: deckId },
            include: {
                deckCards: {
                    include: {
                        card: true
                    }
                }
            }
        })

        if (!deck) {
            return res.status(404).json({ error: 'Deck non trouvé' })
        }

        if (deck.userId !== userId) {
            return res.status(403).json({ error: 'Accès refusé à ce deck' })
        }

        return res.status(200).json(deck)

    } catch (error) {
        return res.status(500).json({ error: 'Erreur serveur' })
    }
})

/**
 * Route pour mettre à jour un deck existant
 * 
 * Permet de modifier le nom et/ou les cartes d'un deck appartenant à l'utilisateur.
 * Si des cartes sont fournies, elles doivent être exactement 10 et toutes exister en base.
 * 
 * @param {Request} req - Requête contenant l'ID du deck, name et/ou cards dans le body
 * @param {string} req.params.id - ID du deck à modifier
 * @param {string} [req.body.name] - Nouveau nom du deck (optionnel)
 * @param {number[]} [req.body.cards] - Nouveau tableau de 10 IDs de cartes (optionnel)
 * @param {number} req.user.userId - ID de l'utilisateur (extrait du token JWT)
 * @param {Response} res - Réponse Express
 * 
 * @throws {404} Si le deck n'existe pas
 * @throws {403} Si l'utilisateur n'est pas le propriétaire du deck
 * @throws {400} Si cards est fourni mais n'est pas un tableau de 10 éléments
 * @throws {400} Si une ou plusieurs cartes n'existent pas en base
 * @throws {500} Si une erreur se produit lors de la mise à jour en base de données
 */
decksRouter.patch('/:id', authenticateToken, async (req: Request, res: Response) => {
    try {
        const deckId = parseInt(req.params.id)
        const userId = req.user?.userId
        const { name, cards } = req.body

        const deck = await prisma.deck.findUnique({
            where: { id: deckId }
        })

        if (!deck) {
            return res.status(404).json({ error: 'Deck non trouvé' })
        }

        if (deck.userId !== userId) {
            return res.status(403).json({ error: 'Accès refusé à ce deck' })
        }

        if (cards) {
            if (!Array.isArray(cards) || cards.length !== 10) {
                return res.status(400).json({ error: 'Le deck doit contenir exactement 10 cartes' })
            }

            const existingCards = await prisma.card.findMany({
                where: { id: { in: cards } }
            })

            if (existingCards.length !== 10) {
                return res.status(400).json({ error: 'Certaines cartes sont invalides ou inexistantes' })
            }
        }

        const updateData: any = {
            name: name
        };

        if (cards) {
            updateData.deckCards = {
                deleteMany: {
                    deckId: deckId,
                },
                create: cards.map((cardId: number) => ({ cardId: cardId }))
            };
        }

        const updatedDeck = await prisma.deck.update({
            where: { id: deckId },
            data: updateData
        });

        return res.status(200).json(updatedDeck)

    } catch (error) {
        return res.status(500).json({ error: 'Erreur serveur' })
    }
});

/**
 * Route pour supprimer un deck
 * 
 * Supprime définitivement un deck appartenant à l'utilisateur.
 * Cette action supprime également toutes les cartes associées au deck (cascade).
 * 
 * @param {Request} req - Requête contenant l'ID du deck dans les paramètres et userId via le token
 * @param {string} req.params.id - ID du deck à supprimer
 * @param {number} req.user.userId - ID de l'utilisateur (extrait du token JWT)
 * @param {Response} res - Réponse Express
 * 
 * @throws {404} Si le deck n'existe pas
 * @throws {403} Si l'utilisateur n'est pas le propriétaire du deck
 * @throws {500} Si une erreur se produit lors de la suppression en base de données
 */
decksRouter.delete('/:id', authenticateToken, async (req: Request, res: Response) => {
    try {
        const deckId = parseInt(req.params.id)
        const userId = req.user?.userId

        const deck = await prisma.deck.findUnique({
            where: { id: deckId }
        })

        if (!deck) {
            return res.status(404).json({ error: 'Deck non trouvé' })
        }

        if (deck.userId !== userId) {
            return res.status(403).json({ error: 'Accès refusé à ce deck' })
        }

        await prisma.deck.delete({
            where: { id: deckId }
        })

        return res.status(200).json({ message: 'Deck supprimé avec succès' })

    } catch (error) {
        return res.status(500).json({ error: 'Erreur serveur' })
    }
})