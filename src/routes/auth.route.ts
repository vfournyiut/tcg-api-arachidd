import bcrypt from 'bcrypt'
import { Response, Router } from 'express'
import jwt from 'jsonwebtoken'

import { prisma } from "../database";
import { SignInRequest, SignUpRequest } from '../types/auth.types';

export const authRouter = Router()

authRouter.post('/sign-up', async (req: SignUpRequest, res: Response) => {
    const { username, email, password } = req.body
    try {
        const existingUser = await prisma.user.findUnique({
            where: { email },
        })
        if (existingUser) {
            return res.status(409).json({ error: 'Utilisateur déjà existant' })
        }
        if (!username || !email || !password) {
            return res.status(400).json({ error: 'Champs manquants' })
        }
        const hashedPassword = await bcrypt.hash(password, 10)
        const newUser = await prisma.user.create({
            data: {
                username,
                email,
                password: hashedPassword,
            },
        })
        const token = jwt.sign(
            {
                userId: newUser.id,
                email: newUser.email,
            },
            process.env.JWT_SECRET as string,
            { expiresIn: '7d' },
        )
        return res.status(201).json({
            message: 'Utilisateur créé avec succès',
            token,
            user: {
                id: newUser.id,
                name: newUser.username,
                email: newUser.email,
            },
        })

    } catch (error) {
        console.error('Erreur lors de la création de l\'utilisateur:', error)
        return res.status(500).json({ error: 'Erreur serveur' })
    }
})

authRouter.post('/sign-in', async (req: SignInRequest, res: Response) => {
    const { email, password } = req.body

    try {
        const user = await prisma.user.findUnique({
            where: { email },
        })

        if (!user) {
            return res.status(401).json({ error: 'Email ou mot de passe incorrect' })
        }
        if (!email || !password) {
            return res.status(400).json({ error: 'Champs manquants' })
        }
        const isPasswordValid = await bcrypt.compare(password, user.password)

        if (!isPasswordValid) {
            return res.status(401).json({ error: 'Email ou mot de passe incorrect' })
        }
        const token = jwt.sign(
            {
                userId: user.id,
                email: user.email,
            },
            process.env.JWT_SECRET as string,
            { expiresIn: '7d' },
        )
        return res.status(200).json({
            message: 'Connexion réussie',
            token,
            user: {
                name: user.username,
                email: user.email,
            },
        })
    } catch (error) {
        console.error('Erreur lors de la connexion:', error)
        return res.status(500).json({ error: 'Erreur serveur' })
    }
})
