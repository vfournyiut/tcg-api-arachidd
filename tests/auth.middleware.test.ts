import {describe, expect, it} from 'vitest'
import request from 'supertest';
import {app} from '../src/index';

describe('Token Authentication Middleware', () => {
    it('should return 401 if no token is provided', async () => {
        const response = await request(app)
            .get('/api/decks/mine')
            .expect(401);
        
        expect(response.body).toHaveProperty('error');
    });

    it('should return 401 if token is invalid', async () => {
        const response = await request(app)
            .get('/api/decks/mine')
            .set('Authorization', 'Bearer invalidtoken')
            .expect(401);
        
        expect(response.body).toHaveProperty('error');
    });

    it('should return 401 if Authorization header is malformed', async () => {
        const response = await request(app)
            .get('/api/decks/mine')
            .set('Authorization', 'invalidformat')
            .expect(401);
        
        expect(response.body).toHaveProperty('error');
    });
});
