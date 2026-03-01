import type { Card } from "../generated/prisma/client"

export interface Player {
    socketId: string
    userId: number
    username: string
    deck: Card[]
    hand: Card[]
    activeCard: Card | null
    score: number
}
export interface GameRoom {
    id: string
    host: Player
    guest: Player | null
    currentTurn: string
    status: 'waiting' | 'playing' | 'finished'
    createdAt: Date
}

export interface GameState {
    roomId: string
    myHand: Card[]
    myActiveCard: Card | null
    myDeck: number
    myScore: number
    opponentActiveCard: Card | null
    opponentHandCount: number
    opponentDeckCount: number
    opponentScore: number
    currentTurn: string
    isMyTurn: boolean
}
