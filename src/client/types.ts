export type OkResponse<T> = {
  ok: 1;
  data: T;
};

export type ErrorResponse = {
  ok: 0;
  data: Record<string, unknown>;
};

export type ApiResponse<T> = OkResponse<T> | ErrorResponse;

export type OpenProClientConfig = {
  baseUrl: string;
  apiKey: string;
  debug?: boolean;
};

export type AccommodationHeader = {
  cleHebergement: {
    idFournisseur: number;
    idHebergement: number;
  };
  nom: string;
};

export type AccommodationListResponse = {
  listeHebergement: AccommodationHeader[];
};

export type BookingListResponse = {
  // shape to be refined per API; keep unknown-safe for now
  dossiers?: unknown[];
} & Record<string, unknown>;

export type BookingDetailResponse = Record<string, unknown>;


