/**
 * Long-running Node entry point (docker-compose, `npm run dev:server`).
 * For Vercel serverless, see /api/index.ts — both use `createApp()`.
 */
import { createApp } from './createApp';

const app = createApp();
const PORT = parseInt(process.env.PORT || '3456', 10);

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Abacus server running on port ${PORT}`);
  // eslint-disable-next-line no-console
  console.log(`Health check: http://localhost:${PORT}/api/health`);
  // eslint-disable-next-line no-console
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

export default app;
