import { OpenProApiError, OpenProHttpError } from './errors';
import {
  AccommodationListResponse,
  ApiResponse,
  OkResponse,
  OpenProClientConfig,
  BookingListResponse,
  BookingDetailResponse,
  Booking,
  BookingList,
  RateTypeListResponse,
  RatesResponse,
  RatesListResponse,
  ListBookingsParams,
  DossierWebhookAjout,
  DossierWebhookSuppr,
  DossierWebhookListe,
  ReponseTypeTarifAjout,
  TypeTarifAjout,
  TypeTarifModif,
  RequeteTarifModif,
  ReponseLiaisonHebergementTypeTarifListe
} from './types';

type Role = 'customer' | 'admin';

/**
 * Formate une date au format DateXml (2017-01-12T12:00:00+01:00)
 * 
 * @param date - Date sous forme de string, Date object, ou timestamp
 * @returns Date formatée en DateXml avec fuseau horaire
 */
function formatDateXml(date: string | Date | number): string {
  let dateObj: Date;
  
  if (typeof date === 'string') {
    // Si c'est déjà au format DateXml (contient + ou - suivi de HH:MM), le retourner tel quel
    if (/[+-]\d{2}:\d{2}$/.test(date)) {
      return date;
    }
    // Sinon, parser la string
    dateObj = new Date(date);
  } else if (typeof date === 'number') {
    dateObj = new Date(date);
  } else {
    dateObj = date;
  }
  
  // Vérifier que la date est valide
  if (isNaN(dateObj.getTime())) {
    throw new Error(`Invalid date: ${date}`);
  }
  
  // Formater la date au format ISO avec le fuseau horaire local
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  const hours = String(dateObj.getHours()).padStart(2, '0');
  const minutes = String(dateObj.getMinutes()).padStart(2, '0');
  const seconds = String(dateObj.getSeconds()).padStart(2, '0');
  
  // Obtenir le décalage de fuseau horaire
  const offset = -dateObj.getTimezoneOffset(); // Inverser car getTimezoneOffset retourne l'offset en minutes
  const offsetHours = Math.floor(Math.abs(offset) / 60);
  const offsetMinutes = Math.abs(offset) % 60;
  const offsetSign = offset >= 0 ? '+' : '-';
  const offsetString = `${offsetSign}${String(offsetHours).padStart(2, '0')}:${String(offsetMinutes).padStart(2, '0')}`;
  
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}${offsetString}`;
}

function toSearchParams(params?: Record<string, unknown>): string {
  if (!params) return '';
  const flat: Record<string, string> = {};
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null) continue;
    flat[k] = String(v);
  }
  const q = new URLSearchParams(flat).toString();
  return q ? `?${q}` : '';
}

async function requestJson<T>(
  cfg: OpenProClientConfig,
  path: string,
  init?: RequestInit
): Promise<T> {
  const method = init?.method || 'GET';
  const fullUrl = `${cfg.baseUrl}${path}`;
  const startTime = Date.now();
  
  // Logger l'appel OpenPro
  console.log(`[OpenPro API] ${method} ${fullUrl}`);
  
  // Logger le body si présent (avec JSON stringifié pour éviter [Object])
  if (init?.body) {
    try {
      const bodyJson = typeof init.body === 'string' ? JSON.parse(init.body) : init.body;
      console.log(JSON.stringify(bodyJson, null, 2));
    } catch {
      // Si le parsing échoue, afficher tel quel
      console.log(init.body);
    }
  }
  
  const res = await fetch(fullUrl, {
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

  const duration = Date.now() - startTime;
  
  if (!res.ok) {
    console.error(`[OpenPro API] ${method} ${fullUrl} → ${res.status} (${duration}ms)`);
    if (json) {
      console.error(JSON.stringify(json, null, 2));
    } else {
      console.error(text);
    }
    throw new OpenProHttpError(`HTTP ${res.status}`, res.status, json ?? text);
  }

  // Logger la réponse réussie avec la durée
  console.log(`[OpenPro API] ${method} ${fullUrl} → ${res.status} (${duration}ms)`);

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
  listBookings(idFournisseur: number, params?: ListBookingsParams): Promise<BookingList>;
  getBooking(idFournisseur: number, idDossier: number): Promise<Booking>;
  getRates(idFournisseur: number, idHebergement: number, params?: Record<string, unknown>): Promise<RatesListResponse>;
  getStock(idFournisseur: number, idHebergement: number, params?: { debut?: string; fin?: string }): Promise<import('./types').StockResponse>;
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
  listRateTypes(idFournisseur: number): Promise<RateTypeListResponse>;
  createRateType(idFournisseur: number, payload: TypeTarifAjout): Promise<ReponseTypeTarifAjout>;
  updateRateType(idFournisseur: number, idTypeTarif: number, payload: TypeTarifModif): Promise<void>;
  deleteRateType(idFournisseur: number, idTypeTarif: number): Promise<void>;
  linkRateTypeToAccommodation(idFournisseur: number, idHebergement: number, idTypeTarif: number): Promise<void>;
  unlinkRateTypeFromAccommodation(idFournisseur: number, idHebergement: number, idTypeTarif: number): Promise<void>;
  listAccommodationRateTypeLinks(idFournisseur: number, idHebergement: number): Promise<ReponseLiaisonHebergementTypeTarifListe>;
  setRates(idFournisseur: number, idHebergement: number, payload: RequeteTarifModif): Promise<{ warnings?: unknown[] } | Record<string, unknown>>;
  listWebhooks(): Promise<DossierWebhookListe>;
  addWebhook(payload: DossierWebhookAjout): Promise<Record<string, unknown>>;
  deleteWebhook(payload: DossierWebhookSuppr): Promise<Record<string, unknown>>;
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
    },
    async listBookings(idFournisseur: number, params?: ListBookingsParams) {
      // Formater les paramètres de date au format DateXml si présents
      const formattedParams: ListBookingsParams = { ...params };
      const dateFields: Array<keyof Pick<ListBookingsParams, 'dateCreationDepuis' | 'dateCreationJusqua' | 'dateModificationDepuis' | 'dateModificationJusqua'>> = [
        'dateCreationDepuis',
        'dateCreationJusqua',
        'dateModificationDepuis',
        'dateModificationJusqua'
      ];
      
      for (const field of dateFields) {
        const dateValue = formattedParams[field];
        if (dateValue && typeof dateValue === 'string') {
          (formattedParams as Record<string, string>)[field] = formatDateXml(dateValue);
        }
      }
      
      const search = toSearchParams(formattedParams as unknown as Record<string, unknown>);
      const resp = await requestJson<ApiResponse<BookingList>>(
        config,
        `/fournisseur/${idFournisseur}/dossiers${search}`,
        { method: 'GET' }
      );
      return unwrapOk(resp);
    },
    async getBooking(idFournisseur: number, idDossier: number) {
      const resp = await requestJson<ApiResponse<Booking>>(
        config,
        `/fournisseur/${idFournisseur}/dossiers/${idDossier}`,
        { method: 'GET' }
      );
      return unwrapOk(resp);
    },
    async getRates(idFournisseur: number, idHebergement: number, params?: Record<string, unknown>) {
      const search = toSearchParams(params);
      const resp = await requestJson<ApiResponse<RatesListResponse>>(
        config,
        `/fournisseur/${idFournisseur}/hebergements/${idHebergement}/typetarifs/tarif${search}`,
        { method: 'GET' }
      );
      return unwrapOk(resp);
    },
    async getStock(idFournisseur: number, idHebergement: number, params?: { debut?: string; fin?: string }) {
      const search = toSearchParams(params as unknown as Record<string, unknown>);
      const resp = await requestJson<ApiResponse<import('./types').StockResponse>>(
        config,
        `/fournisseur/${idFournisseur}/hebergements/${idHebergement}/stock${search}`,
        { method: 'GET' }
      );
      return unwrapOk(resp);
    }
  };

  const admin: AdminSurface = {
    async updateStock(idFournisseur, idHebergement, payload) {
      // Transformer le payload de { jours: [{ date, dispo }] } vers { listeStock: [{ date, valeur }] }
      // selon l'API OpenPro qui attend listeStock avec valeur (pas stock)
      let transformedPayload: { listeStock: Array<{ date: string; valeur: number }> };
      
      if (payload && typeof payload === 'object' && 'jours' in payload && Array.isArray((payload as any).jours)) {
        // Format backend: { jours: [{ date, dispo }] } -> Format OpenPro: { listeStock: [{ date, valeur }] }
        transformedPayload = {
          listeStock: ((payload as any).jours as Array<{ date: string; dispo: number }>).map(j => ({
            date: j.date,
            valeur: j.dispo
          }))
        };
      } else if (payload && typeof payload === 'object' && 'listeStock' in payload) {
        // Déjà au format listeStock, mais il faut s'assurer que c'est 'valeur' et non 'stock'
        const listeStock = (payload as any).listeStock;
        if (Array.isArray(listeStock)) {
          transformedPayload = {
            listeStock: listeStock.map((item: any) => ({
              date: item.date,
              valeur: item.valeur ?? item.stock ?? item.dispo
            }))
          };
        } else {
          transformedPayload = payload as { listeStock: Array<{ date: string; valeur: number }> };
        }
      } else {
        // Format inconnu, essayer de passer tel quel (pour compatibilité)
        transformedPayload = payload as { listeStock: Array<{ date: string; valeur: number }> };
      }
      
      const resp = await requestJson<ApiResponse<Record<string, never>>>(
        config,
        `/fournisseur/${idFournisseur}/hebergements/${idHebergement}/stock`,
        {
          method: 'POST',
          body: JSON.stringify(transformedPayload)
        }
      );
      unwrapOk(resp);
    },
    async listRateTypes(idFournisseur: number) {
      const resp = await requestJson<ApiResponse<RateTypeListResponse>>(
        config,
        `/fournisseur/${idFournisseur}/typetarifs`,
        { method: 'GET' }
      );
      return unwrapOk(resp);
    },
    async createRateType(idFournisseur, payload) {
      const resp = await requestJson<ApiResponse<import('./types').ReponseTypeTarifAjout>>(
        config,
        `/fournisseur/${idFournisseur}/typetarifs`,
        {
          method: 'POST',
          body: JSON.stringify({ typeTarifAjout: payload })
        }
      );
      return unwrapOk(resp);
    },
    async updateRateType(idFournisseur, idTypeTarif, payload) {
      const resp = await requestJson<ApiResponse<Record<string, unknown>>>(
        config,
        `/fournisseur/${idFournisseur}/typetarifs/${idTypeTarif}`,
        {
          method: 'PUT',
          body: JSON.stringify({ typeTarifModif: payload })
        }
      );
      unwrapOk(resp);
    },
    async deleteRateType(idFournisseur, idTypeTarif) {
      const resp = await requestJson<ApiResponse<Record<string, unknown>>>(
        config,
        `/fournisseur/${idFournisseur}/typetarifs/${idTypeTarif}`,
        { method: 'DELETE' }
      );
      unwrapOk(resp);
    },
    async linkRateTypeToAccommodation(idFournisseur, idHebergement, idTypeTarif) {
      const resp = await requestJson<ApiResponse<Record<string, unknown>>>(
        config,
        `/fournisseur/${idFournisseur}/hebergements/${idHebergement}/typetarifs/${idTypeTarif}`,
        { method: 'POST' }
      );
      unwrapOk(resp);
    },
    async unlinkRateTypeFromAccommodation(idFournisseur, idHebergement, idTypeTarif) {
      const resp = await requestJson<ApiResponse<Record<string, unknown>>>(
        config,
        `/fournisseur/${idFournisseur}/hebergements/${idHebergement}/typetarifs/${idTypeTarif}`,
        { method: 'DELETE' }
      );
      unwrapOk(resp);
    },
    async listAccommodationRateTypeLinks(idFournisseur, idHebergement) {
      const resp = await requestJson<ApiResponse<ReponseLiaisonHebergementTypeTarifListe>>(
        config,
        `/fournisseur/${idFournisseur}/hebergements/${idHebergement}/typetarifs`,
        { method: 'GET' }
      );
      return unwrapOk(resp);
    },
    async setRates(idFournisseur, idHebergement, payload) {
      const resp = await requestJson<ApiResponse<{ warnings?: unknown[] } | Record<string, unknown>>>(
        config,
        `/fournisseur/${idFournisseur}/hebergements/${idHebergement}/typetarifs/tarif`,
        {
          method: 'POST',
          body: JSON.stringify({ tarifs: payload.tarifs })
        }
      );
      return unwrapOk(resp);
    },
    async listWebhooks() {
      const resp = await requestJson<ApiResponse<Record<string, unknown>>>(
        config,
        `/config/dossier/webhooks`,
        { method: 'GET' }
      );
      return unwrapOk(resp);
    },
    async addWebhook(payload) {
      const resp = await requestJson<ApiResponse<Record<string, unknown>>>(
        config,
        `/config/dossier/webhooks`,
        { method: 'POST', body: JSON.stringify(payload) }
      );
      return unwrapOk(resp);
    },
    async deleteWebhook(payload) {
      const resp = await requestJson<ApiResponse<Record<string, unknown>>>(
        config,
        `/config/dossier/webhooks`,
        { method: 'DELETE', body: JSON.stringify(payload) }
      );
      return unwrapOk(resp);
    }
  };

  if (role === 'customer') {
    return base as ClientByRole<R>;
  }
  return { ...base, ...admin } as ClientByRole<R>;
}


