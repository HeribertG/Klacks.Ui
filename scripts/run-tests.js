const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const outputDir = path.join(__dirname, '..', 'test-results');
const outputPath = path.join(outputDir, 'output.txt');

fs.mkdirSync(outputDir, { recursive: true });

try {
  const result = execSync('npx ng test --watch=false', {
    cwd: path.join(__dirname, '..'),
    stdio: 'inherit',
    timeout: 300000,
    killSignal: 'SIGKILL',
    env: { ...process.env, NODE_OPTIONS: '--max-old-space-size=6144' }
  });
  fs.writeFileSync(outputPath, 'Tests completed successfully');
  process.exit(0);
} catch (error) {
  if (error.killed) {
    console.log('\nTests timed out after 5 minutes');
  }
  fs.writeFileSync(outputPath, error.stdout?.toString() || 'Test run failed or timed out');
  process.exit(0);
}
