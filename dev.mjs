// Run the built frontend and authenticated API from one server and one origin.
// This prevents local login failures caused by starting only the static page.
import { fileURLToPath } from 'node:url';

process.chdir(fileURLToPath(new URL('./backend/', import.meta.url)));
process.env.PORT = '8080';
await import('./backend/server.js');
