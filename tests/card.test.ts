import {describe, expect, it} from 'vitest'
import request from 'supertest';
import {app} from '../src/index';
import {prismaMock} from './vitest.setup';
import { PokemonType } from '../src/generated/prisma/enums';

const mockCards = [
    { id: 1, name: 'Bulbasaur', hp: 45, attack: 49, type: PokemonType.Grass, pokedexNumber: 1, imgUrl: null, createdAt: new Date(), updatedAt: new Date() },
    { id: 4, name: 'Charmander', hp: 39, attack: 52, type: PokemonType.Fire, pokedexNumber: 4, imgUrl: null, createdAt: new Date(), updatedAt: new Date() },
    { id: 7, name: 'Squirtle', hp: 44, attack: 48, type: PokemonType.Water, pokedexNumber: 7, imgUrl: null, createdAt: new Date(), updatedAt: new Date() }
];

describe('GET /api/cards', () => {
    it('should retrieve all cards ordered by their pokedex number ascending', async () => {
        prismaMock.card.findMany.mockResolvedValueOnce(mockCards);

        const response = await request(app)
            .get('/api/cards')
            .expect(200);
        expect(Array.isArray(response.body)).toBe(true);
        expect(prismaMock.card.findMany).toHaveBeenCalledWith({ orderBy: { pokedexNumber: 'asc' } });
    });

    it('should return 500 if database fails on getting all cards', async () => {
        prismaMock.card.findMany.mockRejectedValueOnce(new Error('DB Error'));

        const response = await request(app)
            .get('/api/cards')
            .expect(500);
        expect(response.body).toHaveProperty('error', 'Erreur serveur');
    });
});
