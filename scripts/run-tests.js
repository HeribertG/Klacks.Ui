const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

/**
 * A cold Angular build prints nothing for up to ~250s, so the idle limit only
 * catches a genuine hang. A healthy run never reaches it - the close handler
 * fires as soon as the CLI exits.
 */
const IDLE_TIMEOUT_MS = 600000;
const IDLE_CHECK_INTERVAL_MS = 5000;

const outputDir = path.join(__dirname, '..', 'test-results');
const outputPath = path.join(outputDir, 'output.txt');

fs.mkdirSync(outputDir, { recursive: true });

const isWindows = process.platform === 'win32';
const cmd = isWindows ? 'npx.cmd' : 'npx';

const child = spawn(cmd, ['ng', 'test', '--watch=false'], {
  cwd: path.join(__dirname, '..'),
  stdio: ['inherit', 'pipe', 'pipe'],
  shell: true
});

let output = '';
let lastOutputAt = Date.now();
let killedForHang = false;

/**
 * Terminates the whole process tree. A plain kill only reaches the shell on
 * Windows and leaves orphaned Vitest workers holding their IPC channels.
 */
function killTree() {
  if (isWindows) {
    spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], { shell: true });
  } else {
    child.kill('SIGKILL');
  }
}

const idleTimer = setInterval(() => {
  if (Date.now() - lastOutputAt > IDLE_TIMEOUT_MS) {
    killedForHang = true;
    clearInterval(idleTimer);
    console.error(`\nNo test output for ${IDLE_TIMEOUT_MS / 1000}s - terminating the run.`);
    killTree();
  }
}, IDLE_CHECK_INTERVAL_MS);

/**
 * Derives the real outcome from every summary block Vitest printed. A run counts
 * as failed when a test failed, when Vitest reported unhandled errors, or when
 * fewer files completed than were discovered - the latter is how a collapsed
 * worker pool shows up while every finished test still reports "passed".
 */
function evaluate(text) {
  const clean = text.replace(/\x1b\[[0-9;]*m/g, '');
  const problems = [];

  const fileSummaries = [...clean.matchAll(/Test Files\s+(.+)/g)];
  if (fileSummaries.length === 0) {
    problems.push('No test summary found - the run did not reach the reporting stage.');
  }

  for (const [, summary] of fileSummaries) {
    if (/\bfailed\b/.test(summary)) {
      problems.push(`Failed test files: ${summary.trim()}`);
    }
    const counts = summary.match(/(\d+)\s+passed\s+\((\d+)\)/);
    if (counts && counts[1] !== counts[2]) {
      problems.push(`Only ${counts[1]} of ${counts[2]} test files completed.`);
    }
  }

  for (const [, summary] of clean.matchAll(/\n\s*Tests\s+(.+)/g)) {
    if (/\bfailed\b/.test(summary)) {
      problems.push(`Failed tests: ${summary.trim()}`);
    }
  }

  const errors = clean.match(/\n\s*Errors\s+(\d+)\s+errors?/);
  if (errors) {
    problems.push(`Vitest reported ${errors[1]} unhandled errors.`);
  }

  return problems;
}

child.stdout.on('data', (data) => {
  const text = data.toString();
  lastOutputAt = Date.now();
  process.stdout.write(text);
  output += text;
});

child.stderr.on('data', (data) => {
  const text = data.toString();
  lastOutputAt = Date.now();
  process.stderr.write(text);
  output += text;
});

child.on('close', (code) => {
  clearInterval(idleTimer);
  fs.writeFileSync(outputPath, output);

  const problems = evaluate(output);

  if (killedForHang) {
    console.error('\nTest run FAILED: terminated after hanging.');
    process.exit(1);
  }

  if (problems.length > 0) {
    console.error('\nTest run FAILED:');
    for (const problem of problems) {
      console.error(`  - ${problem}`);
    }
    process.exit(1);
  }

  if (code !== 0) {
    console.log(`\nTest run passed (ignoring exit code ${code} from the empty plugin test target).`);
  } else {
    console.log('\nTest run passed.');
  }
  process.exit(0);
});
