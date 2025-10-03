const { exec } = require('child_process');
const path = require('path');

const reportPath = path.join(__dirname, 'test-results', 'html', 'test-report', 'index.html');

console.log('\n🎉 Opening test report...\n');

const command = process.platform === 'win32'
  ? `start "" "${reportPath}"`
  : process.platform === 'darwin'
  ? `open "${reportPath}"`
  : `xdg-open "${reportPath}"`;

exec(command, (error) => {
  if (error) {
    console.error('Could not open report:', error);
    console.log('Please open manually:', reportPath);
  }
});
