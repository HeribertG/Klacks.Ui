const fs = require('fs');
const path = require('path');

const outputPath = path.join(__dirname, '..', 'test-results', 'output.txt');
const jsonPath = path.join(__dirname, '..', 'test-results', 'results.json');
const htmlPath = path.join(__dirname, '..', 'test-results', 'report.html');

let results;

if (fs.existsSync(jsonPath)) {
  results = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
} else if (fs.existsSync(outputPath)) {
  const output = fs.readFileSync(outputPath, 'utf8');
  const jsonMatch = output.match(/(\{"numTotalTestSuites".*\})\s*$/s);
  if (jsonMatch) {
    results = JSON.parse(jsonMatch[1]);
    fs.writeFileSync(jsonPath, JSON.stringify(results, null, 2));
  }
}

if (!results) {
  console.error('No test results found');
  process.exit(1);
}

function escapeHtml(text) {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function generateHtml(results) {
  const passed = results.numPassedTests || 0;
  const failed = results.numFailedTests || 0;
  const pending = results.numPendingTests || 0;
  const total = results.numTotalTests || 0;
  const date = new Date().toLocaleString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });

  let testListHtml = '';
  let currentSuite = '';

  for (const file of results.testResults || []) {
    for (const test of file.assertionResults || []) {
      const ancestors = test.ancestorTitles || [];
      const suitePath = ancestors.join(' ');

      if (suitePath !== currentSuite) {
        currentSuite = suitePath;
        testListHtml += `<div class="suite-header">${escapeHtml(suitePath)}</div>\n`;
      }

      testListHtml += `<div class="test">${escapeHtml(test.title)}</div>\n`;
    }
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Test Report - Klacks.Ui</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      background: #fff;
      color: #000;
      padding: 20px;
      font-size: 14px;
      line-height: 1.6;
      margin: 0;
    }
    .header {
      margin-bottom: 20px;
    }
    .header p {
      margin: 5px 0;
    }
    .summary {
      font-weight: bold;
    }
    .suite-header {
      font-weight: bold;
      margin-top: 20px;
      margin-bottom: 5px;
    }
    .test {
      padding-left: 30px;
    }
  </style>
</head>
<body>
  <div class="header">
    <p>Tested with Vitest on ${date}</p>
    <p class="summary">${total} specs, ${failed} failed, ${pending} pending</p>
  </div>
  <div class="test-list">
${testListHtml}
  </div>
</body>
</html>`;
}

const html = generateHtml(results);
fs.mkdirSync(path.dirname(htmlPath), { recursive: true });
fs.writeFileSync(htmlPath, html);
console.log('Report generated:', htmlPath);
