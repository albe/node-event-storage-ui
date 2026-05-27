import fs from 'node:fs';
import path from 'node:path';

const projectRoot = process.cwd();
const generatedRoot = path.join(projectRoot, 'public', 'screenshots', 'generated');
const screenshotRoot = path.join(projectRoot, 'public', 'screenshots');

const readmeScreenshotFiles = [
  'dashboard.png',
  'event-stream.png',
  'consumers-preview-executed.png',
  'write-events-filled.png'
];

function findAllFiles(directory) {
  if (!fs.existsSync(directory)) {
    return [];
  }
  const entries = fs.readdirSync(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...findAllFiles(fullPath));
    } else {
      files.push(fullPath);
    }
  }
  return files;
}

function latestGeneratedScreenshot(fileName) {
  const allFiles = findAllFiles(generatedRoot);
  const matches = allFiles.filter((filePath) => filePath.endsWith(path.sep + fileName));
  if (matches.length === 0) {
    return null;
  }

  return matches
    .map((filePath) => ({ filePath, mtimeMs: fs.statSync(filePath).mtimeMs }))
    .sort((a, b) => b.mtimeMs - a.mtimeMs)[0].filePath;
}

function copyReadmeScreenshots() {
  const missing = [];

  for (const fileName of readmeScreenshotFiles) {
    const source = latestGeneratedScreenshot(fileName);
    if (!source) {
      missing.push(fileName);
      continue;
    }

    const target = path.join(screenshotRoot, fileName);
    fs.copyFileSync(source, target);
    console.log(`Updated ${fileName} from ${path.relative(projectRoot, source)}`);
  }

  if (missing.length > 0) {
    throw new Error(`Missing generated screenshots: ${missing.join(', ')}`);
  }
}

copyReadmeScreenshots();

