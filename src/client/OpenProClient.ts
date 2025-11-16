import { OpenProApiError, OpenProHttpError } from './errors';
import {
  AccommodationListResponse,
  ApiResponse,
  OkResponse,
  OpenProClientConfig
} from './types';

type Role = 'customer' | 'admin';

async function requestJson<T>(
  cfg: OpenProClientConfig,
  path: string,
  init?: RequestInit
): Promise<T> {
  const res = await fetch(`${cfg.baseUrl}${path}`, {
    ...init,
    headers: {
      'Authorization': `OsApiKey ${cfg.apiKey}`,
      'Content-Type': 'application/json',
      ...(init?.headers ?? {})
    }
  });

  const text = await res.text();
  let json: unknown = undefined;
  try {
    json = text ? JSON.parse(text) : undefined;
  } catch {
    // ignore, will be handled below
  }

  if (!res.ok) {
    throw new OpenProHttpError(`HTTP ${res.status}`, res.status, json ?? text);
  }

  return json as T;
}

function unwrapOk<T>(resp: ApiResponse<T>): T {
  if ('ok' in resp && resp.ok === 1) {
    return (resp as OkResponse<T>).data;
  }
  throw new OpenProApiError('API returned ok=0');
}

// Read-only surface available to both roles
export interface CustomerSurface {
  listAccommodations(idFournisseur: number): Promise<AccommodationListResponse>;
  // TODO: add read endpoints required by the widget (bookings, rates reading if provided)
}

// Admin-only surface
export interface AdminSurface {
  // Examples (signatures to be refined when payloads are finalized)
  updateStock(
    idFournisseur: number,
    idHebergement: number,
    payload: unknown
  ): Promise<void>;
}

export type ClientByRole<R extends Role> = R extends 'customer'
  ? CustomerSurface
  : CustomerSurface & AdminSurface;

export function createOpenProClient<R extends Role>(
  role: R,
  config: OpenProClientConfig
): ClientByRole<R> {
  const base: CustomerSurface = {
    async listAccommodations(idFournisseur: number) {
      const resp = await requestJson<ApiResponse<AccommodationListResponse>>(
        config,
        `/fournisseur/${idFournisseur}/hebergements`,
        { method: 'GET' }
      );
      return unwrapOk(resp);
    }
  };

  const admin: AdminSurface = {
    async updateStock(idFournisseur, idHebergement, payload) {
      const resp = await requestJson<ApiResponse<Record<string, never>>>(
        config,
        `/fournisseur/${idFournisseur}/hebergements/${idHebergement}/stock`,
        {
          method: 'POST',
          body: JSON.stringify(payload)
        }
      );
      unwrapOk(resp);
    }
  };

  if (role === 'customer') {
    return base as ClientByRole<R>;
  }
  return { ...base, ...admin } as ClientByRole<R>;
}


