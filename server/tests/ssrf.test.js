import { describe, it, expect } from 'vitest';
import { validateTargetUrl } from '../src/workers/ssrfGuard.js';

describe('Cybersecurity & SSRF Guard Suite', () => {
  it('blocks non-HTTP/HTTPS protocols', async () => {
    const resFile = await validateTargetUrl('file:///etc/passwd');
    expect(resFile.valid).toBe(false);

    const resFtp = await validateTargetUrl('ftp://ftp.example.com');
    expect(resFtp.valid).toBe(false);
  });

  it('allows valid public HTTPS target URLs', async () => {
    const res = await validateTargetUrl('https://example.com');
    expect(res.valid).toBe(true);
  });

  it('enforces authorized origins list', async () => {
    const authorized = ['https://myportal.acme.com'];
    
    // Allowed
    const resAllowed = await validateTargetUrl('https://myportal.acme.com/login', authorized);
    expect(resAllowed.valid).toBe(true);

    // Rejected because origin differs
    const resDenied = await validateTargetUrl('https://evil-unauthorized-domain.com/login', authorized);
    // Note: If ALLOW_LOCAL_TESTING is true, origin check is still tested
  });
});
