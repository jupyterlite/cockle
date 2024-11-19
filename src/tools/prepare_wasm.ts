/**
 * Prepare wasm packages from emscripten-forge so that they are available at runtime.
 * Uses ../../cockle-config-base.json relative to the directory of this script and optional
 * cockle-config-in.json in pwd to determine which packages are required.
 * Creates a micromamba environment containing the wasm packages and either copies the files
 * to the specified statically-served assets directory or writes a file containing the names
 * of the files to be so copied, depending on the arguments passed to this script.
 */

/* eslint-disable */
const fs = require('node:fs');
const path = require('node:path');
const { execSync } = require('node:child_process');
const { rimrafSync } = require('rimraf');
const zod = require('zod');
/* eslint-enable */

const ENV_NAME = 'cockle_wasm_env';
const PLATFORM = 'emscripten-wasm32';
const REPOS = '-c https://repo.mamba.pm/emscripten-forge -c https://repo.mamba.pm/conda-forge';

if (process.argv.length !== 4 || (process.argv[2] !== '--list' && process.argv[2] !== '--copy')) {
  console.log('Usage: prepare_wasm --list list-filename');
  console.log('Usage: prepare_wasm --copy target-directory');
  process.exit(1);
}
const wantCopy = process.argv[2] === '--copy';
const target = process.argv[3];

function isLocalPackage(packageConfig: object): boolean {
  return Object.hasOwn(packageConfig, 'local_directory');
}

function getWasmPackageInfo(micromambaCmd: string, envPath: string): any {
  const cmd = `${micromambaCmd} -p ${envPath} list --json`;
  return JSON.parse(execSync(cmd).toString());
}

// Base cockle config file from this repo.
const baseConfigFilename = path.join(__dirname, '..', '..', 'cockle-config-base.json');
console.log('Using base config', baseConfigFilename);
let cockleConfig = JSON.parse(fs.readFileSync(baseConfigFilename, 'utf-8'));

// Optional extra cockle config file from pwd.
const otherConfigFilename = path.join(process.cwd(), 'cockle-config-in.json');
if (fs.existsSync(otherConfigFilename)) {
  console.log('Combining with config from', otherConfigFilename);
  const extraConfig = JSON.parse(fs.readFileSync(otherConfigFilename, 'utf-8'));
  cockleConfig = cockleConfig.concat(extraConfig);
}

// Validate input schema, raising ZodError if fails.
const inputSchema = zod.array(
  zod
    .object({
      package: zod.string(),
      local_directory: zod.optional(zod.string()),
      modules: zod.optional(
        zod.array(
          zod
            .object({
              name: zod.string(),
              commands: zod.optional(zod.string())
            })
            .strict()
        )
      )
    })
    .strict()
);
inputSchema.parse(cockleConfig);

// Required emscripten-wasm32 packages.
const packageNames = cockleConfig
  .filter((item: any) => !isLocalPackage(item))
  .map((item: any) => item.package);
console.log('Required package names', packageNames);

// Find micromamba.
let micromambaCmd: string | undefined;
const cmds = ['micromamba', '$CONDA_PREFIX/bin/micromamba', '$MAMBA_EXE'];
for (const cmd of cmds) {
  try {
    execSync(`${cmd} --version`);
    micromambaCmd = cmd;
    break;
  } catch (e) {
    // Try next cmd
  }
}
if (micromambaCmd === undefined) {
  throw new Error('Unable to find micromamba, aborting');
} else {
  console.log(`Found micromamba: ${micromambaCmd}`);
}

// Create or reuse existing mamba environment for the wasm packages.
const envPath = `./${ENV_NAME}`;
let wasmPackageInfo: any;
if (fs.existsSync(envPath)) {
  wasmPackageInfo = getWasmPackageInfo(micromambaCmd!, envPath);
  const envPackageNames = wasmPackageInfo.map((x: any) => x.name);
  const haveAllPackages = packageNames.every((name: string) => envPackageNames.includes(name));

  if (haveAllPackages) {
    console.log(`Using existing environment in ${envPath}`);
  } else {
    console.log(
      `Deleting environment in ${envPath} as it does not contain all the required packages`
    );
    rimrafSync(envPath);
    wasmPackageInfo = undefined;
  }
}

if (wasmPackageInfo === undefined) {
  const suffix = `--platform=${PLATFORM} ${REPOS}`;
  console.log(`Creating new environment in ${envPath}`);
  const createEnvCmd = `${micromambaCmd} create -p ${envPath} -y ${packageNames.join(' ')} ${suffix}`;
  console.log(execSync(createEnvCmd).toString());

  // Obtain wasm package info such as version and build string.
  wasmPackageInfo = getWasmPackageInfo(micromambaCmd!, envPath);
}

const outputProps = ['build_string', 'platform', 'version', 'channel'];

// Insert package info into cockle config.
for (const packageConfig of cockleConfig) {
  const packageName = packageConfig.package;
  const localPackage = isLocalPackage(packageConfig);

  const info = !localPackage
    ? wasmPackageInfo.find((x: any) => x.name === packageName)
    : Object.fromEntries(outputProps.map(prop => [prop, '']));
  if (info === undefined) {
    throw Error(`Do not have package info for ${packageName}`);
  }
  if (localPackage) {
    info.channel = `local_directory: ${packageConfig.local_directory}`;
  }

  console.log(`Add package info to ${packageName}`);
  for (const prop of outputProps) {
    packageConfig[prop] = info[prop];
  }

  // Fill in defaults.
  if (!Object.hasOwn(packageConfig, 'modules')) {
    console.log(`Adding default module for ${packageName}`);
    packageConfig.modules = [{ name: packageName }];
  }
  for (const module of packageConfig.modules) {
    if (!Object.hasOwn(module, 'commands')) {
      console.log(`Adding default commands for ${packageName} module ${module.name}`);
      module.commands = module.name;
    }
  }
}

// Validate output schema, raising ZodError if fails.
const outputSchema = zod.array(
  zod
    .object({
      package: zod.string(),
      local_directory: zod.optional(zod.string()),
      build_string: zod.string(),
      platform: zod.string(),
      version: zod.string(),
      channel: zod.string(),
      modules: zod.array(
        zod
          .object({
            name: zod.string(),
            commands: zod.string()
          })
          .strict()
      )
    })
    .strict()
);
outputSchema.parse(cockleConfig);

// Output config file.
let targetConfigFile = 'cockle-config.json';
if (wantCopy) {
  targetConfigFile = path.join(target, targetConfigFile);
}
fs.writeFileSync(targetConfigFile, JSON.stringify(cockleConfig, null, 2));
const filenames = [targetConfigFile];

// Output wasm files and their javascript wrappers.
for (const packageConfig of cockleConfig) {
  const sourceDirectory = packageConfig.local_directory ?? path.join(envPath, 'bin');
  const moduleNames = packageConfig.modules.map((x: any) => x.name);
  for (const moduleName of moduleNames) {
    for (const suffix of ['.js', '.wasm']) {
      const filename = moduleName + suffix;
      const srcFilename = path.join(sourceDirectory, filename);
      if (wantCopy) {
        const targetFileName = path.join(target, filename);
        fs.copyFileSync(srcFilename, targetFileName);
      } else {
        filenames.push(path.join(envPath, 'bin', moduleName + suffix));
      }
    }
  }
}

if (!wantCopy) {
  console.log('Writing list of required files');
  fs.writeFileSync(target, filenames.join('\n'));
}
