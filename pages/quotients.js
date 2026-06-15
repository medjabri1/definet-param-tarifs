/* ═══════════════════════════════════════════════════════════════
   GRILLES DE QUOTIENTS / REVENUS — paramétrables + période de validité obligatoire
   ═══════════════════════════════════════════════════════════════ */
const QuotientsPage = (() => {

  let _sel = null;

  function render(el) {
    if (!_sel && TarifData.grilles.length) _sel = TarifData.grilles[0].code;
    el.innerHTML = `
      <div class="params-shell">
        <div class="params-header">
          <div class="params-header-icon"><span class="material-icons-outlined">calculate</span></div>
          <div><h1>Grilles de quotients / revenus</h1><div class="subtitle">Tranches paramétrables, avec période de validité obligatoire</div></div>
          <div style="margin-left:auto"><button class="btn btn-primary" onclick="QuotientsPage.newGrille()"><span class="material-icons-outlined">add</span>Nouvelle grille</button></div>
        </div>
        ${TarifNav('quotients')}
        <div class="split-layout">
          <div class="split-sidebar" id="q-list"></div>
          <div class="split-content" id="q-detail"></div>
        </div>
      </div>`;
    _renderList(); _renderDetail();
  }

  function _renderList() {
    const host = Utils.qs('#q-list'); if (!host) return;
    host.innerHTML = TarifData.grilles.map(g => `
      <div class="side-list-item ${g.code === _sel ? 'active' : ''}" onclick="QuotientsPage.select('${g.code}')">
        <div class="grille-badge">${g.code}</div>
        <div style="flex:1;min-width:0">
          <div class="orga-name">${Utils.esc(g.libelle)}</div>
          <div class="orga-sub">${g.source} · ${g.tranches.length} tranche(s)</div>
        </div>
        ${g.actif ? '' : Utils.badge('Inactif', 'closed')}
      </div>`).join('');
  }

  function _renderDetail() {
    const host = Utils.qs('#q-detail'); if (!host) return;
    const g = Data.grille(_sel);
    if (!g) { host.innerHTML = `<div class="empty-state"><span class="material-icons-outlined">calculate</span><div class="title">Aucune grille</div></div>`; return; }
    const tranches = [...g.tranches].sort((a, b) => a.ordre - b.ordre);
    host.innerHTML = `
      <div class="bloc">
        <div class="flex-between">
          <div class="bloc-title">${g.code} — ${Utils.esc(g.libelle)}</div>
          <button class="btn btn-sm btn-ghost" onclick="QuotientsPage.editGrille('${g.code}')"><span class="material-icons-outlined">edit</span>Modifier la grille</button>
        </div>
        <div class="kv-row" style="margin-top:6px"><span class="kv-key">Source</span><span class="kv-val">${g.source}</span></div>
        <div class="kv-row"><span class="kv-key">Validité</span><span class="kv-val">${Utils.formatDate(g.validite.debut)} → ${Utils.formatDate(g.validite.fin)} ${g.validite.debut && g.validite.fin ? '' : Utils.badge('manquante', 'closed')}</span></div>
      </div>
      <div class="banner info" style="margin-top:14px"><span class="material-icons-outlined">info</span><span>Cette grille sert de <b>modèle</b> : à sa sélection dans un tarif, ses tranches sont <b>copiées dans le tarif</b> où elles restent <b>modifiables</b> — sans impacter la grille.</span></div>
      <div class="bloc" style="margin-top:14px">
        <div class="flex-between" style="margin-bottom:10px">
          <div class="bloc-title">Tranches (${tranches.length})</div>
          <button class="btn btn-sm btn-primary" onclick="QuotientsPage.addTranche('${g.code}')"><span class="material-icons-outlined">add</span>Ajouter une tranche</button>
        </div>
        <table class="data-table">
          <thead><tr><th>Ordre</th><th>Libellé</th><th style="text-align:right">Borne inf.</th><th style="text-align:right">Borne sup.</th><th style="text-align:right">Montant (€)</th><th style="text-align:right">Actions</th></tr></thead>
          <tbody>${tranches.map(t => `<tr>
            <td>${t.ordre}</td><td class="strong">${Utils.esc(t.libelle)}</td>
            <td style="text-align:right">${t.borneInf}</td><td style="text-align:right">${t.borneSup}</td>
            <td style="text-align:right">${(+(t.montant || 0)).toFixed(2)}</td>
            <td style="text-align:right;white-space:nowrap">
              <button class="icon-btn" title="Modifier" onclick="QuotientsPage.editTranche('${g.code}',${t.ordre})"><span class="material-icons-outlined">edit</span></button>
              <button class="icon-btn" title="Supprimer" onclick="QuotientsPage.delTranche('${g.code}',${t.ordre})"><span class="material-icons-outlined">delete</span></button>
            </td></tr>`).join('')}</tbody>
        </table>
      </div>`;
  }

  function select(code) { _sel = code; _renderList(); _renderDetail(); }

  /* ── Grille create/edit ── */
  function newGrille() { _grilleForm(null); }
  function editGrille(code) { _grilleForm(Data.grille(code)); }
  function _grilleForm(g) {
    const isNew = !g;
    Drawer.open({ title: isNew ? 'Nouvelle grille' : 'Modifier la grille', icon: 'calculate', wide: false,
      body: `<div class="form-grid">
        <div class="form-field"><label>Code <span class="req">*</span></label><input class="input" id="g-code" maxlength="2" value="${g ? g.code : ''}" ${g ? 'disabled' : ''}></div>
        <div class="form-field fg-2"><label>Libellé <span class="req">*</span></label><input class="input" id="g-lib" value="${g ? Utils.esc(g.libelle) : ''}"></div>
        <div class="form-field"><label>Source</label><select class="input" id="g-src"><option ${g && g.source === 'Quotient familial' ? 'selected' : ''}>Quotient familial</option><option ${g && g.source === 'Revenu' ? 'selected' : ''}>Revenu</option></select></div>
        <div class="form-field"><label>Début validité <span class="req">*</span></label><input class="input" type="date" id="g-deb" value="${g ? g.validite.debut : ''}"></div>
        <div class="form-field"><label>Fin validité <span class="req">*</span></label><input class="input" type="date" id="g-fin" value="${g ? g.validite.fin : ''}"></div>
        <div class="form-field"><label class="check-row"><input type="checkbox" id="g-actif" ${!g || g.actif ? 'checked' : ''}> Active</label></div>
      </div>`,
      footer: `<button class="btn btn-ghost" onclick="Drawer.close()">Annuler</button><button class="btn btn-primary" onclick="QuotientsPage.saveGrille(${isNew ? 'null' : `'${g.code}'`})">Enregistrer</button>` });
  }
  function saveGrille(code) {
    const get = id => Utils.qs('#' + id);
    const deb = get('g-deb').value, fin = get('g-fin').value, lib = get('g-lib').value.trim();
    if (!lib) { Utils.toast('Libellé requis', 'error'); return; }
    if (!deb || !fin) { Utils.toast('La période de validité est obligatoire', 'error'); return; }
    if (fin < deb) { Utils.toast('Période incohérente', 'error'); return; }
    if (code) {
      const g = Data.grille(code);
      g.libelle = lib; g.source = get('g-src').value; g.validite = { debut: deb, fin: fin }; g.actif = get('g-actif').checked;
    } else {
      const c = get('g-code').value.trim().toUpperCase();
      if (!c) { Utils.toast('Code requis', 'error'); return; }
      if (Data.grille(c)) { Utils.toast('Ce code de grille existe déjà', 'error'); return; }
      TarifData.grilles.push({ code: c, libelle: lib, source: get('g-src').value, validite: { debut: deb, fin: fin }, actif: get('g-actif').checked, tranches: [] });
      _sel = c;
    }
    Drawer.close(); Utils.toast('Grille enregistrée', 'success'); _renderList(); _renderDetail();
  }

  /* ── Tranche create/edit ── */
  function addTranche(code) { _trancheForm(code, null); }
  function editTranche(code, ordre) { _trancheForm(code, Data.grille(code).tranches.find(t => t.ordre === ordre)); }
  function _trancheForm(code, t) {
    const isNew = !t;
    Drawer.open({ title: isNew ? 'Nouvelle tranche' : 'Modifier la tranche', icon: 'horizontal_split',
      body: `<div class="form-grid">
        <div class="form-field full"><label>Libellé <span class="req">*</span></label><input class="input" id="tr-lib" value="${t ? Utils.esc(t.libelle) : ''}"></div>
        <div class="form-field"><label>Borne inférieure <span class="req">*</span></label><input class="input" type="number" id="tr-inf" value="${t ? t.borneInf : ''}"></div>
        <div class="form-field"><label>Borne supérieure <span class="req">*</span></label><input class="input" type="number" id="tr-sup" value="${t ? t.borneSup : ''}"></div>
        <div class="form-field full"><label>Montant de la tranche (€)</label><input class="input" type="number" step="0.01" id="tr-mt" value="${t ? (t.montant ?? 0) : 0}"><div class="hint">Sert de valeur initiale dans les tarifs ; ajouté au calcul en taux d'effort (<b>QF × taux + ce montant</b>).</div></div>
      </div><div class="hint" style="margin-top:8px">Les tranches ne doivent pas se chevaucher.</div>`,
      footer: `<button class="btn btn-ghost" onclick="Drawer.close()">Annuler</button><button class="btn btn-primary" onclick="QuotientsPage.saveTranche('${code}',${isNew ? 'null' : t.ordre})">Enregistrer</button>` });
  }
  function saveTranche(code, ordre) {
    const g = Data.grille(code);
    const lib = Utils.qs('#tr-lib').value.trim(), inf = +Utils.qs('#tr-inf').value, sup = +Utils.qs('#tr-sup').value;
    const mt = Utils.qs('#tr-mt').value === '' ? 0 : +Utils.qs('#tr-mt').value;
    if (!lib) { Utils.toast('Libellé requis', 'error'); return; }
    if (sup <= inf) { Utils.toast('La borne supérieure doit être > borne inférieure', 'error'); return; }
    const others = g.tranches.filter(t => t.ordre !== ordre);
    if (others.some(t => inf <= t.borneSup && sup >= t.borneInf)) { Utils.toast('Chevauchement avec une autre tranche', 'error'); return; }
    if (ordre) { const t = g.tranches.find(x => x.ordre === ordre); t.libelle = lib; t.borneInf = inf; t.borneSup = sup; t.montant = mt; }
    else { const o = Math.max(0, ...g.tranches.map(t => t.ordre)) + 1; g.tranches.push({ ordre: o, libelle: lib, borneInf: inf, borneSup: sup, montant: mt }); }
    Drawer.close(); Utils.toast('Tranche enregistrée', 'success'); _renderDetail(); _renderList();
  }
  function delTranche(code, ordre) {
    Modals.confirm({ title: 'Supprimer la tranche', confirmText: 'Supprimer', danger: true,
      message: 'Supprimer cette tranche de la grille ?',
      onConfirm: () => {
        const g = Data.grille(code); g.tranches = g.tranches.filter(t => t.ordre !== ordre);
        Utils.toast('Tranche supprimée', 'success'); _renderDetail(); _renderList();
      } });
  }

  return { render, select, newGrille, editGrille, saveGrille, addTranche, editTranche, saveTranche, delTranche };
})();
window.QuotientsPage = QuotientsPage;
