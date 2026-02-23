export interface Station {
    id_velov: string;
    latitude: number;
    longitude: number;
    // New optional fields for the UI
    name?: string;
    address?: string;
    available_bikes?: number;
    bike_stands?: number;
}

export interface BikeData {
    id_velov: string;
    year: number;
    month: number;
    day: number;
    hour: number;
    minute: number;
    bikes: number;
    bike_stands: number;
    departure30min: number;
    arrival30min: number;
}

export interface Filters {
    startDate: Date | null;
    endDate: Date | null;
    startHour: number | null;
    endHour: number | null;
}

export interface GeoJSONFeature {
    type: "Feature";
    properties: {
        nom?: string;
        [key: string]: any;
    };
    geometry: {
        type: string;
        coordinates: any;
    };
}

export interface GeoJSONCollection {
    type: "FeatureCollection";
    features: GeoJSONFeature[];
}
