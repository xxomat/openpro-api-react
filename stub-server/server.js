// Minimal stub server for OpenPro Playground (fake data)
// Install deps: npm i
// Run: npm run stub  (or: node stub-server/server.js)

import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const app = express();
app.use(cors());
app.use(express.json());

app.use((req, _res, next) => {
  // Optional: validate Authorization header "OsApiKey <KEY>"
  // const auth = req.header('Authorization');
  console.log(`${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({ ok: 1, status: 'healthy' });
});

// --- File-backed fake DB ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_PATH = path.join(__dirname, 'stub-data.json');

// Mutex pour protéger les accès concurrents au fichier
class FileMutex {
  constructor() {
    this.queue = [];
    this.locked = false;
  }

  async acquire() {
    return new Promise((resolve) => {
      if (!this.locked) {
        this.locked = true;
        resolve();
      } else {
        this.queue.push(resolve);
      }
    });
  }

  release() {
    if (this.queue.length > 0) {
      const next = this.queue.shift();
      next();
    } else {
      this.locked = false;
    }
  }
}

const fileMutex = new FileMutex();

function loadDbSync() {
  try {
    const raw = fs.readFileSync(DATA_PATH, 'utf-8');
    const json = JSON.parse(raw);
    json.hebergements = json.hebergements || {};
    json.dossiers = json.dossiers || {};
    json.stock = json.stock || {};
    json.rateTypes = json.rateTypes || {};
    json.rates = json.rates || {};
    return json;
  } catch (e) {
    console.error('Failed to load stub-data.json:', e);
    return { hebergements: {}, dossiers: {}, stock: {}, rateTypes: {}, rates: {} };
  }
}

async function loadDb() {
  await fileMutex.acquire();
  try {
    return loadDbSync();
  } finally {
    fileMutex.release();
  }
}

async function saveDb(db) {
  await fileMutex.acquire();
  try {
    fs.writeFileSync(DATA_PATH, JSON.stringify(db, null, 2), 'utf-8');
  } catch (e) {
    console.error('Failed to save stub-data.json:', e);
  } finally {
    fileMutex.release();
  }
}

// Charger les données initiales de manière synchrone au démarrage
let db = loadDbSync();

// Fonction pour recharger les données
async function reloadData() {
  const timestamp = new Date().toISOString();
  console.log(`[STUB] Reloading data from stub-data.json at ${timestamp}`);
  try {
    db = await loadDb();
    console.log(`[STUB] Data reloaded successfully at ${timestamp}`);
  } catch (e) {
    console.error(`[STUB] Failed to reload data at ${timestamp}:`, e);
  }
}

// Recharger les données toutes les minutes
const RELOAD_INTERVAL_MS = 60 * 1000; // 1 minute
setInterval(reloadData, RELOAD_INTERVAL_MS);

// GET /fournisseur/{idFournisseur}/hebergements
app.get('/fournisseur/:idFournisseur/hebergements', (req, res) => {
  const { idFournisseur } = req.params;
  const list = db.hebergements[String(idFournisseur)] || [];
  res.json({
    ok: 1,
    data: { hebergements: list }
  });
});

// GET /fournisseur/{idFournisseur}/dossiers
app.get('/fournisseur/:idFournisseur/dossiers', (req, res) => {
  // Optionally echo back query params (pagination, filters) to aid testing
  const params = req.query;
  const { idFournisseur } = req.params;
  const list = db.dossiers[String(idFournisseur)] || [];
  res.json({
    ok: 1,
    data: {
      meta: { total: list.length, params },
      dossiers: list
    }
  });
});

// GET /fournisseur/{idFournisseur}/dossiers/{idDossier}
app.get('/fournisseur/:idFournisseur/dossiers/:idDossier', (req, res) => {
  const { idFournisseur, idDossier } = req.params;
  const list = db.dossiers[String(idFournisseur)] || [];
  const found = list.find(d => Number(d.idDossier) === Number(idDossier)) || null;
  res.json({
    ok: 1,
    data: found || { idDossier: Number(idDossier), client: { nom: 'N/A', prenom: 'N/A' }, lignes: [] }
  });
});

// DELETE /fournisseur/{idFournisseur}/dossiers/{idDossier} (delete booking/dossier)
app.delete('/fournisseur/:idFournisseur/dossiers/:idDossier', async (req, res) => {
  console.log(`[STUB] DELETE /fournisseur/${req.params.idFournisseur}/dossiers/${req.params.idDossier} called`);
  const { idFournisseur, idDossier } = req.params;
  
  try {
    // Initialiser la liste des dossiers pour ce fournisseur si elle n'existe pas
    if (!db.dossiers[String(idFournisseur)]) {
      db.dossiers[String(idFournisseur)] = [];
    }
    
    const list = db.dossiers[String(idFournisseur)];
    const index = list.findIndex(d => Number(d.idDossier) === Number(idDossier));
    
    if (index === -1) {
      // Dossier non trouvé
      res.status(404).json({
        ok: 0,
        error: 'Booking not found'
      });
      return;
    }
    
    // Supprimer le dossier
    list.splice(index, 1);
    
    // Sauvegarder dans le fichier
    await saveDb(db);
    
    console.log(`[STUB] Deleted dossier ${idDossier} for supplier ${idFournisseur}`);
    
    res.json({
      ok: 1,
      data: { deleted: true, idDossier: Number(idDossier) }
    });
  } catch (error) {
    console.error('[STUB] ERROR in DELETE /dossiers:', error);
    res.status(500).json({
      ok: 0,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /fournisseur/{idFournisseur}/dossiers (create booking/dossier)
app.post('/fournisseur/:idFournisseur/dossiers', async (req, res) => {
  const { idFournisseur } = req.params;
  const payload = req.body ?? {};
  
  try {
    // Initialiser la liste des dossiers pour ce fournisseur si elle n'existe pas
    if (!db.dossiers[String(idFournisseur)]) {
      db.dossiers[String(idFournisseur)] = [];
    }
    
    // Générer un nouvel idDossier (max + 1 ou 1 si vide)
    const existingDossiers = db.dossiers[String(idFournisseur)];
    const maxId = existingDossiers.length > 0 
      ? Math.max(...existingDossiers.map(d => Number(d.idDossier) || 0))
      : 0;
    const newIdDossier = maxId + 1;
    
    // Récupérer le nom de l'hébergement depuis les données du stub
    const idHebergement = payload.hebergement?.idHebergement || payload.idHebergement || 0;
    const hebergements = db.hebergements[String(idFournisseur)] || [];
    const hebergementData = hebergements.find(h => 
      (h.idHebergement || h.cleHebergement?.idHebergement) === Number(idHebergement)
    );
    const hebergementNom = hebergementData?.nom || hebergementData?.nomHebergement || payload.hebergement?.nom || '';
    
    // Créer le nouveau dossier avec les données du payload
    const now = new Date().toISOString();
    const newDossier = {
      idDossier: newIdDossier,
      idFournisseur: Number(idFournisseur),
      reference: payload.reference || `RES-${new Date().getFullYear()}-${String(newIdDossier).padStart(3, '0')}`,
      dateCreation: payload.dateCreation || now,
      dateModification: payload.dateModification || now,
      client: payload.client || {
        civilite: payload.clientCivilite || 'M',
        nom: payload.clientNom || '',
        prenom: payload.clientPrenom || '',
        email: payload.clientEmail || '',
        telephone: payload.clientTelephone || '',
        remarques: payload.clientRemarques || '',
        adresse: payload.clientAdresse || '',
        codePostal: payload.clientCodePostal || '',
        ville: payload.clientVille || '',
        pays: payload.clientPays || '',
        dateNaissance: payload.clientDateNaissance || '',
        nationalite: payload.clientNationalite || '',
        profession: payload.clientProfession || '',
        societe: payload.clientSociete || '',
        siret: payload.clientSiret || '',
        tva: payload.clientTva || '',
        langue: payload.clientLangue || 'fr',
        newsletter: payload.clientNewsletter || false,
        cgvAcceptees: payload.clientCgvAcceptees || true
      },
      hebergement: payload.hebergement || {
        idHebergement: idHebergement,
        nom: hebergementNom,
        dateArrivee: payload.dateArrivee || '',
        dateDepart: payload.dateDepart || '',
        nbNuits: payload.nbNuits || 0,
        nbPersonnes: payload.nbPersonnes || 0,
        typeTarif: payload.typeTarif || {
          idTypeTarif: 1001,
          libelle: 'Tarif public',
          description: 'Tarif public annulable sans frais jusqu\'au jour de votre arrivée'
        }
      },
      paiement: payload.paiement || {
        montantTotal: payload.montantTotal || 0,
        devise: payload.devise || 'EUR',
        transactions: []
      },
      transaction: payload.transaction || {
        transactionResaLocale: {
          idTransaction: `TXN-LOC-${newIdDossier}`,
          reference: `REF-LOC-${payload.reference || `RES-${new Date().getFullYear()}-${String(newIdDossier).padStart(3, '0')}`}`,
          dateCreation: now,
          dateModification: now,
          montant: payload.montantTotal || 0,
          devise: payload.devise || 'EUR',
          statut: 'confirme',
          pointDeVente: 'Site web',
          utilisateur: 'client'
        }
      }
    };
    
    // Ajouter le nouveau dossier à la liste
    db.dossiers[String(idFournisseur)].push(newDossier);
    
    // Sauvegarder dans le fichier
    await saveDb(db);
    
    console.log(`[STUB] Created dossier ${newIdDossier} for supplier ${idFournisseur}`);
    
    res.json({
      ok: 1,
      data: newDossier
    });
  } catch (error) {
    console.error('[STUB] ERROR in POST /dossiers:', error);
    res.status(500).json({
      ok: 0,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /fournisseur/{idFournisseur}/hebergements/{idHebergement}/stock
app.post('/fournisseur/:idFournisseur/hebergements/:idHebergement/stock', async (req, res) => {
  const { idFournisseur, idHebergement } = req.params;
  const key = `${idFournisseur}:${idHebergement}`;
  const payload = req.body ?? {};
  
  // Accepter les deux formats : listeStock (swagger) ou jours (ancien format stub)
  let stockItems = [];
  if (payload && Array.isArray(payload.listeStock)) {
    // Format OpenPro : { listeStock: [{ date, valeur }] }
    stockItems = payload.listeStock.map(item => ({
      date: item.date,
      dispo: Number(item.valeur ?? item.stock ?? 0)
    }));
  } else if (payload && Array.isArray(payload.jours)) {
    // Format ancien stub : { jours: [{ date, dispo }] }
    stockItems = payload.jours.map(j => ({
      date: j.date,
      dispo: Number(j.dispo ?? 0)
    }));
  }
  
  if (stockItems.length > 0) {
    const existing = db.stock[key] || { jours: [] };
    const byDate = new Map(existing.jours.map(j => [j.date, j]));
    for (const item of stockItems) {
      if (item && item.date) {
        byDate.set(item.date, { date: item.date, dispo: item.dispo });
      }
    }
    db.stock[key] = { jours: Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date)) };
    await saveDb(db);
  }
  res.json({ ok: 1, data: { saved: true } });
});

// --- Admin: rate types & rates (fake data) ---

// POST /fournisseur/{idFournisseur}/typetarifs  (create rate type)
app.post('/fournisseur/:idFournisseur/typetarifs', async (req, res) => {
  const { idFournisseur } = req.params;
  const payload = req.body ?? {};
  const list = db.rateTypes[String(idFournisseur)] || [];
  const nextId = (list.reduce((m, r) => Math.max(m, Number(r.idTypeTarif || 0)), 1000) + 1);
  const created = { idTypeTarif: nextId, ...payload, createdAt: new Date().toISOString() };
  db.rateTypes[String(idFournisseur)] = [...list, created];
  await saveDb(db);
  res.json({
    ok: 1,
    data: created
  });
});

// GET /fournisseur/{idFournisseur}/typetarifs (list rate types)
app.get('/fournisseur/:idFournisseur/typetarifs', (req, res) => {
  const { idFournisseur } = req.params;
  const list = db.rateTypes[String(idFournisseur)] || [];
  
  // Transform to Swagger format: each TypeTarif must have cleTypeTarif
  const typeTarifs = list.map(item => {
    const { idTypeTarif, ...rest } = item;
    return {
      cleTypeTarif: {
        idFournisseur: Number(idFournisseur),
        idTypeTarif: Number(idTypeTarif)
      },
      ...rest
    };
  });
  
  res.json({
    ok: 1,
    data: { typeTarifs }
  });
});

// PUT /fournisseur/{idFournisseur}/typetarifs/{idTypeTarif}  (update rate type)
app.put('/fournisseur/:idFournisseur/typetarifs/:idTypeTarif', async (req, res) => {
  const { idFournisseur, idTypeTarif } = req.params;
  const payload = req.body ?? {};
  const list = db.rateTypes[String(idFournisseur)] || [];
  const updated = list.map(r => Number(r.idTypeTarif) === Number(idTypeTarif) ? { ...r, ...payload, updatedAt: new Date().toISOString() } : r);
  db.rateTypes[String(idFournisseur)] = updated;
  await saveDb(db);
  const result = updated.find(r => Number(r.idTypeTarif) === Number(idTypeTarif)) || { idTypeTarif: Number(idTypeTarif), ...payload };
  res.json({
    ok: 1,
    data: result
  });
});

// GET /fournisseur/{idFournisseur}/hebergements/{idHebergement}/typetarifs (list rate types linked to accommodation)
app.get('/fournisseur/:idFournisseur/hebergements/:idHebergement/typetarifs', (req, res) => {
  const { idFournisseur, idHebergement } = req.params;
  const key = `${idFournisseur}:${idHebergement}`;
  const ratesData = db.rates[key] || { periodes: [] };
  
  // Extract unique idTypeTarif from periods
  const idTypeTarifs = new Set();
  if (Array.isArray(ratesData.periodes)) {
    for (const periode of ratesData.periodes) {
      if (periode && typeof periode.idTypeTarif === 'number') {
        idTypeTarifs.add(periode.idTypeTarif);
      }
    }
  }
  
  // Build response according to Swagger format
  const liaisonHebergementTypeTarifs = Array.from(idTypeTarifs).map(idTypeTarif => ({
    idFournisseur: Number(idFournisseur),
    idHebergement: Number(idHebergement),
    idTypeTarif: Number(idTypeTarif)
  }));
  
  res.json({
    ok: 1,
    data: {
      liaisonHebergementTypeTarifs
    }
  });
});

// POST /fournisseur/{idFournisseur}/hebergements/:idHebergement/typetarifs/tarif (set rates)
// IMPORTANT: This route must be defined BEFORE the /typetarifs/:idTypeTarif route
// to ensure Express matches the specific "tarif" path before the generic parameter route
app.post('/fournisseur/:idFournisseur/hebergements/:idHebergement/typetarifs/tarif', async (req, res) => {
  console.log('[STUB] POST handler called!');
  try {
    const { idFournisseur, idHebergement } = req.params;
    const payload = req.body ?? {};
    const key = `${idFournisseur}:${idHebergement}`;
    
    console.log(`\n[STUB] ========================================`);
    console.log(`[STUB] Received setRates for ${key}`);
    console.log(`[STUB] Payload:`, JSON.stringify(payload, null, 2));
  
  // Initialiser la structure si elle n'existe pas
  if (!db.rates[key]) {
    db.rates[key] = { periodes: [] };
  }
  
  const beforePeriodes = JSON.parse(JSON.stringify(db.rates[key].periodes));
  console.log(`[STUB] Before (${beforePeriodes.length} periods):`, JSON.stringify(beforePeriodes, null, 2));
  
  // Si le payload contient un tableau tarifs, traiter chaque période
  if (Array.isArray(payload.tarifs)) {
    let existingPeriodes = [...(db.rates[key].periodes || [])];
    
    // Pour chaque période reçue, remplacer les périodes existantes qui chevauchent
    for (const newPeriode of payload.tarifs) {
      const newStart = new Date(newPeriode.debut + 'T00:00:00');
      const newEnd = new Date(newPeriode.fin + 'T23:59:59');
      
      // Filtrer les périodes existantes : garder celles qui ne chevauchent pas avec la nouvelle période
      const filteredPeriodes = [];
      
      for (const existing of existingPeriodes) {
        if (existing.idTypeTarif === newPeriode.idTypeTarif) {
          const existingStart = new Date(existing.debut + 'T00:00:00');
          const existingEnd = new Date(existing.fin + 'T23:59:59');
          
          // Vérifier le chevauchement
          if (newStart <= existingEnd && newEnd >= existingStart) {
            // Cette période chevauche, on va la découper
            
            // Période avant la nouvelle (si elle existe)
            if (existingStart < newStart) {
              // Calculer la date du jour précédent de manière fiable
              // Utiliser directement la string de date pour éviter les problèmes de fuseau horaire
              const [year, month, day] = newPeriode.debut.split('-').map(Number);
              const dayBeforeDate = new Date(Date.UTC(year, month - 1, day - 1));
              const dateBeforeStr = dayBeforeDate.toISOString().split('T')[0];
              filteredPeriodes.push({
                ...existing,
                fin: dateBeforeStr
              });
            }
            
            // Période après la nouvelle (si elle existe)
            if (existingEnd > newEnd) {
              // Calculer la date du jour suivant de manière fiable
              // Utiliser directement la string de date pour éviter les problèmes de fuseau horaire
              const [year, month, day] = newPeriode.fin.split('-').map(Number);
              const dayAfterDate = new Date(Date.UTC(year, month - 1, day + 1));
              const dateAfterStr = dayAfterDate.toISOString().split('T')[0];
              filteredPeriodes.push({
                ...existing,
                debut: dateAfterStr
              });
            }
            
            // La nouvelle période remplace la partie chevauchante
            // (on l'ajoutera après la boucle)
          } else {
            // Pas de chevauchement, garder la période existante
            filteredPeriodes.push(existing);
          }
        } else {
          // Différent idTypeTarif, garder la période existante
          filteredPeriodes.push(existing);
        }
      }
      
      // Trouver une période existante avec le même idTypeTarif qui chevauche pour préserver le tarifPax si nécessaire
      // Chercher dans les périodes originales avant le découpage
      const originalPeriodWithSameType = db.rates[key].periodes.find(
        p => p.idTypeTarif === newPeriode.idTypeTarif &&
        new Date(p.debut + 'T00:00:00') <= new Date(newPeriode.fin + 'T23:59:59') &&
        new Date(p.fin + 'T23:59:59') >= new Date(newPeriode.debut + 'T00:00:00')
      );
      
      // Si la nouvelle période n'a pas de tarifPax valide (liste vide ou absente) et qu'on a une période existante,
      // préserver le tarifPax existant pour ne pas perdre les prix
      let tarifPaxToUse = newPeriode.tarifPax;
      if ((!tarifPaxToUse || !tarifPaxToUse.listeTarifPaxOccupation || tarifPaxToUse.listeTarifPaxOccupation.length === 0) &&
          originalPeriodWithSameType && originalPeriodWithSameType.tarifPax &&
          originalPeriodWithSameType.tarifPax.listeTarifPaxOccupation &&
          originalPeriodWithSameType.tarifPax.listeTarifPaxOccupation.length > 0) {
        tarifPaxToUse = originalPeriodWithSameType.tarifPax;
      }
      
      // Ajouter la nouvelle période avec les valeurs fournies
      filteredPeriodes.push({
        idTypeTarif: newPeriode.idTypeTarif,
        debut: newPeriode.debut,
        fin: newPeriode.fin,
        ouvert: newPeriode.ouvert !== undefined ? newPeriode.ouvert : true,
        dureeMin: newPeriode.dureeMin !== undefined ? newPeriode.dureeMin : 1,
        dureeMax: newPeriode.dureeMax !== undefined ? newPeriode.dureeMax : 30,
        arriveeAutorisee: newPeriode.arriveeAutorisee !== undefined ? newPeriode.arriveeAutorisee : true,
        departAutorise: newPeriode.departAutorise !== undefined ? newPeriode.departAutorise : true,
        tarifPax: tarifPaxToUse || { listeTarifPaxOccupation: [] }
      });
      
      existingPeriodes = filteredPeriodes;
    }
    
    // Trier par date de début, puis par idTypeTarif, puis par fin (décroissant pour que les périodes courtes soient traitées en dernier)
    // Cela permet aux périodes spécifiques (courtes) d'écraser les périodes longues qui les couvrent
    db.rates[key].periodes = existingPeriodes.sort((a, b) => {
      if (a.debut !== b.debut) return a.debut.localeCompare(b.debut);
      if (a.idTypeTarif !== b.idTypeTarif) return a.idTypeTarif - b.idTypeTarif;
      // Trier par fin décroissant : périodes courtes (fin tôt) en dernier
      return b.fin.localeCompare(a.fin);
    });
  } else {
    // Fallback: comportement original pour compatibilité
    const merged = { ...(db.rates[key] || {}), ...(payload || {}) };
    db.rates[key] = merged;
  }
  
  const afterPeriodes = JSON.parse(JSON.stringify(db.rates[key].periodes));
  console.log(`[STUB] After (${afterPeriodes.length} periods):`, JSON.stringify(afterPeriodes, null, 2));

    await saveDb(db);
    console.log(`[STUB] Database saved to ${DATA_PATH}`);
    console.log(`[STUB] ========================================\n`);
    res.json({
      ok: 1,
      data: {
        idHebergement: Number(idHebergement),
        applied: true,
        payload: db.rates[key]
      }
    });
  } catch (error) {
    console.error(`[STUB] ERROR in setRates handler:`, error);
    console.error(`[STUB] Stack:`, error instanceof Error ? error.stack : 'No stack');
    res.status(500).json({
      ok: 0,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /fournisseur/{idFournisseur}/hebergements/{idHebergement}/typetarifs/:idTypeTarif (link rate type)
app.post('/fournisseur/:idFournisseur/hebergements/:idHebergement/typetarifs/:idTypeTarif', (req, res) => {
  console.log('[STUB] POST handler for typetarifs/:idTypeTarif called!', req.params);
  const { idHebergement, idTypeTarif } = req.params;
  res.json({
    ok: 1,
    data: {
      linked: true,
      idHebergement: Number(idHebergement),
      idTypeTarif: Number(idTypeTarif)
    }
  });
});

// Optional read endpoint for rates (not in MVP spec but handy for Playground)
// GET /fournisseur/:idFournisseur/hebergements/:idHebergement/typetarifs/tarif
app.get('/fournisseur/:idFournisseur/hebergements/:idHebergement/typetarifs/tarif', (req, res) => {
  const { idFournisseur, idHebergement } = req.params;
  const key = `${idFournisseur}:${idHebergement}`;
  const data = db.rates[key] || { periodes: [] };
  res.json({
    ok: 1,
    data: { idHebergement: Number(idHebergement), ...data }
  });
});

// --- Stock read helper (fake) ---
// GET /fournisseur/:idFournisseur/hebergements/:idHebergement/stock
// Optional query params: start=YYYY-MM-DD&end=YYYY-MM-DD
app.get('/fournisseur/:idFournisseur/hebergements/:idHebergement/stock', (req, res) => {
  const { idFournisseur, idHebergement } = req.params;
  const key = `${idFournisseur}:${idHebergement}`;
  const data = db.stock[key] || { jours: [] };
  const { start, end } = req.query;
  let jours = data.jours;
  if (start) {
    jours = jours.filter(j => j.date >= String(start));
  }
  if (end) {
    jours = jours.filter(j => j.date <= String(end));
  }
  // Transformer vers le format OpenPro : { listeStock: [{ date, valeur }] }
  const listeStock = jours.map(j => ({
    date: j.date,
    valeur: j.dispo ?? 0
  }));
  res.json({
    ok: 1,
    data: {
      listeStock
    }
  });
});

// 404 handler (must be last)
app.use((req, res) => {
  console.log(`[STUB] 404 - Route not found: ${req.method} ${req.path}`);
  res.status(404).json({
    ok: 0,
    error: `Route not found: ${req.method} ${req.path}`
  });
});

const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
app.listen(PORT, () => {
  console.log(`Stub listening on http://localhost:${PORT}`);
});


