import {Request, Response, Router} from 'express'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import {prisma} from "./database";
import {env} from "./env";

export const authRouter = Router()


// SIGN UP
authRouter.post('/sign-up', async (req: Request, res: Response) => {
    const {username, email, password} = req.body
    try {
        // Vérifier si l'utilisateur existe déjà
        const existingUser = await prisma.user.findUnique({
            where: {email},
        })

        // Utilisateur déjà existant
        if (existingUser) {
            return res.status(409).json({error: 'Utilisateur déjà existant'})
        }

        // Champ manquant ?
        if (!username || !email || !password) {
            return res.status(400).json({error: 'Champs manquants'})
        }

        // Hasher le mot de passe
        const hashedPassword = await bcrypt.hash(password, 10)

        // Créer l'utilisateur
        const newUser = await prisma.user.create({
            data: {
                username,
                email,
                password: hashedPassword,
            },
        })

        // Générer le JWT
        const token = jwt.sign(
            {
                userId: newUser.id,
                email: newUser.email,
            },
            process.env.JWT_SECRET as string,
            {expiresIn: '7d'},
        )

        // Retourner le token
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
        return res.status(500).json({error: 'Erreur serveur'})
    }
})

// SIGN IN
authRouter.post('/sign-in', async (req: Request, res: Response) => {
    const {email, password} = req.body

    try {
        // Vérifier que l'utilisateur existe
        const user = await prisma.user.findUnique({
            where: {email},
        })

        if (!user) {
            return res.status(401).json({error: 'Email ou mot de passe incorrect'})
        }

        // Champ manquant ?
        if (!email || !password) {
            return res.status(400).json({error: 'Champs manquants'})
        }

        // Vérifier le mot de passe
        const isPasswordValid = await bcrypt.compare(password, user.password)

        if (!isPasswordValid) {
            return res.status(401).json({error: 'Email ou mot de passe incorrect'})
        }

        // Générer le JWT
        const token = jwt.sign(
            {
                userId: user.id,
                email: user.email,
            },
            process.env.JWT_SECRET as string,
            {expiresIn: '7d'},
        )

        // Retourner le token
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
        return res.status(500).json({error: 'Erreur serveur'})
    }
})
