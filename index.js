const { exit, exec } = require('shelljs');

class VersionUpdater {
  constructor(mainBranch = 'main', releaseBranch = 'release') {
    this.mainBranch = mainBranch;
    this.releaseBranch = releaseBranch;
    [this.versionUpdateType] = process.argv.slice(2);
  }

  update() {
    this.ensureRunOnlyOnMasterBranch();
    VersionUpdater.updateGitRemotes();
    this.updatePackageJsonVersion();
    this.updateCodeRepository();
    exit(0);
  }

  ensureRunOnlyOnMasterBranch() {
    const runBranch = VersionUpdater.runExecCommand('git rev-parse --abbrev-ref HEAD');
    if (runBranch.trim() !== this.mainBranch.trim()) {
      console.info(`You tried to run script on ${runBranch} branch. It should be run only on ${this.mainBranch}`);
      exit(0);
    }
  }

  static runExecCommand(command) {
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
  static updateGitRemotes() {
    VersionUpdater.runExecCommand('git config remote.origin.fetch "+refs/heads/*:refs/remotes/origin/*"');
    VersionUpdater.runExecCommand('git fetch');
  }

  updatePackageJsonVersion() {
    const { versionUpdateType } = this;
    if (versionUpdateType === 'minor') {
      VersionUpdater.runExecCommand('yarn version --minor');
    } else if (versionUpdateType === 'major') {
      VersionUpdater.runExecCommand('yarn version --major');
    } else {
      VersionUpdater.runExecCommand('yarn version --patch');
    }
  }

  updateCodeRepository() {
    VersionUpdater.runExecCommand('git push');
    VersionUpdater.runExecCommand('git fetch');
    VersionUpdater.runExecCommand(`git checkout ${this.releaseBranch}`);
    VersionUpdater.runExecCommand(`git merge ${this.mainBranch} --allow-unrelated-histories`);
    VersionUpdater.runExecCommand('git push');
  }
}
