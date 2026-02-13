import {Request, Response, Router} from 'express'

import {prisma} from "../database";

export const cardsRouter = Router()

cardsRouter.get('/', async (_req: Request, res: Response) => {
    try {
        const cards = await prisma.card.findMany({orderBy: {pokedexNumber: 'asc'}})
        res.status(200).json(cards)
    } catch (error) {
        res.status(500).json({error: 'Erreur serveur'})
    }
})