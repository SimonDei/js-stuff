import { build } from 'esbuild';

build({
  entryPoints: ['browser.js'],
  bundle: true,
  target: 'es2020',
  format: 'iife',
  outfile: 'dist/basescript.js'
});

build({
  entryPoints: ['browser.js'],
  bundle: true,
  target: 'es2020',
  format: 'iife',
  minify: true,
  outfile: 'dist/basescript.min.js'
});
