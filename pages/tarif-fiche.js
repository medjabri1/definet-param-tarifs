/* ═══════════════════════════════════════════════════════════════
   FICHE TARIF — en-tête + critères de choix auto + éditeur de grille + prestations
   ═══════════════════════════════════════════════════════════════ */
const TarifFichePage = (() => {

  let _t = null, _isNew = false, _tab = 'general';

  function _blank() {
    return { id: Data.nextTarifId(), nom: '', sigle: '', description: '',
      modeCalcul: 'FORFAIT', uniteLabel: 'repas', regleArrondi: 'AUCUN', minutesMin: null,
      typeValeur: 'PRIX', dependQF: false, grilleCode: TarifData.grilles[0]?.code || null, dependEnfants: false,
      min: null, max: null, formule: null, validite: { debut: '', fin: '' }, actif: true,
      criteres: { commune: 'Toutes', typeFamille: 'Tous', typeIndividu: 'Tous' },
      degressivites: [], valeurs: {}, prestations: [] };
  }

  function render(el, params) {
    _isNew = params.id === 'nouveau';
    _t = _isNew ? _blank() : JSON.parse(JSON.stringify(Data.tarif(params.id)));
    if (!_t) { el.innerHTML = `<div class="params-shell"><div class="empty-state"><span class="material-icons-outlined">error</span><div class="title">Tarif introuvable</div></div></div>`; return; }
    _tab = 'general';
    el.innerHTML = `
      <div class="params-shell">
        <div class="params-header">
          <button class="icon-btn" onclick="Router.go('/tarifs')" title="Retour"><span class="material-icons-outlined">arrow_back</span></button>
          <div class="params-header-icon"><span class="material-icons-outlined">price_change</span></div>
          <div><h1>${_isNew ? 'Nouveau tarif' : Utils.esc(_t.nom)}</h1><div class="subtitle">${_isNew ? 'Création d\'un barème' : Utils.esc(_t.sigle)}</div></div>
          <div style="margin-left:auto"><button class="btn btn-primary" onclick="TarifFichePage.save()"><span class="material-icons-outlined">save</span>Enregistrer</button></div>
        </div>
        <div class="params-subtabs">
          ${[['general','Général','tune'],['criteres','Choix automatique','rule'],['grille','Grille de prix','grid_on'],['prestations','Prestations','category']].map(([id,lbl,ic]) =>
            `<div class="params-subtab" data-st="${id}" onclick="TarifFichePage.tab('${id}')"><span class="material-icons-outlined">${ic}</span>${lbl}</div>`).join('')}
        </div>
        <div id="fiche-content"></div>
      </div>`;
    _renderTab();
  }

  function tab(id) { _tab = id; _renderTab(); }

  function _renderTab() {
    Utils.qsa('.params-subtab').forEach(e => e.classList.toggle('active', e.dataset.st === _tab));
    const c = Utils.qs('#fiche-content'); if (!c) return;
    if (_tab === 'general')     c.innerHTML = _general();
    else if (_tab === 'criteres') c.innerHTML = _criteres();
    else if (_tab === 'grille')   _grille(c);
    else if (_tab === 'prestations') _prestations(c);
    if (_tab === 'general') _bindGeneral();
    if (_tab === 'criteres') _bindCriteres();
  }

  /* ───────── GÉNÉRAL ───────── */
  function _general() {
    const horaire = _t.modeCalcul === 'HORAIRE';
    const opt = (v, cur) => `<option value="${v}" ${v === cur ? 'selected' : ''}>`;
    return `
      <div class="bloc">
        <div class="form-grid">
          <div class="form-field fg-2"><label>Nom <span class="req">*</span></label><input class="input" id="f-nom" value="${Utils.esc(_t.nom)}"></div>
          <div class="form-field"><label>Sigle <span class="req">*</span></label><input class="input" id="f-sigle" value="${Utils.esc(_t.sigle)}"></div>
          <div class="form-field full"><label>Description</label><input class="input" id="f-desc" value="${Utils.esc(_t.description || '')}"></div>

          <div class="form-field"><label>Mode de calcul <span class="req">*</span></label>
            <select class="input" id="f-mode">
              ${opt('FORFAIT', _t.modeCalcul)}Forfait</option>${opt('UNITAIRE', _t.modeCalcul)}À l'unité</option>${opt('HORAIRE', _t.modeCalcul)}À l'heure</option>
            </select></div>
          <div class="form-field" id="f-unite-wrap" style="${_t.modeCalcul === 'UNITAIRE' ? '' : 'display:none'}"><label>Libellé de l'unité</label><input class="input" id="f-unite" value="${Utils.esc(_t.uniteLabel || '')}" placeholder="repas, jour…"></div>
          <div class="form-field" id="f-arrondi-wrap" style="${horaire ? '' : 'display:none'}"><label>Arrondi des heures</label>
            <select class="input" id="f-arrondi">
              ${opt('AUCUN', _t.regleArrondi)}Aucun</option>${opt('HEURE', _t.regleArrondi)}Heure entamée</option>${opt('DEMI', _t.regleArrondi)}Demi-heure entamée</option>${opt('QUART', _t.regleArrondi)}Quart d'heure entamé</option>
            </select></div>
          <div class="form-field" id="f-minmin-wrap" style="${horaire ? '' : 'display:none'}"><label>Durée minimale (min)</label><input class="input" type="number" id="f-minmin" value="${_t.minutesMin ?? ''}"></div>

          <div class="form-field"><label>Type de valeur</label>
            <select class="input" id="f-typeval">
              ${opt('PRIX', _t.typeValeur)}Prix (€)</option>${opt('TAUX', _t.typeValeur)}Taux d'effort (%)</option>
            </select><div class="hint">Taux d'effort en pourcentage (pas de taux pour mille).</div></div>
          <div class="form-field"><label>Borne minimum (€)</label><input class="input" type="number" id="f-min" value="${_t.min ?? ''}"></div>
          <div class="form-field"><label>Borne maximum (€)</label><input class="input" type="number" id="f-max" value="${_t.max ?? ''}"></div>

          <div class="form-field"><label>Début de validité <span class="req">*</span></label><input class="input" type="date" id="f-deb" value="${_t.validite.debut}"></div>
          <div class="form-field"><label>Fin de validité <span class="req">*</span></label><input class="input" type="date" id="f-fin" value="${_t.validite.fin}"></div>
          <div class="form-field"><label>Actif</label><label class="check-row"><input type="checkbox" id="f-actif" ${_t.actif ? 'checked' : ''}> Tarif actif</label></div>

          <div class="form-field"><label class="check-row"><input type="checkbox" id="f-depqf" ${_t.dependQF ? 'checked' : ''}> Dépend du quotient/revenu</label></div>
          <div class="form-field" id="f-grille-wrap" style="${_t.dependQF ? '' : 'display:none'}"><label>Grille de quotients/revenus</label>
            <select class="input" id="f-grille">${TarifData.grilles.map(g => `<option value="${g.code}" ${g.code === _t.grilleCode ? 'selected' : ''}>${g.code} — ${Utils.esc(g.libelle)}</option>`).join('')}</select></div>
          <div class="form-field"><label class="check-row"><input type="checkbox" id="f-depenf" ${_t.dependEnfants ? 'checked' : ''}> Dépend du nombre d'enfants (dégressivité)</label></div>

          <div class="form-field full"><label>Formule personnalisée (optionnel)</label>
            <input class="input" id="f-formule" value="${Utils.esc(_t.formule || '')}" placeholder="ex. valeur * (1 + qf/10000)">
            <div class="hint">Variables : <code>valeur</code>, <code>qf</code>, <code>revenu</code>, <code>nbEnfants</code>, <code>heures</code>, <code>unites</code>, <code>ressources</code>.</div></div>
        </div>
        <div class="banner info" style="margin-top:8px"><span class="material-icons-outlined">info</span><span>La période de validité est <b>obligatoire</b> ; il n'y a pas de notion d'année. Les tranches de quotient proviennent de la grille choisie (onglet « Grille de prix »).</span></div>
      </div>`;
  }

  function _bindGeneral() {
    const v = (id) => Utils.qs('#' + id);
    v('f-nom').oninput = e => _t.nom = e.target.value;
    v('f-sigle').oninput = e => _t.sigle = e.target.value;
    v('f-desc').oninput = e => _t.description = e.target.value;
    v('f-mode').onchange = e => { _t.modeCalcul = e.target.value;
      v('f-arrondi-wrap').style.display = e.target.value === 'HORAIRE' ? '' : 'none';
      v('f-minmin-wrap').style.display = e.target.value === 'HORAIRE' ? '' : 'none';
      v('f-unite-wrap').style.display = e.target.value === 'UNITAIRE' ? '' : 'none'; };
    v('f-unite').oninput = e => _t.uniteLabel = e.target.value;
    v('f-arrondi').onchange = e => _t.regleArrondi = e.target.value;
    v('f-minmin').oninput = e => _t.minutesMin = e.target.value === '' ? null : +e.target.value;
    v('f-typeval').onchange = e => _t.typeValeur = e.target.value;
    v('f-min').oninput = e => _t.min = e.target.value === '' ? null : +e.target.value;
    v('f-max').oninput = e => _t.max = e.target.value === '' ? null : +e.target.value;
    v('f-deb').onchange = e => _t.validite.debut = e.target.value;
    v('f-fin').onchange = e => _t.validite.fin = e.target.value;
    v('f-actif').onchange = e => _t.actif = e.target.checked;
    v('f-depqf').onchange = e => { _t.dependQF = e.target.checked; v('f-grille-wrap').style.display = e.target.checked ? '' : 'none'; };
    v('f-grille').onchange = e => _t.grilleCode = e.target.value;
    v('f-depenf').onchange = e => { _t.dependEnfants = e.target.checked; if (e.target.checked && !_t.degressivites.length) _t.degressivites = [{ ordre: 1, label: 'Tous', borneInf: 1, borneSup: 99 }]; };
    v('f-formule').oninput = e => _t.formule = e.target.value.trim() || null;
  }

  /* ───────── CRITÈRES DE CHOIX AUTOMATIQUE ───────── */
  function _criteres() {
    const sel = (id, list, cur) => `<select class="input" id="${id}">${list.map(o => `<option ${o === cur ? 'selected' : ''}>${o}</option>`).join('')}</select>`;
    return `
      <div class="bloc">
        <div class="banner info"><span class="material-icons-outlined">rule</span><span>Le tarif applicable à une famille est choisi <b>automatiquement</b> selon ces trois critères. « Tous »/« Toutes » = pas de restriction.</span></div>
        <div class="form-grid" style="margin-top:12px">
          <div class="form-field"><label>Localisation communale</label>${sel('c-commune', TarifData.communes, _t.criteres.commune)}</div>
          <div class="form-field"><label>Type de famille</label>${sel('c-fam', TarifData.typesFamille, _t.criteres.typeFamille)}</div>
          <div class="form-field"><label>Type d'individu</label>${sel('c-ind', TarifData.typesIndividu, _t.criteres.typeIndividu)}</div>
        </div>
      </div>`;
  }
  function _bindCriteres() {
    Utils.qs('#c-commune').onchange = e => _t.criteres.commune = e.target.value;
    Utils.qs('#c-fam').onchange = e => _t.criteres.typeFamille = e.target.value;
    Utils.qs('#c-ind').onchange = e => _t.criteres.typeIndividu = e.target.value;
  }

  /* ───────── ÉDITEUR DE GRILLE ───────── */
  function _trancheList() {
    if (!_t.dependQF) return [{ key: '_', label: 'Tarif unique' }];
    const g = Data.grille(_t.grilleCode);
    if (!g) return [{ key: '_', label: 'Tarif unique' }];
    return [...g.tranches].sort((a, b) => a.ordre - b.ordre).map(t => ({ key: t.ordre, label: `${t.libelle} [${t.borneInf} → ${t.borneSup}]` }));
  }
  function _colList() {
    if (!_t.dependEnfants || !_t.degressivites.length) return [{ key: '_', label: '—' }];
    return [..._t.degressivites].sort((a, b) => a.ordre - b.ordre).map(d => ({ key: d.ordre, label: d.label }));
  }

  function _grille(c) {
    const lignes = _trancheList(), cols = _colList();
    const unitSuffix = _t.typeValeur === 'TAUX' ? '%' : '€';
    const g = _t.dependQF ? Data.grille(_t.grilleCode) : null;
    c.innerHTML = `
      <div class="bloc">
        <div class="flex-between" style="margin-bottom:10px">
          <div class="bloc-title">Grille de ${_t.typeValeur === 'TAUX' ? 'taux d\'effort (%)' : 'prix (€)'}</div>
          ${_t.dependEnfants ? `<button class="btn btn-sm btn-ghost" onclick="TarifFichePage.addCol()"><span class="material-icons-outlined">add</span>Ajouter une colonne (enfants)</button>` : ''}
        </div>
        ${_t.dependQF
          ? `<div class="banner info"><span class="material-icons-outlined">calculate</span><span>Lignes = tranches de la grille <b>${g ? g.code + ' — ' + Utils.esc(g.libelle) : '—'}</b> (paramétrée dans « Grilles de quotients/revenus »).</span></div>`
          : `<div class="banner info"><span class="material-icons-outlined">info</span><span>Tarif sans dépendance au quotient : une seule ligne.</span></div>`}
        <table class="data-table" style="margin-top:10px">
          <thead><tr><th>Tranche \\ ${_t.dependEnfants ? 'Nb enfants' : 'Valeur'}</th>
            ${cols.map(col => `<th style="text-align:center">${col.label}${_t.dependEnfants ? ` <button class="icon-btn" title="Supprimer" onclick="TarifFichePage.delCol('${col.key}')"><span class="material-icons-outlined" style="font-size:15px">close</span></button>` : ''}</th>`).join('')}
          </tr></thead>
          <tbody>
            ${lignes.map(l => `<tr><td class="strong">${l.label}</td>
              ${cols.map(col => {
                const val = (_t.valeurs[l.key] || {})[col.key];
                return `<td style="text-align:center"><input class="input cell" style="max-width:90px;text-align:right" type="number" step="0.01" data-l="${l.key}" data-c="${col.key}" value="${val ?? ''}"> ${unitSuffix}</td>`;
              }).join('')}
            </tr>`).join('')}
          </tbody>
        </table>
        <div class="hint" style="margin-top:8px">Toutes les cases doivent être remplies pour enregistrer. ${_t.typeValeur === 'TAUX' ? 'Saisir le pourcentage (ex. 6 pour 6 %).' : ''}</div>
      </div>`;

    Utils.qsa('.cell', c).forEach(inp => inp.oninput = e => {
      const l = e.target.dataset.l, col = e.target.dataset.c;
      _t.valeurs[l] = _t.valeurs[l] || {};
      if (e.target.value === '') delete _t.valeurs[l][col];
      else _t.valeurs[l][col] = _t.typeValeur === 'TAUX' ? (+e.target.value) / 100 : +e.target.value;
    });
    // display TAUX as percentage
    if (_t.typeValeur === 'TAUX') Utils.qsa('.cell', c).forEach(inp => { if (inp.value !== '') inp.value = (+inp.value * 100); });
  }

  function addCol() {
    Drawer.open({ title: 'Ajouter une colonne (nb enfants)', icon: 'add',
      body: `<div class="form-grid">
        <div class="form-field full"><label>Libellé</label><input class="input" id="col-lbl" placeholder="ex. 2 enfants"></div>
        <div class="form-field"><label>De</label><input class="input" type="number" id="col-inf" value="1"></div>
        <div class="form-field"><label>À</label><input class="input" type="number" id="col-sup" value="1"></div>
      </div>`,
      footer: `<button class="btn btn-ghost" onclick="Drawer.close()">Annuler</button><button class="btn btn-primary" onclick="TarifFichePage.doAddCol()">Ajouter</button>` });
  }
  function doAddCol() {
    const lbl = Utils.qs('#col-lbl').value.trim(), inf = +Utils.qs('#col-inf').value, sup = +Utils.qs('#col-sup').value;
    if (!lbl) { Utils.toast('Libellé requis', 'error'); return; }
    if (sup < inf) { Utils.toast('Borne incohérente', 'error'); return; }
    const ordre = Math.max(0, ..._t.degressivites.map(d => d.ordre)) + 1;
    _t.degressivites.push({ ordre, label: lbl, borneInf: inf, borneSup: sup });
    Drawer.close(); _grille(Utils.qs('#fiche-content'));
  }
  function delCol(key) {
    _t.degressivites = _t.degressivites.filter(d => String(d.ordre) !== String(key));
    Object.values(_t.valeurs).forEach(row => delete row[key]);
    _grille(Utils.qs('#fiche-content'));
  }

  /* ───────── PRESTATIONS ───────── */
  function _prestations(c) {
    const attached = _t.prestations.map(id => Data.prestation(id)).filter(Boolean);
    const free = TarifData.prestations.filter(p => !_t.prestations.includes(p.id));
    c.innerHTML = `
      <div class="bloc">
        <div class="bloc-title" style="margin-bottom:10px">Prestations rattachées (${attached.length})</div>
        ${attached.length ? `<table class="data-table"><tbody>
          ${attached.map(p => `<tr><td class="strong">${Utils.esc(p.nom)}</td><td style="text-align:right"><button class="btn btn-sm btn-ghost" onclick="TarifFichePage.unlink(${p.id})"><span class="material-icons-outlined">link_off</span>Retirer</button></td></tr>`).join('')}
        </tbody></table>` : `<div class="text-muted" style="padding:8px 0">Aucune prestation rattachée.</div>`}
        <div class="flex-row" style="margin-top:14px;gap:8px">
          <select class="input" id="p-add" style="max-width:320px"><option value="">Choisir une prestation…</option>${free.map(p => `<option value="${p.id}">${Utils.esc(p.nom)}</option>`).join('')}</select>
          <button class="btn btn-primary btn-sm" onclick="TarifFichePage.link()"><span class="material-icons-outlined">add_link</span>Rattacher</button>
        </div>
      </div>`;
  }
  function link() {
    const id = +Utils.qs('#p-add').value; if (!id) return;
    if (!_t.prestations.includes(id)) _t.prestations.push(id);
    _prestations(Utils.qs('#fiche-content'));
  }
  function unlink(id) { _t.prestations = _t.prestations.filter(x => x !== id); _prestations(Utils.qs('#fiche-content')); }

  /* ───────── SAVE ───────── */
  function save() {
    if (!_t.nom.trim()) { Utils.toast('Le nom est obligatoire', 'error'); tab('general'); return; }
    if (!_t.sigle.trim()) { Utils.toast('Le sigle est obligatoire', 'error'); tab('general'); return; }
    if (!_t.validite.debut || !_t.validite.fin) { Utils.toast('La période de validité est obligatoire', 'error'); tab('general'); return; }
    if (_t.validite.fin < _t.validite.debut) { Utils.toast('La date de fin doit suivre la date de début', 'error'); tab('general'); return; }
    // Completeness of the grid
    const lignes = _trancheList(), cols = _colList(), missing = [];
    lignes.forEach(l => cols.forEach(col => { if ((_t.valeurs[l.key] || {})[col.key] == null) missing.push(`${l.label} × ${col.label}`); }));
    if (missing.length) { Utils.toast(`Grille incomplète : ${missing.length} case(s) vide(s)`, 'error'); tab('grille'); return; }

    const idx = TarifData.tarifs.findIndex(t => t.id === _t.id);
    if (idx >= 0) TarifData.tarifs[idx] = _t; else TarifData.tarifs.push(_t);
    Utils.toast(_isNew ? 'Tarif créé' : 'Tarif enregistré', 'success');
    Router.go('/tarifs');
  }

  return { render, tab, save, addCol, doAddCol, delCol, link, unlink };
})();
window.TarifFichePage = TarifFichePage;
