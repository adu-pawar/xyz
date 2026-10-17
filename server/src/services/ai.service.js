import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

/**
 * Deterministic rule-based fallback test case generator
 */
export const generateFallbackTestCases = ({ targetUrl, objective, testType = 'functional', numCases = 3 }) => {
  const normalizedObj = objective.toLowerCase();
  const cases = [];

  // 1. Login / Authentication scenario
  if (normalizedObj.includes('login') || normalizedObj.includes('auth') || normalizedObj.includes('sign in')) {
    cases.push({
      title: 'Valid User Login Flow',
      description: 'Verifies that registered users can authenticate successfully and reach dashboard.',
      testType: 'security_auth',
      riskLevel: 'high',
      generationSource: 'rule_fallback',
      preconditions: ['User account exists in system', 'Target server is accessible'],
      steps: [
        { stepNumber: 1, action: 'navigate', target: targetUrl, value: targetUrl, expectedOutcome: 'Page loads' },
        { stepNumber: 2, action: 'assert_visible', target: 'input[type="email"], input[name="email"]', expectedOutcome: 'Email field is visible' },
        { stepNumber: 3, action: 'fill', target: 'input[type="email"], input[name="email"]', value: 'qa_verified@bugslayer.io', expectedOutcome: 'Email filled' },
        { stepNumber: 4, action: 'fill', target: 'input[type="password"]', value: 'ValidPass123!', expectedOutcome: 'Password filled' },
        { stepNumber: 5, action: 'click', target: 'button[type="submit"]', expectedOutcome: 'Submit clicked' },
        { stepNumber: 6, action: 'wait', value: '1500', expectedOutcome: 'Wait for response' },
        { stepNumber: 7, action: 'assert_url', value: '/dashboard', expectedOutcome: 'Redirected to dashboard' },
      ],
      expectedResults: ['User session established', 'Redirected to dashboard without errors'],
    });

    if (numCases >= 2) {
      cases.push({
        title: 'Invalid Credentials Rejection',
        description: 'Verifies that authentication fails gracefully with incorrect password.',
        testType: 'security_auth',
        riskLevel: 'high',
        generationSource: 'rule_fallback',
        preconditions: ['Target server is accessible'],
        steps: [
          { stepNumber: 1, action: 'navigate', target: targetUrl, value: targetUrl, expectedOutcome: 'Page loads' },
          { stepNumber: 2, action: 'fill', target: 'input[type="email"], input[name="email"]', value: 'invalid_user@example.com', expectedOutcome: 'Email filled' },
          { stepNumber: 3, action: 'fill', target: 'input[type="password"]', value: 'WrongPassword123!', expectedOutcome: 'Incorrect password filled' },
          { stepNumber: 4, action: 'click', target: 'button[type="submit"]', expectedOutcome: 'Submit clicked' },
          { stepNumber: 5, action: 'wait', value: '1000', expectedOutcome: 'Wait for error notification' },
          { stepNumber: 6, action: 'assert_visible', target: '[role="alert"], .error-message, .text-red-500', expectedOutcome: 'Error alert visible' },
        ],
        expectedResults: ['Access denied error message displayed', 'User remains unauthenticated on login page'],
      });
    }

    if (numCases >= 3) {
      cases.push({
        title: 'Empty Required Fields Validation',
        description: 'Verifies client-side or server validation when submitting empty login fields.',
        testType: 'form_validation',
        riskLevel: 'medium',
        generationSource: 'rule_fallback',
        preconditions: ['Target server is accessible'],
        steps: [
          { stepNumber: 1, action: 'navigate', target: targetUrl, value: targetUrl, expectedOutcome: 'Page loads' },
          { stepNumber: 2, action: 'click', target: 'button[type="submit"]', expectedOutcome: 'Click submit with empty fields' },
          { stepNumber: 3, action: 'assert_visible', target: 'input:invalid, .error, [aria-invalid="true"]', expectedOutcome: 'Validation prompt rendered' },
        ],
        expectedResults: ['Form submission prevented', 'Validation indicators displayed for required inputs'],
      });
    }
  }
  // 2. Navigation / Smoke scenario
  else if (normalizedObj.includes('smoke') || normalizedObj.includes('nav') || normalizedObj.includes('page load')) {
    cases.push({
      title: 'Target Page Load and Core Shell Verification',
      description: 'Verifies initial HTTP 200 response, page rendering, and primary header elements.',
      testType: 'smoke',
      riskLevel: 'high',
      generationSource: 'rule_fallback',
      preconditions: ['Target URL is reachable'],
      steps: [
        { stepNumber: 1, action: 'navigate', target: targetUrl, value: targetUrl, expectedOutcome: 'Page loads completely' },
        { stepNumber: 2, action: 'assert_visible', target: 'header, nav, main, h1', expectedOutcome: 'Core page containers are visible' },
        { stepNumber: 3, action: 'wait', value: '1000', expectedOutcome: 'Network idle check' },
      ],
      expectedResults: ['No fatal errors', 'Primary viewport contains header and main content elements'],
    });

    if (numCases >= 2) {
      cases.push({
        title: 'Interactive Buttons and Links Check',
        description: 'Ensures primary call-to-actions are visible, enabled, and responsive.',
        testType: 'smoke',
        riskLevel: 'medium',
        generationSource: 'rule_fallback',
        preconditions: ['Page rendered'],
        steps: [
          { stepNumber: 1, action: 'navigate', target: targetUrl, value: targetUrl, expectedOutcome: 'Page loads' },
          { stepNumber: 2, action: 'assert_visible', target: 'a, button', expectedOutcome: 'Interactive elements present' },
        ],
        expectedResults: ['Primary CTAs are accessible and not disabled'],
      });
    }
  }
  // 3. General functional testing fallback
  else {
    cases.push({
      title: `Functional Evaluation: ${objective.slice(0, 60)}`,
      description: `Targeted automated test verifying: ${objective}`,
      testType,
      riskLevel: 'medium',
      generationSource: 'rule_fallback',
      preconditions: ['Target environment reachable'],
      steps: [
        { stepNumber: 1, action: 'navigate', target: targetUrl, value: targetUrl, expectedOutcome: 'Navigate to target URL' },
        { stepNumber: 2, action: 'wait', value: '1000', expectedOutcome: 'Allow DOM ready' },
        { stepNumber: 3, action: 'assert_visible', target: 'body', expectedOutcome: 'Page body rendered' },
      ],
      expectedResults: ['Page executes expected lifecycle without runtime exceptions'],
    });
  }

  return cases;
};

/**
 * AI Test Generation using LLM Provider or Rule-based fallback
 */
export const generateTestCasesWithAI = async ({ targetUrl, objective, testType, numCases = 3 }) => {
  const apiKey = env.LLM_API_KEY;

  if (!apiKey) {
    logger.info('No LLM_API_KEY configured. Utilizing deterministic rule-based test generation engine.');
    return {
      cases: generateFallbackTestCases({ targetUrl, objective, testType, numCases }),
      source: 'rule_fallback',
      note: 'Generated using BugSlayer Rule Engine. Configure LLM_API_KEY in Settings to enable Gemini/OpenAI synthesis.',
    };
  }

  // Attempt LLM generation
  try {
    const prompt = `You are BugSlayer's autonomous QA generator.
Target URL: ${targetUrl}
Objective: "${objective}"
Test Category: ${testType}
Number of cases: ${numCases}

Generate exactly ${numCases} executable browser test cases in JSON format.
Each step action must be one of: "navigate", "click", "fill", "select", "hover", "assert_text", "assert_visible", "assert_url", "wait".
Valid targets should be resilient CSS selectors (e.g., 'button[type="submit"]', 'input[type="email"]', 'h1', '#login-btn').

Return ONLY valid JSON matching this schema:
{
  "cases": [
    {
      "title": "Clear string title",
      "description": "Short explanation",
      "testType": "${testType}",
      "riskLevel": "medium",
      "preconditions": ["string"],
      "steps": [
        { "stepNumber": 1, "action": "navigate", "target": "${targetUrl}", "value": "${targetUrl}", "expectedOutcome": "Loads" },
        { "stepNumber": 2, "action": "assert_visible", "target": "h1", "expectedOutcome": "Title visible" }
      ],
      "expectedResults": ["Outcome 1"]
    }
  ]
}`;

    // Call Gemini REST API directly
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json' },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`LLM API returned ${response.status}: ${errText}`);
    }

    const data = await response.json();
    const candidateText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!candidateText) {
      throw new Error('LLM response returned empty text.');
    }

    const parsed = JSON.parse(candidateText);
    const validatedCases = (parsed.cases || []).map((c) => ({
      ...c,
      generationSource: 'ai_generated',
    }));

    return {
      cases: validatedCases.length > 0 ? validatedCases : generateFallbackTestCases({ targetUrl, objective, testType, numCases }),
      source: 'ai_generated',
    };
  } catch (err) {
    logger.warn(`AI generation failed (${err.message}). Falling back to rule engine.`);
    return {
      cases: generateFallbackTestCases({ targetUrl, objective, testType, numCases }),
      source: 'rule_fallback',
      warning: `LLM service unreachable: ${err.message}. Reverted to rule fallback.`,
    };
  }
};

/**
 * AI Failure Analysis & Root Cause Investigation
 */
export const analyzeFailureWithAI = async ({
  testTitle,
  errorMessage,
  failingLocator,
  targetUrl,
  consoleErrors = [],
  networkFailures = [],
}) => {
  const apiKey = env.LLM_API_KEY;

  // Sanitized evidence summary
  const evidenceLines = [
    `Test Case: ${testTitle}`,
    `Target URL: ${targetUrl}`,
    `Error Message: ${errorMessage || 'Unknown step failure'}`,
    `Failing Selector/Target: ${failingLocator || 'N/A'}`,
    `Console Errors: ${consoleErrors.map((c) => c.text).slice(0, 3).join('; ') || 'None'}`,
    `Failed Network Requests: ${networkFailures.map((n) => `${n.method} ${n.url} (${n.status})`).slice(0, 3).join('; ') || 'None'}`,
  ];

  if (!apiKey) {
    // Deterministic rule-based analysis
    let probableCause = 'Element was not found or failed visibility constraint within the allotted timeout.';
    let confidenceLevel = 'medium';
    const recommendedNextSteps = [
      'Verify selector uniqueness and whether the element renders inside a dynamic iframe or shadow DOM.',
      'Check if target page requires pre-authentication or specific viewport dimension.',
      'Inspect network tab for failed asynchronous API requests preceding this step.',
    ];

    if (errorMessage.toLowerCase().includes('timeout')) {
      probableCause = `Execution timed out waiting for condition on '${failingLocator}'. The remote server may be slow or element was never mounted.`;
      confidenceLevel = 'high';
      recommendedNextSteps.unshift('Increase step timeout or verify backend API latency under load.');
    } else if (errorMessage.toLowerCase().includes('assert_text')) {
      probableCause = 'Content mismatch assertion failed. Rendered text does not match expected pattern.';
      confidenceLevel = 'high';
      recommendedNextSteps.unshift('Verify whether recent copy changes or localization occurred on target website.');
    } else if (networkFailures.length > 0) {
      probableCause = `Underlying HTTP ${networkFailures[0].status} error detected on ${networkFailures[0].url}. Client-side UI failed due to backend response failure.`;
      confidenceLevel = 'high';
      recommendedNextSteps.unshift(`Check server logs for ${networkFailures[0].url} returning HTTP ${networkFailures[0].status}.`);
    }

    return {
      probableCause,
      supportingEvidence: evidenceLines,
      confidenceLevel,
      recommendedNextSteps,
      analyzedAt: new Date(),
    };
  }

  // Use LLM to analyze root cause
  try {
    const prompt = `You are BugSlayer's autonomous QA failure investigator.
An automated browser test failed with the following evidence:
${evidenceLines.join('\n')}

Analyze this failure. Clearly distinguish verified observations from hypotheses.
Return ONLY valid JSON matching this structure:
{
  "probableCause": "Concise explanation of the likely defect or test fragility",
  "supportingEvidence": ["Observation 1", "Observation 2"],
  "confidenceLevel": "high",
  "recommendedNextSteps": ["Fix or check step 1", "Step 2"]
}`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json' },
      }),
    });

    if (!response.ok) {
      throw new Error(`Failure analysis API status ${response.status}`);
    }

    const data = await response.json();
    const candidateText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    const parsed = JSON.parse(candidateText);

    return {
      probableCause: parsed.probableCause || 'Automated execution failure',
      supportingEvidence: parsed.supportingEvidence || evidenceLines,
      confidenceLevel: parsed.confidenceLevel || 'medium',
      recommendedNextSteps: parsed.recommendedNextSteps || ['Inspect test logs and replay with Playwright'],
      analyzedAt: new Date(),
    };
  } catch (err) {
    logger.warn(`AI failure investigation fell back to rule engine: ${err.message}`);
    return {
      probableCause: `Automated test step failed: ${errorMessage.slice(0, 150)}`,
      supportingEvidence: evidenceLines,
      confidenceLevel: 'medium',
      recommendedNextSteps: ['Inspect screenshots', 'Verify element locator in live browser'],
      analyzedAt: new Date(),
    };
  }
};
