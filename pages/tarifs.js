/* ═══════════════════════════════════════════════════════════════
   TARIFS — Liste des tarifs (+ duplication)
   ═══════════════════════════════════════════════════════════════ */

/* Navigation secondaire du module Tarifs (les 3 écrans internes) */
window.TarifNav = function (active) {
  const items = [
    ['tarifs', 'Tarifs', 'price_change', '/tarifs'],
    ['quotients', 'Grilles de quotients/revenus', 'calculate', '/quotients'],
    ['simulation', 'Simulation', 'science', '/simulation'],
  ];
  return `<div class="params-subtabs">${items.map(([id, lbl, ic, r]) =>
    `<div class="params-subtab ${active === id ? 'active' : ''}" onclick="Router.go('${r}')"><span class="material-icons-outlined">${ic}</span>${lbl}</div>`).join('')}</div>`;
};

const TarifsPage = (() => {

  let _search = '', _mode = '', _showInactifs = false;

  function _rows() {
    return TarifData.tarifs.filter(t => {
      if (!_showInactifs && !t.actif) return false;
      if (_mode && t.modeCalcul !== _mode) return false;
      if (_search) {
        const s = _search.toLowerCase();
        if (!(t.nom.toLowerCase().includes(s) || t.sigle.toLowerCase().includes(s))) return false;
      }
      return true;
    });
  }

  function render(el) {
    el.innerHTML = `
      <div class="params-shell">
        <div class="params-header">
          <div class="params-header-icon"><span class="material-icons-outlined">price_change</span></div>
          <div><h1>Tarifs</h1><div class="subtitle">Gestion des barèmes de la collectivité</div></div>
          <div style="margin-left:auto"><button class="btn btn-primary" onclick="Router.go('/tarifs/nouveau')"><span class="material-icons-outlined">add</span>Nouveau tarif</button></div>
        </div>
        ${TarifNav('tarifs')}

        <div class="filter-bar">
          <div class="input-wrap" style="flex:1;max-width:320px">
            <input class="input" id="t-search" placeholder="Rechercher (nom ou sigle)…" value="${Utils.esc(_search)}">
            <span class="material-icons-outlined input-icon">search</span>
          </div>
          <select class="input" id="t-mode" style="max-width:180px">
            <option value="">Tous les modes</option>
            <option value="FORFAIT">Forfait</option>
            <option value="UNITAIRE">À l'unité</option>
            <option value="HORAIRE">À l'heure</option>
          </select>
          <label class="check-row" style="margin-left:auto"><input type="checkbox" id="t-inactifs" ${_showInactifs ? 'checked' : ''}> Afficher les inactifs</label>
        </div>

        <div id="t-table"></div>
      </div>`;

    Utils.qs('#t-search').addEventListener('input', Utils.debounce(e => { _search = e.target.value; _renderTable(); }, 200));
    Utils.qs('#t-mode').value = _mode;
    Utils.qs('#t-mode').addEventListener('change', e => { _mode = e.target.value; _renderTable(); });
    Utils.qs('#t-inactifs').addEventListener('change', e => { _showInactifs = e.target.checked; _renderTable(); });
    _renderTable();
  }

  function _renderTable() {
    const rows = _rows();
    const host = Utils.qs('#t-table'); if (!host) return;
    if (!rows.length) {
      host.innerHTML = `<div class="empty-state"><span class="material-icons-outlined">price_change</span><div class="title">Aucun tarif</div><div class="desc">Aucun tarif ne correspond. Créez-en un avec « Nouveau tarif ».</div></div>`;
      return;
    }
    host.innerHTML = `
      <div class="bloc">
      <table class="data-table">
        <thead><tr>
          <th>Nom</th><th>Sigle</th><th>Mode de calcul</th><th>Type de valeur</th>
          <th>Période de validité</th><th style="text-align:center">Prestations</th><th>Statut</th><th style="text-align:right">Actions</th>
        </tr></thead>
        <tbody>
          ${rows.map(t => `
            <tr style="${t.actif ? '' : 'opacity:.55'}">
              <td class="strong">${Utils.esc(t.nom)}</td>
              <td><code>${Utils.esc(t.sigle)}</code></td>
              <td>${Utils.chip(Data.modeLabel(t.modeCalcul), 'blue')}</td>
              <td>${t.typeValeur === 'TAUX' ? Utils.chip('Taux d\'effort %', 'purple') : Utils.chip('Prix €', 'teal')}</td>
              <td>${Utils.formatDate(t.validite.debut)} → ${Utils.formatDate(t.validite.fin)}</td>
              <td style="text-align:center">${t.prestations.length}</td>
              <td>${t.actif ? Utils.badge('Actif', 'active') : Utils.badge('Inactif', 'closed')}</td>
              <td style="text-align:right;white-space:nowrap">
                <button class="icon-btn" title="Modifier" onclick="Router.go('/tarifs/${t.id}')"><span class="material-icons-outlined">edit</span></button>
                <button class="icon-btn" title="Dupliquer" onclick="TarifsPage.duplicate(${t.id})"><span class="material-icons-outlined">content_copy</span></button>
                <button class="icon-btn" title="${t.actif ? 'Désactiver' : 'Réactiver'}" onclick="TarifsPage.toggle(${t.id})"><span class="material-icons-outlined">${t.actif ? 'toggle_on' : 'toggle_off'}</span></button>
              </td>
            </tr>`).join('')}
        </tbody>
      </table>
      </div>`;
  }

  function toggle(id) {
    const t = Data.tarif(id); if (!t) return;
    if (t.actif && t.prestations.length) {
      Modals.confirm({ title: 'Désactiver le tarif', confirmText: 'Désactiver',
        message: `Le tarif « ${Utils.esc(t.nom)} » est rattaché à ${t.prestations.length} prestation(s). Il sera <b>désactivé</b> (et non supprimé), il restera consultable mais ne sera plus proposé.`,
        onConfirm: () => { t.actif = false; Utils.toast('Tarif désactivé', 'success'); _renderTable(); } });
    } else {
      t.actif = !t.actif; Utils.toast(t.actif ? 'Tarif réactivé' : 'Tarif désactivé', 'success'); _renderTable();
    }
  }

  function duplicate(id) {
    const t = Data.tarif(id); if (!t) return;
    Drawer.open({ title: `Dupliquer « ${Utils.esc(t.nom)} »`, icon: 'content_copy',
      body: `
        <p class="text-muted" style="margin-bottom:14px">La copie reprend la grille, les critères et les prestations. Définissez la <b>nouvelle période de validité</b> (obligatoire).</p>
        <div class="form-grid">
          <div class="form-field full"><label>Nouveau nom</label><input class="input" id="dup-nom" value="${Utils.esc(t.nom)} (copie)"></div>
          <div class="form-field"><label>Début <span class="req">*</span></label><input class="input" type="date" id="dup-deb"></div>
          <div class="form-field"><label>Fin <span class="req">*</span></label><input class="input" type="date" id="dup-fin"></div>
        </div>`,
      footer: `<button class="btn btn-ghost" onclick="Drawer.close()">Annuler</button><button class="btn btn-primary" onclick="TarifsPage.doDuplicate(${t.id})">Dupliquer</button>` });
  }

  function doDuplicate(id) {
    const t = Data.tarif(id);
    const nom = Utils.qs('#dup-nom').value.trim();
    const deb = Utils.qs('#dup-deb').value, fin = Utils.qs('#dup-fin').value;
    if (!deb || !fin) { Utils.toast('La période de validité est obligatoire', 'error'); return; }
    if (fin < deb) { Utils.toast('La date de fin doit suivre la date de début', 'error'); return; }
    const copy = JSON.parse(JSON.stringify(t));
    copy.id = Data.nextTarifId(); copy.nom = nom || (t.nom + ' (copie)'); copy.sigle = t.sigle + '-2';
    copy.validite = { debut: deb, fin: fin }; copy.actif = true;
    TarifData.tarifs.push(copy);
    Drawer.close(); Utils.toast('Tarif dupliqué', 'success'); _renderTable();
  }

  return { render, toggle, duplicate, doDuplicate };
})();
window.TarifsPage = TarifsPage;
