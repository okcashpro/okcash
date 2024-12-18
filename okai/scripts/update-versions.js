const fs = require('fs');
const path = require('path');
const readline = require('readline');

const packagesDir = path.join(__dirname, '../packages');
const externalDirs = ['../agent', '../client', '../docs'];
const lernaPath = path.join(__dirname, '../lerna.json');

// Prompt for version input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function askVersion() {
  return new Promise((resolve) => {
    rl.question('Enter the new version: ', (version) => {
      resolve(version);
      rl.close();
    });
  });
}

// Update versions in all package.json files
async function updateVersions() {
  const NEW_VERSION = await askVersion();

  const updateDirectory = (dirPath) => {
    const packagePath = path.join(dirPath, 'package.json');

    if (fs.existsSync(packagePath)) {
      const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf-8'));
      const oldVersion = packageJson.version;

      if (oldVersion) {
        packageJson.version = NEW_VERSION;
        fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2) + '\n');
        console.log(`Updated ${dirPath}: ${oldVersion} -> ${packageJson.version}`);
      } else {
        console.warn(`Version not found in ${dirPath}/package.json`);
      }
    } else {
      console.warn(`No package.json found in ${dirPath}`);
    }
  };

  // Update packages folder
  if (fs.existsSync(packagesDir)) {
    const packageDirs = fs.readdirSync(packagesDir);
    packageDirs.forEach((dir) => updateDirectory(path.join(packagesDir, dir)));
  } else {
    console.warn(`Packages directory not found at ${packagesDir}`);
  }

  // Update external folders
  externalDirs.forEach((dir) => {
    const fullPath = path.join(__dirname, dir);
    if (fs.existsSync(fullPath)) {
      updateDirectory(fullPath);
    } else {
      console.warn(`External directory not found: ${fullPath}`);
    }
  });

  // Update lerna.json
  if (fs.existsSync(lernaPath)) {
    const lernaJson = JSON.parse(fs.readFileSync(lernaPath, 'utf-8'));
    const oldVersion = lernaJson.version;

    if (oldVersion) {
      lernaJson.version = NEW_VERSION;
      fs.writeFileSync(lernaPath, JSON.stringify(lernaJson, null, 2) + '\n');
      console.log(`Updated lerna.json: ${oldVersion} -> ${lernaJson.version}`);
    } else {
      console.warn(`Version not found in lerna.json`);
    }
  } else {
    console.warn(`lerna.json not found at ${lernaPath}`);
  }
}

updateVersions();
