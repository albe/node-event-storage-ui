import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ENV_CONFIG_PATH = 'EVENT_STORAGE_UI_CONFIG';

function getModuleDirectory(importMetaUrl) {
  return path.dirname(fileURLToPath(importMetaUrl));
}

function resolveConfiguredPath(configuredPath) {
  if (!configuredPath) return null;
  return path.isAbsolute(configuredPath)
    ? configuredPath
    : path.resolve(process.cwd(), configuredPath);
}

export function resolveConfigPath({ configuredPath, packageDirectory, importMetaUrl, env = process.env }) {
  const explicitPath = resolveConfiguredPath(configuredPath || env[ENV_CONFIG_PATH]?.trim());
  if (explicitPath) {
    return explicitPath;
  }

  if (packageDirectory) {
    return path.resolve(packageDirectory, 'build/eventstore.config.json');
  }

  const moduleDirectory = getModuleDirectory(importMetaUrl);
  const localConfigPath = path.resolve(moduleDirectory, './eventstore.config.json');
  if (fs.existsSync(localConfigPath)) {
    return localConfigPath;
  }

  return path.resolve(moduleDirectory, '../eventstore.config.json');
}

export function readConfigFile(configPath) {
  if (!fs.existsSync(configPath)) {
    throw new Error(`Config file not found at "${configPath}".`);
  }

  let configStat;
  try {
    configStat = fs.statSync(configPath);
  } catch (error) {
    throw new Error(`Could not read config file metadata at "${configPath}": ${error.message}`);
  }

  if (!configStat.isFile()) {
    throw new Error(`Config path is not a file: "${configPath}".`);
  }

  let rawConfig;
  try {
    rawConfig = fs.readFileSync(configPath, 'utf8');
  } catch (error) {
    throw new Error(`Failed to read config file at "${configPath}": ${error.message}`);
  }

  try {
    return JSON.parse(rawConfig);
  } catch (error) {
    throw new Error(`Config file at "${configPath}" is not valid JSON: ${error.message}`);
  }
}

export { ENV_CONFIG_PATH };

