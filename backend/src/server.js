const cluster = require('cluster');
const os = require('os');
const app = require('./app');
const connectDB = require('./config/db');
const env = require('./config/env');
const logger = require('./utils/logger');
const seedAdmin = require('./utils/seedAdmin');

const PORT = parseInt(env.PORT) || 5000;
const numCPUs = os.cpus().length;

const startWorker = async () => {
  try {
    await connectDB();
    if (cluster.isMaster || (cluster.isPrimary)) {
        await seedAdmin();
    }
    app.listen(PORT, () => {
      logger.info(`🚀 Worker ${process.pid} started - Port ${PORT} [${env.NODE_ENV}]`);
    });
  } catch (error) {
    logger.error(`Worker ${process.pid} failed to start: ${error.message}`);
    process.exit(1);
  }
};

if (cluster.isMaster || cluster.isPrimary) {
  logger.info(`Master ${process.pid} is running`);

  // Fork workers.
  const workers = env.NODE_ENV === 'production' ? numCPUs : 1;
  for (let i = 0; i < workers; i++) {
    cluster.fork();
  }

  cluster.on('exit', (worker, code, signal) => {
    logger.warn(`Worker ${worker.process.pid} died. Forking a new one...`);
    cluster.fork();
  });
} else {
  startWorker();
}
