const PISTON_URL = process.env.PISTON_URL || "http://localhost:2000";

const LANGUAGE_MAP = {
  python: { language: "python", version: "3.12.0" },
  javascript: { language: "node", version: "20.11.1" },
  java: { language: "java", version: "15.0.2" },
  cpp: { language: "c++", version: "10.2.0" },
  c: { language: "c", version: "10.2.0" },
};

const runCode = async (language, code, stdin = "") => {
  const lang = LANGUAGE_MAP[language];
  if (!lang) throw new Error(`Unsupported language: ${language}`);

  const stdinNormalized = stdin
    ? stdin.endsWith("\n")
      ? stdin
      : stdin + "\n"
    : "";

  console.log(`[Piston] Running ${lang.language}@${lang.version}`);
  console.log(`[Piston] stdin: ${JSON.stringify(stdinNormalized)}`);

  let response;
  try {
    response = await fetch(`${PISTON_URL}/api/v2/execute`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        language: lang.language,
        version: lang.version,
        files: [{ name: "solution", content: code }],
        stdin: stdinNormalized,
        // No timeout fields — let Piston use its own configured defaults
      }),
    });
  } catch (err) {
    throw new Error(`Cannot connect to Piston: ${err.message}`);
  }

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Piston API error ${response.status}: ${text}`);
  }

  const result = await response.json();
  console.log(`[Piston] stdout: ${JSON.stringify(result.run?.stdout)}`);
  console.log(`[Piston] stderr: ${JSON.stringify(result.run?.stderr)}`);
  console.log(`[Piston] exit code: ${result.run?.code}`);
  return result;
};

const judgeSubmission = async (language, code, testCases) => {
  const results = [];
  let totalRuntime = 0;

  for (const testCase of testCases) {
    try {
      const start = Date.now();
      const result = await runCode(language, code, testCase.input);
      const elapsed = Date.now() - start;
      totalRuntime += elapsed;

      if (result.compile && result.compile.code !== 0) {
        results.push({
          input: testCase.input,
          expectedOutput: testCase.expectedOutput,
          actualOutput: result.compile.stderr || "Compilation Error",
          passed: false,
          runtime: elapsed,
          error: "COMPILE_ERROR",
        });
        continue;
      }

      if (result.run.code !== 0 || result.run.signal) {
        results.push({
          input: testCase.input,
          expectedOutput: testCase.expectedOutput,
          actualOutput:
            result.run.stderr || result.run.stdout || "Runtime Error",
          passed: false,
          runtime: elapsed,
          error: "RUNTIME_ERROR",
        });
        continue;
      }

      const actualOutput = (result.run.stdout || "").trim();
      const expectedOutput = (testCase.expectedOutput || "").trim();

      results.push({
        input: testCase.input,
        expectedOutput,
        actualOutput,
        passed: actualOutput === expectedOutput,
        runtime: elapsed,
        error: null,
      });
    } catch (err) {
      results.push({
        input: testCase.input,
        expectedOutput: testCase.expectedOutput,
        actualOutput: err.message,
        passed: false,
        runtime: 0,
        error: "EXECUTION_ERROR",
      });
    }
  }

  const testsPassed = results.filter((r) => r.passed).length;
  const testsTotal = results.length;

  return {
    results,
    testsPassed,
    testsTotal,
    score: testsTotal > 0 ? Math.round((testsPassed / testsTotal) * 100) : 0,
    runtime: testsTotal > 0 ? Math.round(totalRuntime / testsTotal) : 0,
    status: testsPassed === testsTotal ? "passed" : "failed",
  };
};

module.exports = { runCode, judgeSubmission };
