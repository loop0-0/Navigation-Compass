import { Component, OnInit, AfterViewInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import * as L from 'leaflet';
import { DataService } from '../../services/data.service';
import { GeoJSONFeature } from '../../models/data.models';

@Component({
    selector: 'app-compass',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './compass.component.html',
    styles: [`
    .perspective-1000 { perspective: 1000px; }
    .card-stack-container { pointer-events: none; }
    .card-item { pointer-events: auto; }
    
    /* 3D Text Effect */
    .text-3d {
        color: #FFFFFF;
        text-shadow: 
            0 1px 0 #ccc,
            0 2px 0 #c9c9c9,
            0 3px 0 #bbb,
            0 4px 0 #b9b9b9,
            0 5px 0 #aaa,
            0 6px 1px rgba(0,0,0,.1),
            0 0 5px rgba(0,0,0,.1),
            0 1px 3px rgba(0,0,0,.3),
            0 3px 5px rgba(0,0,0,.2),
            0 5px 10px rgba(0,0,0,.25),
            0 10px 10px rgba(0,0,0,.2),
            0 20px 20px rgba(0,0,0,.15);
        transform: rotate(-3deg) skew(-2deg);
    }
  `]
})
export class CompassComponent implements OnInit, AfterViewInit {
    allEtablissements: GeoJSONFeature[] = [];
    etablissements: GeoJSONFeature[] = [];

    activeIndex = 0;
    map: L.Map | undefined;
    marker: L.Marker | undefined;
    activePolygon: L.Layer | undefined;

    searchTerm: string = '';

    cardColors = [
        '#1D4ED8', '#10B981', '#FCD34D', '#EF4444', '#FFFFFF'
    ];

    constructor(private dataService: DataService, private router: Router) { }

    async ngOnInit() {
        try {
            const data = await this.dataService.loadEtablissementsData();
            this.allEtablissements = data.features;
            this.etablissements = [...this.allEtablissements];

            if (this.etablissements.length > 0) {
                this.selectEtab(0);
            }
        } catch (e) { console.error(e); }
    }

    ngAfterViewInit() {
        this.initMap();
        setTimeout(() => {
            if (this.etablissements.length > 0) this.selectEtab(this.activeIndex);
        }, 500);
    }

    initMap() {
        this.map = L.map('map-compass', {
            center: [45.75, 4.85],
            zoom: 13,
            zoomControl: false,
            attributionControl: false,
            dragging: true,
            scrollWheelZoom: true
        });
        L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', { maxZoom: 19 }).addTo(this.map);
    }

    onSearch() {
        if (!this.searchTerm) {
            this.etablissements = [...this.allEtablissements];
        } else {
            const lower = this.searchTerm.toLowerCase();
            this.etablissements = this.allEtablissements.filter(e =>
                (e.properties.nom || '').toLowerCase().includes(lower)
            );
        }
        this.activeIndex = 0;
        if (this.etablissements.length > 0) {
            this.selectEtab(0);
        }
    }

    getCenter(etab: GeoJSONFeature): [number, number] {
        const geom: any = etab.geometry;
        let coords = geom.coordinates;
        while (Array.isArray(coords[0]) && typeof coords[0][0] !== 'number') {
            coords = coords[0];
        }
        const pt = coords[0];
        return [pt[1], pt[0]];
    }

    selectEtab(index: number) {
        if (index < 0 || index >= this.etablissements.length) return;
        this.activeIndex = index;
        const etab = this.etablissements[index];

        if (etab && this.map) {

            // Remove old layers
            if (this.marker) this.map.removeLayer(this.marker);
            if (this.activePolygon) this.map.removeLayer(this.activePolygon);

            // Draw Polygon (The Area)
            this.activePolygon = L.geoJSON(etab as any, {
                style: {
                    color: '#EF4444',
                    weight: 3,
                    opacity: 1,
                    fillColor: '#EF4444',
                    fillOpacity: 0.2
                }
            }).addTo(this.map);

            // Calculate center for FlyTo and Marker
            // Tip: L.geoJSON allows getting bounds
            const bounds = (this.activePolygon as L.FeatureGroup).getBounds();
            const center = bounds.getCenter();

            this.map.flyTo(center, 15, { duration: 0.8, easeLinearity: 0.25 });

            // Optional: Still show marker? 
            // User asked for "Area", usually redundant with marker, but good for center point.
            // Let's keep a subtle marker at the center.
            const customIcon = L.icon({
                iconUrl: '/assets/marker-icon.png',
                shadowUrl: '/assets/marker-shadow.png',
                iconSize: [25, 41],
                iconAnchor: [12, 41],
                popupAnchor: [1, -34],
            });
            this.marker = L.marker(center, { icon: customIcon }).addTo(this.map);
        }
    }

    nextCard() {
        if (this.activeIndex < this.etablissements.length - 1) {
            this.selectEtab(this.activeIndex + 1);
        } else {
            this.selectEtab(0);
        }
    }

    prevCard() {
        if (this.activeIndex > 0) {
            this.selectEtab(this.activeIndex - 1);
        } else {
            this.selectEtab(this.etablissements.length - 1);
        }
    }

    @HostListener('window:keydown', ['$event'])
    handleKeyboardEvent(event: KeyboardEvent) {
        if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
            this.nextCard();
        } else if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
            this.prevCard();
        }
    }

    onWheel(event: WheelEvent) {
        if (event.deltaY > 0) this.nextCard();
        else this.prevCard();
    }

    getCardStyle(index: number) {
        const relativeIndex = index - this.activeIndex;

        const yOffsetInfo = 60;
        const zOffsetInfo = -40;
        const scaleDecay = 0.05;

        const color = this.cardColors[index % this.cardColors.length];
        const textColor = (color === '#FFFFFF' || color === '#FCD34D') ? '#111827' : '#FFFFFF';

        let transform = '';
        let opacity = 0;
        let zIndex = 0;
        let pointerEvents = 'none';

        if (index === this.activeIndex) {
            transform = 'translate3d(0, 0, 0) scale(1)';
            opacity = 1;
            zIndex = 50;
            pointerEvents = 'auto';
        }
        else if (index > this.activeIndex && index <= this.activeIndex + 4) {
            transform = `translate3d(0, ${relativeIndex * yOffsetInfo}px, ${relativeIndex * zOffsetInfo}px) scale(${1 - relativeIndex * scaleDecay})`;
            opacity = 1 - (relativeIndex * 0.15);
            zIndex = 50 - relativeIndex;
            pointerEvents = 'auto';
        }
        else if (index < this.activeIndex && index >= this.activeIndex - 2) {
            transform = `translate3d(0, ${relativeIndex * 100}px, 0) scale(0.9)`;
            opacity = 0;
        }

        return {
            'background-color': color,
            'color': textColor,
            'transform': transform,
            'opacity': opacity,
            'z-index': zIndex,
            'pointer-events': pointerEvents,
            'transition': 'all 0.4s cubic-bezier(0.25, 0.8, 0.25, 1)'
        };
    }

    goToExplorer() {
        const current = this.etablissements[this.activeIndex];
        const realIndex = this.allEtablissements.indexOf(current);
        this.navigateToExplorer(realIndex);
    }

    navigateToExplorer(idx: number) {
        this.router.navigate(['/explorer'], { queryParams: { etabId: idx } });
    }
}
