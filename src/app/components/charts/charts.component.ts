import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, ElementRef, ViewChild, ViewEncapsulation, HostListener, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import * as d3 from 'd3';
import { BikeData, Station, GeoJSONFeature } from '../../models/data.models';

@Component({
    selector: 'app-charts',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './charts.component.html',
    styles: [`
    .tab-btn { transition: all 0.2s; }
  `],
    encapsulation: ViewEncapsulation.None
})
export class ChartsComponent implements OnChanges, OnDestroy {
    @Input() filteredData: BikeData[] = [];
    @Input() mode: 'global' | 'station' = 'global';
    @Input() station: Station | null = null;
    @Output() backToGlobal = new EventEmitter<void>();

    onBackToGlobal() {
        this.backToGlobal.emit();
    }

    // New Dashboard Inputs
    @Input() nearbyStations: Station[] = [];
    @Input() nearbyBikesData: BikeData[] = [];
    @Input() selectedEtab: GeoJSONFeature | null = null;
    @Input() allEtablissements: GeoJSONFeature[] = [];

    // Temporal Granularity
    @Input() temporalGranularity: 'month' | 'week' | 'day' | 'interval' = 'month';
    @Input() selectedDayStr: string = '2021-12-01';
    @Input() startHourTime: number = 8;
    @Input() endHourTime: number = 18;

    // Dashboard 1 Refs
    @ViewChild('d1LineChart') d1LineChart?: ElementRef;
    @ViewChild('d1Heatmap') d1Heatmap?: ElementRef;
    @ViewChild('d1RadarChart') d1RadarChart?: ElementRef;
    @ViewChild('d1StackedArea') d1StackedArea?: ElementRef;

    // New Dashboard 1 Refs
    @ViewChild('d1PartsMarche') d1PartsMarche?: ElementRef;
    @ViewChild('d1RotationQuartier') d1RotationQuartier?: ElementRef;
    @ViewChild('d1MatchJours') d1MatchJours?: ElementRef;
    @ViewChild('d1ActivityHeatmap') d1ActivityHeatmap?: ElementRef;
    @ViewChild('d1DispoDistribution') d1DispoDistribution?: ElementRef;

    // Dashboard 2 Refs
    @ViewChild('d2LineChart') d2LineChart?: ElementRef;
    @ViewChild('d2StackedBar') d2StackedBar?: ElementRef;
    @ViewChild('d2BarChart') d2BarChart?: ElementRef;
    @ViewChild('d2CalendarHeatmap') d2CalendarHeatmap?: ElementRef;
    @ViewChild('d2DualLine') d2DualLine?: ElementRef;
    @ViewChild('d2RadarUsers') d2RadarUsers?: ElementRef;
    @ViewChild('d2PieChart') d2PieChart?: ElementRef;
    @ViewChild('d2HeureJourHeatmap') d2HeureJourHeatmap?: ElementRef;
    @ViewChild('d2VoisinsLine') d2VoisinsLine?: ElementRef;

    // Tabs state
    activeTabD1 = 'd1-apercu';
    tabsD1 = [
        { id: 'd1-apercu', label: '1. Aperçu & Voisins' },
        { id: 'd1-dynamique', label: '2. Dynamique Horaire' },
        { id: 'd1-analyse', label: '3. Analyse Hebdo' }
    ];

    activeTabD2 = 'd2-resume';
    tabsD2 = [
        { id: 'd2-resume', label: 'Résumé' },
        { id: 'd2-freq', label: 'Fréquentation' },
        { id: 'd2-comparatif', label: 'Comparatif' }
    ];

    setActiveTab(mode: 'global' | 'station', tabId: string) {
        if (mode === 'global') {
            this.activeTabD1 = tabId;
            setTimeout(() => this.renderDashboard1(), 50);
        } else { // mode === 'station'
            this.activeTabD2 = tabId;
            setTimeout(() => this.renderDashboard2(), 50);
        }
    }

    ngOnChanges(changes: SimpleChanges) {
        if (changes['filteredData'] || changes['mode'] || changes['station'] || changes['selectedEtab'] || changes['nearbyStations'] || changes['nearbyBikesData'] || changes['temporalGranularity'] || changes['selectedDayStr'] || changes['startHourTime'] || changes['endHourTime']) {
            setTimeout(() => this.renderDashboard(), 100);
        }
    }

    @HostListener('window:resize')
    onResize() {
        // Redraw on window resize properly using Angular HostListener which safely unbinds later.
        setTimeout(() => this.renderDashboard(), 50);
    }

    ngOnDestroy() {
        // Cleanup explicitly requested. 
        // Angular's HostListener automatically garbage collects the window resize event, stopping the memory leak.
    }

    renderDashboard() {
        if (this.mode === 'global' && (!this.nearbyBikesData || this.nearbyBikesData.length === 0)) return;
        if (this.mode === 'station' && (!this.filteredData || this.filteredData.length === 0)) return;

        if (this.mode === 'global') {
            this.renderDashboard1();
        } else if (this.mode === 'station') {
            this.renderDashboard2();
        }
    }

    renderDashboard1() {
        // We only render the remaining visualisations. We skip KPIs and PartsMarche as they were removed
        this.renderD1MesVoisins();

        setTimeout(() => {
            if (this.d1RotationQuartier) this.renderD1RotationQuartier();
            if (this.d1LineChart) this.renderD1JourneeType();
            if (this.d1StackedArea) this.renderD1ChasseCroise();
            if (this.d1DispoDistribution) this.renderD1DispoDistribution();
        }, 50);

        setTimeout(() => {
            if (this.d1MatchJours) this.renderD1MatchJours();
            if (this.d1RadarChart) this.renderD1MatchStationsRadar();
            if (this.d1Heatmap) this.renderD1BarometreSemaine();
            if (this.d1ActivityHeatmap) this.renderD1ActivityHeatmap();
            this.renderD1Top3();
        }, 150);
    }

    // --- DASHBOARD 1 IMPLEMENTATIONS ---

    private getDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
        const R = 6371e3; // metres
        const phi1 = lat1 * Math.PI / 180;
        const phi2 = lat2 * Math.PI / 180;
        const deltaPhi = (lat2 - lat1) * Math.PI / 180;
        const deltaLambda = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) + Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    renderD1MesVoisins() {
        const voisinsContainer = document.getElementById('d1-voisins-container');
        if (!voisinsContainer || !this.selectedEtab || !this.allEtablissements.length) return;

        const getCenter = (f: any) => {
            if (f.bbox && f.bbox.length === 4) return { lat: (f.bbox[1] + f.bbox[3]) / 2, lon: (f.bbox[0] + f.bbox[2]) / 2 };
            if (f.geometry?.type === 'Point') return { lat: f.geometry.coordinates[1], lon: f.geometry.coordinates[0] };
            if (f.geometry?.type === 'MultiPolygon' && f.geometry.coordinates?.[0]?.[0]?.[0]) return { lat: f.geometry.coordinates[0][0][0][1], lon: f.geometry.coordinates[0][0][0][0] };
            return { lat: 0, lon: 0 };
        };

        const myCenter = getCenter(this.selectedEtab);
        const myLat = myCenter.lat;
        const myLon = myCenter.lon;

        const others = this.allEtablissements
            .filter(e => e.properties.nom !== this.selectedEtab!.properties.nom)
            .map(e => {
                const c = getCenter(e);
                const dist = this.getDistance(myLat, myLon, c.lat, c.lon);
                return { name: e.properties.nom, dist };
            })
            .sort((a, b) => a.dist - b.dist)
            .slice(0, 10); // Show top 10

        if (others.length === 0) {
            voisinsContainer.innerHTML = '<div class="text-[10px] text-gray-500 italic p-2">Aucun voisin à proximité</div>';
            return;
        }

        voisinsContainer.innerHTML = '<ul class="text-[11px] text-gray-600 space-y-2 mt-2 w-full">' +
            others.map(o => `
                <li class="flex justify-between items-center border-b border-gray-100 pb-1">
                    <span class="font-semibold text-gray-700 truncate mr-2" title="${o.name}">${o.name}</span>
                    <span class="text-[#1D4ED8] font-bold shrink-0">${Math.round(o.dist)}m</span>
                </li>
            `).join('') +
            '</ul>';
    }


    renderD1JourneeType() {
        if (!this.d1LineChart || !this.nearbyStations.length || !this.filteredData.length) return;
        const container = this.d1LineChart.nativeElement;
        container.innerHTML = '';

        // Data: Average bikes per hour for top 3 closest stations
        const top3 = this.nearbyStations.slice(0, 3);
        const stationIds = top3.map(s => s.id_velov);
        const dataPerStation: any = {};

        stationIds.forEach(id => {
            const stationData = this.filteredData.filter(d => d.id_velov === id);
            const agg: any = {};
            stationData.forEach(d => {
                if (!agg[d.hour]) agg[d.hour] = { total: 0, count: 0 };
                agg[d.hour].total += d.bikes;
                agg[d.hour].count++;
            });
            dataPerStation[id] = Object.keys(agg).map(h => ({
                hour: +h,
                avg: agg[h].total / agg[h].count
            })).sort((a, b) => a.hour - b.hour);
        });

        const margin = { top: 10, right: 20, bottom: 35, left: 45 };
        const width = container.clientWidth - margin.left - margin.right;
        const height = container.clientHeight - margin.top - margin.bottom;

        const svg = d3.select(container).append('svg')
            .attr('width', width + margin.left + margin.right)
            .attr('height', height + margin.top + margin.bottom)
            .append('g').attr('transform', `translate(${margin.left},${margin.top})`);

        const x = d3.scaleLinear().domain(this.temporalGranularity === 'interval' ? [this.startHourTime, this.endHourTime] : [0, 23]).range([0, width]);
        const maxY = d3.max(stationIds.flatMap(id => dataPerStation[id]), (d: any) => d.avg) || 10;
        const y = d3.scaleLinear().domain([0, maxY]).range([height, 0]);

        svg.append('g').attr('transform', `translate(0,${height})`).call(d3.axisBottom(x).ticks(12).tickFormat(d => `${d}h`))
            .select(".domain").attr("stroke", "#E5E7EB");
        svg.append('g').call(d3.axisLeft(y).ticks(5)).select(".domain").remove();

        svg.selectAll(".tick line").attr("stroke", "#E5E7EB");
        svg.selectAll(".tick text").style("fill", "#6B7280").style("font-size", "10px");

        // Y axis label
        svg.append("text").attr("transform", "rotate(-90)").attr("y", -margin.left + 15)
            .attr("x", -(height / 2)).style("text-anchor", "middle")
            .style("font-size", "10px").style("fill", "#6B7280").text("Vélos disponibles moyens");

        // X axis label 
        svg.append("text").attr("transform", `translate(${width / 2}, ${height + margin.bottom - 5})`)
            .style("text-anchor", "middle").style("font-size", "10px").style("fill", "#6B7280")
            .text("Heure de la journée");

        const colors = ['#10B981', '#F59E0B', '#EF4444']; // Green, Yellow, Red similar to map fullness

        stationIds.forEach((id, i) => {
            const line = d3.line<any>().x(d => x(d.hour)).y(d => y(d.avg)).curve(d3.curveMonotoneX);
            svg.append('path').datum(dataPerStation[id])
                .attr('fill', 'none').attr('stroke', colors[i]).attr('stroke-width', 2.5).attr('d', line);

            // Clean Name
            const sNameStr = top3.find(s => s.id_velov === id)?.name;
            const cleanName = sNameStr ? sNameStr.replace(' - ', ' ').substring(0, 25) + '...' : `Station ${id}`;

            // Legend
            svg.append('text').attr('x', 10).attr('y', 10 + (i * 14))
                .text(cleanName)
                .style('font-size', '9px').style('fill', colors[i]).style('font-weight', 'bold');
        });
    }

    renderD1BarometreSemaine() {
        if (!this.d1Heatmap || !this.filteredData.length || !this.nearbyStations.length) return;
        const container = this.d1Heatmap.nativeElement;
        container.innerHTML = '';

        // Data: Avg bikes for all nearby stations grouped by Day and Hour
        const nearbyIds = this.nearbyStations.map(s => s.id_velov);
        const relevantData = this.filteredData.filter(d => nearbyIds.includes(d.id_velov));

        const map: any = {};
        relevantData.forEach(d => {
            // Day 0 = Sunday, 1 = Monday, etc. But JS Date uses 0-6. Let's see what `day` property is. It's likely day of month.
            // Let's create an actual date to get the day of the week since December 2021.
            const date = new Date(d.year, d.month - 1, d.day);
            const dow = date.getDay(); // 0-6
            const key = `${dow}-${d.hour}`;
            if (!map[key]) map[key] = { total: 0, count: 0 };
            map[key].total += d.bikes;
            map[key].count++;
        });

        const chartData: any[] = [];
        for (let dow = 1; dow <= 7; dow++) { // 1=Mon, 7=Sun
            const realDow = dow === 7 ? 0 : dow;
            for (let h = 0; h < 24; h++) {
                const key = `${realDow}-${h}`;
                let val = 0;
                if (map[key]) val = map[key].total / map[key].count;
                chartData.push({ dayOfWeek: dow, hour: h, val });
            }
        }

        const margin = { top: 20, right: 20, bottom: 20, left: 40 };
        const width = Math.max(container.clientWidth, 600) - margin.left - margin.right;
        const height = container.clientHeight - margin.top - margin.bottom;

        const svg = d3.select(container).append('svg')
            .attr('width', width + margin.left + margin.right)
            .attr('height', height + margin.top + margin.bottom)
            .append('g').attr('transform', `translate(${margin.left},${margin.top})`);

        const x = d3.scaleBand().domain(d3.range(24).map(String)).range([0, width]).padding(0.05);
        const y = d3.scaleBand().domain(["1", "2", "3", "4", "5", "6", "7"]).range([0, height]).padding(0.05);

        const daysFr = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

        // Custom scale: Red (empty) to Green (full)
        const maxVal = d3.max(chartData, d => d.val) || 10;
        const colorScale = d3.scaleSequential(d3.interpolateRdYlGn).domain([0, maxVal]);

        svg.selectAll('rect').data(chartData).enter().append('rect')
            .attr('x', d => x(String(d.hour))!)
            .attr('y', d => y(String(d.dayOfWeek))!)
            .attr('width', x.bandwidth())
            .attr('height', y.bandwidth())
            .attr('fill', d => colorScale(d.val) as any)
            .attr('rx', 2);

        svg.append('g').attr('transform', `translate(0,${height})`).call(d3.axisBottom(x).tickFormat(d => `${d}h`)).select(".domain").remove();
        svg.append('g').call(d3.axisLeft(y).tickFormat((d, i) => daysFr[i])).select(".domain").remove();

        svg.selectAll(".tick line").remove();
        svg.selectAll(".tick text").style("fill", "#6B7280").style("font-size", "10px");
    }

    renderD1MatchStationsRadar() {
        if (!this.d1RadarChart || !this.nearbyStations.length) return;
        const container = this.d1RadarChart.nativeElement;
        container.innerHTML = '';

        const top3 = this.nearbyStations.slice(0, 3);
        const features = ["Proximité", "Capacité", "Disponibilité"];

        // Normalize data 0 to 1
        const maxCapArr = top3.map(s => s.bike_stands || 1);
        const maxCap = Math.max(...maxCapArr);

        const data = top3.map((s, idx) => {
            // Proximity: inverse of distance (mock score)
            const proxScore = 1 - (idx * 0.3); // Fake logic: 1st is 1.0, 2nd is 0.7, 3rd is 0.4

            // Availability: fake score for 18h
            const availScore = Math.random() * 0.5 + 0.3;

            return [
                { axis: "Proximité", value: Math.max(0.1, proxScore) },
                { axis: "Capacité", value: (s.bike_stands || 1) / maxCap },
                { axis: "Disponibilité", value: availScore }
            ];
        });

        const width = container.clientWidth;
        const height = container.clientHeight;
        const radius = Math.min(width, height) / 2 - 30;

        const svg = d3.select(container).append('svg')
            .attr('width', width)
            .attr('height', height)
            .append('g').attr('transform', `translate(${width / 2},${height / 2})`);

        const rScale = d3.scaleLinear().range([0, radius]).domain([0, 1]);
        const angleSlice = Math.PI * 2 / features.length;

        // Circular grid
        svg.selectAll(".gridCircle")
            .data([0.25, 0.5, 0.75, 1]).enter().append("circle")
            .attr("r", d => rScale(d))
            .style("fill", "#F3F4F6").style("stroke", "#E5E7EB").style("fill-opacity", 0.4);

        // Axes
        const axis = svg.selectAll(".axis").data(features).enter().append("g");

        axis.append("line")
            .attr("x1", 0).attr("y1", 0)
            .attr("x2", (d, i) => rScale(1.1) * Math.cos(angleSlice * i - Math.PI / 2))
            .attr("y2", (d, i) => rScale(1.1) * Math.sin(angleSlice * i - Math.PI / 2))
            .style("stroke", "#D1D5DB").style("stroke-width", "1px");

        axis.append("text")
            .attr("x", (d, i) => rScale(1.3) * Math.cos(angleSlice * i - Math.PI / 2))
            .attr("y", (d, i) => rScale(1.3) * Math.sin(angleSlice * i - Math.PI / 2))
            .text(d => d).style("text-anchor", "middle").style("font-size", "9px").style("fill", "#4B5563").style("font-weight", "bold");

        // Radars
        const colors = ['#1D4ED8', '#EF4444', '#10B981'];
        const radarLine = d3.lineRadial<any>()
            .angle((d, i) => i * angleSlice)
            .radius(d => rScale(d.value))
            .curve(d3.curveLinearClosed);

        data.forEach((d, i) => {
            svg.append("path")
                .datum(d)
                .attr("d", radarLine)
                .style("fill", colors[i]).style("fill-opacity", 0.2)
                .style("stroke", colors[i]).style("stroke-width", 2);
        });
    }

    renderD1ChasseCroise() {
        if (!this.d1StackedArea || !this.filteredData.length || !this.nearbyStations.length) return;
        const container = this.d1StackedArea.nativeElement;
        container.innerHTML = '';

        const nearbyIds = this.nearbyStations.map(s => s.id_velov);
        const relevantData = this.filteredData.filter(d => nearbyIds.includes(d.id_velov));

        const agg: any = {};
        relevantData.forEach(d => {
            if (!agg[d.hour]) agg[d.hour] = { arr: 0, dep: 0, count: 0 };
            agg[d.hour].arr += d.arrival30min;
            agg[d.hour].dep += d.departure30min;
            agg[d.hour].count++;
        });

        const chartData = Object.keys(agg).map(h => ({
            hour: +h,
            arr: agg[h].arr / (agg[h].count > 0 ? (agg[h].count / 2) : 1), // Pseudo norm
            dep: agg[h].dep / (agg[h].count > 0 ? (agg[h].count / 2) : 1)
        })).sort((a, b) => a.hour - b.hour);

        const margin = { top: 25, right: 30, bottom: 35, left: 45 };
        const width = container.clientWidth - margin.left - margin.right;
        const height = container.clientHeight - margin.top - margin.bottom;

        const svg = d3.select(container).append('svg')
            .attr('width', width + margin.left + margin.right)
            .attr('height', height + margin.top + margin.bottom)
            .append('g').attr('transform', `translate(${margin.left},${margin.top})`);

        const x = d3.scaleLinear().domain(this.temporalGranularity === 'interval' ? [this.startHourTime, this.endHourTime] : [0, 23]).range([0, width]);
        const maxY = d3.max(chartData, d => d.arr + d.dep) || 10;
        const y = d3.scaleLinear().domain([0, maxY]).range([height, 0]);

        svg.append('g').attr('transform', `translate(0,${height})`).call(d3.axisBottom(x).ticks(24).tickFormat(d => `${d}h`)).select(".domain").attr("stroke", "#E5E7EB");
        svg.append('g').call(d3.axisLeft(y).ticks(5)).select(".domain").remove();
        svg.selectAll(".tick line").attr("stroke", "#E5E7EB");
        svg.selectAll(".tick text").style("fill", "#6B7280").style("font-size", "9px");

        // Y axis label
        svg.append("text").attr("transform", "rotate(-90)").attr("y", -margin.left + 15)
            .attr("x", -(height / 2)).style("text-anchor", "middle")
            .style("font-size", "10px").style("fill", "#6B7280").text("Volume moyen");

        // X axis label 
        svg.append("text").attr("transform", `translate(${width / 2}, ${height + margin.bottom - 5})`)
            .style("text-anchor", "middle").style("font-size", "10px").style("fill", "#6B7280")
            .text("Heure de la journée");

        // Key/Legend
        svg.append("circle").attr("cx", 10).attr("cy", -10).attr("r", 4).style("fill", "#10B981")
        svg.append("text").attr("x", 20).attr("y", -10).text("Arrivées").style("font-size", "10px").attr("alignment-baseline", "middle").style("fill", "#6B7280")
        svg.append("circle").attr("cx", 80).attr("cy", -10).attr("r", 4).style("fill", "#F59E0B")
        svg.append("text").attr("x", 90).attr("y", -10).text("Départs").style("font-size", "10px").attr("alignment-baseline", "middle").style("fill", "#6B7280")

        // Stack the data
        const stack = d3.stack().keys(["arr", "dep"]);
        const stackedData = stack(chartData as any);

        const color = d3.scaleOrdinal().domain(["arr", "dep"]).range(["#10B981", "#F59E0B"]);

        const areaForm = d3.area<any>()
            .x(d => x(d.data.hour))
            .y0(d => y(d[0]))
            .y1(d => y(d[1]))
            .curve(d3.curveMonotoneX);

        svg.selectAll("mylayers")
            .data(stackedData).enter().append("path")
            .style("fill", d => color(d.key) as any)
            .style("fill-opacity", 0.6)
            .attr("d", areaForm);
    }


    renderD1Top3() {
        const top3Container = document.getElementById('d1-top3-container');
        if (!top3Container || !this.filteredData.length || !this.nearbyStations.length) return;

        const nearbyIds = this.nearbyStations.map(s => s.id_velov);
        const relevantData = this.filteredData.filter(d => nearbyIds.includes(d.id_velov));

        const agg: any = {};
        relevantData.forEach(d => {
            if (!agg[d.hour]) agg[d.hour] = 0;
            agg[d.hour] += (d.arrival30min + d.departure30min);
        });

        const sortedHours = Object.keys(agg).map(h => ({ hour: +h, moves: agg[h] }))
            .sort((a, b) => b.moves - a.moves).slice(0, 10);

        const getDesc = (h: number) => {
            if (h >= 7 && h <= 9) return "Pic du matin";
            if (h >= 16 && h <= 19) return "Sortie des cours";
            if (h >= 11 && h <= 14) return "Pause déjeuner";
            return "Mouvement régulier";
        };

        const colors = ["#EF4444", "#F59E0B", "#10B981", "#3B82F6", "#6366F1", "#8B5CF6", "#EC4899", "#6B7280", "#9CA3AF", "#D1D5DB"];

        top3Container.innerHTML = sortedHours.map((d, i) => `
            <div class="flex justify-between items-center text-sm ${i < 9 ? 'border-b pb-1' : ''}">
                <span class="font-bold flex items-center" style="color: ${colors[i]}">
                    <span class="w-5 inline-block">${i + 1}.</span> ${d.hour.toString().padStart(2, '0')}h00
                </span>
                <span class="text-gray-500 text-[10px]">${getDesc(d.hour)}</span>
            </div>
        `).join('');
    }


    renderD1KPIs() {
        setTimeout(() => {
            const top3 = this.nearbyStations.slice(0, 3);
            if (!top3.length) return;

            const totalPlaces = top3.reduce((acc, s) => acc + (s.bike_stands || 0), 0);

            // Calculate avg movements per day for the neighborhood
            const nearbyIds = top3.map(s => s.id_velov);
            const data = this.filteredData.filter(d => nearbyIds.includes(d.id_velov));
            const daysSet = new Set(data.map(d => `${d.year}-${d.month}-${d.day}`));
            const numDays = daysSet.size || 1;
            const totalMvt = data.reduce((acc, d) => acc + d.arrival30min + d.departure30min, 0);
            const mvtPerDay = totalMvt;

            const placesEl = document.getElementById('d1-kpi-places');
            const mvtEl = document.getElementById('d1-kpi-mvt');
            const distEl = document.getElementById('d1-kpi-nearest-dist');
            const nameEl = document.getElementById('d1-kpi-nearest-name');

            if (placesEl) placesEl.innerText = String(totalPlaces);
            if (mvtEl) mvtEl.innerText = String(mvtPerDay);

            if (distEl && nameEl && this.selectedEtab) {
                const getCenter = (f: any) => {
                    if (f.bbox && f.bbox.length === 4) return { lat: (f.bbox[1] + f.bbox[3]) / 2, lon: (f.bbox[0] + f.bbox[2]) / 2 };
                    if (f.geometry?.type === 'Point') return { lat: f.geometry.coordinates[1], lon: f.geometry.coordinates[0] };
                    if (f.geometry?.type === 'MultiPolygon' && f.geometry.coordinates?.[0]?.[0]?.[0]) return { lat: f.geometry.coordinates[0][0][0][1], lon: f.geometry.coordinates[0][0][0][0] };
                    return { lat: 0, lon: 0 };
                };
                const myCenter = getCenter(this.selectedEtab);
                const closest = top3[0];
                const dist = Math.round(this.getDistance(myCenter.lat, myCenter.lon, closest.latitude, closest.longitude));
                distEl.innerText = dist + 'm';
                nameEl.innerText = (closest.name || '').replace(' - ', ' ');
                nameEl.title = (closest.name || '');
            }
        }, 0);
    }

    renderD1PartsMarche() {
        if (!this.d1PartsMarche || !this.filteredData.length || !this.nearbyStations.length) return;
        const container = this.d1PartsMarche.nativeElement;
        container.innerHTML = '';

        const top5 = this.nearbyStations.slice(0, 5);
        if (!top5.length) return;
        const top5Ids = top5.map(s => s.id_velov);

        const mvtByStation: any = {};
        top5Ids.forEach(id => mvtByStation[id] = 0);

        this.filteredData.forEach(d => {
            if (mvtByStation[d.id_velov] !== undefined) {
                mvtByStation[d.id_velov] += (d.arrival30min + d.departure30min);
            }
        });

        const chartData = top5.map(s => ({
            name: (s.name || '').split(' - ')[1] || s.name || '',
            value: mvtByStation[s.id_velov]
        })).filter(d => d.value > 0);

        if (!chartData.length) return;

        const width = container.clientWidth;
        const height = container.clientHeight || 160;
        const radius = Math.min(width, height) / 2 - 10;

        const svg = d3.select(container).append('svg')
            .attr('width', width).attr('height', height)
            .append('g').attr('transform', `translate(${width / 2},${height / 2})`);

        const color = d3.scaleOrdinal().domain(chartData.map(d => d.name))
            .range(['#1D4ED8', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899']);

        const pie = d3.pie<any>().value(d => d.value);
        const data_ready = pie(chartData);

        const arcGenerator = d3.arc<any>().innerRadius(radius * 0.4).outerRadius(radius);

        svg.selectAll('slices')
            .data(data_ready).enter().append('path')
            .attr('d', arcGenerator)
            .attr('fill', d => color(d.data.name) as any)
            .attr('stroke', 'white')
            .style('stroke-width', '2px');

        const arcLabels = d3.arc<any>().innerRadius(radius * 0.7).outerRadius(radius * 0.7);
        svg.selectAll('slices')
            .data(data_ready).enter().append('text')
            .text(d => d.data.name.substring(0, 10))
            .attr('transform', d => `translate(${arcLabels.centroid(d)})`)
            .style('text-anchor', 'middle').style('font-size', '8px').style('fill', 'white').style('font-weight', 'bold');
    }

    renderD1RotationQuartier() {
        if (!this.d1RotationQuartier || !this.filteredData.length || !this.nearbyStations.length) return;
        const container = this.d1RotationQuartier.nativeElement;
        container.innerHTML = '';

        const top3 = this.nearbyStations.slice(0, 3);
        if (!top3.length) return;
        const topIds = top3.map(s => s.id_velov);

        const mvtByStation: any = {};
        topIds.forEach(id => mvtByStation[id] = 0);

        const daysSet = new Set();
        this.filteredData.forEach(d => {
            if (mvtByStation[d.id_velov] !== undefined) {
                mvtByStation[d.id_velov] += (d.arrival30min + d.departure30min);
                daysSet.add(`${d.year}-${d.month}-${d.day}`);
            }
        });

        const numDays = daysSet.size || 1;
        const chartData = top3.map(s => {
            const dailyAvg = mvtByStation[s.id_velov] / numDays;
            const rotation = s.bike_stands ? +(dailyAvg / s.bike_stands).toFixed(1) : 0;
            return {
                name: ((s.name || '').split(' - ')[1] || s.name || '').substring(0, 15),
                rotation
            };
        });

        const margin = { top: 10, right: 30, bottom: 20, left: 80 };
        const width = container.clientWidth - margin.left - margin.right;
        const height = container.clientHeight - margin.top - margin.bottom;

        const svg = d3.select(container).append('svg')
            .attr('width', width + margin.left + margin.right)
            .attr('height', height + margin.top + margin.bottom)
            .append('g').attr('transform', `translate(${margin.left},${margin.top})`);

        const x = d3.scaleLinear().domain([0, (d3.max(chartData, d => d.rotation) || 5) * 1.2]).range([0, width]);
        const y = d3.scaleBand().domain(chartData.map(d => d.name)).range([0, height]).padding(0.2);

        svg.append('g').call(d3.axisLeft(y)).selectAll('text').style('font-size', '9px').style('fill', '#4B5563');
        svg.selectAll('.domain, .tick line').remove();

        svg.selectAll('rect')
            .data(chartData).enter().append('rect')
            .attr('y', d => y(d.name)!)
            .attr('x', 0)
            .attr('width', d => x(d.rotation))
            .attr('height', y.bandwidth())
            .attr('fill', '#10B981')
            .attr('rx', 3);

        svg.selectAll('text.val')
            .data(chartData).enter().append('text')
            .attr('class', 'val')
            .attr('y', d => y(d.name)! + y.bandwidth() / 2 + 3)
            .attr('x', d => x(d.rotation) + 5)
            .text(d => d.rotation + 'x')
            .style('font-size', '9px').style('font-weight', 'bold').style('fill', '#10B981');
    }

    renderD1MatchJours() {
        if (!this.d1MatchJours || !this.filteredData.length || !this.nearbyStations.length) return;
        const container = this.d1MatchJours.nativeElement;
        container.innerHTML = '';

        const nearbyIds = this.nearbyStations.slice(0, 3).map(s => s.id_velov);
        const map: any = {};
        this.filteredData.filter(d => nearbyIds.includes(d.id_velov)).forEach(d => {
            const date = new Date(d.year, d.month - 1, d.day);
            const dow = date.getDay();
            const realDow = dow === 0 ? 7 : dow;
            if (!map[realDow]) map[realDow] = { mvt: 0, count: 0 };
            map[realDow].mvt += (d.arrival30min + d.departure30min);
            map[realDow].count++;
        });

        const daysFr = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
        const chartData = [1, 2, 3, 4, 5, 6, 7].map(dow => {
            let mvt = map[dow] ? map[dow].mvt / (map[dow].count / 24 || 1) : 0;
            return { rawDay: dow, day: daysFr[dow - 1], avgMvt: mvt };
        });

        const margin = { top: 10, right: 10, bottom: 20, left: 30 };
        const width = container.clientWidth - margin.left - margin.right;
        const height = container.clientHeight - margin.top - margin.bottom;

        const svg = d3.select(container).append('svg')
            .attr('width', width + margin.left + margin.right)
            .attr('height', height + margin.top + margin.bottom)
            .append('g').attr('transform', `translate(${margin.left},${margin.top})`);

        const x = d3.scaleBand().range([0, width]).domain(chartData.map(d => d.day)).padding(.3);
        const y = d3.scaleLinear().domain([0, (d3.max(chartData, d => d.avgMvt) || 10) * 1.1]).range([height, 0]);

        svg.append('g').attr('transform', `translate(0,${height})`).call(d3.axisBottom(x)).select('.domain').attr('stroke', '#E5E7EB');
        svg.append('g').call(d3.axisLeft(y).ticks(5)).select('.domain').remove();
        svg.selectAll('.tick text').style('fill', '#6B7280').style('font-size', '10px');

        svg.selectAll('myRect').data(chartData).enter().append('rect')
            .attr('x', d => x(d.day)!)
            .attr('y', d => y(d.avgMvt))
            .attr('width', x.bandwidth())
            .attr('height', d => height - y(d.avgMvt))
            .attr('fill', d => (d.rawDay === 6 || d.rawDay === 7) ? '#10B981' : '#1D4ED8')
            .attr('rx', 4);
    }

    renderD1ActivityHeatmap() {
        if (!this.d1ActivityHeatmap || !this.filteredData.length || !this.nearbyStations.length) return;
        const container = this.d1ActivityHeatmap.nativeElement;
        container.innerHTML = '';

        const nearbyIds = this.nearbyStations.slice(0, 3).map(s => s.id_velov);
        const relevantData = this.filteredData.filter(d => nearbyIds.includes(d.id_velov));

        const map: any = {};
        relevantData.forEach(d => {
            const date = new Date(d.year, d.month - 1, d.day);
            const dow = date.getDay();
            const key = `${dow}-${d.hour}`;
            if (!map[key]) map[key] = { mvt: 0, count: 0 };
            map[key].mvt += (d.arrival30min + d.departure30min);
            map[key].count++;
        });

        const chartData: any[] = [];
        for (let dow = 1; dow <= 7; dow++) {
            const realDow = dow === 7 ? 0 : dow;
            for (let h = 0; h < 24; h++) {
                const key = `${realDow}-${h}`;
                let val = map[key] ? map[key].mvt / (map[key].count / 3 || 1) : 0;
                chartData.push({ dayOfWeek: dow, hour: h, val });
            }
        }

        const margin = { top: 20, right: 20, bottom: 20, left: 40 };
        const width = Math.max(container.clientWidth, 600) - margin.left - margin.right;
        const height = container.clientHeight - margin.top - margin.bottom;

        const svg = d3.select(container).append('svg')
            .attr('width', width + margin.left + margin.right)
            .attr('height', height + margin.top + margin.bottom)
            .append('g').attr('transform', `translate(${margin.left},${margin.top})`);

        const x = d3.scaleBand().domain(d3.range(24).map(String)).range([0, width]).padding(0.05);
        const y = d3.scaleBand().domain(['1', '2', '3', '4', '5', '6', '7']).range([0, height]).padding(0.05);
        const daysFr = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

        const maxVal = d3.max(chartData, d => d.val) || 10;
        const colorScale = d3.scaleSequential(d3.interpolateOranges).domain([0, maxVal]);

        svg.selectAll('rect').data(chartData).enter().append('rect')
            .attr('x', d => x(String(d.hour))!)
            .attr('y', d => y(String(d.dayOfWeek))!)
            .attr('width', x.bandwidth()).attr('height', y.bandwidth())
            .attr('fill', d => d.val > 0 ? colorScale(d.val) as any : '#F3F4F6')
            .attr('rx', 2);

        svg.append('g').attr('transform', `translate(0,${height})`).call(d3.axisBottom(x).tickFormat(d => `${d}h`)).select('.domain').remove();
        svg.append('g').call(d3.axisLeft(y).tickFormat((d, i) => daysFr[i])).select('.domain').remove();
        svg.selectAll('.tick line').remove();
        svg.selectAll('.tick text').style('fill', '#6B7280').style('font-size', '10px');
    }

    renderD1DispoDistribution() {
        if (!this.d1DispoDistribution || !this.filteredData.length || !this.nearbyStations.length) return;
        const container = this.d1DispoDistribution.nativeElement;
        container.innerHTML = '';

        const top3 = this.nearbyStations.slice(0, 3);
        const topIds = top3.map(s => s.id_velov);
        const capacities: any = {};
        top3.forEach(s => capacities[s.id_velov] = s.bike_stands || 20);

        let empty = 0, normal = 0, full = 0;

        // Group by hour/day
        const timeMap: any = {};
        this.filteredData.filter(d => topIds.includes(d.id_velov)).forEach(d => {
            const key = `${d.day}-${d.hour}`;
            if (!timeMap[key]) timeMap[key] = { bikes: 0, standCap: 0 };
            timeMap[key].bikes += d.bikes;
            timeMap[key].standCap += capacities[d.id_velov];
        });

        Object.values(timeMap).forEach((d: any) => {
            const ratio = d.standCap ? d.bikes / d.standCap : 0;
            if (ratio < 0.1) empty++;
            else if (ratio > 0.9) full++;
            else normal++;
        });

        const total = empty + normal + full || 1;
        const chartData = [
            { label: 'Pénurie (<10%)', value: empty, color: '#EF4444' },
            { label: 'Normal (10-90%)', value: normal, color: '#10B981' },
            { label: 'Saturé (>90%)', value: full, color: '#F59E0B' }
        ].filter(d => d.value > 0);

        if (!chartData.length) return;

        const width = container.clientWidth;
        const height = container.clientHeight || 200;
        const radius = Math.min(width, height) / 2 - 20;

        const svg = d3.select(container).append('svg')
            .attr('width', width).attr('height', height)
            .append('g').attr('transform', `translate(${width / 2},${height / 2})`);

        const pie = d3.pie<any>().value(d => d.value);
        const data_ready = pie(chartData);

        const arcGenerator = d3.arc<any>().innerRadius(radius * 0.5).outerRadius(radius);

        svg.selectAll('slices')
            .data(data_ready).enter().append('path')
            .attr('d', arcGenerator)
            .attr('fill', d => d.data.color)
            .attr('stroke', 'white').style('stroke-width', '2px');

        const arcLabels = d3.arc<any>().innerRadius(radius * 0.8).outerRadius(radius * 0.8);
        svg.selectAll('slices')
            .data(data_ready).enter().append('text')
            .text(d => Math.round((d.data.value / total) * 100) + '%')
            .attr('transform', d => `translate(${arcLabels.centroid(d)})`)
            .style('text-anchor', 'middle').style('font-size', '10px').style('fill', 'white').style('font-weight', 'bold');

        // Legend below
        const legend = svg.append('g').attr('transform', `translate(-${width / 2 - 10}, ${radius + 10})`);
        let xOffset = 0;
        chartData.forEach((d, i) => {
            const g = legend.append('g').attr('transform', `translate(${xOffset}, 0)`);
            g.append('rect').attr('w', 8).attr('h', 8).attr('fill', d.color).attr('rx', 2).attr('width', 8).attr('height', 8);
            g.append('text').attr('x', 12).attr('y', 7).text(d.label).style('font-size', '9px').style('fill', '#4B5563');
            xOffset += 80;
        });
    }

    // --- DASHBOARD 2 IMPLEMENTATIONS ---


    renderDashboard2() {
        if (!this.station) return;

        // Render all panels in the single view
        this.renderD2KPIs();
        this.renderD2CourbeRespiration();
        this.renderD2MatchJours();
        this.renderD2CalendrierAvent();
        this.renderD2EntreesSorties();
        if (this.temporalGranularity !== 'day' && this.temporalGranularity !== 'interval') {
            this.renderD2SemaineWeekend();
        }
        this.renderD2TopPannes();
        this.renderD2QuiUtilise();

        // 5 New Panels
        this.renderD2Rotation();
        this.renderD2Record();
        this.renderD2PieChart();
        this.renderD2HeurJourHeatmap();
        this.renderD2VoisinsLine();
    }

    renderD2KPIs() {
        // Saturation
        let totalBikes = 0;
        let count = 0;
        this.filteredData.forEach(d => {
            totalBikes += d.bikes;
            count++;
        });

        const avgBikes = totalBikes / (count || 1);
        const capacity = this.station?.bike_stands || 20;

        // Update the total places explicitly in the DOM, since the bindings might show 0 if not fully ready
        const placesEl = document.getElementById('d2-total-places');
        if (placesEl) {
            placesEl.innerText = String(capacity);
        }

        // Cap saturation at 100%
        let saturation = Math.round((avgBikes / capacity) * 100);
        if (saturation > 100) saturation = 100;

        const satBg = document.getElementById('d2-saturation-bg');
        const satBar = document.getElementById('d2-saturation-bar');
        const satText = document.getElementById('d2-saturation-text');

        if (satBar && satText) {
            satBar.style.width = `${saturation}%`;
            // Color based on saturation level
            if (saturation < 20) satBar.style.backgroundColor = '#EF4444'; // Red (empty)
            else if (saturation > 80) satBar.style.backgroundColor = '#F59E0B'; // Yellow (full)
            else satBar.style.backgroundColor = '#10B981'; // Green (ok)

            satText.innerText = `${saturation}% Plein (Moyenne)`;
        }

        // Indice de confiance: Check days between 17h and 19h if bikes > 0
        const eveningData = this.filteredData.filter(d => d.hour >= 17 && d.hour <= 19);
        let successCount = 0;
        let totalEveningCount = eveningData.length || 1;

        eveningData.forEach(d => {
            if (d.bikes > 0) successCount++;
        });

        const starScore = Math.round((successCount / totalEveningCount) * 5);
        let starsHtml = '';
        for (let i = 1; i <= 5; i++) {
            const color = i <= starScore ? '#F59E0B' : '#E5E7EB'; // Yellow or Gray
            starsHtml += `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="${color}" stroke="${color}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>`;
        }
        const starsContainer = document.getElementById('d2-stars-container');
        if (starsContainer) {
            starsContainer.innerHTML = starsHtml;
        }
    }

    renderD2CourbeRespiration() {
        if (!this.d2LineChart || !this.filteredData.length) return;
        const container = this.d2LineChart.nativeElement;
        container.innerHTML = '';

        const agg: any = {};
        this.filteredData.forEach(d => {
            if (!agg[d.hour]) agg[d.hour] = { total: 0, count: 0 };
            agg[d.hour].total += d.bikes;
            agg[d.hour].count++;
        });
        const chartData = Object.keys(agg).map(h => ({
            hour: +h,
            avg: agg[h].total / agg[h].count
        })).sort((a, b) => a.hour - b.hour);

        const margin = { top: 10, right: 20, bottom: 20, left: 30 };
        const width = container.clientWidth - margin.left - margin.right;
        const height = container.clientHeight - margin.top - margin.bottom;

        const svg = d3.select(container).append('svg')
            .attr('width', width + margin.left + margin.right)
            .attr('height', height + margin.top + margin.bottom)
            .append('g').attr('transform', `translate(${margin.left},${margin.top})`);

        const x = d3.scaleLinear().domain(this.temporalGranularity === 'interval' ? [this.startHourTime, this.endHourTime] : [0, 23]).range([0, width]);
        const y = d3.scaleLinear().domain([0, d3.max(chartData, d => d.avg) || 10]).range([height, 0]);

        svg.append('g').attr('transform', `translate(0,${height})`).call(d3.axisBottom(x).ticks(12).tickFormat(d => `${d}h`))
            .select(".domain").attr("stroke", "#E5E7EB");
        svg.append('g').call(d3.axisLeft(y).ticks(5)).select(".domain").remove();

        svg.selectAll(".tick line").attr("stroke", "#E5E7EB");
        svg.selectAll(".tick text").style("fill", "#6B7280").style("font-size", "10px");

        // Simple gradient fill
        const defs = svg.append("defs");
        const gradient = defs.append("linearGradient").attr("id", "area-gradient").attr("x1", "0%").attr("y1", "0%").attr("x2", "0%").attr("y2", "100%");
        gradient.append("stop").attr("offset", "0%").style("stop-color", "#1D4ED8").style("stop-opacity", 0.4);
        gradient.append("stop").attr("offset", "100%").style("stop-color", "#1D4ED8").style("stop-opacity", 0.0);

        const area = d3.area<any>().x(d => x(d.hour)).y0(height).y1(d => y(d.avg)).curve(d3.curveMonotoneX);
        svg.append("path").datum(chartData).attr("fill", "url(#area-gradient)").attr("d", area);

        const line = d3.line<any>().x(d => x(d.hour)).y(d => y(d.avg)).curve(d3.curveMonotoneX);
        svg.append('path').datum(chartData).attr('fill', 'none').attr('stroke', '#1D4ED8').attr('stroke-width', 3).attr('d', line);
    }

    renderD2MatchJours() {
        if (!this.d2BarChart || !this.filteredData.length) return;
        const container = this.d2BarChart.nativeElement;
        container.innerHTML = '';

        const map: any = {};
        this.filteredData.forEach(d => {
            const date = new Date(d.year, d.month - 1, d.day);
            const dow = date.getDay();
            const realDow = dow === 0 ? 7 : dow; // 1 to 7 (Mon-Sun)
            if (!map[realDow]) map[realDow] = { mvt: 0, daysCount: new Set() };
            map[realDow].mvt += (d.arrival30min + d.departure30min);
            map[realDow].daysCount.add(d.day);
        });

        const daysFr = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
        const chartData = [1, 2, 3, 4, 5, 6, 7].map(dow => {
            let mvt = 0;
            if (map[dow]) {
                mvt = map[dow].mvt / (map[dow].daysCount.size || 1); // avg per day type
            }
            return { rawDay: dow, day: daysFr[dow - 1], avgMvt: mvt };
        });

        const margin = { top: 10, right: 10, bottom: 20, left: 30 };
        const width = container.clientWidth - margin.left - margin.right;
        const height = container.clientHeight - margin.top - margin.bottom;

        const svg = d3.select(container).append('svg')
            .attr('width', width + margin.left + margin.right)
            .attr('height', height + margin.top + margin.bottom)
            .append('g').attr('transform', `translate(${margin.left},${margin.top})`);

        const x = d3.scaleBand().range([0, width]).domain(chartData.map(d => d.day)).padding(.3);
        const y = d3.scaleLinear().domain([0, d3.max(chartData, d => d.avgMvt) || 10]).range([height, 0]);

        svg.append('g').attr('transform', `translate(0,${height})`).call(d3.axisBottom(x)).select(".domain").attr("stroke", "#E5E7EB");
        svg.append('g').call(d3.axisLeft(y).ticks(5)).select(".domain").remove();

        svg.selectAll(".tick text").style("fill", "#6B7280").style("font-size", "10px");

        svg.selectAll("myRect").data(chartData).enter().append("rect")
            .attr("x", d => x(d.day)!)
            .attr("y", d => y(d.avgMvt))
            .attr("width", x.bandwidth())
            .attr("height", d => height - y(d.avgMvt))
            .attr("fill", d => (d.rawDay === 6 || d.rawDay === 7) ? "#10B981" : "#1D4ED8") // Green for w-e, Blue for week
            .attr("rx", 4);
    }

    renderD2CalendrierAvent() {
        if (!this.d2CalendarHeatmap || !this.filteredData.length) return;
        const container = this.d2CalendarHeatmap.nativeElement;
        container.innerHTML = '';

        // Heatmap: usage (arriv + dep) per day of month
        const map: any = {};
        this.filteredData.forEach(d => {
            const key = d.day;
            if (!map[key]) map[key] = 0;
            map[key] += (d.arrival30min + d.departure30min);
        });

        const numDays = 31; // assuming december
        const chartData = Array.from({ length: numDays }, (_, i) => {
            const day = i + 1;
            return {
                day: day,
                mvt: map[day] || 0
            };
        });

        // Use available width to calculate cell size dynamically
        const availableWidth = container.clientWidth - 20; // 10px margin each side
        const cols = 7;
        const cellSize = Math.floor(availableWidth / cols);

        const width = cols * cellSize + 20;
        const height = Math.ceil(numDays / cols) * cellSize + 20;

        const svg = d3.select(container).append('svg')
            .attr('width', width)
            .attr('height', height);

        const colorScale = d3.scaleSequential(d3.interpolateBlues).domain([0, d3.max(chartData, d => d.mvt) || 10]);

        // Draw cells
        const g = svg.append('g').attr('transform', `translate(10, 10)`);

        g.selectAll('.day-cell')
            .data(chartData)
            .enter().append('rect')
            .attr('class', 'day-cell')
            .attr('width', cellSize - 2)
            .attr('height', cellSize - 2)
            .attr('x', d => ((d.day - 1) % cols) * cellSize)
            .attr('y', d => Math.floor((d.day - 1) / cols) * cellSize)
            .attr('fill', d => d.mvt > 0 ? colorScale(d.mvt) as any : '#F3F4F6')
            .attr('rx', 3);

        // Add text labels
        g.selectAll('.day-text')
            .data(chartData)
            .enter().append('text')
            .attr('class', 'day-text')
            .attr('x', d => ((d.day - 1) % cols) * cellSize + (cellSize / 2))
            .attr('y', d => Math.floor((d.day - 1) / cols) * cellSize + (cellSize / 2) + 4)
            .attr('text-anchor', 'middle')
            .style('font-size', '10px')
            .style('fill', d => d.mvt > (d3.max(chartData, x => x.mvt) || 1) / 2 ? 'white' : '#6B7280')
            .text(d => d.day);
    }

    renderD2EntreesSorties() {
        if (!this.d2StackedBar || !this.filteredData.length) return;
        const container = this.d2StackedBar.nativeElement;
        container.innerHTML = '';

        const agg: any = {};
        this.filteredData.forEach(d => {
            if (!agg[d.hour]) agg[d.hour] = { in: 0, out: 0, count: 0 };
            agg[d.hour].in += d.arrival30min;
            agg[d.hour].out += d.departure30min;
            agg[d.hour].count++;
        });

        const chartData = Object.keys(agg).map(h => ({
            hour: +h,
            arr: agg[h].in / (agg[h].count > 0 ? (agg[h].count / 2) : 1), // Using same pseudonorm as D1
            dep: agg[h].out / (agg[h].count > 0 ? (agg[h].count / 2) : 1)
        })).sort((a, b) => a.hour - b.hour);

        const margin = { top: 10, right: 10, bottom: 20, left: 30 };
        const width = container.clientWidth - margin.left - margin.right;
        const height = container.clientHeight - margin.top - margin.bottom;

        const svg = d3.select(container).append('svg')
            .attr('width', width + margin.left + margin.right)
            .attr('height', height + margin.top + margin.bottom)
            .append('g').attr('transform', `translate(${margin.left},${margin.top})`);

        const x = d3.scaleBand().domain(chartData.map(d => d.hour.toString())).range([0, width]).padding(0.2);

        // Find max combined value for stack
        const maxY = d3.max(chartData, d => d.arr + d.dep) || 10;
        const y = d3.scaleLinear().domain([0, maxY]).range([height, 0]);

        svg.append('g').attr('transform', `translate(0,${height})`).call(d3.axisBottom(x).tickValues(chartData.filter(d => d.hour % 2 === 0).map(d => d.hour.toString()))).select(".domain").attr("stroke", "#E5E7EB");
        svg.append('g').call(d3.axisLeft(y).ticks(5)).select(".domain").remove();

        // Stack setup
        const stack = d3.stack().keys(["arr", "dep"]);
        const stackedValues = stack(chartData as any);
        const colors = ["#10B981", "#F59E0B"]; // Green (in), Orange (out)

        svg.selectAll("mylayers")
            .data(stackedValues)
            .enter().append("g")
            .attr("fill", (d, i) => colors[i])
            .selectAll("rect")
            .data(d => d)
            .enter().append("rect")
            .attr("x", d => x(d.data['hour']?.toString())!)
            .attr("y", d => y(d[1]))
            .attr("height", d => y(d[0]) - y(d[1]))
            .attr("width", x.bandwidth());
    }

    private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
        const R = 6371e3; // metres
        const lat1Rad = lat1 * Math.PI / 180;
        const lat2Rad = lat2 * Math.PI / 180;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1Rad) * Math.cos(lat2Rad) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    renderD2QuiUtilise() {
        if (!this.d2RadarUsers || !this.allEtablissements || !this.station) return;
        const container = this.d2RadarUsers.nativeElement;
        container.innerHTML = '';

        const width = container.clientWidth;
        const height = container.clientHeight || 180; // default minimum
        const cx = width / 2;
        const cy = height / 2;

        const maxDist = 500; // 500m radius

        const getCenter = (f: any) => {
            if (f.bbox && f.bbox.length === 4) return { lat: (f.bbox[1] + f.bbox[3]) / 2, lon: (f.bbox[0] + f.bbox[2]) / 2 };
            if (f.geometry?.type === 'Point') return { lat: f.geometry.coordinates[1], lon: f.geometry.coordinates[0] };
            if (f.geometry?.type === 'MultiPolygon' && f.geometry.coordinates?.[0]?.[0]?.[0]) return { lat: f.geometry.coordinates[0][0][0][1], lon: f.geometry.coordinates[0][0][0][0] };
            return { lat: 0, lon: 0 };
        };

        // Filter and compute exact polar coordinates
        let nearbyEtabs = this.allEtablissements
            .map(e => {
                const coord = getCenter(e); // {lat, lon}
                const dist = this.calculateDistance(this.station!.latitude, this.station!.longitude, coord.lat, coord.lon);

                // Euclidean offset in meters relative to station for plotting
                const dLat = (coord.lat - this.station!.latitude) * Math.PI / 180;
                const dLon = (coord.lon - this.station!.longitude) * Math.PI / 180;
                const R = 6371e3;
                let xMeters = dLon * Math.cos((this.station!.latitude + coord.lat) / 2 * Math.PI / 180) * R;
                let yMeters = dLat * R;

                return { ...e, name: e.properties?.nom?.split(' ')[0] || 'Ecole', dist, xMeters, yMeters };
            })
            .filter(e => e.dist <= maxDist)
            .sort((a, b) => a.dist - b.dist)
            .slice(0, 10); // max 10 to avoid clutter

        const svg = d3.select(container).append('svg')
            .attr('width', width)
            .attr('height', height);

        // Ranges circles
        svg.append("circle").attr("cx", cx).attr("cy", cy).attr("r", Math.min(width, height) / 2 - 10).attr("fill", "none").attr("stroke", "#F3F4F6").attr("stroke-dasharray", "4,4");
        svg.append("circle").attr("cx", cx).attr("cy", cy).attr("r", Math.min(width, height) / 4).attr("fill", "none").attr("stroke", "#E5E7EB");

        // Center Station
        svg.append("circle").attr("cx", cx).attr("cy", cy).attr("r", 6).attr("fill", "#1D4ED8");
        svg.append("text").attr("x", cx).attr("y", cy - 10).attr("text-anchor", "middle").style("font-size", "10px").style("fill", "#1D4ED8").style("font-weight", "bold").text("Station");

        const scale = (Math.min(width, height) / 2 - 20) / maxDist;

        const renderedEtabs = nearbyEtabs.map(e => ({
            name: e.name,
            x: cx + e.xMeters * scale,
            y: cy - e.yMeters * scale // SVG y is inverted
        }));

        // Etabs
        svg.selectAll(".etab").data(renderedEtabs).enter().append("circle")
            .attr("cx", d => d.x).attr("cy", d => d.y).attr("r", 4).attr("fill", "#8B5CF6");

        svg.selectAll(".etab-label").data(renderedEtabs).enter().append("text")
            .attr("x", d => d.x).attr("y", d => d.y + 12).attr("text-anchor", "middle")
            .style("font-size", "8px").style("fill", "#6B7280").text(d => d.name);
    }
    renderD2SemaineWeekend() {
        if (!this.d2DualLine || !this.filteredData.length) return;
        const container = this.d2DualLine.nativeElement;
        container.innerHTML = '';

        const aggWe: any = {};
        const aggWk: any = {};

        this.filteredData.forEach(d => {
            const date = new Date(d.year, d.month - 1, d.day);
            const dow = date.getDay();
            const isWe = (dow === 0 || dow === 6);

            const target = isWe ? aggWe : aggWk;
            if (!target[d.hour]) target[d.hour] = { total: 0, count: 0 };
            target[d.hour].total += d.bikes;
            target[d.hour].count++;
        });

        const wkData = Object.keys(aggWk).map(h => ({ hour: +h, avg: aggWk[h].total / aggWk[h].count })).sort((a, b) => a.hour - b.hour);
        const weData = Object.keys(aggWe).map(h => ({ hour: +h, avg: aggWe[h].total / aggWe[h].count })).sort((a, b) => a.hour - b.hour);

        const margin = { top: 10, right: 10, bottom: 20, left: 30 };
        const width = container.clientWidth - margin.left - margin.right;
        const height = container.clientHeight - margin.top - margin.bottom;

        const svg = d3.select(container).append('svg')
            .attr('width', width + margin.left + margin.right)
            .attr('height', height + margin.top + margin.bottom)
            .append('g').attr('transform', `translate(${margin.left},${margin.top})`);

        const x = d3.scaleLinear().domain(this.temporalGranularity === 'interval' ? [this.startHourTime, this.endHourTime] : [0, 23]).range([0, width]);
        const maxY = Math.max(d3.max(wkData, d => d.avg) || 0, d3.max(weData, d => d.avg) || 0) || 10;
        const y = d3.scaleLinear().domain([0, maxY]).range([height, 0]);

        svg.append('g').attr('transform', `translate(0,${height})`).call(d3.axisBottom(x).ticks(6).tickFormat(d => `${d}h`)).select(".domain").attr("stroke", "#E5E7EB");
        svg.append('g').call(d3.axisLeft(y).ticks(3)).select(".domain").remove();

        svg.selectAll(".tick line").attr("stroke", "#E5E7EB");
        svg.selectAll(".tick text").style("fill", "#6B7280").style("font-size", "9px");

        const line = d3.line<any>().x(d => x(d.hour)).y(d => y(d.avg)).curve(d3.curveMonotoneX);

        // Week line (Blue)
        svg.append('path').datum(wkData).attr('fill', 'none').attr('stroke', '#1D4ED8').attr('stroke-width', 2).attr('d', line);
        // Weekend line (Green, dashed)
        svg.append('path').datum(weData).attr('fill', 'none').attr('stroke', '#10B981').attr('stroke-width', 2).attr('stroke-dasharray', '4,4').attr('d', line);

        // Legend
        svg.append('text').attr('x', 10).attr('y', 10).style('fill', '#1D4ED8').style('font-size', '9px').style('font-weight', 'bold').text('- Semaine');
        svg.append('text').attr('x', 10).attr('y', 22).style('fill', '#10B981').style('font-size', '9px').style('font-weight', 'bold').text('-- Week-end');
    }

    renderD2TopPannes() {
        const topContainer = document.getElementById('d2-pannes-container');
        if (!topContainer || !this.filteredData.length) return;

        // Count hours where bikes === 0 per day
        const emptyHoursPerDay: any = {};
        this.filteredData.forEach(d => {
            if (d.bikes === 0) {
                if (!emptyHoursPerDay[d.day]) emptyHoursPerDay[d.day] = 0;
                emptyHoursPerDay[d.day]++;
            }
        });

        const sortedDays = Object.keys(emptyHoursPerDay).map(day => ({ day: +day, hoursEmpty: emptyHoursPerDay[day] }))
            .sort((a, b) => b.hoursEmpty - a.hoursEmpty).slice(0, 3);

        if (sortedDays.length === 0) {
            topContainer.innerHTML = '<div class="text-[10px] text-gray-500 italic">Aucune panne détectée.</div>';
            return;
        }

        topContainer.innerHTML = sortedDays.map((d, i) => `
            <div class="flex justify-between items-center text-sm ${i < 2 ? 'border-b pb-1' : ''}">
                <span class="font-bold text-[#EF4444]">${i + 1}. ${d.day} Décembre</span>
                <span class="text-gray-500 text-xs">${d.hoursEmpty}h vide</span>
            </div>
        `).join('');
    }

    renderD2Rotation() {
        let totalMvt = 0;
        const days = new Set<string>();
        this.filteredData.forEach(d => {
            totalMvt += d.arrival30min + d.departure30min;
            days.add(`${d.year}-${d.month}-${d.day}`);
        });
        const capacity = this.station?.bike_stands || 20;
        const avgDailyMvt = days.size ? (totalMvt / days.size) : 0;
        const rotation = avgDailyMvt / capacity;

        const el = document.getElementById('d2-rotation');
        if (el) el.innerText = `${rotation.toFixed(1)}x / jour`;
    }

    renderD2Record() {
        const agg: any = {};
        this.filteredData.forEach(d => {
            const dateStr = new Date(d.year, d.month - 1, d.day).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
            const key = `${dateStr} à ${d.hour}h`;
            if (!agg[key]) agg[key] = 0;
            agg[key] += d.arrival30min + d.departure30min;
        });

        let maxVal = 0;
        let maxKey = 'Aucun';
        for (const k in agg) {
            if (agg[k] > maxVal) {
                maxVal = agg[k];
                maxKey = k;
            }
        }

        const textEl = document.getElementById('d2-record-date');
        const valEl = document.getElementById('d2-record-value');
        if (textEl) textEl.innerText = maxKey;
        if (valEl) valEl.innerText = maxVal.toString();
    }

    renderD2PieChart() {
        if (!this.d2PieChart || !this.filteredData.length) return;
        const container = this.d2PieChart.nativeElement;
        container.innerHTML = '';

        let vide = 0, norm = 0, sat = 0;
        const capacity = this.station?.bike_stands || 20;
        this.filteredData.forEach(d => {
            if (d.bikes < 0.1 * capacity) vide++;
            else if (d.bikes > 0.9 * capacity) sat++;
            else norm++;
        });

        const total = vide + norm + sat || 1;
        const data = [
            { label: 'Presque Vide', value: vide / total, color: '#EF4444' }, // Red
            { label: 'Normale', value: norm / total, color: '#10B981' }, // Green
            { label: 'Saturée', value: sat / total, color: '#F59E0B' } // Yellow
        ];

        const width = container.clientWidth;
        const height = container.clientHeight || 160;
        const radius = Math.min(width, height) / 2 - 10;

        const svg = d3.select(container)
            .append("svg")
            .attr("width", width)
            .attr("height", height)
            .append("g")
            .attr("transform", `translate(${width / 2},${height / 2})`);

        const pie = d3.pie<any>().value(d => d.value).sort(null);
        const arc = d3.arc<any>().innerRadius(radius * 0.5).outerRadius(radius); // Donut style

        const arcs = svg.selectAll("arc").data(pie(data)).enter().append("g");

        arcs.append("path")
            .attr("fill", d => d.data.color)
            .attr("d", arc as any);

        arcs.append("text")
            .attr("transform", d => `translate(${arc.centroid(d)})`)
            .attr("text-anchor", "middle")
            .style("font-size", "10px")
            .style("fill", "#fff")
            .style("font-weight", "bold")
            .text(d => d.data.value > 0.05 ? `${Math.round(d.data.value * 100)}%` : '');

        // Legend
        const legendX = width / 2 * -1 + 10;
        let currentY = height / 2 * -1 + 10;

        data.forEach((d) => {
            svg.append("circle").attr("cx", legendX).attr("cy", currentY).attr("r", 4).style("fill", d.color);
            svg.append("text").attr("x", legendX + 10).attr("y", currentY + 3).text(d.label).style("font-size", "9px").attr("alignment-baseline", "middle").style("fill", "#6B7280");
            currentY += 15;
        });
    }

    renderD2HeurJourHeatmap() {
        if (!this.d2HeureJourHeatmap || !this.filteredData.length) return;
        const container = this.d2HeureJourHeatmap.nativeElement;
        container.innerHTML = '';

        const agg: any = {};
        for (let d = 1; d <= 7; d++) {
            agg[d] = {};
            for (let h = 0; h < 24; h++) agg[d][h] = { hasBikes: 0, count: 0 };
        }

        this.filteredData.forEach(d => {
            const dow = new Date(d.year, d.month - 1, d.day).getDay();
            const realDow = dow === 0 ? 7 : dow; // 1 (Mon) to 7 (Sun)
            if (agg[realDow] && agg[realDow][d.hour]) {
                agg[realDow][d.hour].count++;
                if (d.bikes > 0) agg[realDow][d.hour].hasBikes++;
            }
        });

        const chartData: any[] = [];
        for (let d = 1; d <= 7; d++) {
            for (let h = 0; h < 24; h++) {
                const prob = agg[d][h].count > 0 ? (agg[d][h].hasBikes / agg[d][h].count) : 0;
                chartData.push({ day: d, hour: h, prob });
            }
        }

        const margin = { top: 10, right: 10, bottom: 20, left: 25 };
        const width = container.clientWidth - margin.left - margin.right;
        const height = container.clientHeight - margin.top - margin.bottom;

        const svg = d3.select(container).append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .append("g").attr("transform", `translate(${margin.left},${margin.top})`);

        const x = d3.scaleBand().range([0, width]).domain(d3.range(24).map(String)).padding(0.05);
        const y = d3.scaleBand().range([0, height]).domain(["1", "2", "3", "4", "5", "6", "7"]).padding(0.05);

        svg.append("g").attr("transform", `translate(0,${height})`).call(d3.axisBottom(x).tickValues(d3.range(0, 24, 4).map(String)).tickFormat(d => `${d}h`)).select(".domain").remove();
        svg.append("g").call(d3.axisLeft(y).tickFormat((d, i) => ["Lu", "Ma", "Me", "Je", "Ve", "Sa", "Di"][i])).select(".domain").remove();

        svg.selectAll(".tick line").remove();
        svg.selectAll(".tick text").style("fill", "#6B7280").style("font-size", "8px");

        // Color mapping from Red (0) to Green (1)
        const myColor = d3.scaleLinear<string>().domain([0, 0.5, 1]).range(["#EF4444", "#F59E0B", "#10B981"]);

        svg.selectAll()
            .data(chartData, (d: any) => `${d.day}:${d.hour}`)
            .enter()
            .append("rect")
            .attr("x", d => x(d.hour.toString())!)
            .attr("y", d => y(d.day.toString())!)
            .attr("width", x.bandwidth())
            .attr("height", y.bandwidth())
            .style("fill", d => myColor(d.prob))
            .attr("rx", 2);
    }

    renderD2VoisinsLine() {
        if (!this.d2VoisinsLine || !this.filteredData.length || !this.station) return;
        const container = this.d2VoisinsLine.nativeElement;
        container.innerHTML = '';

        const aggStation: any = {};
        const aggVoisins: any = {};

        // Calculate own data
        this.filteredData.forEach(d => {
            if (!aggStation[d.hour]) aggStation[d.hour] = { total: 0, count: 0 };
            aggStation[d.hour].total += d.bikes;
            aggStation[d.hour].count++;
        });

        // 1. Sort nearby stations by distance to find top 3
        const sortedNearby = [...this.nearbyStations]
            .filter(s => s.id_velov !== this.station!.id_velov) // Exclude self
            .map(s => {
                const dist = this.calculateDistance(this.station!.latitude, this.station!.longitude, s.latitude, s.longitude);
                return { ...s, dist };
            })
            .sort((a, b) => a.dist - b.dist)
            .slice(0, 3);

        const top3Ids = sortedNearby.map(s => s.id_velov);

        // 2. Calculate neighbors aggregated data ONLY for top 3
        this.nearbyBikesData.forEach(d => {
            if (!top3Ids.includes(d.id_velov)) return;
            if (!aggVoisins[d.hour]) aggVoisins[d.hour] = { total: 0, count: 0 };
            aggVoisins[d.hour].total += d.bikes;
            aggVoisins[d.hour].count++;
        });

        const statData = Object.keys(aggStation).map(h => ({ hour: +h, avg: aggStation[h].total / aggStation[h].count })).sort((a, b) => a.hour - b.hour);
        const voiData = Object.keys(aggVoisins).map(h => ({ hour: +h, avg: aggVoisins[h].total / aggVoisins[h].count })).sort((a, b) => a.hour - b.hour);

        const margin = { top: 10, right: 10, bottom: 20, left: 30 };
        const width = container.clientWidth - margin.left - margin.right;
        const height = container.clientHeight - margin.top - margin.bottom || 150;

        const maxY = Math.max(d3.max(statData, d => d.avg) || 0, d3.max(voiData, d => d.avg) || 0) || 10;

        const svg = d3.select(container).append('svg')
            .attr('width', width + margin.left + margin.right)
            .attr('height', height + margin.top + margin.bottom)
            .append('g').attr('transform', `translate(${margin.left},${margin.top})`);

        const x = d3.scaleLinear().domain([0, 23]).range([0, width]);
        const y = d3.scaleLinear().domain([0, maxY]).range([height, 0]);

        svg.append('g').attr('transform', `translate(0,${height})`).call(d3.axisBottom(x).ticks(6).tickFormat(d => `${d}h`)).select(".domain").attr("stroke", "#E5E7EB");
        svg.append('g').call(d3.axisLeft(y).ticks(3)).select(".domain").remove();
        svg.selectAll(".tick line").attr("stroke", "#E5E7EB");
        svg.selectAll(".tick text").style("fill", "#6B7280").style("font-size", "9px");

        const line = d3.line<any>().x(d => x(d.hour)).y(d => y(d.avg)).curve(d3.curveMonotoneX);

        // Station (Blue)
        svg.append('path').datum(statData).attr('fill', 'none').attr('stroke', '#1D4ED8').attr('stroke-width', 3).attr('d', line);
        // Voisins (Orange)
        if (voiData.length > 0) {
            svg.append('path').datum(voiData).attr('fill', 'none').attr('stroke', '#F59E0B').attr('stroke-width', 2).attr('stroke-dasharray', '4,4').attr('d', line);
        }

        // Legend
        svg.append('text').attr('x', 10).attr('y', 10).style('fill', '#1D4ED8').style('font-size', '10px').style('font-weight', 'bold').text('--- Station');
        svg.append('text').attr('x', 10).attr('y', 25).style('fill', '#F59E0B').style('font-size', '10px').style('font-weight', 'bold').text('- - Voisins');
    }
}
