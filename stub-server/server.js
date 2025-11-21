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

function loadDb() {
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

function saveDb(db) {
  try {
    fs.writeFileSync(DATA_PATH, JSON.stringify(db, null, 2), 'utf-8');
  } catch (e) {
    console.error('Failed to save stub-data.json:', e);
  }
}

const db = loadDb();

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

// POST /fournisseur/{idFournisseur}/hebergements/{idHebergement}/stock
app.post('/fournisseur/:idFournisseur/hebergements/:idHebergement/stock', (req, res) => {
  const { idFournisseur, idHebergement } = req.params;
  const key = `${idFournisseur}:${idHebergement}`;
  const payload = req.body ?? {};
  if (payload && Array.isArray(payload.jours)) {
    const existing = db.stock[key] || { jours: [] };
    const byDate = new Map(existing.jours.map(j => [j.date, j]));
    for (const j of payload.jours) {
      if (j && j.date) {
        byDate.set(j.date, { date: j.date, dispo: Number(j.dispo ?? 0) });
      }
    }
    db.stock[key] = { jours: Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date)) };
    saveDb(db);
  }
  res.json({ ok: 1, data: { saved: true } });
});

// --- Admin: rate types & rates (fake data) ---

// POST /fournisseur/{idFournisseur}/typetarifs  (create rate type)
app.post('/fournisseur/:idFournisseur/typetarifs', (req, res) => {
  const { idFournisseur } = req.params;
  const payload = req.body ?? {};
  const list = db.rateTypes[String(idFournisseur)] || [];
  const nextId = (list.reduce((m, r) => Math.max(m, Number(r.idTypeTarif || 0)), 1000) + 1);
  const created = { idTypeTarif: nextId, ...payload, createdAt: new Date().toISOString() };
  db.rateTypes[String(idFournisseur)] = [...list, created];
  saveDb(db);
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
app.put('/fournisseur/:idFournisseur/typetarifs/:idTypeTarif', (req, res) => {
  const { idFournisseur, idTypeTarif } = req.params;
  const payload = req.body ?? {};
  const list = db.rateTypes[String(idFournisseur)] || [];
  const updated = list.map(r => Number(r.idTypeTarif) === Number(idTypeTarif) ? { ...r, ...payload, updatedAt: new Date().toISOString() } : r);
  db.rateTypes[String(idFournisseur)] = updated;
  saveDb(db);
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
app.post('/fournisseur/:idFournisseur/hebergements/:idHebergement/typetarifs/tarif', (req, res) => {
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
  
    saveDb(db);
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
  res.json({
    ok: 1,
    data: {
      idHebergement: Number(idHebergement),
      jours
    }
  });
});

const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
app.listen(PORT, () => {
  console.log(`Stub listening on http://localhost:${PORT}`);
});


