import { NextFunction, Request, Response } from 'express'
import jwt from 'jsonwebtoken'

/**
 * Middleware d'authentification par JWT
 * 
 * Vérifie la présence et la validité du token JWT dans l'en-tête Authorization.
 * Si valide, ajoute les informations utilisateur (userId, email) à l'objet req.user.
 * 
 * @param {Request} req - Objet de requête Express contenant l'en-tête Authorization
 * @param {Response} res - Objet de réponse Express
 * @param {NextFunction} next - Fonction pour passer au middleware suivant
 * 
 * @returns {void} Passe au middleware suivant si le token est valide
 * 
 * @throws {401} Token manquant - Aucun token n'est présent dans l'en-tête Authorization
 * @throws {401} Token invalide ou expiré - Le token ne peut pas être vérifié ou a expiré
 */
export const authenticateToken = (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    // Récupérer le token depuis l'en-tête Authorization
    const authHeader = req.headers.authorization
    const token = authHeader && authHeader.split(' ')[1] // Format: "Bearer TOKEN"

    if (!token) {
        return res.status(401).json({ error: 'Token manquant' })
    }

    try {
        // Vérifier et décoder le token
        const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as {
            userId: number
            email: string
        }

        // Ajouter userId à la requête pour l'utiliser dans les routes
        req.user = decoded

        // Passer au prochain middleware ou à la route
        return next()
    } catch (error) {
        return res.status(401).json({ error: 'Token invalide ou expiré' })
    }
}
