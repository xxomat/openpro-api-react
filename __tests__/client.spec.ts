import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createOpenProClient } from '../src/client/OpenProClient';

const mockFetch = vi.fn();

describe('OpenProClient', () => {
  beforeEach(() => {
    // @ts-expect-error override
    global.fetch = mockFetch;
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('listAccommodations returns data on ok=1', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ ok: 1, data: { listeHebergement: [] } })
    });

    const client = createOpenProClient('customer', {
      baseUrl: 'https://example.test',
      apiKey: 'key'
    });

    const data = await client.listAccommodations(1);
    expect(data).toEqual({ listeHebergement: [] });
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('throws on ok=0', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ ok: 0, data: {} })
    });

    const client = createOpenProClient('customer', {
      baseUrl: 'https://example.test',
      apiKey: 'key'
    });

    await expect(client.listAccommodations(1)).rejects.toThrow();
  });

  it('listBookings returns data', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ ok: 1, data: { dossiers: [] } })
    });

    const client = createOpenProClient('customer', {
      baseUrl: 'https://example.test',
      apiKey: 'key'
    });

    const data = await client.listBookings(1);
    expect(data).toEqual({ dossiers: [] });
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
});


