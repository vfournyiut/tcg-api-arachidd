import { Response, Router } from 'express'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { prisma } from "../database";
import { SignUpRequest, SignInRequest } from '../types/auth.types';

export const authRouter = Router()

/**
 * Route d'inscription d'un nouvel utilisateur
 * 
 * Permet à un utilisateur de créer un compte en fournissant un nom d'utilisateur,
 * un email et un mot de passe. Le mot de passe est hashé avant d'être stocké.
 * 
 * @param {SignUpRequest} req - Requête contenant username, email et password dans le body
 * @param {string} req.body.username - Nom d'utilisateur
 * @param {string} req.body.email - Email de l'utilisateur (doit être unique)
 * @param {string} req.body.password - Mot de passe en clair (sera hashé)
 * @param {Response} res - Réponse Express
 * 
 * @throws {409} Si un utilisateur avec cet email existe déjà
 * @throws {400} Si username, email ou password sont manquants
 */
authRouter.post('/sign-up', async (req: SignUpRequest, res: Response) => {
    const { username, email, password } = req.body
    try {
        // Vérifier si l'utilisateur existe déjà
        const existingUser = await prisma.user.findUnique({
            where: { email },
        })

        // Utilisateur déjà existant
        if (existingUser) {
            return res.status(409).json({ error: 'Utilisateur déjà existant' })
        }

        // Champ manquant ?
        if (!username || !email || !password) {
            return res.status(400).json({ error: 'Champs manquants' })
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
            { expiresIn: '7d' },
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
        return res.status(500).json({ error: 'Erreur serveur' })
    }
})

/**
 * Route de connexion d'un utilisateur
 * 
 * Permet à un utilisateur existant de se connecter avec son email et mot de passe.
 * Retourne un token JWT valide pour 7 jours en cas de succès.
 * 
 * @param {SignInRequest} req - Requête contenant email et password dans le body
 * @param {string} req.body.email - Email de l'utilisateur
 * @param {string} req.body.password - Mot de passe en clair
 * @param {Response} res - Réponse Express
 * 
 * @throws {401} Si l'utilisateur n'existe pas ou si le mot de passe est incorrect
 * @throws {400} Si email ou password sont manquants
 * @throws {500} Si une erreur se produit lors de la vérification en base de données
 */
authRouter.post('/sign-in', async (req: SignInRequest, res: Response) => {
    const { email, password } = req.body

    try {
        // Vérifier que l'utilisateur existe
        const user = await prisma.user.findUnique({
            where: { email },
        })

        if (!user) {
            return res.status(401).json({ error: 'Email ou mot de passe incorrect' })
        }

        // Champ manquant ?
        if (!email || !password) {
            return res.status(400).json({ error: 'Champs manquants' })
        }

        // Vérifier le mot de passe
        const isPasswordValid = await bcrypt.compare(password, user.password)

        if (!isPasswordValid) {
            return res.status(401).json({ error: 'Email ou mot de passe incorrect' })
        }

        // Générer le JWT
        const token = jwt.sign(
            {
                userId: user.id,
                email: user.email,
            },
            process.env.JWT_SECRET as string,
            { expiresIn: '7d' },
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
        return res.status(500).json({ error: 'Erreur serveur' })
    }
})
