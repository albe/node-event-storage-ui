#!/usr/bin/env node

import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {createRequire} from 'node:module';
import {readConfigFile, resolveConfigPath} from '../config.js';

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
            return {showHelpRequested: true};
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

    return {configuredPath, passThroughArgs, showHelpRequested: false};
}

function resolveReactRouterServeBin() {
    const require = createRequire(import.meta.url);
    const packageJsonPath = require.resolve('@react-router/serve/package.json');
    return path.resolve(path.dirname(packageJsonPath), 'bin.js');
}

async function main() {
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

    // Set environment variables
    process.env.NODE_ENV = process.env.NODE_ENV ?? 'production';
    process.env[ENV_CONFIG_PATH] = configPath;

    // Set process.argv for the CLI
    process.argv = [process.execPath, reactRouterServeBin, serverEntry, ...parsedArguments.passThroughArgs];

    // Change working directory
    process.chdir(packageDirectory);

    // Load and run react-router-serve CLI directly
    const cliPath = path.resolve(path.dirname(reactRouterServeBin), 'dist', 'cli.js');
    try {
        await import(pathToFileURL(cliPath).href);
    } catch (error) {
        console.error('Failed to start event-storage-ui:', error.message);
        process.exit(1);
    }
}

main();

