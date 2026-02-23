/**************************************************************
 * data.js
 * Gestion du chargement des données et fonctions utilitaires
 **************************************************************/
export async function loadEtablissementsData() {
  try {
    const response = await d3.json('data/etablissements.json');
    return response;
  } catch (error) {
    console.error("Erreur lors du chargement des établissements :", error);
    throw error;
  }
}

export async function loadStationsData() {
  try {
    const data = await d3.csv('data/data-stations.csv');
    return data.map(d => ({
      id_velov: d.id_velov,
      latitude: parseFloat(d.latitude),
      longitude: parseFloat(d.longitude)
    }));
  } catch (error) {
    console.error("Erreur lors du chargement des stations :", error);
    throw error;
  }
}

export async function loadBikesData() {
  try {
    const data = await d3.csv('data/december-data.csv');
    // On garde uniquement le mois 12 (décembre)
    return data
      .map(d => ({
        id_velov: d.id_velov,
        year: +d.year,
        month: +d.month,
        day: +d.day,
        hour: +d.hour,
        minute: +d.minute,
        bikes: +d.bikes,
        bike_stands: +d.bike_stands,
        departure30min: +d.departure30min,
        arrival30min: +d.arrival30min,
      }))
      .filter(d => [12].includes(d.month)); // <-- Filtre sur décembre
      // Pour janvier/février/mars, utilisez : .filter(d => [1,2,3].includes(d.month))
  } catch (error) {
    console.error("Erreur lors du chargement des données de vélos :", error);
    throw error;
  }
}

/**
 * Distance Haversine (m).
 */
export function distance(lat1, lon1, lat2, lon2) {
  const R = 6371e3;
  const rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad;
  const dLon = (lon2 - lon1) * rad;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*rad)*Math.cos(lat2*rad)*Math.sin(dLon/2)**2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R*c;
}

/**
 * Rayon dynamique d'un cercle selon le zoom Leaflet
 */
export function getDynamicRadius(zoom) {
  return Math.max(5, 50 / (20 - zoom));
}

/**
 * Couleur du cercle selon la distance.
 */
export function getCircleColorByDistance(dist) {
  if (dist <= 300) return '#e74c3c';  // proche => rouge
  if (dist <= 700) return '#f1c40f';  // moyen => jaune
  return '#2ecc71';                   // plus éloigné => vert
}
