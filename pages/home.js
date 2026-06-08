/* ═══════════════════════════════════════════════════════════════
   HOME — Accueil « Paramétrage des tarifs »
   ═══════════════════════════════════════════════════════════════ */
const HomePage = (() => {

  const MODULES = [
    { icon: 'price_change', title: 'Tarifs', route: '/tarifs',
      desc: 'Créer et entretenir les tarifs : mode de calcul, grille de prix ou de taux d\'effort, critères de choix automatique, prestations rattachées.' },
    { icon: 'calculate', title: 'Grilles de quotients/revenus', route: '/quotients',
      desc: 'Grilles paramétrables (tranches de quotient familial ou de revenus) avec période de validité obligatoire.' },
    { icon: 'science', title: 'Simulation', route: '/simulation',
      desc: 'Tester un tarif pour une situation donnée (quotient, nombre d\'enfants, durée…) et voir le prix calculé.' },
  ];

  const PRINCIPES = [
    ['event_available', 'Période de validité obligatoire', 'Les tarifs et les grilles sont gérés par période de validité — pas par année.'],
    ['rule', 'Choix automatique', 'Le tarif est sélectionné selon la commune, le type de famille et le type d\'individu.'],
    ['percent', 'Prix ou taux d\'effort', 'Grille de prix en € ou grille de taux d\'effort en pourcentage (pas de taux pour mille).'],
    ['functions', 'Formule personnalisée', 'Possibilité de paramétrer un tarif via une formule de calcul personnalisée.'],
    ['vertical_align_top', 'Pas de quotient → tarif maximum', 'En l\'absence de quotient/revenu, le tarif maximum est appliqué.'],
  ];

  function render(el) {
    el.innerHTML = `
      <div class="params-shell">
        <div class="params-header">
          <div class="params-header-icon"><span class="material-icons-outlined">sell</span></div>
          <div>
            <h1>Paramétrage des tarifs</h1>
            <div class="subtitle">Maquette interactive — conforme aux remarques client</div>
          </div>
        </div>

        <div class="banner info">
          <span class="material-icons-outlined">info</span>
          <span>Prototype cliquable à données fictives. L'éditeur de grille et la simulation calculent réellement le prix. Aucune donnée n'est enregistrée durablement.</span>
        </div>

        <h2 class="home-sec">Écrans</h2>
        <div class="entry-grid">
          ${MODULES.map(m => `
            <div class="entry-card" onclick="Router.go('${m.route}')">
              <div class="entry-badge ready">Disponible</div>
              <div class="entry-icon"><span class="material-icons-outlined">${m.icon}</span></div>
              <div class="entry-title">${m.title}</div>
              <div class="entry-sub">${m.desc}</div>
            </div>`).join('')}
        </div>

        <h2 class="home-sec">Principes retenus</h2>
        <div class="entry-grid">
          ${PRINCIPES.map(([ic, t, d]) => `
            <div class="entry-card" style="cursor:default">
              <div class="entry-icon"><span class="material-icons-outlined">${ic}</span></div>
              <div class="entry-title">${t}</div>
              <div class="entry-sub">${d}</div>
            </div>`).join('')}
        </div>
      </div>
      <style>
        .home-sec{font-size:13px;font-weight:600;color:var(--c-text-3);text-transform:uppercase;letter-spacing:.04em;margin:24px 0 10px;}
      </style>`;
  }
  return { render };
})();
window.HomePage = HomePage;
