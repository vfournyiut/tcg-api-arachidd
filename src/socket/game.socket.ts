import { Server, Socket } from 'socket.io'
import { prisma } from '../database'
import { GameRoom, Player, GameState } from '../types/game.types'
import { calculateDamage as calcDamage } from '../utils/rules.util'
import type { Card } from '../generated/prisma/client'

function calculateDamage(attackerCard: Card, defenderCard: Card): number {
    return calcDamage(attackerCard.attack, attackerCard.type, defenderCard.type)
}

const gameRooms = new Map<string, GameRoom>()
let roomCounter = 0
let debugMode = true
const MAX_HAND_SIZE = 5

function shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array]
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    return shuffled
}

export function initializeSocketHandlers(io: Server) {

    io.on('connection', (socket: Socket) => {
        console.log(`🔌 Nouveau client connecté: ${socket.id}`)
        console.log(`   User: ${socket.data.email}`)
        roomCounter++

        socket.on('createRoom', async (data: { deckId: number }) => {
            try {
                const userId = socket.data.userId
                const deck = await prisma.deck.findUnique({
                    where: { id: data.deckId },
                    include: {
                        deckCards: {
                            include: { card: true }
                        },
                        user: true
                    }
                })

                if (!deck) {
                    socket.emit('error', { message: 'Deck non trouvé' })
                    return
                }

                if (deck.userId !== userId) {
                    socket.emit('error', { message: 'Ce deck ne vous appartient pas' })
                    return
                }

                if (deck.deckCards.length !== 10) {
                    socket.emit('error', { message: 'Le deck doit contenir exactement 10 cartes' })
                    return
                }
                const cards = deck.deckCards.map(dc => dc.card)
                const shuffledDeck = shuffleArray(cards)
                const host: Player = {
                    socketId: socket.id,
                    userId: userId,
                    username: deck.user.username,
                    deck: shuffledDeck,
                    hand: [],
                    activeCard: null,
                    score: 0
                }
                const roomId = `room_${Date.now()}_${socket.id.substring(0, 5)}`
                const room: GameRoom = {
                    id: roomId,
                    host: host,
                    guest: null,
                    currentTurn: socket.id,
                    status: 'waiting',
                    createdAt: new Date()
                }

                gameRooms.set(roomId, room)
                socket.join(roomId)

                console.log(`🏠 Room créée: ${roomId} par ${deck.user.username}`)

                socket.emit('roomCreated', {
                    roomId: roomId,
                    message: 'Room créée avec succès, en attente d\'un adversaire...'
                })

                io.emit('roomsListUpdated', getAvailableRooms())

            } catch (error) {
                console.error('Erreur createRoom:', error)
                socket.emit('error', { message: 'Erreur lors de la création de la room' })
            }
        })

        socket.on('getRooms', () => {
            socket.emit('roomsList', getAvailableRooms())
        })

        socket.on('joinRoom', async (data: { roomId: string, deckId: number }) => {
            try {
                const userId = socket.data.userId
                const room = gameRooms.get(data.roomId)

                if (!room) {
                    socket.emit('error', { message: 'Room non trouvée' })
                    return
                }

                if (room.guest !== null) {
                    socket.emit('error', { message: 'Room déjà complète' })
                    return
                }

                const deck = await prisma.deck.findUnique({
                    where: { id: data.deckId },
                    include: {
                        deckCards: { include: { card: true } },
                        user: true
                    }
                })

                if (!deck || deck.userId !== userId || deck.deckCards.length !== 10) {
                    socket.emit('error', { message: 'Deck invalide' })
                    return
                }

                const cards = deck.deckCards.map(dc => dc.card)
                const shuffledDeck = shuffleArray(cards)

                const guest: Player = {
                    socketId: socket.id,
                    userId: userId,
                    username: deck.user.username,
                    deck: shuffledDeck,
                    hand: [],
                    activeCard: null,
                    score: 0
                }

                room.guest = guest
                room.status = 'playing'
                socket.join(data.roomId)

                console.log(`👥 ${guest.username} a rejoint la room ${data.roomId}`)

                drawInitialHands(room)

                sendGameState(io, room, room.host.socketId)
                sendGameState(io, room, room.guest.socketId)

                io.emit('roomsListUpdated', getAvailableRooms())

            } catch (error) {
                console.error('Erreur joinRoom:', error)
                socket.emit('error', { message: 'Erreur lors de la jonction' })
            }
        })

        socket.on('drawCards', (data: { roomId: string }) => {
            try {
                const room = gameRooms.get(data.roomId)
                if (!room) {
                    socket.emit('error', { message: 'Room non trouvée' })
                    return
                }

                const player = getPlayer(room, socket.id)
                if (!player) {
                    socket.emit('error', { message: 'Joueur non trouvé' })
                    return
                }

                while (player.hand.length < 5 && player.deck.length > 0) {
                    const card = player.deck.shift()
                    if (card) {
                        player.hand.push(card)
                    }
                }

                console.log(`🎴 ${player.username} a pioché (main: ${player.hand.length})`)

                sendGameState(io, room, room.host.socketId)
                sendGameState(io, room, room.guest!.socketId)

            } catch (error) {
                console.error('Erreur drawCards:', error)
                socket.emit('error', { message: 'Erreur lors de la pioche' })
            }
        })

        socket.on('playCard', (data: { roomId: string, cardIndex: number }) => {
            try {
                const room = gameRooms.get(data.roomId)
                if (!room) {
                    socket.emit('error', { message: 'Room non trouvée' })
                    return
                }

                const player = getPlayer(room, socket.id)
                if (!player) {
                    socket.emit('error', { message: 'Joueur non trouvé' })
                    return
                }
                const card = player.hand.splice(data.cardIndex, 1)[0]
                player.activeCard = card

                console.log(`⚔️ ${player.username} joue ${card.name}`)

                sendGameState(io, room, room.host.socketId)
                sendGameState(io, room, room.guest!.socketId)

            } catch (error) {
                console.error('Erreur playCard:', error)
                socket.emit('error', { message: 'Erreur lors du jeu de la carte' })
            }
        })

        socket.on('attack', (data: { roomId: string }) => {
            try {
                const room = gameRooms.get(data.roomId)
                if (!room) {
                    socket.emit('error', { message: 'Room non trouvée' })
                    return
                }

                const attacker = getPlayer(room, socket.id)
                const defender = getOpponent(room, socket.id)

                if (!attacker || !defender) {
                    socket.emit('error', { message: 'Joueurs non trouvés' })
                    return
                }

                if (room.currentTurn !== socket.id) {
                    socket.emit('error', { message: 'Ce n\'est pas votre tour' })
                    return
                }

                if (!attacker.activeCard) {
                    socket.emit('error', { message: 'Vous n\'avez pas de carte active' })
                    return
                }

                if (!defender.activeCard) {
                    socket.emit('error', { message: 'L\'adversaire n\'a pas de carte active' })
                    return
                }

                const damage = calculateDamage(attacker.activeCard, defender.activeCard)

                console.log(`💥 ${attacker.username} attaque avec ${attacker.activeCard.name}`)
                console.log(`   Dégâts: ${damage} HP sur ${defender.activeCard.name}`)

                defender.activeCard.hp -= damage
                if (defender.activeCard.hp <= 0) {
                    console.log(`💀 ${defender.activeCard.name} est KO !`)
                    attacker.score += 1
                    defender.activeCard = null
                }

                room.currentTurn = defender.socketId
                if (attacker.score >= 3) {
                    room.status = 'finished'
                    io.to(data.roomId).emit('gameEnded', {
                        winner: attacker.username,
                        winnerId: attacker.socketId,
                        message: `${attacker.username} a gagné la partie !`
                    })
                    return
                }
                sendGameState(io, room, room.host.socketId)
                sendGameState(io, room, room.guest!.socketId)

            } catch (error) {
                console.error('Erreur attack:', error)
                socket.emit('error', { message: 'Erreur lors de l\'attaque' })
            }
        })

        socket.on('endTurn', (data: { roomId: string }) => {
            try {
                const room = gameRooms.get(data.roomId)
                if (!room) {
                    socket.emit('error', { message: 'Room non trouvée' })
                    return
                }

                if (room.currentTurn !== socket.id) {
                    socket.emit('error', { message: 'Ce n\'est pas votre tour' })
                    return
                }

                const opponent = getOpponent(room, socket.id)
                if (opponent) {
                    room.currentTurn = opponent.socketId
                    console.log(`🔄 Tour suivant: ${opponent.username}`)
                }

                sendGameState(io, room, room.host.socketId)
                sendGameState(io, room, room.guest!.socketId)

            } catch (error) {
                console.error('Erreur endTurn:', error)
                socket.emit('error', { message: 'Erreur lors du changement de tour' })
            }
        })

        socket.on('disconnect', () => {
            console.log(`🔌 Déconnexion: ${socket.id}`)

            for (const [roomId, room] of gameRooms.entries()) {
                if (room.host.socketId === socket.id || room.guest?.socketId === socket.id) {
                    gameRooms.delete(roomId)
                    io.emit('roomsListUpdated', getAvailableRooms())
                    console.log(`🗑️ Room ${roomId} supprimée (déconnexion)`)
                }
            }
        })
    })
}

function getPlayer(room: GameRoom, socketId: string): Player | null {
    if (room.host.socketId === socketId) return room.host
    if (room.guest?.socketId === socketId) return room.guest
    return null
}

function getOpponent(room: GameRoom, socketId: string): Player | null {
    if (room.host.socketId === socketId) return room.guest
    if (room.guest?.socketId === socketId) return room.host
    return null
}

function drawInitialHands(room: GameRoom) {
    for (let i = 0; i < 5; i++) {
        if (room.host.deck.length > 0) {
            const card = room.host.deck.shift()
            if (card) room.host.hand.push(card)
        }
        if (room.guest && room.guest.deck.length > 0) {
            const card = room.guest.deck.shift()
            if (card) room.guest.hand.push(card)
        }
    }
}

function sendGameState(io: Server, room: GameRoom, socketId: string) {
    const player = getPlayer(room, socketId)
    const opponent = getOpponent(room, socketId)

    if (!player || !opponent) return

    const gameState: GameState = {
        roomId: room.id,
        myHand: player.hand,
        myActiveCard: player.activeCard,
        myDeck: player.deck.length,
        myScore: player.score,
        opponentActiveCard: opponent.activeCard,
        opponentHandCount: opponent.hand.length,
        opponentDeckCount: opponent.deck.length,
        opponentScore: opponent.score,
        currentTurn: room.currentTurn,
        isMyTurn: room.currentTurn === socketId
    }

    io.to(socketId).emit('gameStateUpdated', gameState)
}

function getAvailableRooms() {
    const availableRooms: any[] = []

    for (const [roomId, room] of gameRooms.entries()) {
        if (room.status === 'waiting') {
            availableRooms.push({
                roomId: roomId,
                hostUsername: room.host.username,
                createdAt: room.createdAt
            })
        }
    }

    return availableRooms
}
