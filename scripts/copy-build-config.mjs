import fs from 'node:fs';
import path from 'node:path';

const sourcePath = path.resolve('eventstore.config.json');
const targetPath = path.resolve('build/eventstore.config.json');
fs.mkdirSync(path.dirname(targetPath), { recursive: true });
fs.copyFileSync(sourcePath, targetPath);


