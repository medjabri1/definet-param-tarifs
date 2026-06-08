/* ═══════════════════════════════════════════════════════════════
   SIMULATION — choix automatique du tarif + calcul réel du prix
   ═══════════════════════════════════════════════════════════════ */
const SimulationPage = (() => {

  let _tarifId = null;

  function render(el) {
    if (!_tarifId) _tarifId = (TarifData.tarifs.find(t => t.actif) || TarifData.tarifs[0]).id;
    el.innerHTML = `
      <div class="params-shell">
        <div class="params-header">
          <div class="params-header-icon"><span class="material-icons-outlined">science</span></div>
          <div><h1>Simulation d'un tarif</h1><div class="subtitle">Tester le calcul du prix — aucune donnée enregistrée</div></div>
        </div>
        ${TarifNav('simulation')}

        <div class="bloc">
          <div class="bloc-header"><div class="bloc-icon"><span class="material-icons-outlined">rule</span></div>
            <div class="bloc-title">1 · Choix automatique du tarif <span class="text-muted" style="font-weight:400">(optionnel)</span></div></div>
          <div class="sim-body">
            <div class="banner info" style="margin:0 0 12px"><span class="material-icons-outlined">rule</span><span>Le tarif est sélectionné selon la <b>prestation</b>, la <b>commune</b>, le <b>type de famille</b> et le <b>type d'individu</b>.</span></div>
            <div class="form-grid fg-2" style="padding:0">
              <div class="form-field"><label>Prestation</label><select class="input" id="s-prest">${TarifData.prestations.map(p => `<option value="${p.id}">${Utils.esc(p.nom)}</option>`).join('')}</select></div>
              <div class="form-field"><label>Commune</label><select class="input" id="s-com">${TarifData.communes.map(c => `<option>${c}</option>`).join('')}</select></div>
              <div class="form-field"><label>Type de famille</label><select class="input" id="s-fam">${TarifData.typesFamille.map(c => `<option>${c}</option>`).join('')}</select></div>
              <div class="form-field"><label>Type d'individu</label><select class="input" id="s-ind">${TarifData.typesIndividu.map(c => `<option>${c}</option>`).join('')}</select></div>
            </div>
            <button class="btn btn-ghost btn-sm" style="margin-top:12px" onclick="SimulationPage.autoSelect()"><span class="material-icons-outlined">auto_fix_high</span>Trouver le tarif automatiquement</button>
            <div id="s-auto-res" style="margin-top:10px"></div>
          </div>
        </div>

        <div class="bloc" style="margin-top:14px">
          <div class="bloc-header"><div class="bloc-icon"><span class="material-icons-outlined">tune</span></div>
            <div class="bloc-title">2 · Paramètres de calcul</div></div>
          <div class="sim-body">
            <div class="form-field" style="margin-bottom:4px"><label>Tarif</label>
              <select class="input" id="s-tarif">${TarifData.tarifs.map(t => `<option value="${t.id}" ${t.id === _tarifId ? 'selected' : ''}>${Utils.esc(t.nom)} (${t.sigle})${t.actif ? '' : ' — inactif'}</option>`).join('')}</select></div>
            <div id="s-inputs"></div>
            <button class="btn btn-primary" style="margin-top:14px" onclick="SimulationPage.compute()"><span class="material-icons-outlined">calculate</span>Calculer le prix</button>
          </div>
        </div>

        <div id="s-result" style="margin-top:14px"></div>
      </div>
      <style>
        .sim-body { padding: 16px 18px; }
        .sim-montant { font-size: 30px; font-weight: 800; color: var(--c-primary); }
        .sim-steps { margin: 0; padding-left: 18px; color: var(--c-text-2); font-size: 13px; line-height: 1.9; }
      </style>`;
    Utils.qs('#s-tarif').onchange = e => { _tarifId = +e.target.value; _renderInputs(); Utils.qs('#s-result').innerHTML = ''; };
    _renderInputs();
  }

  function _renderInputs() {
    const t = Data.tarif(_tarifId), host = Utils.qs('#s-inputs'); if (!t || !host) return;
    const g = t.dependQF ? Data.grille(t.grilleCode) : null;
    const fields = [];
    if (t.dependQF && g) {
      const lbl = g.source === 'Revenu' ? 'Revenu mensuel (€)' : 'Quotient familial';
      const id = g.source === 'Revenu' ? 's-revenu' : 's-qf';
      fields.push(`<div class="form-field"><label>${lbl}</label><input class="input" type="number" id="${id}" placeholder="laisser vide = tarif maximum"><div class="hint">Vide → tarif maximum (règle métier).</div></div>`);
    }
    if (t.dependEnfants) fields.push(`<div class="form-field"><label>Nombre d'enfants</label><input class="input" type="number" id="s-nbenf" value="1"></div>`);
    if (t.modeCalcul === 'HORAIRE') fields.push(`<div class="form-field"><label>Durée (heures)</label><input class="input" type="number" step="0.01" id="s-heures" value="1.10"></div>`);
    if (t.modeCalcul === 'UNITAIRE') fields.push(`<div class="form-field"><label>Nombre de ${t.uniteLabel || 'unités'}</label><input class="input" type="number" id="s-unites" value="20"></div>`);
    if (t.typeValeur === 'TAUX') fields.push(`<div class="form-field"><label>Ressources (€)</label><input class="input" type="number" id="s-ress" value="1800"></div>`);
    fields.push(`<div class="form-field"><label>Date de référence</label><input class="input" type="date" id="s-date" value="2026-09-15"></div>`);
    host.innerHTML = `
      <div class="banner info" style="margin:12px 0"><span class="material-icons-outlined">tune</span><span>${Data.modeLabel(t.modeCalcul)} · ${Data.valeurLabel(t.typeValeur)}${t.dependQF ? ' · grille ' + t.grilleCode : ''}${t.regleArrondi !== 'AUCUN' ? ' · arrondi ' + Data.arrondiLabel(t.regleArrondi) : ''} · validité ${Utils.formatDate(t.validite.debut)}→${Utils.formatDate(t.validite.fin)}</span></div>
      <div class="form-grid fg-2" style="padding:0">${fields.join('')}</div>`;
  }

  function autoSelect() {
    const prestId = +Utils.qs('#s-prest').value, com = Utils.qs('#s-com').value, fam = Utils.qs('#s-fam').value, ind = Utils.qs('#s-ind').value;
    const wild = (v, all) => v === all || v === 'Tous' || v === 'Toutes';
    const matches = TarifData.tarifs.filter(t => t.actif && t.prestations.includes(prestId)
      && (wild(t.criteres.commune, 'Toutes') || t.criteres.commune === com)
      && (wild(t.criteres.typeFamille, 'Tous') || t.criteres.typeFamille === fam)
      && (wild(t.criteres.typeIndividu, 'Tous') || t.criteres.typeIndividu === ind));
    const host = Utils.qs('#s-auto-res');
    if (!matches.length) { host.innerHTML = `<div class="banner" style="background:#FEF2F2;border-color:#FCA5A5;margin:0"><span class="material-icons-outlined" style="color:var(--c-danger)">block</span><span>Aucun tarif ne correspond à ces critères pour cette prestation.</span></div>`; return; }
    host.innerHTML = `<div class="banner" style="background:#ECFDF5;border-color:#6EE7B7;margin:0"><span class="material-icons-outlined" style="color:var(--c-success)">check_circle</span><span>${matches.length} tarif(s) : ${matches.map(m => `<a href="#" onclick="SimulationPage.pick(${m.id});return false" style="font-weight:600">${Utils.esc(m.nom)}</a>`).join(', ')}</span></div>`;
  }
  function pick(id) { _tarifId = id; Utils.qs('#s-tarif').value = id; _renderInputs(); Utils.qs('#s-result').innerHTML = ''; Utils.toast('Tarif sélectionné', 'success'); }

  function compute() {
    const t = Data.tarif(_tarifId);
    const val = id => { const e = Utils.qs('#' + id); return e ? e.value : undefined; };
    const ctx = { qf: val('s-qf'), revenu: val('s-revenu'), nbEnfants: val('s-nbenf'), heures: val('s-heures'), unites: val('s-unites'), ressources: val('s-ress'), date: val('s-date') };
    const r = Engine.resolveTarif(t, ctx);
    const host = Utils.qs('#s-result');
    if (!r.ok) {
      host.innerHTML = `<div class="bloc"><div class="sim-body">
        <div class="banner" style="background:#FEF2F2;border-color:#FCA5A5;margin:0 0 10px"><span class="material-icons-outlined" style="color:var(--c-danger)">error</span><span><b>${r.code}</b> — ${r.message}</span></div>
        ${r.steps.length ? `<ul class="sim-steps">${r.steps.map(s => `<li>${Utils.esc(s)}</li>`).join('')}</ul>` : ''}
      </div></div>`;
      return;
    }
    host.innerHTML = `
      <div class="bloc">
        <div class="flex-between" style="padding:14px 18px;border-bottom:1px solid var(--c-border)"><div class="bloc-title">Résultat</div><div class="sim-montant">${r.montant.toFixed(2)} €</div></div>
        <div class="kv-row"><span class="kv-key">Tranche retenue</span><span class="kv-val">${Utils.esc(r.trancheLabel)} ${r.noQf ? Utils.badge('tarif max', 'pending') : ''}</span></div>
        <div class="kv-row"><span class="kv-key">Colonne (dégressivité)</span><span class="kv-val">${Utils.esc(r.degLabel)}</span></div>
        <div class="kv-row"><span class="kv-key">${t.typeValeur === 'TAUX' ? 'Taux d\'effort' : 'Valeur unitaire'}</span><span class="kv-val">${t.typeValeur === 'TAUX' ? (r.valeur * 100).toFixed(2) + ' %' : r.unit.toFixed(2) + ' €'}</span></div>
        ${r.heuresFacturees != null ? `<div class="kv-row"><span class="kv-key">Heures facturées (arrondi)</span><span class="kv-val">${r.heuresFacturees} h</span></div>` : ''}
        <div style="padding:12px 18px 16px">
          <div style="font-size:13px;font-weight:600;color:var(--c-text-1);margin-bottom:6px">Détail du calcul</div>
          <ul class="sim-steps">${r.steps.map(s => `<li>${Utils.esc(s)}</li>`).join('')}</ul>
        </div>
      </div>`;
  }

  return { render, autoSelect, pick, compute };
})();
window.SimulationPage = SimulationPage;
