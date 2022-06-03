const { exit, exec } = require('shelljs');
const fs = require('fs');
const packageFile = require('./package.json');

class VersionUpdater {
  constructor(mainBranch = 'main', releaseBranch = 'release') {
    this.mainBranch = mainBranch;
    this.releaseBranch = releaseBranch;
    [this.versionUpdateType] = process.argv.slice(2);
    this.runExecCommand = this.runExecCommand.bind(this);
  }

  update() {
    this.ensureRunOnlyOnMasterBranch();
    this.updateGitRemotes();
    this.updatePackageJsonVersionCode();
    this.updatePackageJsonVersion();
    this.updateCodeRepository();
    exit(0);
  }

  ensureRunOnlyOnMasterBranch() {
    const runBranch = this.runExecCommand('git rev-parse --abbrev-ref HEAD');
    if (runBranch.trim() !== this.mainBranch.trim()) {
      console.info(`You tried to run script on ${runBranch} branch. It should be run only on ${this.mainBranch}`);
      exit(0);
    }
  }

  runExecCommand(command) {
    console.info(`Running command: ${command}`);
    const execCommand = exec(command, { silent: true });
    if (execCommand.code !== 0) {
      console.error(`Command failed: ${command}: ${execCommand.stderr}`);
      exit(1);
    }
    return execCommand.stdout;
  }

  /**
     * Because most of CI\CD store remote only for branch you run it,
     * we need to update information about all branches
     */
  updateGitRemotes() {
    this.runExecCommand('git config remote.origin.fetch "+refs/heads/*:refs/remotes/origin/*"');
    this.runExecCommand('git fetch');
  }

  updatePackageJsonVersion() {
    const { versionUpdateType } = this;
    if (versionUpdateType === 'minor') {
      this.runExecCommand('yarn version --minor');
    } else if (versionUpdateType === 'major') {
      this.runExecCommand('yarn version --major');
    } else {
      this.runExecCommand('yarn version --patch');
    }
  }

  updateCodeRepository() {
    this.runExecCommand('git push');
    this.runExecCommand('git fetch');
    this.runExecCommand(`git checkout ${this.releaseBranch}`);
    this.runExecCommand(`git merge ${this.mainBranch} --allow-unrelated-histories`);
    this.runExecCommand('git push');
  }

  updatePackageJsonVersionCode() {
    packageFile.versionCode += 1;
    try {
      fs.writeFileSync('./package.json', JSON.stringify(packageFile), 'utf-8');
    } catch (err) {
      console.error(err);
      this.runExecCommand('git reset --hard');
      exit(1);
    }
  }
}
