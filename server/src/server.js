import app from './app.js';
import { env, validateEnv } from './config/env.js';
import { connectDatabase, disconnectDatabase } from './database/connection.js';
import { logger } from './utils/logger.js';

let server = null;

async function bootstrap() {
  try {
    validateEnv();
    await connectDatabase();

    server = app.listen(env.PORT, () => {
      logger.info(`========================================================`);
      logger.info(`MarichiHR Backend API Server Running on port ${env.PORT}`);
      logger.info(`Environment: ${env.NODE_ENV}`);
      logger.info(`Health Check: http://localhost:${env.PORT}/health`);
      logger.info(`Base API v1:  http://localhost:${env.PORT}/api/v1`);
      logger.info(`========================================================`);
    });

    const shutdown = async (signal) => {
      logger.info(`Received ${signal}. Shutting down gracefully...`);
      if (server) {
        server.close(async () => {
          logger.info('HTTP server closed.');
          await disconnectDatabase();
          process.exit(0);
        });
      } else {
        process.exit(0);
      }
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (err) {
    logger.error('Failed to bootstrap server:', err);
    process.exit(1);
  }
}

// Only bootstrap automatically if not in test suite
if (process.env.NODE_ENV !== 'test') {
  bootstrap();
}

export default app;
