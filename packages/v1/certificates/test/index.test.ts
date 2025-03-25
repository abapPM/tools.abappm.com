import { main } from '../src/index';
import { describe, it, expect } from 'vitest';

describe('main function', () => {
  it('should return 400 if domain is not provided', async () => {
    const event = {};
    const response = await main(event);
    expect(response.statusCode).toBe(400);
    expect(response.body).toHaveProperty('error', 'Domain is required');
  });

  it('should return 400 for invalid domain format', async () => {
    const event = { domain: 'invalid_domain' };
    const response = await main(event);
    expect(response.statusCode).toBe(400);
    expect(response.body).toHaveProperty('error', 'Invalid domain format');
  });

  it('should return 200 and certificates for github.com', async () => {
    const event = { domain: 'github.com' };
    const response = await main(event);
    expect(response.statusCode).toBe(200);
    expect(response.body).toHaveProperty('domain', 'github.com');
    expect(response.body).toHaveProperty('peerCertificate');
    expect(response.body).toHaveProperty('intermediateCertificates');
  });

  it('should return 200 and certificates for codeberg.org', async () => {
    const event = { domain: 'codeberg.org' };
    const response = await main(event);
    expect(response.statusCode).toBe(200);
    expect(response.body).toHaveProperty('domain', 'codeberg.org');
    expect(response.body).toHaveProperty('peerCertificate');
    expect(response.body).toHaveProperty('intermediateCertificates');
  });
});
