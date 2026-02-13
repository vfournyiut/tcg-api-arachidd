import {describe, expect, it} from 'vitest'
import request from 'supertest';
import {app} from '../src/index';
import {prismaMock} from './vitest.setup';
import bcrypt from 'bcrypt';

const mockUser = {
    id: 1,
    username: 'testuser',
    email: 'test@example.com',
    password: 'hashedpassword',
    createdAt: new Date(),
    updatedAt: new Date()
};

describe('POST /auth/sign-up', () => {
    it('should sign up a new user', async () => {
        prismaMock.user.findUnique.mockResolvedValueOnce(null);
        prismaMock.user.create.mockResolvedValueOnce({
            id: 1,
            username: 'tcguser',
            email: 'tcg@test.com',
            password: await bcrypt.hash('testpassword', 10),
            createdAt: new Date(),
            updatedAt: new Date()
        });

        const response = await request(app)
            .post('/api/auth/sign-up')
            .send({
                username: 'tcguser',
                email: 'tcg@test.com',
                password: 'testpassword'
            })
            .expect(201);
        expect(response.body).toHaveProperty('token');
        expect(response.body).toHaveProperty('user');
        expect(response.body.message).toBe('Utilisateur créé avec succès');
    });

    it('should not sign up with existing email', async () => {
        prismaMock.user.findUnique.mockResolvedValueOnce({
            ...mockUser,
            email: 'existing@example.com',
            username: 'existing'
        });

        const response = await request(app)
            .post('/api/auth/sign-up')
            .send({
                username: 'newuser',
                email: 'existing@example.com',
                password: 'password123'
            })
            .expect(409);
        expect(response.body).toHaveProperty('error', 'Utilisateur déjà existant');
    });

    it('should not sign up with missing fields', async () => {
        const response = await request(app)
            .post('/api/auth/sign-up')
            .send({
                username: 'incompleteuser',
                email: '',
                password: 'testpassword'
            })
            .expect(400);
        expect(response.body).toHaveProperty('error', 'Champs manquants');
    });

    it('should return 500 if database fails on sign-up', async () => {
        prismaMock.user.findUnique.mockRejectedValueOnce(new Error('DB Error'));

        const response = await request(app)
            .post('/api/auth/sign-up')
            .send({
                username: 'testuser',
                email: 'test@example.com',
                password: 'password123'
            })
            .expect(500);
        expect(response.body).toHaveProperty('error', 'Erreur serveur');
    });
});

describe('POST /auth/sign-in', () => {
    it('should sign in an existing user', async () => {
        const hashedPassword = await bcrypt.hash('password123', 10);
        prismaMock.user.findUnique.mockResolvedValueOnce({
            id: 1,
            email: 'blue@example.com',
            username: 'blue',
            password: hashedPassword,
            createdAt: new Date(),
            updatedAt: new Date()
        });

        const response = await request(app)
            .post('/api/auth/sign-in')
            .send({
                email: 'blue@example.com',
                password: 'password123'
            })
            .expect(200);
        expect(response.body).toHaveProperty('token');
        expect(response.body).toHaveProperty('user');
    });

    it('should not sign in with invalid email', async () => {
        prismaMock.user.findUnique.mockResolvedValueOnce(null);

        const response = await request(app)
            .post('/api/auth/sign-in')
            .send({
                email: 'nonexistent@example.com',
                password: 'password123'
            })
            .expect(401);
        expect(response.body).toHaveProperty('error', 'Email ou mot de passe incorrect');
    });

    it('should not sign in with invalid password', async () => {
        const hashedPassword = await bcrypt.hash('correctpassword', 10);
        prismaMock.user.findUnique.mockResolvedValueOnce({
            id: 1,
            email: 'blue@example.com',
            username: 'blue',
            password: hashedPassword,
            createdAt: new Date(),
            updatedAt: new Date()
        });

        const response = await request(app)
            .post('/api/auth/sign-in')
            .send({
                email: 'blue@example.com',
                password: 'wrongpassword'
            })
            .expect(401);
        expect(response.body).toHaveProperty('error', 'Email ou mot de passe incorrect');
    });

    it('should not sign in with missing fields', async () => {
        prismaMock.user.findUnique.mockResolvedValueOnce({
            id: 1,
            email: 'test@example.com',
            username: 'test',
            password: 'hashedpassword',
            createdAt: new Date(),
            updatedAt: new Date()
        });

        const response = await request(app)
            .post('/api/auth/sign-in')
            .send({
                email: '',
                password: ''
            })
            .expect(400);
        expect(response.body).toHaveProperty('error', 'Champs manquants');
    });

    it('should return 500 if database fails on sign-in', async () => {
        prismaMock.user.findUnique.mockRejectedValueOnce(new Error('DB Error'));

        const response = await request(app)
            .post('/api/auth/sign-in')
            .send({
                email: 'test@example.com',
                password: 'password123'
            })
            .expect(500);
        expect(response.body).toHaveProperty('error', 'Erreur serveur');
    });
});