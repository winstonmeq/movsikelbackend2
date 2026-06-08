import 'dotenv/config';
import { createServer } from 'node:http';
import next from 'next';
import { connectDb } from './lib/db.js';

const dev = process.env.NODE_ENV !== 'production';
const hostname = '0.0.0.0';
const port = Number(process.env.PORT || 4000);

const app = next({ dev, hostname, port });
const handler = app.getRequestHandler();

async function main() {
  await connectDb();
  await app.prepare();

  const httpServer = createServer(handler);

  httpServer.listen(port, () => {
    console.log(`MovSikel backend ready at http://localhost:${port}`);
    console.log('Realtime transport: REST polling / Firebase-ready mode. Socket.IO is disabled.');
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
