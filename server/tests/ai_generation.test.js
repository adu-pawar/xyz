import { describe, it, expect } from 'vitest';
import { generateFallbackTestCases } from '../src/services/ai.service.js';

describe('AI Test Generation & Fallback Engine Suite', () => {
  it('generates structured authentication test suite from natural language objective', () => {
    const result = generateFallbackTestCases({
      targetUrl: 'https://example.com/login',
      objective: 'Test the login page with valid credentials, invalid credentials, and empty fields',
      testType: 'security_auth',
      numCases: 3,
    });

    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(3);

    // Verify first case structure
    const firstCase = result[0];
    expect(firstCase.title).toContain('Login');
    expect(firstCase.steps.length).toBeGreaterThan(0);
    expect(firstCase.steps[0].action).toBe('navigate');
    expect(firstCase.riskLevel).toBeDefined();
    expect(firstCase.expectedResults.length).toBeGreaterThan(0);
  });

  it('generates smoke test cases when objective specifies page load', () => {
    const result = generateFallbackTestCases({
      targetUrl: 'https://example.com',
      objective: 'Verify page load and header navigation smoke test',
      testType: 'smoke',
      numCases: 2,
    });

    expect(result.length).toBe(2);
    expect(result[0].testType).toBe('smoke');
    expect(result[0].steps[0].action).toBe('navigate');
  });
});
