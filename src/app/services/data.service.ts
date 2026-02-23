import { Injectable } from '@angular/core';
import * as d3 from 'd3';
import { BikeData, GeoJSONCollection, Station } from '../models/data.models';

@Injectable({
    providedIn: 'root'
})
export class DataService {

    constructor() { }

    async loadEtablissementsData(): Promise<GeoJSONCollection> {
        try {
            console.log('Loading Data: Etablissements...');
            const data = await d3.json('/assets/data/etablissements.json') as GeoJSONCollection;
            console.log('Loaded Etablissements:', data);
            return data;
        } catch (error) {
            console.error("Erreur lors du chargement des établissements :", error);
            throw error;
        }
    }

    async loadStationsData(): Promise<Station[]> {
        try {
            const data = await d3.csv('/assets/data/data-stations.csv');
            return data.map((d: any) => ({
                id_velov: d.id_velov,
                latitude: parseFloat(d.latitude),
                longitude: parseFloat(d.longitude)
            }));
        } catch (error) {
            console.error("Erreur lors du chargement des stations :", error);
            throw error;
        }
    }

    async loadBikesData(): Promise<BikeData[]> {
        try {
            const data = await d3.csv('/assets/data/december-data.csv');
            // Filter only December as in original code
            return data
                .map((d: any) => ({
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
                .filter((d: BikeData) => [12].includes(d.month));
        } catch (error) {
            console.error("Erreur lors du chargement des données de vélos :", error);
            throw error;
        }
    }

    // Utils
    distance(lat1: number, lon1: number, lat2: number, lon2: number): number {
        const R = 6371e3;
        const rad = Math.PI / 180;
        const dLat = (lat2 - lat1) * rad;
        const dLon = (lon2 - lon1) * rad;
        const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLon / 2) ** 2;
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    getDynamicRadius(zoom: number): number {
        return Math.max(5, 50 / (20 - zoom));
    }

    getCircleColorByDistance(dist: number): string {
        if (dist <= 300) return '#e74c3c';  // proche => rouge
        if (dist <= 700) return '#f1c40f';  // moyen => jaune
        return '#2ecc71';                   // plus éloigné => vert
    }
}
