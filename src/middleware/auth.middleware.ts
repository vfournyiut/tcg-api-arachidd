import { NextFunction, Request, Response } from 'express'
import jwt from 'jsonwebtoken'



export const authenticateToken = (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    const authHeader = req.headers.authorization
    const token = authHeader && authHeader.split(' ')[1]

    if (!token) {
        return res.status(401).json({ error: 'Token manquant' })
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as {
            userId: number
            email: string
        }
        req.user = decoded
        return next()
    } catch (error) {
        return res.status(401).json({ error: 'Token invalide ou expiré' })
    }
}
