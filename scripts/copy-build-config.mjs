import fs from 'node:fs';
import path from 'node:path';

const sourcePath = path.resolve('eventstore.config.json');
const targetPaths = [
  path.resolve('build/eventstore.config.json'),
  path.resolve('build/server/eventstore.config.json'),
];

for (const targetPath of targetPaths) {
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.copyFileSync(sourcePath, targetPath);
}


