/**************************************************************
 * main.js
 * Logique de navigation + chargement des données + stats
 **************************************************************/
import { initCompassMap, initExplorerMap } from './map.js';
import {
  loadEtablissementsData,
  loadStationsData,
  loadBikesData,
  distance,
  getDynamicRadius,
  getCircleColorByDistance
} from './data.js';
import {
  initStats,
  updateGlobalStats,
  updateStationStats,
  backToCampusStats
} from './stats.js';

document.addEventListener('DOMContentLoaded', async () => {
  const viewMapCompass = document.getElementById('view-map-compass');
  const viewExplorer = document.getElementById('view-explorer');
  const goToExplorerBtn = document.getElementById('go-to-explorer');
  const backToMapBtn = document.getElementById('back-to-map');
  const backCampusBtn = document.getElementById('back-campus-btn');

  const etabSelect = document.getElementById('etab-select');
  const selectedEtabNameElem = document.getElementById('selected-etab-name');

  const distanceSlider = document.getElementById('distance-threshold');
  const distanceValue = document.getElementById('distance-value');
  const applyFiltersBtn = document.getElementById('apply-filters');
  const summaryTotalStations = document.getElementById('summary-total-stations');
  const summaryNearbyStations = document.getElementById('summary-nearby-stations');

  let etablissementsData = null;
  let stationsData = null;
  let globalBikes = null;
  let currentlySelectedEtab = null;
  const stationCircles = {}; // stocker la référence des cercles Leaflet
  const mapCompass = initCompassMap();
  const mapExplorer = initExplorerMap();

  // Boutons
  goToExplorerBtn.addEventListener('click', switchToExplorer);
  backToMapBtn.addEventListener('click', switchToCompass);
  backCampusBtn.addEventListener('click', () => {
    const filters = collectFilters();
    backToCampusStats(filters);
  });

  // Init stats
  await initStats();

  // Chargement des données
  try {
    etablissementsData = await loadEtablissementsData();
    stationsData = await loadStationsData();
    globalBikes = await loadBikesData();
  } catch (err) {
    console.error("Erreur chargement données :", err);
    return;
  }

  summaryTotalStations.textContent = stationsData.length;

  // Dessine établissements sur la carte Compass
  drawEtablissementsOnCompassMap(etablissementsData);

  // Liste déroulante
  populateDropdown(etablissementsData);

  // Dessine établissements sur la carte Explorer (repère)
  drawEtablissementsOnExplorerMap(etablissementsData);

  // Filtres
  applyFiltersBtn.addEventListener('click', () => {
    if (currentlySelectedEtab) highlightEtabInExplorer(currentlySelectedEtab);
  });
  distanceSlider.addEventListener('input', () => {
    distanceValue.textContent = distanceSlider.value;
  });

  /* =============== Recuperer les date debut et fin ============= */
  function getDateRangeFromBikesData(bikesData) {
    if (!bikesData || bikesData.length === 0) return { startDate: null, endDate: null };
  
    // Extraire la première et la dernière date (si les données sont ordonnées)
    const startDate = bikesData.length > 0
      ? new Date(2021, 11, 1,23,59,59,999)
      : null;
    const endDate = bikesData.length > 0
      ? new Date(bikesData[bikesData.length - 1].year, bikesData[bikesData.length - 1].month - 1, bikesData[bikesData.length - 1].day)
      : null;

    return { startDate, endDate };
  }

  /* ============== Vues ============== */
  function switchToExplorer() {
    viewMapCompass.classList.add('hidden');
    viewExplorer.classList.remove('hidden');
      
      // Récupérer la plage de dates totale
    const { startDate, endDate } = getDateRangeFromBikesData(globalBikes);

    // Définir les valeurs par défaut des champs de filtre
    const startDateInput = document.getElementById('start-date');
    const endDateInput = document.getElementById('end-date');

    if (startDate) {
      startDateInput.value = startDate.toISOString().split('T')[0]; // Format YYYY-MM-DD
    }
    if (endDate) {
      endDateInput.value = endDate.toISOString().split('T')[0]; // Format YYYY-MM-DD
    }

    if (currentlySelectedEtab) highlightEtabInExplorer(currentlySelectedEtab);
  }
  function switchToCompass() {
    viewExplorer.classList.add('hidden');
    viewMapCompass.classList.remove('hidden');
  }

  /* ============== Compass ============== */
  function drawEtablissementsOnCompassMap(etabs) {
    const color = '#3498db';
    etabs.features.forEach((feature) => {
      const layer = L.geoJSON(feature, {
        style: {
          color,
          weight:1,
          fillColor: color,
          fillOpacity:0.3
        }
      }).addTo(mapCompass);

      layer.on('click', () => {
        currentlySelectedEtab = feature;
        switchToExplorer();
      });
    });
  }

  function populateDropdown(etabs) {
    etabs.features.forEach((etab, idx) => {
      const opt = document.createElement('option');
      opt.value = idx;
      const nom = etab.properties.nom || `Etablissement n°${idx}`;
      opt.textContent = nom;
      etabSelect.appendChild(opt);
    });
    etabSelect.addEventListener('change', e => {
      const idx = e.target.value;
      if (idx !== '') {
        currentlySelectedEtab = etablissementsData.features[idx];
        switchToExplorer();
      }
    });
  }

  /* ============== Explorer ============== */
  function drawEtablissementsOnExplorerMap(etabs) {
    const color = '#3498db';
    etabs.features.forEach((etab) => {
      L.geoJSON(etab, {
        style: { color, weight:1, fillColor:color, fillOpacity:0.2 }
      }).addTo(mapExplorer);
    });
  }

  function highlightEtabInExplorer(etab) {
    // Clear anciens overlays
    clearExplorerOverlays();

    // Nom
    const nom = etab.properties.nom || 'Nom inconnu';
    selectedEtabNameElem.textContent = nom;

    // Surbrillance polygone
    const layer = L.geoJSON(etab, {
      style: {
        color:'#3498db',
        weight:2,
        fillColor:'#3498db',
        fillOpacity:0.5
      }
    }).addTo(mapExplorer);

    // Zoom sur l’établissement
    const coords = etab.geometry.coordinates;
    const firstPt = coords[0][0][0].length === 2 ? coords[0][0][0] : coords[0][0];
    const etabLat = firstPt[1];
    const etabLng = firstPt[0];
    mapExplorer.setView([etabLat, etabLng], 15);

    // Stations proches
    const threshold = parseInt(distanceSlider.value,10) || 500;
    const stationsProches = [];
    stationsData.forEach(st => {
      const lat = st.latitude;
      const lng = st.longitude;
      const dist = distance(lat, lng, etabLat, etabLng);
      if(dist <= threshold){
        stationsProches.push(st);
        // Création du cercle
        const circleColor = getCircleColorByDistance(dist);
        const circle = L.circle([lat,lng], {
          color: circleColor,
          fillColor: circleColor,
          fillOpacity: 0.6,
          radius: getDynamicRadius(mapExplorer.getZoom())
        }).addTo(mapExplorer)
          .bindPopup(`Station ${st.id_velov} à ${Math.round(dist)} m`)
          .on('click',() => {
            selectStation(st);
          });
        stationCircles[st.id_velov] = circle;
        // On lance une animation colorée sur ce cercle
        animateCircleColor(circle);
      }
    });
    summaryNearbyStations.textContent = stationsProches.length;

    // Stats globales
    const filters = collectFilters();
    updateGlobalStats(stationsProches, filters);

    mapExplorer.on('zoomend', () => {
      const z = mapExplorer.getZoom();
      Object.values(stationCircles).forEach(circle => {
        circle.setRadius(getDynamicRadius(z));
      });
    });
  }

  // Sélection station => stats spécifiques
  function selectStation(station) {
    summaryNearbyStations.textContent = '1';
    const filters = collectFilters();
    updateStationStats(station, filters);
  }

  function clearExplorerOverlays() {
    mapExplorer.eachLayer((layer) => {
      if(layer instanceof L.Circle || layer instanceof L.GeoJSON){
        mapExplorer.removeLayer(layer);
      }
    });
  }

  // Filtres
  function collectFilters() {
    const startDateStr = document.getElementById('start-date').value;
    const endDateStr = document.getElementById('end-date').value;
    const startHourStr = document.getElementById('start-hour').value;
    const endHourStr = document.getElementById('end-hour').value;

    let startDate=null, endDate=null;
    if(startDateStr) {
      startDate = new Date(startDateStr);
      startDate.setHours(0,0,0,0);
    }
    if(endDateStr) {
      endDate = new Date(endDateStr);
      endDate.setHours(23,59,59,999);
    }
    let startHour=null, endHour=null;
    if(startHourStr !== '') startHour = parseInt(startHourStr,10);
    if(endHourStr !== '') endHour = parseInt(endHourStr,10);
    return { startDate, endDate, startHour, endHour };
  }

  // Animation colorée sur un cercle Leaflet
  function animateCircleColor(circle) {
    // On alterne 2 couleurs
    let toggle = false;
    const baseColor = circle.options.color;

    const interval = setInterval(() => {
      toggle = !toggle;
      const nextColor = toggle ? '#ff66cc' : baseColor; 
      circle.setStyle({
        color: nextColor,
        fillColor: nextColor
      });
    }, 1200);

    // Arrêter après 15s
    setTimeout(() => {
      clearInterval(interval);
      circle.setStyle({
        color: baseColor,
        fillColor: baseColor
      });
    }, 15000);
  }
});
