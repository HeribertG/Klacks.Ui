const fs = require('fs');
const path = require('path');

const outputPath = path.join(__dirname, '..', 'test-results', 'output.txt');
const jsonPath = path.join(__dirname, '..', 'test-results', 'results.json');
const htmlPath = path.join(__dirname, '..', 'test-results', 'report.html');

let results;

if (fs.existsSync(outputPath)) {
  const output = fs.readFileSync(outputPath, 'utf8');
  const jsonStart = output.lastIndexOf('{"numTotalTestSuites"');
  if (jsonStart !== -1) {
    const jsonString = output.substring(jsonStart);
    results = JSON.parse(jsonString);
    fs.writeFileSync(jsonPath, JSON.stringify(results, null, 2));
  }
}

if (!results && fs.existsSync(jsonPath)) {
  results = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
}

if (!results) {
  console.error('No test results found');
  process.exit(1);
}

function parseTestDataFromOutput() {
  const testDataMap = {};
  try {
    if (fs.existsSync(outputPath)) {
      const output = fs.readFileSync(outputPath, 'utf-8');
      const cleanOutput = output.replace(/\x1b\[[0-9;]*m/g, '');
      const lines = cleanOutput.split('\n');
      let currentTestKey = null;
      let currentTestData = [];

      for (const line of lines) {
        const testNumMatch = line.match(/Test (\d+):/);
        if (testNumMatch) {
          if (currentTestKey && currentTestData.length > 0) {
            testDataMap[currentTestKey] = currentTestData;
          }
          currentTestKey = `Test ${testNumMatch[1]}`;
          currentTestData = [];
        }

        const scriptTestMatch = line.match(/should interpret correctly for script: (.+)/);
        if (scriptTestMatch) {
          if (currentTestKey && currentTestData.length > 0) {
            testDataMap[currentTestKey] = currentTestData;
          }
          currentTestKey = scriptTestMatch[1].trim();
          currentTestData = [];
        }

        const stdoutMatch = line.match(/stdout\s*\|\s*.*>\s*(.+)/);
        if (stdoutMatch && !testNumMatch && !scriptTestMatch) {
          if (currentTestKey && currentTestData.length > 0) {
            testDataMap[currentTestKey] = currentTestData;
          }
          currentTestKey = stdoutMatch[1].trim();
          currentTestData = [];
        }

        if (line.includes('[TEST-DATA]')) {
          const data = line.replace(/.*\[TEST-DATA\]\s*/, '').trim();
          if (data) {
            currentTestData.push(data);
          }
        }
      }
      if (currentTestKey && currentTestData.length > 0) {
        testDataMap[currentTestKey] = currentTestData;
      }
    }
  } catch (e) {
    console.log('Could not parse output.txt:', e.message);
  }
  return testDataMap;
}

function escapeHtml(text) {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatTestData(data) {
  let formatted = escapeHtml(data);
  formatted = formatted.replace(/^(Input|Original|Copied|Total|CuttingAfterMidnight|Script|Result|Rule|Year|Date|isLeapYear|daysIntoYear|ISO Week):/g, '<span class="label">$1:</span>');
  formatted = formatted.replace(/= (\d+)min/g, '= <span class="value">$1min</span>');
  formatted = formatted.replace(/\(expected: ([^)]+)\)/g, '(expected: <span class="expected">$1</span>)');
  formatted = formatted.replace(/(true|false)/g, '<span class="bool">$1</span>');
  formatted = formatted.replace(/Result:<\/span> ([^ ]+)/g, 'Result:</span> <span class="value">$1</span>');
  formatted = formatted.replace(/\| /g, '<br>');
  return formatted;
}

function generateHtml(results, testDataMap) {
  const passed = results.numPassedTests || 0;
  const failed = results.numFailedTests || 0;
  const pending = results.numPendingTests || 0;
  const total = results.numTotalTests || 0;
  const date = new Date().toLocaleString('de-DE', {
    weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });

  let testListHtml = '';
  let currentSuite = '';

  for (const file of results.testResults || []) {
    for (const test of file.assertionResults || []) {
      const ancestors = test.ancestorTitles || [];
      const suitePath = ancestors.join(' > ');

      if (suitePath !== currentSuite) {
        currentSuite = suitePath;
        testListHtml += `<div class="suite">${escapeHtml(suitePath)}</div>\n`;
      }

      const status = test.status || 'unknown';
      const statusClass = status === 'passed' ? 'passed' : status === 'failed' ? 'failed' : 'pending';
      const statusIcon = status === 'passed' ? '✓' : status === 'failed' ? '✗' : '○';
      const duration = test.duration ? ` <span class="duration">(${Math.round(test.duration)}ms)</span>` : '';

      testListHtml += `<div class="test ${statusClass}"><span class="icon">${statusIcon}</span> ${escapeHtml(test.title)}${duration}</div>\n`;

      let testData = null;

      const testNumberMatch = test.title.match(/Test (\d+):/);
      if (testNumberMatch) {
        testData = testDataMap[`Test ${testNumberMatch[1]}`];
      }

      const scriptMatch = test.title.match(/should interpret correctly for script: (.+)/);
      if (scriptMatch) {
        testData = testDataMap[scriptMatch[1].trim()];
      }

      if (!testData) {
        testData = testDataMap[test.title];
      }

      if (testData && testData.length > 0) {
        testListHtml += `<div class="test-data">\n`;
        for (const data of testData) {
          testListHtml += `  <div class="data-line">${formatTestData(data)}</div>\n`;
        }
        testListHtml += `</div>\n`;
      }

      if (status === 'failed' && test.failureMessages && test.failureMessages.length > 0) {
        testListHtml += `<div class="error">\n`;
        for (const msg of test.failureMessages) {
          testListHtml += `  <pre>${escapeHtml(msg)}</pre>\n`;
        }
        testListHtml += `</div>\n`;
      }
    }
  }

  return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Test Report - Klacks.Ui</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', Roboto, sans-serif;
      background: #0f172a;
      color: #e2e8f0;
      padding: 20px;
      margin: 0;
      line-height: 1.5;
    }
    .header {
      background: #1e293b;
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 20px;
    }
    .header h1 { margin: 0 0 10px 0; font-size: 24px; color: #f8fafc; }
    .header .date { color: #94a3b8; font-size: 14px; }
    .summary { display: flex; gap: 20px; margin-top: 15px; font-size: 16px; }
    .summary .passed { color: #4ade80; }
    .summary .failed { color: #f87171; }
    .summary .pending { color: #fbbf24; }
    .suite {
      background: #1e293b;
      padding: 10px 15px;
      margin: 20px 0 8px 0;
      border-radius: 6px;
      border-left: 4px solid #3b82f6;
      font-weight: 600;
      font-size: 14px;
    }
    .test {
      display: flex;
      align-items: center;
      padding: 8px 15px 8px 25px;
      font-size: 13px;
      border-radius: 4px;
      margin: 2px 0;
    }
    .test .icon { width: 20px; font-weight: bold; flex-shrink: 0; }
    .test .duration { color: #64748b; font-size: 11px; margin-left: 10px; }
    .test.passed { color: #4ade80; }
    .test.passed .icon { color: #22c55e; }
    .test.failed { color: #f87171; background: rgba(248, 113, 113, 0.1); }
    .test.failed .icon { color: #ef4444; }
    .test.pending { color: #fbbf24; }
    .test-data {
      margin: 5px 0 10px 40px;
      padding: 12px 15px;
      background: rgba(59, 130, 246, 0.1);
      border-left: 3px solid #3b82f6;
      border-radius: 4px;
      font-family: 'Consolas', 'Monaco', monospace;
      font-size: 12px;
    }
    .test-data .data-line { margin: 4px 0; color: #cbd5e1; }
    .test-data .label { color: #60a5fa; font-weight: 600; }
    .test-data .value { color: #4ade80; font-weight: 600; }
    .test-data .expected { color: #fbbf24; }
    .test-data .bool { color: #c084fc; font-weight: 600; }
    .error {
      margin: 5px 0 10px 40px;
      padding: 12px 15px;
      background: rgba(239, 68, 68, 0.1);
      border-left: 3px solid #ef4444;
      border-radius: 4px;
    }
    .error pre {
      margin: 0;
      font-family: 'Consolas', monospace;
      font-size: 12px;
      color: #fca5a5;
      white-space: pre-wrap;
      word-break: break-word;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>Klacks.Ui Test Report</h1>
    <div class="date">Getestet am ${date}</div>
    <div class="summary">
      <span><strong>${total}</strong> Tests</span>
      <span class="passed"><strong>${passed}</strong> bestanden</span>
      <span class="failed"><strong>${failed}</strong> fehlgeschlagen</span>
      <span class="pending"><strong>${pending}</strong> ausstehend</span>
    </div>
  </div>
  <div class="tests">
${testListHtml}
  </div>
</body>
</html>`;
}

const testDataMap = parseTestDataFromOutput();
const html = generateHtml(results, testDataMap);
fs.writeFileSync(htmlPath, html);
console.log(`Report generated: ${htmlPath}`);
