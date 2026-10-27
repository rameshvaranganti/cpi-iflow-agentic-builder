import { ZeroTrustMasker } from '../src/security/zeroTrustMasker';

describe('ZeroTrustMasker Test Suite', () => {
  const DEFAULT_MASK = '[REDACTED_BY_AGENTIC_INTEGRATION_HUB]';

  it('should mask standard BTP credentials', () => {
    const creds = {
      client_id: 'sample-client-id',
      clientSecret: 'super-secret-key-123',
      password: 'mypassword'
    };
    const sanitized = ZeroTrustMasker.maskObject(creds);
    expect(sanitized.client_id).toBe(DEFAULT_MASK);
    expect(sanitized.clientSecret).toBe(DEFAULT_MASK);
    expect(sanitized.password).toBe(DEFAULT_MASK);
  });

  it('should mask Bearer tokens in text', () => {
    const log = 'Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.dummyPayloadSampleString';
    expect(ZeroTrustMasker.maskText(log)).toBe('Authorization: Bearer [REDACTED_TOKEN]');
  });

  it('should mask PCI card numbers and SSNs', () => {
    const pii = 'Card: 4111111111111111, SSN: 123-45-6789, Email: user@domain.com';
    const scrubbed = ZeroTrustMasker.maskText(pii);
    expect(scrubbed).toContain('[REDACTED_PCI_CARD]');
    expect(scrubbed).toContain('XXX-XX-[REDACTED_SSN]');
    expect(scrubbed).toContain('[REDACTED_EMAIL]');
  });
});