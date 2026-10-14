import { run } from './lib.mjs';
const head = process.env.HEAD;
const base = process.env.BASE || process.env.BEFORE;
if (!/^[a-f0-9]{40}$/.test(head || '')) throw new Error('Invalid scan head');
const range = base && base !== '0'.repeat(40) ? `${base}..${head}` : head;
run('node', ['scripts/scan.mjs', 'range', range]);
