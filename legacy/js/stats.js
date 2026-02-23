/**************************************************************
 * stats.js
 * Gère l'affichage des 6 visualisations distinctes + onglets
 **************************************************************/
import { loadBikesData } from './data.js';

let globalBikes = [];
let globalStationsProches = [];

/**
 * Appelé au démarrage (main.js).
 */
export async function initStats() {
  globalBikes = await loadBikesData();
}

/**
 * Stats globales => On affiche 3 onglets (Barres, Ligne, Empilé).
 */
export function updateGlobalStats(stationsProches, filters) {
  globalStationsProches = stationsProches;
  const stationIds = stationsProches.map(s => s.id_velov);

  // Filtrage
  const filtered = applyFilters(globalBikes, filters)
    .filter(d => stationIds.includes(d.id_velov));

  // Vider container
  const container = document.getElementById('charts-section');
  container.innerHTML = '';

  // Créer un conteneur pour nos "onglets"
  const tabsContainer = document.createElement('div');
  tabsContainer.classList.add('tabs-container', 'mb-4');
  container.appendChild(tabsContainer);

  // Créer un conteneur pour le contenu de l’onglet actif
  const tabContent = document.createElement('div');
  tabContent.classList.add('tab-content', 'flex');
  container.appendChild(tabContent);

  // Onglets (3)
  const tabs = [
    { id: 'tab-global-bar', label: 'Barres (Heure)', render: () => displayBarChart(filtered, tabContent) },
    { id: 'tab-global-line', label: 'Évolution Journalière', render: () => displayLineChart(filtered, tabContent) },
    { id: 'tab-global-stacked', label: 'Arr/Dep Empilé', render: () => displayStackedChart(filtered, tabContent) },
  ];
  buildTabsUI(tabsContainer, tabContent, tabs);
}

/**
 * Stats station => On affiche 3 onglets (Line Journalière, Scatter, Heatmap).
 */
export function updateStationStats(station, filters) {
  // On ne garde que la station en question
  const filtered = applyFilters(globalBikes, filters)
    .filter(d => d.id_velov === station.id_velov);

  // Vider container
  const container = document.getElementById('charts-section');
  container.innerHTML = '';

  // Conteneur onglets
  const tabsContainer = document.createElement('div');
  tabsContainer.classList.add('tabs-container', 'mb-4');
  container.appendChild(tabsContainer);

  // Conteneur contenu
  const tabContent = document.createElement('div');
  tabContent.classList.add('tab-content', 'flex');
  container.appendChild(tabContent);

  const tabs = [
    { id: 'tab-station-line', label: 'Ligne Journalière', render: () => displayStationLine(filtered, tabContent) },
    { id: 'tab-station-scatter', label: 'Nuage de points', render: () => displayScatterPlot(filtered, tabContent) },
    { id: 'tab-station-heatmap', label: 'Carte de chaleur', render: () => displayHeatmap(filtered, tabContent) },
  ];
  buildTabsUI(tabsContainer, tabContent, tabs);
}

/**
 * Petite fonction pour revenir aux stats globales
 */
export function backToCampusStats(filters) {
  updateGlobalStats(globalStationsProches, filters);
}

/**
 * Appliquer les filtres date/heure
 */
function applyFilters(allData, filters) {
  const { startDate, endDate, startHour, endHour } = filters;
  return allData.filter(d => {
    const dateObj = new Date(d.year, d.month - 1, d.day);
    let okDate = true;
    if (startDate) okDate = okDate && (dateObj >= startDate);
    if (endDate) okDate = okDate && (dateObj <= endDate);
    let okHour = true;
    if (startHour !== null) okHour = okHour && (d.hour >= startHour);
    if (endHour !== null) okHour = okHour && (d.hour <= endHour);
    return okDate && okHour;
  });
}

/*************************************************************
 * Gestion "onglets" : on reconstruit le contenu dynamiquement
 *************************************************************/
function buildTabsUI(tabsContainer, tabContent, tabs) {
  // On crée un bouton par onglet
  tabs.forEach((tab, idx) => {
    const btn = document.createElement('button');
    btn.textContent = tab.label;
    btn.classList.add('tab-btn', 'px-3', 'py-1', 'border', 'rounded', 'mr-2', 'text-sm');
    if (idx === 0) {
      // premier onglet actif
      btn.classList.add('bg-blue-600', 'text-white');
    } else {
      btn.classList.add('bg-gray-100', 'text-gray-700');
    }
    tabsContainer.appendChild(btn);

    // Au clic, on "active" cet onglet
    btn.addEventListener('click', () => {
      // reset
      tabsContainer.querySelectorAll('button').forEach(b => {
        b.classList.remove('bg-blue-600', 'text-white');
        b.classList.add('bg-gray-100', 'text-gray-700');
      });
      // Activer le btn
      btn.classList.remove('bg-gray-100', 'text-gray-700');
      btn.classList.add('bg-blue-600', 'text-white');
      // Vider le conteneur
      tabContent.innerHTML = '';
      // Re-render
      tab.render();
    });

    // Le premier onglet est affiché par défaut
    if (idx === 0) {
      tab.render();
    }
  });
}

/***********************************************************************
 *    3 Graphiques pour "Stats Globales"
 ***********************************************************************/

/** 1) Barres : moyenne de vélos par heure */
function displayBarChart(data, container) {
  // Regroupement par heure => moyenne
  const agg = {};
  data.forEach(d => {
    if (!agg[d.hour]) agg[d.hour] = { total: 0, count: 0 };
    agg[d.hour].total += d.bikes;
    agg[d.hour].count++;
  });
  const chartData = Object.keys(agg).map(h => ({
    hour: +h,
    avgBikes: agg[h].total / agg[h].count
  })).sort((a, b) => a.hour - b.hour);

  // Dimensions dynamiques en fonction du conteneur
  const containerWidth = container.clientWidth || 300;
  const margin = { top: 20, right: 20, bottom: 40, left: 40 };
  const width = containerWidth - margin.left - margin.right;
  const height = 200;

  const svg = d3.select(container)
    .append('svg')
    .attr('width', width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom)
    .append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);

  // Échelles
  const x = d3.scaleBand()
    .domain(chartData.map(d => d.hour))
    .range([0, width])
    .padding(0.2);
  const y = d3.scaleLinear()
    .domain([0, d3.max(chartData, d => d.avgBikes) || 0])
    .range([height, 0]);

  // Axes
  svg.append('g')
    .attr('transform', `translate(0, ${height})`)
    .call(d3.axisBottom(x).ticks(24));
  svg.append('g')
    .call(d3.axisLeft(y));

  // Barres animées
  const bars = svg.selectAll('.bar')
    .data(chartData)
    .enter()
    .append('rect')
    .attr('class', 'bar')
    .attr('x', d => x(d.hour))
    .attr('y', height) // départ de bas
    .attr('width', x.bandwidth())
    .attr('height', 0)
    .attr('fill', '#3498db');

  bars.transition()
    .duration(800)
    .delay((d, i) => i * 50)
    .attr('y', d => y(d.avgBikes))
    .attr('height', d => height - y(d.avgBikes))
    .attr('fill', '#3498db');

  // Titre
  svg.append('text')
    .attr('x', width / 2)
    .attr('y', -5)
    .attr('text-anchor', 'middle')
    .style('font-size', '12px')
    // .text('Moyenne de vélos par heure');
    .text('Moyenne de vélos disponibles par heure');
  
  // Label de l'axe X
  svg.append('text')
    .attr('x', width / 2)
    .attr('y', height + margin.bottom - 5)
    .attr('text-anchor', 'middle')
    .style('font-size', '10px')
    .text('Heure de la journée');

  // Label de l'axe Y
  svg.append('text')
    .attr('transform', 'rotate(-90)')
    .attr('x', -height / 2)
    .attr('y', -margin.left + 15)
    .attr('text-anchor', 'middle')
    .style('font-size', '10px')
    .text('Nombre moyen de vélos');
}

/** 2) Ligne : évolution journalière (moyenne de vélos par jour) */
function displayLineChart(data, container) {
  // Agrégation par date avec moyenne
  const agg = {};
  data.forEach(d => {
    const dateKey = `${d.year}-${d.month}-${d.day}`;
    if (!agg[dateKey]) agg[dateKey] = { total: 0, count: 0 };
    agg[dateKey].total += d.bikes;
    agg[dateKey].count++;
  });
  const chartData = Object.keys(agg).map(k => ({
    date: k,
    avgBikes: agg[k].total / agg[k].count
  })).sort((a, b) => new Date(a.date) - new Date(b.date));

  // Dimensions dynamiques
  const containerWidth = container.clientWidth || 600;
  const margin = { top: 20, right: 20, bottom: 80, left: 50 };
  const width = containerWidth - margin.left - margin.right;
  const height = 300;

  const svg = d3.select(container)
    .append('svg')
    .attr('width', width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom)
    .append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);

  // Échelles
  const x = d3.scaleBand()
    .domain(chartData.map(d => d.date))
    .range([0, width])
    .padding(0.1);
  const y = d3.scaleLinear()
    .domain([0, d3.max(chartData, d => d.avgBikes) || 0])
    .range([height, 0]);

  // Axe X avec ticks espacés
  const xAxis = d3.axisBottom(x)
    .tickValues(chartData.map((d, i) => i % Math.ceil(chartData.length / 10) === 0 ? d.date : null).filter(Boolean))
    .tickFormat(d => {
      const [year, month, day] = d.split('-');
      return `${day}/${month}/${year}`;
    });

  svg.append('g')
    .attr('transform', `translate(0,${height})`)
    .call(xAxis)
    .selectAll("text")
    .attr("transform", "rotate(-45)")
    .style("text-anchor", "end");

  // Axe Y
  svg.append('g')
    .call(d3.axisLeft(y));

  // Ligne avec animation
  const lineGen = d3.line()
    .x(d => x(d.date) + x.bandwidth() / 2)
    .y(d => y(d.avgBikes));

  const path = svg.append('path')
    .datum(chartData)
    .attr('fill', 'none')
    .attr('stroke', '#e74c3c')
    .attr('stroke-width', 2)
    .attr('d', lineGen);

  const totalLength = path.node().getTotalLength();
  path
    .attr('stroke-dasharray', totalLength + ' ' + totalLength)
    .attr('stroke-dashoffset', totalLength)
    .transition()
    .duration(1000)
    .ease(d3.easeLinear)
    .attr('stroke-dashoffset', 0);

  // Titre
  svg.append('text')
    .attr('x', width / 2)
    .attr('y', -5)
    .attr('text-anchor', 'middle')
    .style('font-size', '14px')
    // .text('Évolution journalière (moyenne de vélos)');
    .text('Évolution journalière du nombre moyen de vélos disponibles');
  
  // Label de l'axe X
svg.append('text')
  .attr('x', width / 2)
  .attr('y', height + margin.bottom - 5)
  .attr('text-anchor', 'middle')
  .style('font-size', '10px')
  .text('Date');

// Label de l'axe Y
svg.append('text')
  .attr('transform', 'rotate(-90)')
  .attr('x', -height / 2)
  .attr('y', -margin.left + 15)
  .attr('text-anchor', 'middle')
  .style('font-size', '10px')
  .text('Nombre moyen de vélos');
}

/** 3) Graphique empilé : Arrivées vs Départs par heure */
function displayStackedChart(data, container) {
  const agg = {};
  const days = new Set();
  data.forEach(d => {
    const dayKey = `${d.year}-${d.month}-${d.day}`;
    days.add(dayKey);
    if (!agg[d.hour]) agg[d.hour] = { arr: 0, dep: 0 };
    agg[d.hour].arr += d.arrival30min;
    agg[d.hour].dep += d.departure30min;
  });
  const totalDays = days.size;
  const chartData = Object.keys(agg).map(h => ({
    hour: +h,
    arr: agg[h].arr / totalDays,
    dep: agg[h].dep / totalDays
  })).sort((a, b) => a.hour - b.hour);

  // Dimensions dynamiques
  const containerWidth = container.clientWidth || 500;
  const margin = { top: 20, right: 20, bottom: 40, left: 50 };
  const width = containerWidth - margin.left - margin.right;
  const height = 300;

  const svg = d3.select(container)
    .append('svg')
    .attr('width', width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom)
    .append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);

  // Échelles
  const x = d3.scaleLinear()
    .domain([0, 23])
    .range([0, width]);
  const y = d3.scaleLinear()
    .domain([0, d3.max(chartData, d => Math.max(d.arr, d.dep)) || 0])
    .range([height, 0]);

  // Axes
  svg.append('g')
    .attr('transform', `translate(0,${height})`)
    .call(d3.axisBottom(x).ticks(24).tickFormat(d => `${d}h`));
  svg.append('g')
    .call(d3.axisLeft(y));

  // Ligne pour les arrivées
  const lineArr = d3.line()
    .x(d => x(d.hour))
    .y(d => y(d.arr));
  svg.append('path')
    .datum(chartData)
    .attr('fill', 'none')
    .attr('stroke', '#27ae60')
    .attr('stroke-width', 2)
    .attr('d', lineArr);

  // Ligne pour les départs
  const lineDep = d3.line()
    .x(d => x(d.hour))
    .y(d => y(d.dep));
  svg.append('path')
    .datum(chartData)
    .attr('fill', 'none')
    .attr('stroke', '#e74c3c')
    .attr('stroke-width', 2)
    .attr('d', lineDep);

  // Légende
  const legend = svg.append('g')
    .attr('transform', `translate(${width - 150}, ${20})`);
  legend.append('rect').attr('x', 0).attr('y', 0).attr('width', 10).attr('height', 10).attr('fill', '#27ae60');
  legend.append('text').attr('x', 15).attr('y', 10).text('Arrivées moyennes').style('font-size', '12px').attr('alignment-baseline', 'middle');
  legend.append('rect').attr('x', 0).attr('y', 20).attr('width', 10).attr('height', 10).attr('fill', '#e74c3c');
  legend.append('text').attr('x', 15).attr('y', 30).text('Départs moyens').style('font-size', '12px').attr('alignment-baseline', 'middle');

  // Titre
  svg.append('text')
    .attr('x', width / 2)
    .attr('y', -10)
    .attr('text-anchor', 'middle')
    .style('font-size', '14px')
    .text('Moyenne des arrivées vs départs par heure');
  
  // Label de l'axe X
  svg.append('text')
    .attr('x', width / 2)
    .attr('y', height + margin.bottom - 5)
    .attr('text-anchor', 'middle')
    .style('font-size', '10px')
    .text('Heure de la journée');

  // Label de l'axe Y
  svg.append('text')
    .attr('transform', 'rotate(-90)')
    .attr('x', -height / 2)
    .attr('y', -margin.left + 15)
    .attr('text-anchor', 'middle')
    .style('font-size', '10px')
    .text('Nombre moyen de vélos');
}

/***********************************************************************
 *    3 Graphiques pour "Stats Station"
 ***********************************************************************/

/** 1) Graphique linéaire journalier pour 1 station */
function displayStationLine(data, container) {
  const agg = {};
  data.forEach(d => {
    const dateKey = `${d.year}-${d.month}-${d.day}`;
    if (!agg[dateKey]) agg[dateKey] = { total: 0, count: 0 };
    agg[dateKey].total += d.bikes;
    agg[dateKey].count++;
  });
  const chartData = Object.keys(agg).map(k => ({
    date: k,
    avgBikes: agg[k].total / agg[k].count
  })).sort((a, b) => new Date(a.date) - new Date(b.date));

  const containerWidth = container.clientWidth || 600;
  const margin = { top: 20, right: 20, bottom: 80, left: 50 };
  const width = containerWidth - margin.left - margin.right;
  const height = 300;

  const svg = d3.select(container)
    .append('svg')
    .attr('width', width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom)
    .append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);

  const x = d3.scaleBand()
    .domain(chartData.map(d => d.date))
    .range([0, width])
    .padding(0.1);
  const y = d3.scaleLinear()
    .domain([0, d3.max(chartData, d => d.avgBikes) || 0])
    .range([height, 0]);

  const xAxis = d3.axisBottom(x)
    .tickValues(chartData.map((d, i) => i % Math.ceil(chartData.length / 10) === 0 ? d.date : null).filter(Boolean))
    .tickFormat(d => {
      const [year, month, day] = d.split('-');
      return `${day}/${month}/${year}`;
    });

  svg.append('g')
    .attr('transform', `translate(0,${height})`)
    .call(xAxis)
    .selectAll("text")
    .attr("transform", "rotate(-45)")
    .style("text-anchor", "end");

  svg.append('g')
    .call(d3.axisLeft(y));

  const lineGen = d3.line()
    .x(d => x(d.date) + x.bandwidth() / 2)
    .y(d => y(d.avgBikes));

  const path = svg.append('path')
    .datum(chartData)
    .attr('fill', 'none')
    .attr('stroke', '#3498db')
    .attr('stroke-width', 2)
    .attr('d', lineGen);

  const totalLength = path.node().getTotalLength();
  path
    .attr('stroke-dasharray', totalLength + ' ' + totalLength)
    .attr('stroke-dashoffset', totalLength)
    .transition()
    .duration(1000)
    .ease(d3.easeLinear)
    .attr('stroke-dashoffset', 0);

  svg.append('text')
    .attr('x', width / 2)
    .attr('y', -10)
    .attr('text-anchor', 'middle')
    .style('font-size', '14px')
    .text('Évolution journalière du nombre de vélos disponibles dans la station');
  
  // Label de l'axe X
  svg.append('text')
    .attr('x', width / 2)
    .attr('y', height + margin.bottom - 5)
    .attr('text-anchor', 'middle')
    .style('font-size', '10px')
    .text('Date');

  // Label de l'axe Y
  svg.append('text')
    .attr('transform', 'rotate(-90)')
    .attr('x', -height / 2)
    .attr('y', -margin.left + 15)
    .attr('text-anchor', 'middle')
    .style('font-size', '10px')
    .text('Nombre moyen de vélos');
}

/** 2) Scatter : Nuage de points (heure vs vélos) */
function displayScatterPlot(data, container) {
  const containerWidth = container.clientWidth || 300;
  const margin = { top: 20, right: 20, bottom: 40, left: 40 };
  const width = containerWidth - margin.left - margin.right;
  const height = 200;

  const svg = d3.select(container)
    .append('svg')
    .attr('width', width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom)
    .append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);

  const x = d3.scaleLinear().domain([0, 23]).range([0, width]);
  const maxBikes = d3.max(data, d => d.bikes) || 10;
  const y = d3.scaleLinear().domain([0, maxBikes]).range([height, 0]);

  svg.append('g')
    .attr('transform', `translate(0,${height})`)
    .call(d3.axisBottom(x).ticks(24));
  svg.append('g')
    .call(d3.axisLeft(y));

  const circles = svg.selectAll('circle')
    .data(data)
    .enter()
    .append('circle')
    .attr('cx', d => x(d.hour))
    .attr('cy', d => y(d.bikes))
    .attr('r', 0)
    .attr('fill', '#2ecc71')
    .attr('opacity', 0);

  circles.transition()
    .duration(1000)
    .delay((d, i) => i * 2)
    .attr('r', 3)
    .attr('opacity', 0.6);

  svg.append('text')
    .attr('x', width / 2)
    .attr('y', -5)
    .attr('text-anchor', 'middle')
    .style('font-size', '12px')
    .text("Variation du nombre de vélos en fonction de l'heure");
    
    // Label de l'axe X
  svg.append('text')
    .attr('x', width / 2)
    .attr('y', height + margin.bottom - 5)
    .attr('text-anchor', 'middle')
    .style('font-size', '10px')
    .text('Heure de la journée');

// Label de l'axe Y
  svg.append('text')
    .attr('transform', 'rotate(-90)')
    .attr('x', -height / 2)
    .attr('y', -margin.left + 15)
    .attr('text-anchor', 'middle')
    .style('font-size', '10px')
    .text('Nombre de vélos');
}

/** 3) Carte de chaleur : jour vs heure */
function displayHeatmap(data, container) {
  const map = {};
  data.forEach(d => {
    const key = `${d.day}-${d.hour}`;
    if (!map[key]) map[key] = { total: 0, count: 0 };
    map[key].total += d.bikes;
    map[key].count++;
  });
  const days = [...new Set(data.map(d => d.day))].sort((a, b) => a - b);
  const chartData = [];
  days.forEach(day => {
    for (let h = 0; h < 24; h++) {
      const key = `${day}-${h}`;
      let val = 0;
      if (map[key]) val = map[key].total / map[key].count;
      chartData.push({ day, hour: h, val });
    }
  });

  const cellSize = 12;
  const margin = { top: 20, right: 20, bottom: 40, left: 40 };
  const width = 24 * cellSize;
  const height = days.length * cellSize;

  const svg = d3.select(container)
    .append('svg')
    .attr('width', width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom)
    .append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);

  const x = d3.scaleBand().domain(d3.range(24)).range([0, width]);
  const y = d3.scaleBand().domain(days).range([0, height]);

  const maxVal = d3.max(chartData, d => d.val) || 10;
  const colorScale = d3.scaleSequential(d3.interpolateOrRd).domain([0, maxVal]);

  const rects = svg.selectAll('rect')
    .data(chartData)
    .enter()
    .append('rect')
    .attr('x', d => x(d.hour))
    .attr('y', d => y(d.day))
    .attr('width', x.bandwidth())
    .attr('height', y.bandwidth())
    .attr('fill', '#fff');

  rects.transition().duration(1000)
    .attr('fill', d => colorScale(d.val));

  svg.append('g')
    .attr('transform', `translate(0,${height})`)
    .call(d3.axisBottom(x).tickValues([0, 6, 12, 18, 23]));

  svg.append('g').call(d3.axisLeft(y));

  svg.append('text')
    .attr('x', width / 2)
    .attr('y', -5)
    .attr('text-anchor', 'middle')
    .style('font-size', '12px')
    .text('Disponibilité des vélos par jour et par heure dans la station');
  
  // Label de l'axe X
  svg.append('text')
    .attr('x', width / 2)
    .attr('y', height + margin.bottom - 5)
    .attr('text-anchor', 'middle')
    .style('font-size', '10px')
    .text('Heure de la journée');

// Label de l'axe Y
  svg.append('text')
    .attr('transform', 'rotate(-90)')
    .attr('x', -height / 2)
    .attr('y', -margin.left + 15)
    .attr('text-anchor', 'middle')
    .style('font-size', '10px')
    .text('Jour du mois');
}
