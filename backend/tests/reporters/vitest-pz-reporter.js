import fs from 'fs';
import path from 'path';

function collectTests(tasks, topSuite) {
  const results = [];
  for (const task of tasks || []) {
    if (task.type === 'suite') {
      const name = topSuite || task.name;
      results.push(...collectTests(task.tasks, name));
    } else {
      const state = task.result?.state;
      const status = state === 'pass' ? 'passed' : state === 'fail' ? 'failed' : 'skipped';
      const entry = { suite: topSuite || 'root', name: task.name, status };
      if (status === 'failed') {
        const msg = task.result?.errors?.[0]?.message || task.result?.error?.message || '';
        entry.error = msg.split('\n')[0].substring(0, 200);
      }
      results.push(entry);
    }
  }
  return results;
}

export default class VitestPzReporter {
  constructor(options = {}) {
    this._outputFile = options.outputFile;
  }

  onFinished(files = []) {
    const endTime = Date.now();
    let startTime = endTime;

    const allTests = [];
    const suiteResults = [];

    for (const file of files) {
      const fileName = path.basename(file.filepath || file.name || '');
      const suiteName = fileName.replace(/\.test\.js$/, '');
      const duration = file.result?.duration || 0;
      if (file.result?.startTime) startTime = Math.min(startTime, file.result.startTime);

      const fileTests = collectTests(file.tasks, suiteName);
      allTests.push(...fileTests);

      const numPassing = fileTests.filter(t => t.status === 'passed').length;
      const numFailing = fileTests.filter(t => t.status === 'failed').length;
      const numPending = fileTests.filter(t => t.status === 'skipped').length;

      suiteResults.push({
        file: fileName,
        path: file.filepath || file.name,
        status: numFailing > 0 ? 'failed' : numPassing > 0 ? 'passed' : 'skipped',
        duration,
        numTests: fileTests.length,
        numPassing,
        numFailing,
        numPending,
        tests: fileTests.map(t => ({
          title: t.name,
          fullName: `${t.suite} > ${t.name}`,
          ancestors: [t.suite],
          status: t.status === 'passed' ? 'passed' : t.status === 'failed' ? 'failed' : 'pending',
          duration: null,
          failureMessages: t.error ? [t.error] : [],
        })),
      });
    }

    const failures     = allTests.filter(t => t.status === 'failed').map(({ suite, name, error }) => ({ suite, name, error }));
    const skippedTests = allTests.filter(t => t.status === 'skipped');
    const passed  = allTests.filter(t => t.status === 'passed').length;
    const failed  = failures.length;
    const skipped = skippedTests.length;
    const total   = allTests.length;

    const summary = {
      startTime,
      endTime,
      numTotalTestSuites:  files.length,
      numPassedTestSuites: suiteResults.filter(s => s.status !== 'failed').length,
      numFailedTestSuites: suiteResults.filter(s => s.status === 'failed').length,
      numTotalTests:   total,
      numPassedTests:  passed,
      numFailedTests:  failed,
      numPendingTests: skipped,
      success: failed === 0,
      suites: suiteResults,
    };

    const pzJson = {
      ok: failed === 0,
      total,
      passed,
      failed,
      skipped,
      durationMs: endTime - startTime,
      runner: 'vitest',
      failures,
      skipped_tests: skippedTests,
      tests: allTests,
    };

    if (!this._outputFile) return;
    const pzFile = this._outputFile.replace(/\.json$/, '-pz.json');
    try {
      fs.mkdirSync(path.dirname(this._outputFile), { recursive: true });
      fs.writeFileSync(this._outputFile, JSON.stringify(summary, null, 2));
      fs.writeFileSync(pzFile, JSON.stringify(pzJson, null, 2));
    } catch (err) {
      console.error('[vitest-pz-reporter] write failed:', err.message);
    }
  }
}
