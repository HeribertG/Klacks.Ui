const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

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

// Force exit after tests complete - check output every second
const checkInterval = setInterval(() => {
  if (output.includes('Test Files') || output.includes('Tests ')) {
    if (output.includes('passed') || output.includes('failed')) {
      clearInterval(checkInterval);
      setTimeout(() => {
        fs.writeFileSync(outputPath, output);
        child.kill('SIGKILL');
        const hasFailures = output.includes(' failed');
        process.exit(hasFailures ? 1 : 0);
      }, 2000);
    }
  }
}, 1000);

child.stdout.on('data', (data) => {
  const text = data.toString();
  process.stdout.write(text);
  output += text;
});

child.stderr.on('data', (data) => {
  const text = data.toString();
  process.stderr.write(text);
  output += text;
});

child.on('close', (code) => {
  fs.writeFileSync(outputPath, output);
  process.exit(code);
});
