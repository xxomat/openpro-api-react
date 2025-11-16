import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createOpenProClient } from '../src/client/OpenProClient';

const mockFetch = vi.fn();

describe('OpenProClient', () => {
  const jsonOk = (data: unknown) => ({
    ok: true,
    status: 200,
    text: async () => JSON.stringify({ ok: 1, data })
  });

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

  it('listRateTypes returns data', async () => {
    mockFetch.mockResolvedValueOnce(jsonOk({ typeTarifs: [] }));

    const client = createOpenProClient('admin', {
      baseUrl: 'https://example.test',
      apiKey: 'key'
    });

    const data = await client.listRateTypes(1);
    expect(data).toEqual({ typeTarifs: [] });
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('createRateType returns idTypeTarif', async () => {
    mockFetch.mockResolvedValueOnce(jsonOk({ idTypeTarif: 9 }));
    const client = createOpenProClient('admin', {
      baseUrl: 'https://example.test',
      apiKey: 'key'
    });
    const res = await client.createRateType(1, {
      libelle: [{ langue: 'fr', texte: 'Tarif public' }],
      description: [{ langue: 'fr', texte: 'desc' }],
      ordre: 1
    });
    expect(res).toEqual({ idTypeTarif: 9 });
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('setRates posts payload and returns data', async () => {
    mockFetch.mockResolvedValueOnce(jsonOk({ warnings: [] }));
    const client = createOpenProClient('admin', {
      baseUrl: 'https://example.test',
      apiKey: 'key'
    });
    const res = await client.setRates(1, 2, {
      tarifs: [{
        idTypeTarif: 9,
        debut: '2026-03-16',
        fin: '2026-03-16',
        ouvert: true,
        dureeMin: 1,
        dureeMax: 14,
        arriveeAutorisee: true,
        departAutorise: true,
        tarifPax: { listeTarifPaxOccupation: [] }
      }]
    });
    expect(res).toEqual({ warnings: [] });
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('listWebhooks returns list', async () => {
    mockFetch.mockResolvedValueOnce(jsonOk({ webhooks: [{ url: 'https://x', emailAlerte: 'a@b.c' }] }));
    const client = createOpenProClient('admin', {
      baseUrl: 'https://example.test',
      apiKey: 'key'
    });
    const res = await client.listWebhooks();
    expect(res).toEqual({ webhooks: [{ url: 'https://x', emailAlerte: 'a@b.c' }] });
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('listBookings forwards query params', async () => {
    mockFetch.mockResolvedValueOnce(jsonOk({ dossiers: [], pageCourante: 2 }));
    const client = createOpenProClient('customer', {
      baseUrl: 'https://example.test',
      apiKey: 'key'
    });
    const res = await client.listBookings(1, { page: 2, nbParPage: 10 });
    expect(res.pageCourante).toBe(2);
    expect(mockFetch).toHaveBeenCalledTimes(1);
    const calledUrl: string = mockFetch.mock.calls[0][0];
    expect(calledUrl).toContain('/fournisseur/1/dossiers?');
  });
});


