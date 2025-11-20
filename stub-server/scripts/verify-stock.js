// Script de vérification du stock après mise à jour
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_PATH = path.join(__dirname, '..', 'stub-data.json');

const data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf-8'));

console.log('=== Vérification du stock après mise à jour ===\n');

// Vérifier quelques périodes de réservation
const checks = [
  { key: '47186:1', date: '2025-06-15', label: 'Hébergement 1 - 15 juin (RES-2025-001)' },
  { key: '47186:1', date: '2025-06-21', label: 'Hébergement 1 - 21 juin (RES-2025-001)' },
  { key: '47186:1', date: '2025-06-22', label: 'Hébergement 1 - 22 juin (jour de départ, doit être dispo)' },
  { key: '47186:2', date: '2025-06-15', label: 'Hébergement 2 - 15 juin (RES-2025-002)' },
  { key: '47186:2', date: '2025-08-05', label: 'Hébergement 2 - 5 août (RES-2025-005)' },
  { key: '47186:3', date: '2025-12-25', label: 'Hébergement 3 - 25 décembre (RES-2025-014)' },
  { key: '47186:3', date: '2025-12-31', label: 'Hébergement 3 - 31 décembre (jour de départ, doit être dispo)' },
];

for (const check of checks) {
  const stock = data.stock[check.key];
  if (!stock || !stock.jours) {
    console.log(`❌ ${check.label}: Stock non trouvé`);
    continue;
  }
  
  const jour = stock.jours.find(j => j.date === check.date);
  if (!jour) {
    console.log(`⚠️  ${check.label}: Date non trouvée dans le stock`);
    continue;
  }
  
  const status = jour.dispo === 0 ? '❌ INDISPONIBLE (réservé)' : '✅ DISPONIBLE';
  console.log(`${status} - ${check.label}: dispo=${jour.dispo}`);
}

console.log('\n=== Vérification terminée ===');

