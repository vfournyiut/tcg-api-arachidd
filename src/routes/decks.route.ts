import { Request, Response, Router } from "express";
import {prisma} from "../database";
import { authenticateToken } from "../middleware/auth.middleware";
import "../types/express";

export const decksRouter = Router()

decksRouter.post('/', authenticateToken, async (req, res) => {
    try {
        const { name, cards } = req.body
        const userId = req.user?.userId

        if (!name) {
            return res.status(400).json({error: 'Le nom du deck est requis'})
        }

        if (!cards || !Array.isArray(cards) || cards.length !== 10) {
            return res.status(400).json({error: 'Le deck doit contenir 10 cartes'})
        }

        const existingCards = await prisma.card.findMany({
            where:{id: {in: cards}}
        })

        if (existingCards.length !== 10) {
            return res.status(400).json({error: 'Toutes les cartes doivent exister en base'})
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

        res.status(201).json(newDeck)

    } catch (error) {
        res.status(500).json({ error: 'Erreur serveur' })
    }
})

decksRouter.get('/mine', authenticateToken, async (req, res) => {
    try {
        const userId = req.user?.userId
        const existingDecks = await prisma.deck.findMany({
            where: {userId: userId!},
            include: {
                deckCards: {
                    include: {
                        card: true
                    }
                }
            }
        })

        res.status(200).json(existingDecks)

    } catch (error) {
        res.status(500).json({ error: 'Erreur serveur' })
    }
})

decksRouter.get('/:id', authenticateToken, async (req, res) => {
    try {
        const deckId = parseInt(req.params.id)
        const userId = req.user?.userId
        const deck = await prisma.deck.findUnique({
            where: {id: deckId},
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

        res.status(200).json(deck)

    } catch (error) {
        res.status(500).json({ error: 'Erreur serveur' })
    }
})

decksRouter.patch('/:id', authenticateToken, async (req, res) => {
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

        const updatedDeck = await prisma.deck.update({
            where: { id: deckId },
            data: {
                name: name || deck.name,
                ...(cards && {
                    deckCards: {
                        deleteMany: {},
                        create: cards.map((cardId) => ({ cardId: cardId }))
                    }
                })
            },
            include: {
                deckCards: {
                    include: {
                        card: true
                    }
                }
            }
        })

        res.status(200).json(updatedDeck)

    } catch (error) {
        res.status(500).json({ error: 'Erreur serveur' })
    }
})

decksRouter.delete('/:id', authenticateToken, async (req, res) => {
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

        res.status(200).json({ message: 'Deck supprimé avec succès' })

    } catch (error) {
        res.status(500).json({ error: 'Erreur serveur' })
    }
})