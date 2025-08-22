import { BoltBackendApp } from './app';

async function bootstrap() {
  const app = new BoltBackendApp();

  const port = parseInt(process.env.PORT || '8000');
  await app.start(port);
}

// Handle bootstrap errors
bootstrap().catch((error) => {
  console.error('Failed to start application:', error);
  process.exit(1);
});
