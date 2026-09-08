import {build} from 'vite';
import {cp, readFile, readdir, rm, writeFile} from 'node:fs/promises';
import {resolve, relative} from 'node:path';
import {createHash} from 'node:crypto';

const root = resolve(import.meta.dirname, '..');
const shipped = resolve(root, 'modern'), output = resolve(root, 'dist');
await rm(output, {recursive: true, force: true});
await build({configFile: false, root, build: {
    outDir: 'dist/compiled', target: 'es2022',
    lib: {entry: 'app/main.js', formats: ['es'], fileName: () => 'conflicts.js', cssFileName: 'conflicts'},
}});
// Keep the same Angular release, using its official production distribution.
const angular = await readFile(resolve(root, 'node_modules/angular/angular.min.js'), 'utf8');
await writeFile(resolve(shipped, 'vendor/angular/angular.js'),
    angular.replace(/\/\/# sourceMappingURL=.*$/m, '').trimEnd() + '\n');
await rm(resolve(shipped, 'compiled'), {recursive: true, force: true});
await cp(resolve(output, 'compiled'), resolve(shipped, 'compiled'), {recursive: true});
await cp(resolve(root, 'index.html'), resolve(shipped, 'index.html'));
await cp(shipped, output, {recursive: true});
await cp(resolve(root, 'LICENSE.syncthing'), resolve(output, 'LICENSE.syncthing'));
await cp(resolve(root, 'licenses'), resolve(output, 'licenses'), {recursive: true});
for (const theme of ['dark', 'light']) {
    await cp(resolve(root, 'themes', theme + '.css'), resolve(output, 'assets/css/syncshell-' + theme + '.css'));
}
const css = await readFile(resolve(shipped, 'assets/css/theme.css'), 'utf8');
await writeFile(resolve(output, 'assets/css/theme.css'), css.replaceAll(
    /\.\.\/\.\.\/theme-assets\/(dark|light)\/assets\/css\/theme.css/g, 'syncshell-$1.css'));
async function files(directory) {
    const result = [];
    for (const entry of await readdir(directory, {withFileTypes: true})) {
        const path = resolve(directory, entry.name);
        if (entry.isDirectory()) result.push(...await files(path));
        else if (entry.isFile()) result.push(path);
        else throw new Error('Unexpected asset link: ' + path);
    }
    return result;
}
const paths = [resolve(root, 'LICENSE.syncthing'), ...await files(shipped),
    ...await files(resolve(root, 'themes')), ...await files(resolve(root, 'licenses'))];
const sums = [];
for (const path of paths.sort()) sums.push(createHash('sha256').update(await readFile(path)).digest('hex') + '  ' + relative(root, path));
await writeFile(resolve(root, 'SHA256SUMS'), sums.join('\n') + '\n');
