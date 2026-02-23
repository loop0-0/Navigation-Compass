import { Component, OnInit, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import * as L from 'leaflet';
import { DataService } from '../../services/data.service';
import { BikeData, Station, GeoJSONFeature } from '../../models/data.models';
import { ChartsComponent } from '../charts/charts.component';

@Component({
    selector: 'app-explorer',
    standalone: true,
    imports: [CommonModule, FormsModule, ChartsComponent],
    templateUrl: './explorer.component.html',
    styles: [`
    :host { display: block; height: 100vh; display: flex; flex-direction: column; }
    #view-explorer { height: 100%; display: flex; flex-direction: column; }
    /* Custom Red Scrollbar for sidebar */
    ::-webkit-scrollbar { width: 6px; }
    ::-webkit-scrollbar-thumb { background: #B91C1C; }
  `]
})
export class ExplorerComponent implements OnInit, AfterViewInit {
    map: L.Map | undefined;
    etablissements: GeoJSONFeature[] = [];
    allEtabLayer: L.LayerGroup | undefined;
    stations: Station[] = [];
    allBikesData: BikeData[] = [];
    // Current filtered data
    filteredBikesData: BikeData[] = [];
    nearbyBikesData: BikeData[] = [];

    currentlySelectedEtab: GeoJSONFeature | null = null;
    selectedEtabName = "Aucun établissement sélectionné";

    // Filters
    distanceMax = 200;
    temporalGranularity: 'month' | 'week' | 'day' | 'interval' = 'month';
    selectedWeek: number = 1; // 1: 1-5, 2: 6-12, 3: 13-19, 4: 20-26, 5: 27-31
    selectedDayStr: string = '2021-12-01';
    startHourTime: number = 8;
    endHourTime: number = 18;

    // Stats
    totalStations = 0;
    nearbyStationsCount = 0;
    nearbyStations: Station[] = [];

    // View state
    selectedStation: Station | null = null;
    viewMode: 'global' | 'station' = 'global';
    showFilters = true;

    stationCircles: L.Circle[] = [];
    etabLayer: L.Layer | null = null;

    constructor(private dataService: DataService, private router: Router, private route: ActivatedRoute) { }

    async ngOnInit() {
        try {
            // Parallel load
            const [etabsData, stations, bikes] = await Promise.all([
                this.dataService.loadEtablissementsData(),
                this.dataService.loadStationsData(),
                this.dataService.loadBikesData()
            ]);

            this.stations = stations;
            this.totalStations = this.stations.length;
            this.allBikesData = bikes;

            // Filter out establishments that don't have any stations within 500m
            this.etablissements = etabsData.features.filter((etab: GeoJSONFeature) => {
                const center = this.getCenter(etab);
                return this.stations.some(st => {
                    const dist = L.latLng(center[0], center[1]).distanceTo(L.latLng(st.latitude, st.longitude));
                    return dist <= 500;
                });
            });

            // Default Dates based on data
            if (this.allBikesData.length > 0) {
                this.selectedDayStr = "2021-12-01";
            }

            this.route.queryParams.subscribe(params => {
                if (params['etabId'] !== undefined) {
                    const idx = +params['etabId'];
                    if (this.etablissements[idx]) {
                        // If map ready, select. If not, wait.
                        this.selectEtabIndex(idx);
                    }
                }
            });

        } catch (e) { console.error(e); }
    }

    ngAfterViewInit() {
        this.initMap();
        // setTimeout to Ensure data is loaded if we came from nav quickly
        setTimeout(() => {
            this.drawAllEtabs();
            if (this.currentlySelectedEtab) {
                this.highlightEtab(this.currentlySelectedEtab);
            }
        }, 500);
    }

    initMap() {
        this.map = L.map('map-explorer', {
            center: [45.75, 4.85],
            zoom: 13,
            zoomControl: false,
            attributionControl: false
        });
        L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
            maxZoom: 19
        }).addTo(this.map);

        this.map.on('zoomend', () => {
            const z = this.map!.getZoom();
            this.stationCircles.forEach((c: any) => c.setRadius(this.dataService.getDynamicRadius(z)));
        });
    }

    drawAllEtabs() {
        if (!this.map || !this.etablissements.length) return;

        if (this.allEtabLayer) this.map.removeLayer(this.allEtabLayer);
        this.allEtabLayer = L.layerGroup().addTo(this.map);

        this.etablissements.forEach(etab => {
            const poly = L.geoJSON(etab as any, {
                style: {
                    color: '#1D4ED8',
                    weight: 2,
                    fillColor: '#1D4ED8',
                    fillOpacity: 0.2
                }
            });

            poly.on('click', () => {
                this.selectEtab(etab);
            });

            poly.bindTooltip(etab.properties.nom || 'Établissement', { sticky: true });
            this.allEtabLayer!.addLayer(poly);
        });
    }

    selectEtabIndex(idx: number) {
        this.selectEtab(this.etablissements[idx]);
    }

    selectEtab(etab: GeoJSONFeature) {
        this.currentlySelectedEtab = etab;
        this.selectedEtabName = etab.properties.nom || 'Etablissement';
        this.viewMode = 'global';
        this.selectedStation = null;
        this.showFilters = false; // Auto-hide filters

        if (this.map) {
            this.highlightEtab(etab);
        }
    }

    getCenter(etab: GeoJSONFeature): [number, number] {
        // Logic copied from CompassComponent
        const geom: any = etab.geometry;
        let coords = geom.coordinates;
        while (Array.isArray(coords[0]) && typeof coords[0][0] !== 'number') {
            coords = coords[0];
        }
        const pt = coords[0];
        return [pt[1], pt[0]];
    }

    highlightEtab(etab: GeoJSONFeature) {
        if (!this.map) return;

        // Clear previous
        if (this.etabLayer) this.map.removeLayer(this.etabLayer);
        this.stationCircles.forEach(c => this.map!.removeLayer(c));
        this.stationCircles = [];

        // Draw Polygon with distinct style
        const poly = L.geoJSON(etab as any, {
            style: { color: '#B91C1C', weight: 4, fillColor: '#B91C1C', fillOpacity: 0.3 }
        });

        poly.on('click', () => {
            this.backToGlobal();
        });

        this.etabLayer = poly.addTo(this.map);

        // Frame the establishment
        const bounds = L.geoJSON(etab as any).getBounds();
        this.map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });

        // Ensure map recalculates its center when CSS layout changes
        setTimeout(() => { if (this.map) this.map.invalidateSize(); }, 300);

        const center = this.getCenter(etab);
        this.updateNearbyStations(center[0], center[1]);
    }

    updateNearbyStations(lat: number, lng: number) {
        this.nearbyStations = [];
        // Only search if we have valid stations
        if (!this.stations.length) return;

        this.stations.forEach(st => {
            // Using Leaflet's built-in precise spherical distance calculation
            const d = this.map!.distance([st.latitude, st.longitude], [lat, lng]);
            if (d <= this.distanceMax) {
                this.nearbyStations.push(st);

                const color = this.dataService.getCircleColorByDistance(d);
                const radius = this.dataService.getDynamicRadius(this.map!.getZoom());

                // Use a nice circle
                const circle = L.circleMarker([st.latitude, st.longitude], {
                    color: '#fff',
                    weight: 1,
                    fillColor: color,
                    fillOpacity: 1,
                    radius: 8 // distinct size
                }).addTo(this.map!);

                // Popup
                circle.bindTooltip(`Station ${st.id_velov} (${Math.round(d)}m)`, { direction: 'top' });

                circle.on('click', () => {
                    // Reset others?
                    this.selectStation(st);
                });

                this.stationCircles.push(circle as any);
            }
        });

        this.nearbyStationsCount = this.nearbyStations.length;
        this.applyFilters();
    }

    selectStation(s: Station) {
        this.selectedStation = s;
        this.viewMode = 'station';
        this.showFilters = false; // Auto-hide filters
        this.applyFilters();

        if (this.map && s.latitude && s.longitude) {
            this.map.panTo([s.latitude, s.longitude]);
        }

        // Ensure map resizes correctly when panels slide in/out
        setTimeout(() => {
            if (this.map) this.map.invalidateSize();
        }, 300);
    }

    backToGlobal() {
        if (this.viewMode === 'station' && this.currentlySelectedEtab) {
            // Unselect station, go back to etab dashboard
            this.viewMode = 'global';
            this.selectedStation = null;
            this.applyFilters();

            // Re-center map on etab
            if (this.map) {
                const bounds = L.geoJSON(this.currentlySelectedEtab as any).getBounds();
                this.map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
            }
        } else {
            // Close sidebar entirely
            this.viewMode = 'global';
            this.selectedStation = null;
            this.currentlySelectedEtab = null;
            this.selectedEtabName = "Aucun établissement sélectionné";
            this.applyFilters();

            if (this.map) {
                if (this.etabLayer) this.map.removeLayer(this.etabLayer);
                this.stationCircles.forEach(c => this.map!.removeLayer(c));
                this.stationCircles = [];
                this.nearbyStations = [];

                if (this.etablissements.length > 0) {
                    const allBounds = L.geoJSON(this.etablissements as any).getBounds();
                    this.map.fitBounds(allBounds, { padding: [50, 50] });
                } else {
                    this.map.setView([45.75, 4.85], 13);
                }
            }
        }

        // Ensure map resizes
        setTimeout(() => {
            if (this.map) this.map.invalidateSize();
        }, 300);
    }

    onEtabSelectChange(etab: GeoJSONFeature | null) {
        if (etab) {
            this.selectEtab(etab);
        } else {
            // Act like closing completely
            this.viewMode = 'global';
            this.backToGlobal();
        }
    }

    toggleFilters() {
        this.showFilters = !this.showFilters;
    }

    onFilterChange() {
        // Re-run spatial query if distance changed
        // For simplicity, just re-run all if possible.
        if (this.currentlySelectedEtab) {
            const center = this.getCenter(this.currentlySelectedEtab);
            // Only re-draw circles if distance changed. 
            // We can just clear and redraw.
            this.stationCircles.forEach(c => this.map!.removeLayer(c));
            this.stationCircles = [];

            this.updateNearbyStations(center[0], center[1]);
        } else {
            this.applyFilters();
        }
    }

    applyFilters() {
        let data = this.allBikesData;

        // Apply Temporal Granularity logic
        const year = 2021;
        const month = 12; // December

        if (this.temporalGranularity === 'month') {
            // Keep all Dec data
            data = data.filter(d => d.year === year && d.month === month);
        } else if (this.temporalGranularity === 'week') {
            let startD = 1, endD = 31;
            if (this.selectedWeek === 1) { startD = 1; endD = 5; }
            else if (this.selectedWeek === 2) { startD = 6; endD = 12; }
            else if (this.selectedWeek === 3) { startD = 13; endD = 19; }
            else if (this.selectedWeek === 4) { startD = 20; endD = 26; }
            else if (this.selectedWeek === 5) { startD = 27; endD = 31; }
            data = data.filter(d => d.year === year && d.month === month && d.day >= startD && d.day <= endD);
        } else if (this.temporalGranularity === 'day') {
            const dateObj = new Date(this.selectedDayStr);
            const dYear = dateObj.getFullYear();
            const dMonth = dateObj.getMonth() + 1;
            const dDay = dateObj.getDate();
            if (!isNaN(dDay)) {
                data = data.filter(d => d.year === dYear && d.month === dMonth && d.day === dDay);
            }
        } else if (this.temporalGranularity === 'interval') {
            const dateObj = new Date(this.selectedDayStr);
            const dYear = dateObj.getFullYear();
            const dMonth = dateObj.getMonth() + 1;
            const dDay = dateObj.getDate();
            if (!isNaN(dDay)) {
                data = data.filter(d => d.year === dYear && d.month === dMonth && d.day === dDay && d.hour >= this.startHourTime && d.hour <= this.endHourTime);
            }
        }

        if (this.viewMode === 'station' && this.selectedStation) {
            this.filteredBikesData = data.filter(d => d.id_velov === this.selectedStation!.id_velov);
            const nearbyIds = this.nearbyStations.map(s => s.id_velov);
            this.nearbyBikesData = data.filter(d => nearbyIds.includes(d.id_velov));
        } else {
            const nearbyIds = this.nearbyStations.map(s => s.id_velov);
            this.filteredBikesData = data.filter(d => nearbyIds.includes(d.id_velov));
            this.nearbyBikesData = this.filteredBikesData;
        }
    }

    backToMap() {
        this.router.navigate(['/compass']);
    }
}
