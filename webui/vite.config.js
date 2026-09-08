import {defineConfig} from 'vite';
import {svelte} from '@sveltejs/vite-plugin-svelte';
export default defineConfig({base: './', publicDir: false, plugins: [svelte()], build: {outDir: 'dist', assetsDir: 'compiled', target: 'es2022'}});
