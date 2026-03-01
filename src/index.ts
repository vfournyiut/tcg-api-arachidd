import cors from "cors";
import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";

import { env } from "./env";
import { authRouter } from "./routes/auth.route";
import { cardsRouter } from "./routes/cards.route";
import { decksRouter } from "./routes/decks.route";
import { authenticateSocket } from "./middleware/socket-auth.middleware";
import { initializeSocketHandlers } from "./socket/game.socket";

export const app = express();
app.use(
    cors({
        origin: true,
        credentials: true,
    }),
);

app.use(express.json());

app.use(express.static('public'));

app.use('/api/auth', authRouter);

app.use('/api/cards', cardsRouter);

app.use('/api/decks', decksRouter);

app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", message: "TCG Backend Server is running" });
});

if (require.main === module) {
    const httpServer = createServer(app);
    const io = new Server(httpServer, {
        cors: {
            origin: true,
            credentials: true
        }
    });

    io.use(authenticateSocket);

    initializeSocketHandlers(io);
    try {
        httpServer.listen(env.PORT, () => {
            console.log(`\n🚀 Server is running on http://localhost:${env.PORT}`);
            console.log(`🎮 Socket.io ready for game connections`);
            console.log(`🧪 Socket.io Test Client available at http://localhost:${env.PORT}`);
        });
    } catch (error) {
        console.error("Failed to start server:", error);
        process.exit(1);
    }
}
