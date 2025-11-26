/**************************************************************
 * map.js
 * Initialise les cartes Leaflet (Compass & Explorer)
 **************************************************************/
export function initCompassMap() {
  const mapCompass = L.map('map-compass', {
    center: [45.75, 4.85],
    zoom: 13
  });
  L.tileLayer(
    'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    {
      attribution: 'Données © <a href="https://carto.com/">CARTO</a>',
      maxZoom: 19
    }
  ).addTo(mapCompass);
  return mapCompass;
}

export function initExplorerMap() {
  const mapExplorer = L.map('map-explorer', {
    center: [45.75, 4.85],
    zoom: 13
  });
  L.tileLayer(
    'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    {
      attribution: 'Données © <a href="https://carto.com/">CARTO</a>',
      maxZoom: 19
    }
  ).addTo(mapExplorer);
  return mapExplorer;
}
