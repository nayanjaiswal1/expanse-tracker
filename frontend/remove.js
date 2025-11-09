import fs from 'fs';

fs.rmSync('./node_modules', { recursive: true, force: true });
