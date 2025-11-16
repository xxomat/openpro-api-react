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

export type RateType = {
  idTypeTarif: number;
  libelle?: unknown;
  description?: unknown;
  ordre?: number;
} & Record<string, unknown>;

export type RateTypeListResponse = {
  // per Swagger ReponseTypeTarifListe -> data.typeTarifs
  typeTarifs?: RateType[];
} & Record<string, unknown>;

export type Tarif = Record<string, unknown>;
export type RatesResponse = {
  // per Swagger ReponseTarifListe -> data.tarifs
  tarifs?: Tarif[];
} & Record<string, unknown>;

// Admin payloads (simplified per Swagger, keep loose where needed)
export type Multilingue = {
  langue: string; // 'fr' | 'en' etc.
  texte: string;
};

export type TypeTarifAjout = {
  libelle: Multilingue[];
  description: Multilingue[];
  ordre: number;
};

export type TypeTarifModif = TypeTarifAjout;

export type ReponseTypeTarifAjout = {
  idTypeTarif: number;
};

export type ReponseTypeTarifListe = {
  typeTarifs: RateType[];
};

export type LiaisonResponse = Record<string, unknown>;

export type TarifModif = {
  idTypeTarif: number;
  debut: string; // YYYY-MM-DD
  fin: string;   // YYYY-MM-DD
  ouvert: boolean;
  dureeMin: number;
  dureeMax: number;
  arriveeAutorisee: boolean;
  departAutorise: boolean;
  tarifPax: Record<string, unknown>;
};

export type RequeteTarifModif = {
  tarifs: TarifModif[];
};


