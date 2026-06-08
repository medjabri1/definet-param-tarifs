/* ═══════════════════════════════════════════════════════════════
   MOTEUR DE CALCUL DU PRIX — resolveTarif()
   Implémente les règles validées + remarques client :
   - sélection de la tranche (grille de quotients/revenus)
   - si pas de QF/revenu → TARIF MAXIMUM (dernière tranche)
   - sélection de la colonne (dégressivité / nb enfants)
   - lecture de la cellule (matrice prix OU taux d'effort %)
   - mode forfait / unité / heure (+ arrondi heure/½h/¼h, plancher)
   - formule personnalisée optionnelle
   - bornes min/max
   ═══════════════════════════════════════════════════════════════ */
const Engine = (() => {

  function appliquerArrondi(heures, regle, minutesMin) {
    let h = Number(heures) || 0;
    if (minutesMin) h = Math.max(h, minutesMin / 60);
    const ent = Math.floor(h), dec = +(h - ent).toFixed(6);
    if (dec === 0) return h;
    switch (regle) {
      case 'HEURE': return ent + 1;
      case 'DEMI':  return dec <= 0.5 ? ent + 0.5 : ent + 1;
      case 'QUART': return dec <= 0.25 ? ent + 0.25 : dec <= 0.5 ? ent + 0.5 : dec <= 0.75 ? ent + 0.75 : ent + 1;
      default:      return h; // AUCUN
    }
  }

  function evalFormule(formule, vars) {
    try {
      const keys = Object.keys(vars);
      const fn = new Function(...keys, `"use strict"; return (${formule});`);
      const r = fn(...keys.map(k => vars[k]));
      return (typeof r === 'number' && isFinite(r)) ? r : null;
    } catch (e) { return null; }
  }

  // ctx : { qf, revenu, nbEnfants, heures, unites, ressources, date }
  function resolveTarif(tarif, ctx = {}) {
    const steps = [];
    const err = (code, message) => ({ ok: false, code, message, steps });

    if (!tarif) return err('TARIF_INTROUVABLE', 'Tarif introuvable.');
    if (!tarif.actif) return err('TARIF_INACTIF', 'Ce tarif est désactivé.');

    // 0. Validité (obligatoire)
    const d = ctx.date || new Date().toISOString().slice(0, 10);
    if (tarif.validite && (d < tarif.validite.debut || d > tarif.validite.fin)) {
      return err('HORS_VALIDITE', `Ce tarif n'est pas applicable au ${Utils.formatDate(d)} (validité ${Utils.formatDate(tarif.validite.debut)} → ${Utils.formatDate(tarif.validite.fin)}).`);
    }

    // 1. LIGNE — tranche de QF/revenu
    let trancheKey = '_', trancheLabel = '—', noQf = false;
    if (tarif.dependQF) {
      const grille = Data.grille(tarif.grilleCode);
      if (!grille) return err('GRILLE_INTROUVABLE', 'Grille de quotients/revenus introuvable.');
      const base = grille.source === 'Revenu' ? ctx.revenu : ctx.qf;
      const tris = [...grille.tranches].sort((a, b) => a.borneInf - b.borneInf);
      if (base == null || base === '') {
        // RÈGLE CLIENT : pas de quotient/revenu → tarif maximum (dernière tranche)
        const t = tris[tris.length - 1];
        trancheKey = t.ordre; trancheLabel = `${t.libelle} (tarif maximum — pas de ${grille.source.toLowerCase()})`;
        noQf = true;
        steps.push(`Pas de ${grille.source.toLowerCase()} fourni → application du tarif maximum (${t.libelle}).`);
      } else {
        let t = tris.find(x => base >= x.borneInf && base <= x.borneSup);
        if (!t) { t = base < tris[0].borneInf ? tris[0] : tris[tris.length - 1]; steps.push('Valeur hors bornes → tranche extrême appliquée.'); }
        trancheKey = t.ordre; trancheLabel = `${t.libelle} [${t.borneInf} → ${t.borneSup}]`;
        steps.push(`${grille.source} = ${base} → ${t.libelle}.`);
      }
    } else {
      steps.push('Tarif sans dépendance au quotient.');
    }

    // 2. COLONNE — dégressivité (nb enfants)
    let degKey = '_', degLabel = '—';
    if (tarif.dependEnfants && tarif.degressivites.length) {
      const nbEnf = ctx.nbEnfants == null || ctx.nbEnfants === '' ? 1 : +ctx.nbEnfants;
      const cols = [...tarif.degressivites].sort((a, b) => a.borneInf - b.borneInf);
      let c = cols.find(x => nbEnf >= x.borneInf && nbEnf <= x.borneSup) || (nbEnf < cols[0].borneInf ? cols[0] : cols[cols.length - 1]);
      degKey = c.ordre; degLabel = c.label;
      steps.push(`${nbEnf} enfant(s) → ${c.label}.`);
    }

    // 3. CELLULE
    const row = tarif.valeurs[trancheKey];
    const valeur = row ? row[degKey] : undefined;
    if (valeur == null) return err('VALEUR_MANQUANTE', 'Le prix n\'est pas défini pour cette combinaison (grille incomplète).');

    // 4. Valeur de base / formule
    let unit = valeur;
    let formuleInfo = null;
    if (tarif.typeValeur === 'TAUX') {
      const assiette = ctx.ressources != null && ctx.ressources !== '' ? +ctx.ressources
                      : (ctx.revenu != null && ctx.revenu !== '' ? +ctx.revenu : null);
      if (assiette == null) return err('ASSIETTE_REQUISE', 'Un montant de ressources est requis pour un tarif en taux d\'effort.');
      unit = assiette * valeur; // taux stocké en fraction décimale (0.06 = 6 %)
      steps.push(`Taux d'effort ${(valeur * 100).toFixed(2)} % × ressources ${Utils.formatEuro(assiette)} = ${unit.toFixed(2)} €.`);
    } else if (tarif.formule) {
      const vars = { valeur, qf: +ctx.qf || 0, revenu: +ctx.revenu || 0, nbEnfants: +ctx.nbEnfants || 1, heures: +ctx.heures || 0, unites: +ctx.unites || 1, ressources: +ctx.ressources || 0 };
      const r = evalFormule(tarif.formule, vars);
      if (r == null) return err('FORMULE_INVALIDE', 'La formule personnalisée est invalide.');
      formuleInfo = `Formule « ${tarif.formule} » → ${r.toFixed(2)}`;
      unit = r; steps.push(formuleInfo);
    }

    // 5. Mode de calcul
    let montant = unit, heuresFacturees = null;
    if (tarif.modeCalcul === 'UNITAIRE') {
      const q = ctx.unites == null || ctx.unites === '' ? 1 : +ctx.unites;
      montant = unit * q; steps.push(`${unit.toFixed(2)} × ${q} ${tarif.uniteLabel || 'unité(s)'} = ${montant.toFixed(2)}`);
    } else if (tarif.modeCalcul === 'HORAIRE') {
      if (ctx.heures == null || ctx.heures === '') return err('HEURES_REQUISES', 'La durée (heures) est requise pour ce tarif horaire.');
      heuresFacturees = appliquerArrondi(+ctx.heures, tarif.regleArrondi, tarif.minutesMin);
      montant = unit * heuresFacturees;
      steps.push(`Durée ${(+ctx.heures).toFixed(2)} h → arrondi ${heuresFacturees} h × ${unit.toFixed(2)} = ${montant.toFixed(2)}`);
    }

    // 6. Bornes
    if (tarif.min != null && montant < tarif.min) { montant = tarif.min; steps.push(`Plancher appliqué : ${tarif.min.toFixed(2)} €`); }
    if (tarif.max != null && montant > tarif.max) { montant = tarif.max; steps.push(`Plafond appliqué : ${tarif.max.toFixed(2)} €`); }
    montant = Math.round(montant * 100) / 100;

    return { ok: true, montant, unit, valeur, trancheKey, trancheLabel, degKey, degLabel, heuresFacturees, noQf, steps };
  }

  return { resolveTarif, appliquerArrondi, evalFormule };
})();
window.Engine = Engine;
