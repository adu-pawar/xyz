import { app } from './app.js';
import { connectDB } from './config/db.js';
import { env } from './config/env.js';
import { logger } from './utils/logger.js';

const startServer = async () => {
  try {
    await connectDB();

    // Auto-seed if database is currently empty (e.g. freshly initialized embedded MongoDB)
    const { User } = await import('./models/User.js');
    const userCount = await User.countDocuments();
    if (userCount === 0) {
      logger.info('Empty database detected on startup. Auto-seeding initial demo data...');
      const { seedDatabase } = await import('./scripts/seed.js');
      // The server already connected before checking whether the database is empty.
      await seedDatabase({ connect: false });
    }

    const server = app.listen(env.PORT, () => {
      logger.info(`=======================================================`);
      logger.info(`  BugSlayer — Autonomous AI QA Engineer API Server       `);
      logger.info(`  Running on: http://localhost:${env.PORT}             `);
      logger.info(`  Environment: ${env.NODE_ENV}                         `);
      logger.info(`  Client Origin: ${env.CLIENT_ORIGIN}                  `);
      logger.info(`  Sandbox Target: http://localhost:${env.PORT}/demo-app`);
      logger.info(`=======================================================`);
    });

    const shutdown = async () => {
      logger.info('Gracefully terminating server...');
      server.close(() => {
        logger.info('HTTP server closed.');
        process.exit(0);
      });
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
  } catch (err) {
    logger.error('Failed to start server:', err);
    process.exit(1);
  }
};

startServer();
