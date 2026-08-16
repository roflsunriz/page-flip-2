import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dryRun = process.argv.includes('--dry-run');
const destinationFlag = process.argv.indexOf('--destination');
const destination =
    destinationFlag >= 0 && process.argv[destinationFlag + 1]
        ? resolve(projectRoot, process.argv[destinationFlag + 1])
        : projectRoot;

await run(['bun', 'run', 'build'], projectRoot);

const stage = await mkdtemp(join(projectRoot, '.pack-stage-'));
if (relative(projectRoot, stage).startsWith('..')) {
    throw new Error(`Refusing to use pack stage outside project: ${stage}`);
}

try {
    const manifest = JSON.parse(await readFile(join(projectRoot, 'package.json'), 'utf8'));
    delete manifest.patchedDependencies;
    delete manifest.devDependencies;
    delete manifest.scripts;

    await writeFile(join(stage, 'package.json'), `${JSON.stringify(manifest, null, 2)}\n`);
    await cp(join(projectRoot, 'dist'), join(stage, 'dist'), {
        recursive: true,
    });
    await cp(join(projectRoot, 'LICENSE'), join(stage, 'LICENSE'));
    await cp(join(projectRoot, 'README.md'), join(stage, 'README.md'));

    const args = ['bun', 'pm', 'pack'];
    if (dryRun) args.push('--dry-run');
    else args.push('--destination', destination);
    await run(args, stage);
} finally {
    await rm(stage, { recursive: true, force: true });
}

async function run(command, cwd) {
    const process = Bun.spawn(command, {
        cwd,
        stdin: 'inherit',
        stdout: 'inherit',
        stderr: 'inherit',
    });
    const exitCode = await process.exited;
    if (exitCode !== 0) {
        throw new Error(`${command.join(' ')} failed with exit code ${exitCode}`);
    }
}
