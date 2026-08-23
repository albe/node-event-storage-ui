#!/usr/bin/env node

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { readConfigFile, resolveConfigPath } from '../config.js';

const CONFIG_OPTION = '--config';
const CONFIG_ALIAS = '-c';
const ENV_CONFIG_PATH = 'EVENT_STORAGE_UI_CONFIG';

function showHelp() {
  console.log(`Usage: event-storage-ui [options] [react-router-serve args]\n\nOptions:\n  -c, --config <path>  Path to eventstore.config.json\n  -h, --help           Show this help\n\nEnvironment:\n  ${ENV_CONFIG_PATH}    Path to eventstore.config.json (used when --config is not set)`);
}

function parseArguments(argv) {
  const passThroughArgs = [];
  let configuredPath;

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];

    if (argument === '-h' || argument === '--help') {
      return { showHelpRequested: true };
    }

    if (argument === CONFIG_ALIAS || argument === CONFIG_OPTION) {
      const value = argv[index + 1];
      if (!value) {
        throw new Error('Missing value for --config option.');
      }
      configuredPath = value;
      index += 1;
      continue;
    }

    if (argument.startsWith(`${CONFIG_OPTION}=`)) {
      configuredPath = argument.slice(`${CONFIG_OPTION}=`.length);
      continue;
    }

    passThroughArgs.push(argument);
  }

  return { configuredPath, passThroughArgs, showHelpRequested: false };
}

function resolveReactRouterServeBin() {
  const require = createRequire(import.meta.url);
  const packageJsonPath = require.resolve('@react-router/serve/package.json');
  return path.resolve(path.dirname(packageJsonPath), 'bin.js');
}

function main() {
  let parsedArguments;
  try {
    parsedArguments = parseArguments(process.argv.slice(2));
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }

  if (parsedArguments.showHelpRequested) {
    showHelp();
    process.exit(0);
  }

  const packageDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const configPath = resolveConfigPath({
    configuredPath: parsedArguments.configuredPath,
    packageDirectory,
    env: process.env,
  });
  const serverEntry = path.resolve(packageDirectory, 'build/server/index.js');
  const reactRouterServeBin = resolveReactRouterServeBin();

  try {
    readConfigFile(configPath);
  } catch (error) {
    console.error(`[event-storage-ui] ${error.message}`);
    process.exit(1);
  }

  const child = spawn(
    process.execPath,
    [reactRouterServeBin, serverEntry, ...parsedArguments.passThroughArgs],
    {
      cwd: packageDirectory,
      stdio: 'inherit',
      env: {
        ...process.env,
        [ENV_CONFIG_PATH]: configPath,
      },
    }
  );

  child.on('exit', (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal);
      return;
    }
    process.exit(code ?? 0);
  });

  child.on('error', (error) => {
    console.error('Failed to start event-storage-ui:', error.message);
    process.exit(1);
  });
}

main();

