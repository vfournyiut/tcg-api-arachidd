import { describe, expect, it, beforeAll } from 'vitest'
import request from 'supertest';
import { app } from '../src/index';
import { prismaMock } from './vitest.setup';
import jwt from 'jsonwebtoken';
import { env } from '../src/env';
import { PokemonType } from '../src/generated/prisma/enums';

const mockDeck = {
    id: 1,
    name: 'Test Deck',
    userId: 1,
    createdAt: new Date(),
    updatedAt: new Date()
};

const foundedCards = [
    { id: 1, name: 'Bulbasaur', hp: 45, attack: 49, type: PokemonType.Grass, pokedexNumber: 1, imgUrl: null, createdAt: new Date(), updatedAt: new Date() },
    { id: 2, name: 'Ivysaur', hp: 60, attack: 62, type: PokemonType.Grass, pokedexNumber: 2, imgUrl: null, createdAt: new Date(), updatedAt: new Date() },
    { id: 3, name: 'Venusaur', hp: 80, attack: 82, type: PokemonType.Grass, pokedexNumber: 3, imgUrl: null, createdAt: new Date(), updatedAt: new Date() },
    {
        id: 4, name: 'Charmander', hp: 39, attack: 52, type: PokemonType.Fire
        , pokedexNumber: 4, imgUrl: null, createdAt: new Date(), updatedAt: new Date()
    },
    { id: 5, name: 'Charmeleon', hp: 58, attack: 64, type: PokemonType.Fire, pokedexNumber: 5, imgUrl: null, createdAt: new Date(), updatedAt: new Date() },
    { id: 6, name: 'Charizard', hp: 78, attack: 84, type: PokemonType.Fire, pokedexNumber: 6, imgUrl: null, createdAt: new Date(), updatedAt: new Date() },
    { id: 7, name: 'Squirtle', hp: 44, attack: 48, type: PokemonType.Water, pokedexNumber: 7, imgUrl: null, createdAt: new Date(), updatedAt: new Date() },
    {
        id: 8, name: 'Wartortle', hp: 59, attack: 63, type: PokemonType.Water,
        pokedexNumber: 8, imgUrl: null, createdAt: new Date(), updatedAt: new Date()
    },
    { id: 9, name: 'Blastoise', hp: 79, attack: 83, type: PokemonType.Water, pokedexNumber: 9, imgUrl: null, createdAt: new Date(), updatedAt: new Date() },
    { id: 10, name: 'Caterpie', hp: 45, attack: 30, type: PokemonType.Bug, pokedexNumber: 10, imgUrl: null, createdAt: new Date(), updatedAt: new Date() }
];

const mockCards = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

let authToken: string;

beforeAll(() => {
    authToken = jwt.sign(
        { userId: 1, email: 'blue@example.com' },
        env.JWT_SECRET,
        { expiresIn: '7d' }
    );
});

describe('POST /api/decks', () => {
    it('should create a new deck with 10 cards', async () => {
        prismaMock.card.findMany.mockResolvedValueOnce(foundedCards);
        prismaMock.deck.create.mockResolvedValueOnce({
            ...mockDeck,
            name: 'My Test Deck'
        });

        const response = await request(app)
            .post('/api/decks')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
                name: 'My Test Deck',
                cards: mockCards
            })
            .expect(201);
        expect(response.body).toHaveProperty('id');
        expect(response.body).toHaveProperty('name', 'My Test Deck');
    });

    it('should not create a deck without authentication', async () => {
        const response = await request(app)
            .post('/api/decks')
            .send({
                name: 'Unauthorized Deck',
                cards: mockCards
            })
            .expect(401);
        expect(response.body).toHaveProperty('error');
    });

    it('should not create a deck without a name', async () => {
        const response = await request(app)
            .post('/api/decks')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
                name: '',
                cards: mockCards
            })
            .expect(400);
        expect(response.body).toHaveProperty('error', 'Le nom du deck est requis');
    });

    it('should not create a deck with less than 10 cards', async () => {
        const response = await request(app)
            .post('/api/decks')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
                name: 'Incomplete Deck',
                cards: [1, 2, 3]
            })
            .expect(400);
        expect(response.body).toHaveProperty('error', 'Le deck doit contenir 10 cartes');
    });

    it('should not create a deck with more than 10 cards', async () => {
        const response = await request(app)
            .post('/api/decks')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
                name: 'Too Many Cards Deck',
                cards: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
            })
            .expect(400);
        expect(response.body).toHaveProperty('error', 'Le deck doit contenir 10 cartes');
    });

    it('should not create a deck without cards array', async () => {
        const response = await request(app)
            .post('/api/decks')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
                name: 'No Cards Deck'
            })
            .expect(400);
        expect(response.body).toHaveProperty('error', 'Le deck doit contenir 10 cartes');
    });

    it('should not create a deck with cards not being an array', async () => {
        const response = await request(app)
            .post('/api/decks')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
                name: 'Invalid Cards Type',
                cards: 'not an array'
            })
            .expect(400);
        expect(response.body).toHaveProperty('error', 'Le deck doit contenir 10 cartes');
    });

    it('should not create a deck with non-existent cards', async () => {
        prismaMock.card.findMany.mockResolvedValueOnce([
            foundedCards[0],
            foundedCards[1],
            foundedCards[2]
        ]);

        const response = await request(app)
            .post('/api/decks')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
                name: 'Invalid Cards Deck',
                cards: mockCards
            })
            .expect(400);
        expect(response.body).toHaveProperty('error', 'Toutes les cartes doivent exister en base');
    });

    it('should return 500 if database fails on deck creation', async () => {
        prismaMock.card.findMany.mockRejectedValueOnce(new Error('DB Error'));

        const response = await request(app)
            .post('/api/decks')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
                name: 'Error Deck',
                cards: mockCards
            })
            .expect(500);
        expect(response.body).toHaveProperty('error', 'Erreur serveur');
    });
});

describe('GET /api/decks/mine', () => {
    it('should retrieve all decks for authenticated user', async () => {
        prismaMock.deck.findMany.mockResolvedValueOnce([
            { ...mockDeck, name: 'Deck 1' },
            { ...mockDeck, id: 2, name: 'Deck 2' }
        ]);

        const response = await request(app)
            .get('/api/decks/mine')
            .set('Authorization', `Bearer ${authToken}`)
            .expect(200);
        expect(Array.isArray(response.body)).toBe(true);
        expect(response.body.length).toBe(2);
    });

    it('should not retrieve decks without authentication', async () => {
        const response = await request(app)
            .get('/api/decks/mine')
            .expect(401);
        expect(response.body).toHaveProperty('error');
    });

    it('should return 500 if database fails on getting user decks', async () => {
        prismaMock.deck.findMany.mockRejectedValueOnce(new Error('DB Error'));

        const response = await request(app)
            .get('/api/decks/mine')
            .set('Authorization', `Bearer ${authToken}`)
            .expect(500);
        expect(response.body).toHaveProperty('error', 'Erreur serveur');
    });
});

describe('GET /api/decks/:id', () => {
    it('should retrieve a specific deck by ID', async () => {
        prismaMock.deck.findUnique.mockResolvedValueOnce({
            ...mockDeck
        });

        const response = await request(app)
            .get(`/api/decks/1`)
            .set('Authorization', `Bearer ${authToken}`)
            .expect(200);
        expect(response.body).toHaveProperty('id', 1);
        expect(response.body).toHaveProperty('name');
    });

    it('should not retrieve a deck without authentication', async () => {
        const response = await request(app)
            .get(`/api/decks/1`)
            .expect(401);
        expect(response.body).toHaveProperty('error');
    });

    it('should return 404 for non-existent deck', async () => {
        prismaMock.deck.findUnique.mockResolvedValueOnce(null);

        const response = await request(app)
            .get('/api/decks/99999')
            .set('Authorization', `Bearer ${authToken}`)
            .expect(404);
        expect(response.body).toHaveProperty('error', 'Deck non trouvé');
    });

    it('should return 403 if deck belongs to another user', async () => {
        prismaMock.deck.findUnique.mockResolvedValueOnce({
            ...mockDeck,
            userId: 999
        });

        const response = await request(app)
            .get('/api/decks/1')
            .set('Authorization', `Bearer ${authToken}`)
            .expect(403);
        expect(response.body).toHaveProperty('error', 'Accès refusé à ce deck');
    });

    it('should return 500 if database fails on getting deck', async () => {
        prismaMock.deck.findUnique.mockRejectedValueOnce(new Error('DB Error'));

        const response = await request(app)
            .get('/api/decks/1')
            .set('Authorization', `Bearer ${authToken}`)
            .expect(500);
        expect(response.body).toHaveProperty('error', 'Erreur serveur');
    });
});

describe('PATCH /api/decks/:id', () => {
    it('should update a deck name and cards', async () => {
        prismaMock.deck.findUnique.mockResolvedValueOnce({
            ...mockDeck,
            name: 'Old Name'
        });

        prismaMock.card.findMany.mockResolvedValueOnce(foundedCards);
        prismaMock.deck.update.mockResolvedValueOnce({
            ...mockDeck,
            name: 'Updated Deck Name'
        });

        const response = await request(app)
            .patch(`/api/decks/1`)
            .set('Authorization', `Bearer ${authToken}`)
            .send({
                name: 'Updated Deck Name',
                cards: mockCards
            })
            .expect(200);
        expect(response.body).toHaveProperty('name', 'Updated Deck Name');
    });

    it('should update only deck name without cards', async () => {
        prismaMock.deck.findUnique.mockResolvedValueOnce({
            ...mockDeck,
            name: 'Old Name'
        });

        prismaMock.deck.update.mockResolvedValueOnce({
            ...mockDeck,
            name: 'New Name Only'
        });

        const response = await request(app)
            .patch(`/api/decks/1`)
            .set('Authorization', `Bearer ${authToken}`)
            .send({
                name: 'New Name Only'
            })
            .expect(200);
        expect(response.body).toHaveProperty('name', 'New Name Only');
    });

    it('should not update a deck without authentication', async () => {
        const response = await request(app)
            .patch(`/api/decks/1`)
            .send({
                name: 'Unauthorized Update',
                cards: mockCards
            })
            .expect(401);
        expect(response.body).toHaveProperty('error');
    });

    it('should return 404 if deck not found', async () => {
        prismaMock.deck.findUnique.mockResolvedValueOnce(null);

        const response = await request(app)
            .patch('/api/decks/99999')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
                name: 'Updated Name',
                cards: mockCards
            })
            .expect(404);
        expect(response.body).toHaveProperty('error', 'Deck non trouvé');
    });

    it('should return 403 if deck belongs to another user', async () => {
        prismaMock.deck.findUnique.mockResolvedValueOnce({
            ...mockDeck,
            userId: 999
        });

        const response = await request(app)
            .patch('/api/decks/1')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
                name: 'Updated Name',
                cards: mockCards
            })
            .expect(403);
        expect(response.body).toHaveProperty('error', 'Accès refusé à ce deck');
    });

    it('should not update with invalid number of cards', async () => {
        prismaMock.deck.findUnique.mockResolvedValueOnce(mockDeck);

        const response = await request(app)
            .patch('/api/decks/1')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
                name: 'Updated Name',
                cards: [1, 2, 3]
            })
            .expect(400);
        expect(response.body).toHaveProperty('error', 'Le deck doit contenir exactement 10 cartes');
    });

    it('should not update with cards not being an array', async () => {
        prismaMock.deck.findUnique.mockResolvedValueOnce(mockDeck);

        const response = await request(app)
            .patch('/api/decks/1')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
                name: 'Updated Name',
                cards: 'not an array'
            })
            .expect(400);
        expect(response.body).toHaveProperty('error', 'Le deck doit contenir exactement 10 cartes');
    });

    it('should not update with non-existent cards', async () => {
        prismaMock.deck.findUnique.mockResolvedValueOnce(mockDeck);
        prismaMock.card.findMany.mockResolvedValueOnce([
            foundedCards[0],
            foundedCards[1]
        ]);

        const response = await request(app)
            .patch('/api/decks/1')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
                name: 'Updated Name',
                cards: mockCards
            })
            .expect(400);
        expect(response.body).toHaveProperty('error', 'Certaines cartes sont invalides ou inexistantes');
    });

    it('should return 500 if database fails on deck update', async () => {
        prismaMock.deck.findUnique.mockRejectedValueOnce(new Error('DB Error'));

        const response = await request(app)
            .patch('/api/decks/1')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
                name: 'Updated Name',
                cards: mockCards
            })
            .expect(500);
        expect(response.body).toHaveProperty('error', 'Erreur serveur');
    });
});

describe('DELETE /api/decks/:id', () => {
    it('should delete a deck', async () => {
        prismaMock.deck.findUnique.mockResolvedValueOnce(mockDeck);
        prismaMock.deck.delete.mockResolvedValueOnce(mockDeck);

        const response = await request(app)
            .delete('/api/decks/1')
            .set('Authorization', `Bearer ${authToken}`)
            .expect(200);
        expect(response.body).toHaveProperty('message', 'Deck supprimé avec succès');
    });

    it('should not delete a deck without authentication', async () => {
        const response = await request(app)
            .delete('/api/decks/1')
            .expect(401);
        expect(response.body).toHaveProperty('error');
    });

    it('should return 404 if deck not found', async () => {
        prismaMock.deck.findUnique.mockResolvedValueOnce(null);

        const response = await request(app)
            .delete('/api/decks/99999')
            .set('Authorization', `Bearer ${authToken}`)
            .expect(404);
        expect(response.body).toHaveProperty('error', 'Deck non trouvé');
    });

    it('should return 403 if deck belongs to another user', async () => {
        prismaMock.deck.findUnique.mockResolvedValueOnce({
            ...mockDeck,
            userId: 999
        });

        const response = await request(app)
            .delete('/api/decks/1')
            .set('Authorization', `Bearer ${authToken}`)
            .expect(403);
        expect(response.body).toHaveProperty('error', 'Accès refusé à ce deck');
    });

    it('should return 500 if database fails on deck deletion', async () => {
        prismaMock.deck.findUnique.mockRejectedValueOnce(new Error('DB Error'));

        const response = await request(app)
            .delete('/api/decks/1')
            .set('Authorization', `Bearer ${authToken}`)
            .expect(500);
        expect(response.body).toHaveProperty('error', 'Erreur serveur');
    });
});
