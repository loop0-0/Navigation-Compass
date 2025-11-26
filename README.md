## Navigation Compass – Explorer les stations Vélo'v autour des campus

Application web interactive (HTML/CSS/JS) permettant de visualiser les établissements d’enseignement supérieur et les stations Vélo'v à proximité, puis d’explorer finement la disponibilité des vélos via des graphiques D3.js.

### 1. Fonctionnalités

- **Vue Compass (carte principale)**  
  - Affichage des établissements (`etablissements.json`) sur une carte Leaflet.  
  - Sélection d’un établissement via la carte ou un menu déroulant.  
  - Bouton **« Accéder à Explorer »** pour analyser l’environnement vélo autour de l’établissement sélectionné.

- **Vue Explorer (analyse détaillée)**  
  - Carte Leaflet centrée sur l’établissement sélectionné.  
  - **Filtre de distance** (slider en mètres) pour ne garder que les stations proches.  
  - **Filtres temporels** : dates de début/fin et plages horaires (heures de la journée).  
  - Résumé chiffré : nombre total de stations et nombre de stations proches.  
  - Panneau de **visualisations interactives (D3.js)** :
    - Stats globales (pour les stations proches sélectionnées) :  
      - moyenne de vélos disponibles par heure (barres),  
      - évolution journalière (courbe),  
      - arrivées vs départs moyens par heure.  
    - Stats par station (lorsqu’une station est cliquée) :  
      - évolution journalière de la disponibilité,  
      - nuage de points heure vs vélos,  
      - carte de chaleur jour/heure.

### 2. Technologies utilisées

- **Front-end** : HTML5, Tailwind CSS (via CDN), CSS custom minimal.  
- **Cartographie** : [Leaflet](https://leafletjs.com/) + tuiles Carto basemap.  
- **Visualisation de données** : [D3.js v7](https://d3js.org/).  
- **Données** :
  - `data/etablissements.json` : géométrie des établissements (GeoJSON).  
  - `data/data-stations.csv` : positions des stations Vélo'v.  
  - `data/december-data.csv` : historique agrégé (décembre) par station (vélos disponibles, arrivées/départs, etc.).

### 3. Structure du projet

- **`index.html`** : page principale avec les deux vues (Compass & Explorer) et la mise en page Tailwind.  
- **`css/style.css`** : styles complémentaires.  
- **`js/data.js`** : chargement et transformation des données (CSV/JSON), fonctions utilitaires (distance, couleur/rayon des cercles).  
- **`js/map.js`** : initialisation des cartes Leaflet (Compass et Explorer).  
- **`js/main.js`** : logique d’interface, navigation entre les vues, filtrage, lien carte ⇔ stats.  
- **`js/stats.js`** : calculs et affichage des 6 visualisations D3.js + gestion d’onglets.

### 4. Installation & lancement

- **1. Cloner ou télécharger le dépôt**  
  Place ce dossier sur ta machine, par exemple `Navigation-Compass/`.

- **2. Servir les fichiers via un petit serveur web local**  
  Les fichiers CSV/JSON sont chargés via `fetch`/D3, ce qui nécessite un serveur HTTP (ouvrir simplement le fichier `index.html` dans le navigateur ne suffira pas dans la plupart des cas à cause de la politique CORS).

  Exemples de lancement :

  - **Avec Python 3** (dans le dossier du projet) :
    ```bash
    cd Navigation-Compass
    python -m http.server 8000
    ```
    Puis ouvrir `http://localhost:8000` dans le navigateur.

  - **Avec `npx serve` (Node.js)** :
    ```bash
    cd Navigation-Compass
    npx serve .
    ```

- **3. Utilisation**  
  1. Depuis la **Vue Compass**, cliquer sur un établissement sur la carte ou le choisir dans la liste.  
  2. Cliquer sur **« Accéder à Explorer »** pour ouvrir la vue détaillée.  
  3. Ajuster la distance, les dates et les heures, puis cliquer sur **« Appliquer »**.  
  4. Cliquer sur une station (cercle coloré) pour passer des stats globales aux stats spécifiques de cette station.  
  5. Utiliser le bouton **« Revenir aux stats du campus »** pour revenir aux stats globales.

### 5. Notes et limites

- Les données temporelles sont actuellement filtrées sur le mois de **décembre** (`loadBikesData` dans `data.js`).  
- Pour étendre à d’autres mois, il suffit d’adapter le filtrage dans `loadBikesData`.  
- Les coordonnées et géométries sont supposées déjà projetées en WGS84 (lat/lon) pour Leaflet.


