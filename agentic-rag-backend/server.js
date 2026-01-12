import app from './src/app.js';
import { connectDB, disconnectDB } from './src/config/database.js';
import { connectRedis, disconnectRedis } from './src/config/redis.js';
import cacheService from './src/services/cache.service.js';
import queueService from './src/services/queue.service.js';
import pythonBridge from './src/services/python/bridge.js';
import logger from './src/utils/logger.js';
import env from './src/config/environment.js';

/**
 * Server Entry Point
 * 
 * Handles:
 * - Service initialization (DB, Redis, Cache, Queue)
 * - Python health check
 * - HTTP server startup
 * - Graceful shutdown
 */

let server = null;

/**
 * Start the server
 */
async function startServer() {
    try {
        logger.info('🚀 Starting Agentic RAG Backend...');
        logger.info('Environment:', env.toObject());

        // Initialize MongoDB
        logger.info('Connecting to MongoDB...');
        await connectDB();

        // Initialize Redis (optional - skip if caching disabled)
        if (env.cacheEnabled) {
            logger.info('Connecting to Redis...');
            await connectRedis();
        } else {
            logger.info('⏭️  Skipping Redis connection (CACHE_ENABLED=false)');
        }

        // Initialize cache service
        logger.info('Initializing cache service...');
        await cacheService.initialize();

        // Start queue processor
        logger.info('Starting queue processor...');
        queueService.processJobs();

        // Python health check
        logger.info('Checking Python RAG pipeline...');
        const isPythonHealthy = await pythonBridge.healthCheck();

        if (!isPythonHealthy) {
            logger.warn('⚠️  Python health check failed - some features may not work');
        } else {
            logger.info('✓ Python RAG pipeline is healthy');
        }

        // Start HTTP server
        const PORT = env.port;
        server = app.listen(PORT, '0.0.0.0', () => {
            logger.info('');
            logger.info('╔═══════════════════════════════════════════════════════════╗');
            logger.info('║                                                           ║');
            logger.info('║        🤖 Agentic RAG Backend Server Running 🤖          ║');
            logger.info('║                                                           ║');
            logger.info('╚═══════════════════════════════════════════════════════════╝');
            logger.info('');
            logger.info(`🌐 Server:        http://localhost:${PORT}`);
            logger.info(`📊 Health:        http://localhost:${PORT}/health`);
            logger.info(`💬 Chat API:      http://localhost:${PORT}/api/chat`);
            logger.info(`📈 Stats:         http://localhost:${PORT}/api/stats`);
            logger.info(`🔧 Environment:   ${env.nodeEnv}`);
            logger.info(`📦 Cache:         ${cacheService.getStats().enabled ? 'Enabled' : 'Disabled'}`);
            logger.info(`⚙️  Queue:         ${queueService.isProcessing ? 'Processing' : 'Idle'}`);
            logger.info('');
            logger.info('Press Ctrl+C to stop the server');
            logger.info('');
        });

        // Handle server errors
        server.on('error', (error) => {
            if (error.code === 'EADDRINUSE') {
                logger.error(`Port ${PORT} is already in use`);
            } else {
                logger.error('Server error:', error);
            }
            process.exit(1);
        });

    } catch (error) {
        logger.error('Failed to start server:', {
            error: error.message,
            stack: error.stack,
        });
        process.exit(1);
    }
}

/**
 * Graceful shutdown
 */
async function gracefulShutdown(signal) {
    logger.info(`\n${signal} received, starting graceful shutdown...`);

    try {
        // Stop accepting new requests
        if (server) {
            logger.info('Closing HTTP server...');
            await new Promise((resolve) => {
                server.close(resolve);
            });
            logger.info('✓ HTTP server closed');
        }

        // Close queue
        logger.info('Closing queue...');
        await queueService.close();
        logger.info('✓ Queue closed');

        // Close Redis
        logger.info('Disconnecting from Redis...');
        await disconnectRedis();
        logger.info('✓ Redis disconnected');

        // Close MongoDB
        logger.info('Disconnecting from MongoDB...');
        await disconnectDB();
        logger.info('✓ MongoDB disconnected');

        logger.info('✓ Graceful shutdown completed');
        process.exit(0);
    } catch (error) {
        logger.error('Error during shutdown:', {
            error: error.message,
        });
        process.exit(1);
    }
}

/**
 * Handle shutdown signals
 */
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

/**
 * Start the server
 */
startServer();

export { server };
