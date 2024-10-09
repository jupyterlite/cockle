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
/* eslint-enable */

const ENV_NAME = 'cockle_wasm_env';
const MICROMAMBA_COMMAND = 'micromamba';
const PLATFORM = 'emscripten-wasm32';
const REPOS = '-c https://repo.mamba.pm/emscripten-forge -c https://repo.mamba.pm/conda-forge';

if (process.argv.length !== 4 || (process.argv[2] !== '--list' && process.argv[2] !== '--copy')) {
  console.log('Usage: prepare_wasm --list list-filename');
  console.log('Usage: prepare_wasm --copy target-directory');
  process.exit(1);
}
const wantCopy = process.argv[2] === '--copy';
const target = process.argv[3];

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

// Required emscripten-wasm32 packages.
const packageNames = cockleConfig.map((item: any) => item.package);
console.log('Required package names', packageNames);

// Create or reuse existing mamba environment for the wasm packages.
const envPath = `./${ENV_NAME}`;
if (fs.existsSync(envPath)) {
  console.log(`Using existing environment in ${envPath}`);
  // Should really check that env contents are what we want.
} else {
  const suffix = `--platform=${PLATFORM} ${REPOS}`;
  console.log(`Creating new environment in ${envPath}`);
  const createEnvCmd = `${MICROMAMBA_COMMAND} create -p ${envPath} -y ${packageNames.join(' ')} ${suffix}`;
  console.log(execSync(createEnvCmd).toString());
}

// Obtain wasm package info such as version and build string.
const wasmPackageInfo = JSON.parse(
  execSync(`${MICROMAMBA_COMMAND} run -p ${envPath} ${MICROMAMBA_COMMAND} list --json`).toString()
);
//console.log('Wasm package info:', wasmPackageInfo);

// Insert package info into cockle config.
for (const packageConfig of cockleConfig) {
  const packageName = packageConfig.package;
  const info = wasmPackageInfo.find((x: any) => x.name === packageName);
  if (info === undefined) {
    throw Error(`Do not have package info for ${packageName}`);
  }

  console.log(`Add package info to ${packageName}`);
  for (const prop of ['build_string', 'platform', 'version', 'channel']) {
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

// Output config file.
let targetConfigFile = 'cockle-config.json';
if (wantCopy) {
  targetConfigFile = path.join(target, targetConfigFile);
}
fs.writeFileSync(targetConfigFile, JSON.stringify(cockleConfig, null, 2));
const filenames = [targetConfigFile];

// Output wasm files and their javascript wrappers.
const moduleNames = cockleConfig.flatMap((x: any) => x.modules).map((x: any) => x.name);
for (const moduleName of moduleNames) {
  for (const suffix of ['.js', '.wasm']) {
    const filename = moduleName + suffix;
    const srcFilename = path.join(envPath, 'bin', filename);
    if (wantCopy) {
      const targetFileName = path.join(target, filename);
      fs.copyFileSync(srcFilename, targetFileName);
    } else {
      filenames.push(path.join(envPath, 'bin', moduleName + suffix));
    }
  }
}

if (!wantCopy) {
  console.log('Writing list of required files');
  fs.writeFileSync(target, filenames.join('\n'));
}
