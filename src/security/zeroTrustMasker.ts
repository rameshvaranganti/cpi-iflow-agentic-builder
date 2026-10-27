export interface MaskingConfig {
  replacementPattern?: string;
  customSensitiveKeys?: string[];
}

export class ZeroTrustMasker {
  private static readonly DEFAULT_MASK = '[REDACTED_BY_AGENTIC_INTEGRATION_HUB]';

  private static readonly SENSITIVE_KEY_PATTERNS = [
    /client[_-]?secret/i,
    /client[_-]?id/i,
    /api[_-]?key/i,
    /access[_-]?token/i,
    /refresh[_-]?token/i,
    /bearer/i,
    /authorization/i,
    /password/i,
    /passwd/i,
    /pwd/i,
    /private[_-]?key/i,
    /certificate/i,
    /keystore[_-]?pass/i
  ];

  private static readonly REGEX_RULES = [
    { pattern: /Bearer\s+([a-zA-Z0-9_\-\.]{20,})/gi, mask: 'Bearer [REDACTED_TOKEN]' },
    { pattern: /Basic\s+([a-zA-Z0-9+/=]{16,})/gi, mask: 'Basic [REDACTED_CREDENTIALS]' },
    { pattern: /-----BEGIN[ A-Z0-9_-]+PRIVATE KEY-----[\s\S]*?-----END[ A-Z0-9_-]+PRIVATE KEY-----/gi, mask: '[REDACTED_PRIVATE_KEY]' },
    { pattern: /(https?|sftp|ftp|amqp):\/\/([^:]+):([^@]+)@/gi, mask: '$1://$2:[REDACTED_PASSWORD]@' },
    { pattern: /\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|6(?:011|5[0-9]{2})[0-9]{12})\b/g, mask: '[REDACTED_PCI_CARD]' },
    { pattern: /\b[A-Z]{2}[0-9]{2}(?:[ ]?[A-Z0-9]{4}){3,7}(?:[ ]?[A-Z0-9]{1,4})?\b/gi, mask: '[REDACTED_IBAN]' },
    { pattern: /\b(?!000|666|9\d{2})\d{3}-(?!00)\d{2}-(?!0000)\d{4}\b/g, mask: 'XXX-XX-[REDACTED_SSN]' },
    { pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,7}\b/g, mask: '[REDACTED_EMAIL]' }
  ];

  public static maskText(input: string, customMask?: string): string {
    if (!input || typeof input !== 'string') return input;
    let scrubbed = input;
    const replacement = customMask || this.DEFAULT_MASK;
    for (const rule of this.REGEX_RULES) {
      scrubbed = scrubbed.replace(rule.pattern, rule.mask.includes('$') ? rule.mask : replacement);
    }
    return scrubbed;
  }

  public static maskObject<T>(obj: T, config?: MaskingConfig): T {
    if (obj === null || obj === undefined) return obj;
    if (typeof obj === 'string') return this.maskText(obj, config?.replacementPattern) as unknown as T;
    if (Array.isArray(obj)) return obj.map((item) => this.maskObject(item, config)) as unknown as T;

    if (typeof obj === 'object') {
      const result: Record<string, any> = {};
      for (const [key, value] of Object.entries(obj)) {
        if (this.isSensitiveKey(key, config?.customSensitiveKeys)) {
          result[key] = config?.replacementPattern || this.DEFAULT_MASK;
        } else if (typeof value === 'object' && value !== null) {
          result[key] = this.maskObject(value, config);
        } else if (typeof value === 'string') {
          result[key] = this.maskText(value, config?.replacementPattern);
        } else {
          result[key] = value;
        }
      }
      return result as T;
    }
    return obj;
  }

  private static isSensitiveKey(key: string, extraKeys?: string[]): boolean {
    if (extraKeys && extraKeys.some((k) => k.toLowerCase() === key.toLowerCase())) return true;
    return this.SENSITIVE_KEY_PATTERNS.some((pattern) => pattern.test(key));
  }
}