import { Request, Response, Router } from 'express'
import { prisma } from "../database";

export const cardsRouter = Router()

/**
 * Route pour récupérer toutes les cartes Pokémon
 * 
 * Retourne la liste complète des cartes Pokémon disponibles,
 * triées par numéro Pokédex en ordre croissant.
 * 
 * @param {Request} _req - Requête Express (non utilisée)
 * @param {Response} res - Réponse Express
 * 
 * @throws {500} Si une erreur se produit lors de la récupération en base de données
 */
cardsRouter.get('/', async (_req: Request, res: Response) => {
    try {
        const cards = await prisma.card.findMany({ orderBy: { pokedexNumber: 'asc' } })
        res.status(200).json(cards)
    } catch (error) {
        res.status(500).json({ error: 'Erreur serveur' })
    }
})