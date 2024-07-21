const fs = require('fs');
const path = require('path');

const branchOrTag = process.argv[2];

if (!branchOrTag) {
    console.error('Branch or tag not provided');
    process.exit(1);
}

let version;
let isTag = false;

if (branchOrTag.startsWith('v')) {
    // It's a tag, assuming format v1.12.0
    version = branchOrTag.substring(1);
    isTag = true;
} else {
    const regex = /^\d+\.\d+$/;
    // It's a branch, assuming format 1.12, transform to 1.12.0
    version = regex.test(branchOrTag) ? `${branchOrTag}.0` : branchOrTag;
}

const packagesDir = path.resolve(__dirname, 'packages');

const updateDependencies = (dependencies) => {
    if (dependencies) {
        for (const dep in dependencies) {
            if (dep.startsWith('@iomediacommunication/')) {
                const depName = dep.split('/')[1];
                const newVersion = isTag
                    ? `github:iomediacommunication/${depName}#semver:${version.split('.')[0]}.${version.split('.')[1]}.x`
                    : `github:iomediacommunication/${depName}#${branchOrTag}`;
                dependencies[dep] = newVersion;
            }
        }
    }
};

const updatePackageJson = (dir) => {
    const packageJsonPath = path.join(dir, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));

        // Update version
        packageJson.version = version;

        // Update dependencies and devDependencies
        updateDependencies(packageJson.dependencies);
        updateDependencies(packageJson.devDependencies);

        // Write back the updated package.json
        fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
    }
};

fs.readdirSync(packagesDir).forEach((dir) => {
    const packagePath = path.join(packagesDir, dir);
    if (fs.statSync(packagePath).isDirectory()) {
        updatePackageJson(packagePath);
    }
});
