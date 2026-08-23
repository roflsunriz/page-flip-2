import { basename, join } from 'node:path';

const root = join(import.meta.dir, '..');
const routes = new Map([
    ['/', Bun.file(join(root, 'demo', 'index.html'))],
    ['/dist/page-flip-2.js', Bun.file(join(root, 'dist', 'page-flip-2.js'))],
    ['/dist/page-flip-2.js.map', Bun.file(join(root, 'dist', 'page-flip-2.js.map'))],
]);

const server = Bun.serve({
    port: 4173,
    async fetch(request) {
        const path = new URL(request.url).pathname;
        if (path === '/favicon.ico') return new Response(null, { status: 204 });

        const file = routes.get(path);
        if (file !== undefined) return new Response(file);

        if (path.startsWith('/dist/chunks/')) {
            const fileName = basename(path);
            if (path !== `/dist/chunks/${fileName}`)
                return new Response('Not found', { status: 404 });

            const chunk = Bun.file(join(root, 'dist', 'chunks', fileName));
            if (await chunk.exists()) return new Response(chunk);
        }

        return new Response('Not found', { status: 404 });
    },
});

console.log(`Demo server: ${server.url}`);
