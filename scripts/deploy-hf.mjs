// Publishes the current commit to the Hugging Face Space.
//
// The Space is its own git repo and needs a README with Space settings in its
// front matter, so this copies HEAD into a temporary folder, swaps in
// hf/README.md and force-pushes it. GitHub stays the source of truth.
//
// Usage: npm run deploy:hf              (HF_SPACE=<user>/<space> to override the target)
//        npm run deploy:hf -- --dry-run  (prepare the files without pushing)
import { execSync } from 'node:child_process';
import { copyFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const space = process.env.HF_SPACE ?? 'Optickal095/pregunta-a-mi-cv';
const dryRun = process.argv.includes('--dry-run');
const run = (command, cwd) => execSync(command, { cwd, stdio: 'inherit' });
const read = (command) => execSync(command, { encoding: 'utf-8' }).trim();

if (read('git status --porcelain')) {
  console.warn('Warning: uncommitted changes are not deployed, only HEAD is.');
}
const commit = read('git rev-parse --short HEAD');

const dir = mkdtempSync(join(tmpdir(), 'hf-space-'));
try {
  // Only Node and git here: the script must work in cmd and PowerShell too.
  const archive = join(dir, 'src.tar');
  run(`git archive --format=tar --output="${archive}" HEAD`);
  run('tar -xf src.tar', dir);
  rmSync(archive);
  copyFileSync('hf/README.md', join(dir, 'README.md'));

  run('git init -q -b main', dir);
  run('git add -A', dir);
  run(`git -c core.autocrlf=false commit -q -m "Deploy ${commit}"`, dir);

  if (dryRun) {
    console.log(`Dry run: prepared ${commit} in ${dir}, nothing pushed.`);
    run('git ls-files', dir);
  } else {
    // Git asks for credentials: the Hugging Face username and an access token with write permission.
    run(`git push --force https://huggingface.co/spaces/${space} main`, dir);
    console.log(`Deployed ${commit} to https://huggingface.co/spaces/${space}`);
  }
} finally {
  rmSync(dir, { recursive: true, force: true });
}
