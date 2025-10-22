const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

const reportPath = path.join(__dirname, 'test-results', 'html', 'test-report', 'index.html');

if (fs.existsSync(reportPath)) {
  const platform = process.platform;
  const isWSL = fs.existsSync('/proc/version') &&
                fs.readFileSync('/proc/version', 'utf8').toLowerCase().includes('microsoft');

  let command;

  if (platform === 'win32') {
    command = `start "" "${reportPath}"`;
  } else if (platform === 'darwin') {
    command = `open "${reportPath}"`;
  } else if (isWSL) {
    const windowsPath = reportPath.replace(/^\/mnt\/([a-z])/, (match, drive) => `${drive.toUpperCase()}:`).replace(/\//g, '\\');
    command = `cmd.exe /c start "" "${windowsPath}"`;
  } else {
    command = `xdg-open "${reportPath}"`;
  }

  exec(command, (error) => {
    if (error) {
      console.error('Error opening test report:', error.message);
      console.log(`Please open the report manually: ${reportPath}`);
    } else {
      console.log('Test report opened successfully!');
    }
  });
} else {
  console.error('Test report not found at:', reportPath);
}
