import { mkdir, rm } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const projectRoot = resolve(import.meta.dirname, '..');
const distDirectory = resolve(projectRoot, 'dist');

if (dirname(distDirectory) !== projectRoot) {
    throw new Error(`Refusing to clean unexpected output directory: ${distDirectory}`);
}

const runTypeScriptDeclarations = async () => {
    const subprocess = Bun.spawn([process.execPath, 'x', 'tsc', '--emitDeclarationOnly'], {
        cwd: projectRoot,
        stdout: 'inherit',
        stderr: 'inherit',
    });

    const exitCode = await subprocess.exited;
    if (exitCode !== 0) {
        throw new Error(`TypeScript declaration build failed with exit code ${exitCode}`);
    }
};

const buildBundle = async () => {
    const result = await Bun.build({
        entrypoints: [resolve(projectRoot, 'src/index.ts')],
        outdir: distDirectory,
        target: 'browser',
        format: 'esm',
        minify: true,
        sourcemap: 'linked',
        naming: 'page-flip-2.[ext]',
    });

    if (!result.success) {
        for (const log of result.logs) {
            console.error(log);
        }
        throw new Error('Bun ESM bundle failed');
    }
};

const validateBundle = async () => {
    const bundlePath = resolve(distDirectory, 'page-flip-2.js');
    const bundle = Bun.file(bundlePath);

    if (!(await bundle.exists()) || bundle.size < 10_000) {
        throw new Error(`Bun emitted an incomplete bundle: ${bundlePath}`);
    }

    const source = await bundle.text();
    const requiredMarkers = ['PageFlip', 'data-page-flip-2-styles', 'page-flip-2__wrapper'];

    for (const marker of requiredMarkers) {
        if (!source.includes(marker)) {
            throw new Error(`Bun bundle is missing required marker: ${marker}`);
        }
    }
};

await rm(distDirectory, { recursive: true, force: true });
await mkdir(distDirectory, { recursive: true });
await runTypeScriptDeclarations();
await buildBundle();
await validateBundle();
