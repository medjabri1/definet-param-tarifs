/* ═══════════════════════════════════════════════════════════════
   STATE — store léger (identique au prototype Paramétrage)
   ═══════════════════════════════════════════════════════════════ */
const State = (() => {
  let _state = { route: null, theme: 'azur', navExpanded: true, navOpenGroups: { tarifs: true } };
  const _listeners = {};
  function get(key) { return key ? _state[key] : { ..._state }; }
  function set(key, value) { const prev = _state[key]; _state[key] = value; _emit(key, value, prev); }
  function _emit(key, value, prev) {
    (_listeners[key] || []).forEach(fn => fn(value, prev));
    (_listeners['*'] || []).forEach(fn => fn(key, value, prev));
  }
  function on(key, fn) { (_listeners[key] = _listeners[key] || []).push(fn); return () => { _listeners[key] = _listeners[key].filter(f => f !== fn); }; }
  return { get, set, on };
})();
window.State = State;

/* ═══════════════════════════════════════════════════════════════
   DONNÉES MOCK — domaine « Paramétrage des tarifs »
   Reflète les remarques client :
   - période de validité OBLIGATOIRE (pas d'année / exercice)
   - grilles de quotients/revenus paramétrables et datées (servent à INITIALISER les tranches d'un tarif, puis modifiables dans le tarif)
   - choix automatique du tarif (commune / type de famille / type d'individu)
   - grille de PRIX ou de TAUX D'EFFORT (%) ; taux d'effort : montant = QF × taux + montant paramétré de la tranche
   - chaque tranche porte un MONTANT paramétrable (ajouté au calcul QF × taux d'effort)
   - formule personnalisée
   - si pas de QF/revenu → tarif maximum
   - TVA conservée ; pas de taux de facturation (taux pour mille)
   ═══════════════════════════════════════════════════════════════ */
const TarifData = {
  communes:      ['Toutes', 'Paris 12e', 'Vincennes', 'Saint-Mandé', 'Hors commune'],
  typesFamille:  ['Tous', 'Standard', 'Monoparentale', 'Famille nombreuse'],
  typesIndividu: ['Tous', 'Enfant', 'Adulte', 'Allocataire CAF', 'Non-allocataire'],

  prestations: [
    { id: 1, nom: 'Cantine maternelle' },
    { id: 2, nom: 'Cantine élémentaire' },
    { id: 3, nom: 'Accueil périscolaire matin' },
    { id: 4, nom: 'Accueil périscolaire soir' },
    { id: 5, nom: 'ALSH mercredi' },
    { id: 6, nom: 'Crèche collective' },
  ],

  // Grilles de quotients / revenus (paramétrables + datées)
  grilles: [
    { code: 'A', libelle: 'Quotient familial CAF', source: 'Quotient familial',
      validite: { debut: '2026-01-01', fin: '2026-12-31' }, actif: true,
      tranches: [
        { ordre: 1, libelle: 'Tranche 1', borneInf: 0,    borneSup: 700,    montant: 0 },
        { ordre: 2, libelle: 'Tranche 2', borneInf: 701,  borneSup: 1200,   montant: 5 },
        { ordre: 3, libelle: 'Tranche 3', borneInf: 1201, borneSup: 2000,   montant: 10 },
        { ordre: 4, libelle: 'Tranche 4', borneInf: 2001, borneSup: 999999, montant: 15 },
      ] },
    { code: 'B', libelle: 'Revenus mensuels', source: 'Revenu',
      validite: { debut: '2026-01-01', fin: '2026-08-31' }, actif: true,
      tranches: [
        { ordre: 1, libelle: 'Bas revenus',    borneInf: 0,    borneSup: 1500,   montant: 0 },
        { ordre: 2, libelle: 'Revenus moyens', borneInf: 1501, borneSup: 3000,   montant: 0 },
        { ordre: 3, libelle: 'Hauts revenus',  borneInf: 3001, borneSup: 999999, montant: 0 },
      ] },
  ],

  tarifs: [
    {
      id: 1, nom: 'Cantine maternelle', sigle: 'CANT-MAT',
      description: 'Repas au quotient familial, dégressif selon le nombre d\'enfants',
      modeCalcul: 'UNITAIRE', uniteLabel: 'repas', regleArrondi: 'AUCUN', minutesMin: null,
      typeValeur: 'PRIX', dependQF: true, grilleCode: 'A', dependEnfants: true,
      min: 0.50, max: null, formule: null,
      validite: { debut: '2026-09-01', fin: '2027-08-31' }, actif: true,
      criteres: { commune: 'Paris 12e', typeFamille: 'Tous', typeIndividu: 'Enfant' },
      degressivites: [
        { ordre: 1, label: '1 enfant',       borneInf: 1, borneSup: 1 },
        { ordre: 2, label: '2 enfants',      borneInf: 2, borneSup: 2 },
        { ordre: 3, label: '3 enfants et +', borneInf: 3, borneSup: 99 },
      ],
      valeurs: {
        1: { 1: 1.50, 2: 1.30, 3: 1.10 },
        2: { 1: 2.50, 2: 2.20, 3: 1.90 },
        3: { 1: 3.80, 2: 3.50, 3: 3.20 },
        4: { 1: 4.50, 2: 4.20, 3: 3.90 },
      },
      prestations: [1],
    },
    {
      id: 2, nom: 'Accueil du matin', sigle: 'ACM',
      description: 'Tarif horaire arrondi au quart d\'heure entamé, plancher 30 min',
      modeCalcul: 'HORAIRE', uniteLabel: 'heure', regleArrondi: 'QUART', minutesMin: 30,
      typeValeur: 'PRIX', dependQF: true, grilleCode: 'A', dependEnfants: false,
      min: null, max: 12, formule: null,
      validite: { debut: '2026-09-01', fin: '2027-08-31' }, actif: true,
      criteres: { commune: 'Toutes', typeFamille: 'Tous', typeIndividu: 'Enfant' },
      degressivites: [],
      valeurs: { 1: { _: 1.20 }, 2: { _: 1.80 }, 3: { _: 2.40 }, 4: { _: 3.00 } },
      prestations: [3, 4],
    },
    {
      id: 3, nom: 'Crèche — taux d\'effort', sigle: 'CRECHE-TE',
      description: 'Participation = QF × taux d\'effort + montant paramétré de la tranche',
      modeCalcul: 'FORFAIT', uniteLabel: null, regleArrondi: 'AUCUN', minutesMin: null,
      typeValeur: 'TAUX', dependQF: true, grilleCode: 'A', dependEnfants: true,
      min: null, max: null, formule: null,
      validite: { debut: '2026-01-01', fin: '2026-12-31' }, actif: true,
      criteres: { commune: 'Toutes', typeFamille: 'Tous', typeIndividu: 'Allocataire CAF' },
      // 🟦 tranches initialisées depuis la grille A, avec montant paramétré par tranche
      tranches: [
        { ordre: 1, libelle: 'Tranche 1', borneInf: 0,    borneSup: 700,    montant: 0 },
        { ordre: 2, libelle: 'Tranche 2', borneInf: 701,  borneSup: 1200,   montant: 5 },
        { ordre: 3, libelle: 'Tranche 3', borneInf: 1201, borneSup: 2000,   montant: 10 },
        { ordre: 4, libelle: 'Tranche 4', borneInf: 2001, borneSup: 999999, montant: 15 },
      ],
      degressivites: [
        { ordre: 1, label: '1 enfant',       borneInf: 1, borneSup: 1 },
        { ordre: 2, label: '2 enfants',      borneInf: 2, borneSup: 2 },
        { ordre: 3, label: '3 enfants et +', borneInf: 3, borneSup: 99 },
      ],
      valeurs: { // taux d'effort (fraction : 0.06 = 6 %)
        1: { 1: 0.06, 2: 0.05, 3: 0.04 },
        2: { 1: 0.06, 2: 0.05, 3: 0.04 },
        3: { 1: 0.07, 2: 0.06, 3: 0.05 },
        4: { 1: 0.08, 2: 0.07, 3: 0.06 },
      },
      prestations: [6],
    },
    {
      id: 4, nom: 'ALSH journée', sigle: 'ALSH-J',
      description: 'Forfait journée unique',
      modeCalcul: 'FORFAIT', uniteLabel: null, regleArrondi: 'AUCUN', minutesMin: null,
      typeValeur: 'PRIX', dependQF: false, grilleCode: null, dependEnfants: false,
      min: null, max: null, formule: null,
      validite: { debut: '2026-09-01', fin: '2027-08-31' }, actif: true,
      criteres: { commune: 'Toutes', typeFamille: 'Tous', typeIndividu: 'Tous' },
      degressivites: [],
      valeurs: { _: { _: 15.00 } },
      prestations: [5],
    },
    {
      id: 5, nom: 'Périscolaire (formule)', sigle: 'PERI-F',
      description: 'Tarif avec formule personnalisée : valeur de base modulée par le QF',
      modeCalcul: 'FORFAIT', uniteLabel: null, regleArrondi: 'AUCUN', minutesMin: null,
      typeValeur: 'PRIX', dependQF: true, grilleCode: 'A', dependEnfants: false,
      min: 1, max: 20, formule: 'valeur * (1 + qf/10000)',
      validite: { debut: '2026-01-01', fin: '2026-07-31' }, actif: false,
      criteres: { commune: 'Vincennes', typeFamille: 'Standard', typeIndividu: 'Enfant' },
      degressivites: [],
      valeurs: { 1: { _: 2.00 }, 2: { _: 3.00 }, 3: { _: 4.00 }, 4: { _: 5.00 } },
      prestations: [3],
    },
  ],
};
window.TarifData = TarifData;

const Data = {
  tarif: (id) => TarifData.tarifs.find(t => t.id === +id),
  grille: (code) => TarifData.grilles.find(g => g.code === code),
  prestation: (id) => TarifData.prestations.find(p => p.id === +id),
  modeLabel: (m) => ({ FORFAIT: 'Forfait', UNITAIRE: 'À l\'unité', HORAIRE: 'À l\'heure' }[m] || m),
  arrondiLabel: (a) => ({ AUCUN: 'Aucun', HEURE: 'Heure entamée', DEMI: 'Demi-heure entamée', QUART: 'Quart d\'heure entamé' }[a] || a),
  valeurLabel: (v) => (v === 'TAUX' ? 'Taux d\'effort (%)' : 'Prix (€)'),
  nextTarifId: () => Math.max(0, ...TarifData.tarifs.map(t => t.id)) + 1,
};
window.Data = Data;
