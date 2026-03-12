import jwt from 'jsonwebtoken'
import { Socket } from 'socket.io'

export const authenticateSocket = async (socket: Socket, next: (err?: Error) => void) => {
    try {
        const token = socket.handshake.auth.token

        if (!token) {
            return next(new Error('Token manquant'))
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as {
            userId: number
            email: string
        }

        socket.data.userId = decoded.userId
        socket.data.email = decoded.email

        next()
    } catch (error) {
        next(new Error('Token invalide ou expiré'))
    }
}
