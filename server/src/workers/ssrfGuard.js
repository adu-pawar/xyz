import dns from 'dns/promises';
import { URL } from 'url';
import { env } from '../config/env.js';

// IP range checkers
const isPrivateIPv4 = (ip) => {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some(isNaN)) return false;

  // 127.0.0.0/8 (Loopback)
  if (parts[0] === 127) return true;
  // 10.0.0.0/8 (Private)
  if (parts[0] === 10) return true;
  // 172.16.0.0/12 (Private)
  if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
  // 192.168.0.0/16 (Private)
  if (parts[0] === 192 && parts[1] === 168) return true;
  // 169.254.0.0/16 (Link Local & AWS/GCP Metadata 169.254.169.254)
  if (parts[0] === 169 && parts[1] === 254) return true;
  // 0.0.0.0/8
  if (parts[0] === 0) return true;

  return false;
};

const isPrivateIPv6 = (ip) => {
  const lower = ip.toLowerCase();
  // Loopback ::1
  if (lower === '::1' || lower === '0:0:0:0:0:0:0:1') return true;
  // Unique local addresses (fc00::/7)
  if (lower.startsWith('fc') || lower.startsWith('fd')) return true;
  // Link-local addresses (fe80::/10)
  if (lower.startsWith('fe8') || lower.startsWith('fe9') || lower.startsWith('fea') || lower.startsWith('feb')) return true;
  return false;
};

/**
 * Validates a target URL against SSRF, internal networks, and unauthorized origins.
 * @param {string} targetUrl - The URL to validate
 * @param {Array<string>} authorizedOrigins - List of origins configured on the project
 * @returns {Promise<{ valid: boolean, error?: string, resolvedIp?: string }>}
 */
export const validateTargetUrl = async (targetUrl, authorizedOrigins = []) => {
  try {
    const parsed = new URL(targetUrl);

    // Only allow http and https
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return { valid: false, error: 'Only HTTP and HTTPS protocols are permitted.' };
    }

    const hostname = parsed.hostname.toLowerCase();

    // Check special hostnames
    if (hostname === 'localhost' || hostname.endsWith('.local') || hostname.endsWith('.internal')) {
      if (!env.ALLOW_LOCAL_TESTING) {
        return {
          valid: false,
          error: `Access to local or internal domain '${hostname}' is restricted by security policy.`,
        };
      }
    }

    // Resolve DNS to verify destination IP
    let addresses = [];
    try {
      addresses = await dns.resolve(hostname);
    } catch (dnsErr) {
      // If hostname is directly an IP or cannot be resolved
      addresses = [hostname];
    }

    for (const ip of addresses) {
      if (isPrivateIPv4(ip) || isPrivateIPv6(ip)) {
        if (!env.ALLOW_LOCAL_TESTING) {
          return {
            valid: false,
            error: `Resolved target IP '${ip}' falls into a restricted private network range (SSRF protection).`,
          };
        }
      }
    }

    // Check against authorized project origins if provided
    if (authorizedOrigins && authorizedOrigins.length > 0) {
      const targetOrigin = parsed.origin.toLowerCase();
      const isAuthorized = authorizedOrigins.some((authOrigin) => {
        try {
          const authParsed = new URL(authOrigin);
          return authParsed.origin.toLowerCase() === targetOrigin;
        } catch {
          return false;
        }
      });

      if (!isAuthorized && !env.ALLOW_LOCAL_TESTING) {
        return {
          valid: false,
          error: `Target origin '${targetOrigin}' is not in the project's authorized target origins allowlist.`,
        };
      }
    }

    return { valid: true, resolvedIp: addresses[0] || hostname };
  } catch (err) {
    return { valid: false, error: `Invalid URL structure: ${err.message}` };
  }
};
