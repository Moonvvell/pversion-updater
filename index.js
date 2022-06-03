const fs = require('fs');

const { exec, exit } = require('shelljs');
const packageFile = require('./package.json');

const MAIN_BRANCH = 'main';
const MERGE_INTO_BRANCH = 'staging';

const runExecCommand = (command) => {
    console.info(`Running command: ${command}`);
    const execCommand = exec(command, { silent: true });
    if (execCommand.code !== 0) {
        console.error(`Command failed: ${command}: ${execCommand.stderr}`);
        exit(1);
    }
    return execCommand.stdout;
};

const updateGitRemotes = () => {
    runExecCommand('git config remote.origin.fetch "+refs/heads/*:refs/remotes/origin/*"');
    runExecCommand('git fetch');
};

const updatePackageJsonVersion = () => {
    const versionUpdateType = process.argv.slice(2)[0];
    if (versionUpdateType === 'minor') {
        runExecCommand('yarn version --minor');
    } else if (versionUpdateType === 'major') {
        runExecCommand('yarn version --major');
    } else {
        runExecCommand('yarn version --patch');
    }
};

const updateCodeRepository = () => {
    runExecCommand('git push');
    runExecCommand('git fetch');
    runExecCommand(`git checkout ${MERGE_INTO_BRANCH}`);
    runExecCommand(`git merge ${MAIN_BRANCH} --allow-unrelated-histories`);
    runExecCommand('git push');
};

const updatePackageJsonVersionCode = () => {
    packageFile.versionCode += 1;
    try {
        fs.writeFileSync('./package.json', JSON.stringify(packageFile), 'utf-8');
    } catch (err) {
        console.error(err);
        runExecCommand('git reset --hard');
        exit(1);
    }
};

const ensureRunOnlyOnMasterBranch = () => {
    const runBranch = runExecCommand('git rev-parse --abbrev-ref HEAD');
    if (runBranch.trim() !== MAIN_BRANCH.trim()) {
        console.info(`You tried to run script on ${runBranch} branch. It should be run only on ${MAIN_BRANCH}`);
        exit(0);
    }
};

ensureRunOnlyOnMasterBranch();
updateGitRemotes();
updatePackageJsonVersionCode();
updatePackageJsonVersion();
updateCodeRepository();
exit(0);
