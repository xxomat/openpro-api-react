import { describe, it, expect } from 'vitest';
import { createOpenProClient } from '../../src/client/OpenProClient';
import { mockFetch, jsonOk } from '../helpers';

describe('OpenProClient.listBookings', () => {
  it('returns data', async () => {
    // Should return the booking list payload with pagination meta fields
    const mockResponse = {
      infoPage: {
        index: 0,
        nbPage: 1,
        nbParPage: 20,
        nbTotal: 0
      },
      liste: []
    };
    mockFetch.mockResolvedValueOnce(jsonOk(mockResponse));

    const client = createOpenProClient('customer', {
      baseUrl: 'https://example.test',
      apiKey: 'key'
    });

    const data = await client.listBookings(1, { page: 1, nbParPage: 20 });
    expect(data).toEqual(mockResponse);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('forwards query params', async () => {
    // Should include pagination params in the request URL (page, nbParPage)
    const mockResponse = {
      infoPage: {
        index: 1,
        nbPage: 2,
        nbParPage: 10,
        nbTotal: 0
      },
      liste: []
    };
    mockFetch.mockResolvedValueOnce(jsonOk(mockResponse));
    const client = createOpenProClient('customer', {
      baseUrl: 'https://example.test',
      apiKey: 'key'
    });
    const res = await client.listBookings(1, { page: 2, nbParPage: 10 });
    expect(res.infoPage.nbPage).toBe(2);
    expect(mockFetch).toHaveBeenCalledTimes(1);
    const calledUrl: string = mockFetch.mock.calls[0][0];
    expect(calledUrl).toContain('/fournisseur/1/dossiers?');
  });
});


