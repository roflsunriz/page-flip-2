import { join } from 'node:path';

const root = join(import.meta.dir, '..');
const routes = new Map([
    ['/', Bun.file(join(root, 'demo', 'index.html'))],
    ['/dist/page-flip-2.js', Bun.file(join(root, 'dist', 'page-flip-2.js'))],
    ['/dist/page-flip-2.js.map', Bun.file(join(root, 'dist', 'page-flip-2.js.map'))],
]);

const server = Bun.serve({
    port: 4173,
    fetch(request) {
        const path = new URL(request.url).pathname;
        const file = routes.get(path);

        return file === undefined ? new Response('Not found', { status: 404 }) : new Response(file);
    },
});

console.log(`Demo server: ${server.url}`);
