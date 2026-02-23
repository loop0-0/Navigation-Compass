const fs = require('fs');

const tsPath = 'src/app/components/charts/charts.component.ts';
let ts = fs.readFileSync(tsPath, 'utf8');

// Inject ViewChilds
const viewChildAnchor = "    @ViewChild('d1StackedArea') d1StackedArea?: ElementRef;";
const viewChilds = `    @ViewChild('d1StackedArea') d1StackedArea?: ElementRef;
    @ViewChild('d1PartsMarche') d1PartsMarche?: ElementRef;
    @ViewChild('d1RotationQuartier') d1RotationQuartier?: ElementRef;
    @ViewChild('d1MatchJours') d1MatchJours?: ElementRef;
    @ViewChild('d1ActivityHeatmap') d1ActivityHeatmap?: ElementRef;
    @ViewChild('d1DispoDistribution') d1DispoDistribution?: ElementRef;`;
ts = ts.replace(viewChildAnchor, viewChilds);

// Inject render functions in renderDashboard1
const renderAnchor1 = `        if (this.activeTabD1 === 'd1-apercu') {
            this.renderD1MesVoisins();
            this.renderD1Top3();
        } else if (this.activeTabD1 === 'd1-dynamique') {
            this.renderD1JourneeType();
            this.renderD1ChasseCroise();
        } else if (this.activeTabD1 === 'd1-analyse') {
            this.renderD1BarometreSemaine();
            this.renderD1MatchStationsRadar();
        }`;
const renderReplacement1 = `        if (this.activeTabD1 === 'd1-apercu') {
            this.renderD1KPIs();
            this.renderD1MesVoisins();
            this.renderD1PartsMarche();
        } else if (this.activeTabD1 === 'd1-dynamique') {
            this.renderD1Top3();
            this.renderD1RotationQuartier();
            this.renderD1JourneeType();
            this.renderD1ChasseCroise();
            this.renderD1DispoDistribution();
        } else if (this.activeTabD1 === 'd1-analyse') {
            this.renderD1MatchJours();
            this.renderD1MatchStationsRadar();
            this.renderD1BarometreSemaine();
            this.renderD1ActivityHeatmap();
        }`;
ts = ts.replace(renderAnchor1, renderReplacement1);


// Create new TS functions
const newTsFunctions = `
    renderD1KPIs() {
        setTimeout(() => {
            const top3 = this.nearbyStations.slice(0, 3);
            if (!top3.length) return;

            const totalPlaces = top3.reduce((acc, s) => acc + (s.bike_stands || 0), 0);
            
            // Calculate avg movements per day for the neighborhood
            const nearbyIds = top3.map(s => s.id_velov);
            const data = this.filteredData.filter(d => nearbyIds.includes(d.id_velov));
            const daysSet = new Set(data.map(d => \`\${d.year}-\${d.month}-\${d.day}\`));
            const numDays = daysSet.size || 1;
            const totalMvt = data.reduce((acc, d) => acc + d.arrival30min + d.departure30min, 0);
            const mvtPerDay = Math.round(totalMvt / numDays);

            const placesEl = document.getElementById('d1-kpi-places');
            const mvtEl = document.getElementById('d1-kpi-mvt');
            const distEl = document.getElementById('d1-kpi-nearest-dist');
            const nameEl = document.getElementById('d1-kpi-nearest-name');

            if (placesEl) placesEl.innerText = String(totalPlaces);
            if (mvtEl) mvtEl.innerText = String(mvtPerDay);
            
            if (distEl && nameEl && this.selectedEtab) {
                const myLat = this.selectedEtab.geometry.coordinates[1] || this.selectedEtab.geometry.coordinates[0][0][0][1];
                const myLon = this.selectedEtab.geometry.coordinates[0] || this.selectedEtab.geometry.coordinates[0][0][0][0];
                const closest = top3[0];
                const dist = Math.round(this.getDistance(myLat, myLon, closest.latitude, closest.longitude));
                distEl.innerText = dist + 'm';
                nameEl.innerText = closest.name.replace(' - ', ' ');
                nameEl.title = closest.name;
            }
        }, 0);
    }

    renderD1PartsMarche() {
        if (!this.d1PartsMarche || !this.filteredData.length || !this.nearbyStations.length) return;
        const container = this.d1PartsMarche.nativeElement;
        container.innerHTML = '';

        const top5 = this.nearbyStations.slice(0, 5);
        if(!top5.length) return;
        const top5Ids = top5.map(s => s.id_velov);

        const mvtByStation: any = {};
        top5Ids.forEach(id => mvtByStation[id] = 0);

        this.filteredData.forEach(d => {
            if (mvtByStation[d.id_velov] !== undefined) {
                mvtByStation[d.id_velov] += (d.arrival30min + d.departure30min);
            }
        });

        const chartData = top5.map(s => ({
            name: s.name.split(' - ')[1] || s.name,
            value: mvtByStation[s.id_velov]
        })).filter(d => d.value > 0);

        if(!chartData.length) return;

        const width = container.clientWidth;
        const height = container.clientHeight || 160;
        const radius = Math.min(width, height) / 2 - 10;

        const svg = d3.select(container).append('svg')
            .attr('width', width).attr('height', height)
            .append('g').attr('transform', \`translate(\${width/2},\${height/2})\`);

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
            .attr('transform', d => \`translate(\${arcLabels.centroid(d)})\`)
            .style('text-anchor', 'middle').style('font-size', '8px').style('fill', 'white').style('font-weight', 'bold');
    }

    renderD1RotationQuartier() {
        if (!this.d1RotationQuartier || !this.filteredData.length || !this.nearbyStations.length) return;
        const container = this.d1RotationQuartier.nativeElement;
        container.innerHTML = '';

        const top3 = this.nearbyStations.slice(0, 3);
        if(!top3.length) return;
        const topIds = top3.map(s => s.id_velov);

        const mvtByStation: any = {};
        topIds.forEach(id => mvtByStation[id] = 0);

        const daysSet = new Set();
        this.filteredData.forEach(d => {
            if (mvtByStation[d.id_velov] !== undefined) {
                mvtByStation[d.id_velov] += (d.arrival30min + d.departure30min);
                daysSet.add(\`\${d.year}-\${d.month}-\${d.day}\`);
            }
        });

        const numDays = daysSet.size || 1;
        const chartData = top3.map(s => {
            const dailyAvg = mvtByStation[s.id_velov] / numDays;
            const rotation = s.bike_stands ? +(dailyAvg / s.bike_stands).toFixed(1) : 0;
            return {
                name: (s.name.split(' - ')[1] || s.name).substring(0, 15),
                rotation
            };
        });

        const margin = { top: 10, right: 30, bottom: 20, left: 80 };
        const width = container.clientWidth - margin.left - margin.right;
        const height = container.clientHeight - margin.top - margin.bottom;

        const svg = d3.select(container).append('svg')
            .attr('width', width + margin.left + margin.right)
            .attr('height', height + margin.top + margin.bottom)
            .append('g').attr('transform', \`translate(\${margin.left},\${margin.top})\`);

        const x = d3.scaleLinear().domain([0, d3.max(chartData, d => d.rotation) || 5]).range([0, width]);
        const y = d3.scaleBand().domain(chartData.map(d => d.name)).range([0, height]).padding(0.2);

        svg.append('g').call(d3.axisLeft(y)).selectAll('text').style('font-size', '9px').style('fill', '#4B5563');
        svg.selectAll(".domain, .tick line").remove();

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
            .attr('y', d => y(d.name)! + y.bandwidth()/2 + 3)
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

        const daysFr = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
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
            .append('g').attr('transform', \`translate(\${margin.left},\${margin.top})\`);

        const x = d3.scaleBand().range([0, width]).domain(chartData.map(d => d.day)).padding(.3);
        const y = d3.scaleLinear().domain([0, d3.max(chartData, d => d.avgMvt) || 10]).range([height, 0]);

        svg.append('g').attr('transform', \`translate(0,\${height})\`).call(d3.axisBottom(x)).select(".domain").attr("stroke", "#E5E7EB");
        svg.append('g').call(d3.axisLeft(y).ticks(5)).select(".domain").remove();
        svg.selectAll(".tick text").style("fill", "#6B7280").style("font-size", "10px");

        svg.selectAll("myRect").data(chartData).enter().append("rect")
            .attr("x", d => x(d.day)!)
            .attr("y", d => y(d.avgMvt))
            .attr("width", x.bandwidth())
            .attr("height", d => height - y(d.avgMvt))
            .attr("fill", d => (d.rawDay === 6 || d.rawDay === 7) ? "#10B981" : "#1D4ED8")
            .attr("rx", 4);
    }

    renderD1ActivityHeatmap() {
        if (!this.d1ActivityHeatmap || !this.filteredData.length || !this.nearbyStations.length) return;
        const container = this.d1ActivityHeatmap.nativeElement;
        container.innerHTML = '';

        const nearbyIds = this.nearbyStations.slice(0,3).map(s => s.id_velov);
        const relevantData = this.filteredData.filter(d => nearbyIds.includes(d.id_velov));

        const map: any = {};
        relevantData.forEach(d => {
            const date = new Date(d.year, d.month - 1, d.day);
            const dow = date.getDay();
            const key = \`\${dow}-\${d.hour}\`;
            if (!map[key]) map[key] = { mvt: 0, count: 0 };
            map[key].mvt += (d.arrival30min + d.departure30min);
            map[key].count++;
        });

        const chartData: any[] = [];
        for (let dow = 1; dow <= 7; dow++) { 
            const realDow = dow === 7 ? 0 : dow;
            for (let h = 0; h < 24; h++) {
                const key = \`\${realDow}-\${h}\`;
                let val = map[key] ? map[key].mvt / (map[key].count/3 || 1) : 0;
                chartData.push({ dayOfWeek: dow, hour: h, val });
            }
        }

        const margin = { top: 20, right: 20, bottom: 20, left: 40 };
        const width = Math.max(container.clientWidth, 600) - margin.left - margin.right;
        const height = container.clientHeight - margin.top - margin.bottom;

        const svg = d3.select(container).append('svg')
            .attr('width', width + margin.left + margin.right)
            .attr('height', height + margin.top + margin.bottom)
            .append('g').attr('transform', \`translate(\${margin.left},\${margin.top})\`);

        const x = d3.scaleBand().domain(d3.range(24).map(String)).range([0, width]).padding(0.05);
        const y = d3.scaleBand().domain(["1", "2", "3", "4", "5", "6", "7"]).range([0, height]).padding(0.05);
        const daysFr = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

        const maxVal = d3.max(chartData, d => d.val) || 10;
        const colorScale = d3.scaleSequential(d3.interpolateOranges).domain([0, maxVal]);

        svg.selectAll('rect').data(chartData).enter().append('rect')
            .attr('x', d => x(String(d.hour))!)
            .attr('y', d => y(String(d.dayOfWeek))!)
            .attr('width', x.bandwidth()).attr('height', y.bandwidth())
            .attr('fill', d => d.val > 0 ? colorScale(d.val) as any : '#F3F4F6')
            .attr('rx', 2);

        svg.append('g').attr('transform', \`translate(0,\${height})\`).call(d3.axisBottom(x).tickFormat(d => \`\${d}h\`)).select(".domain").remove();
        svg.append('g').call(d3.axisLeft(y).tickFormat((d, i) => daysFr[i])).select(".domain").remove();
        svg.selectAll(".tick line").remove();
        svg.selectAll(".tick text").style("fill", "#6B7280").style("font-size", "10px");
    }

    renderD1DispoDistribution() {
        if (!this.d1DispoDistribution || !this.filteredData.length || !this.nearbyStations.length) return;
        const container = this.d1DispoDistribution.nativeElement;
        container.innerHTML = '';

        const top3 = this.nearbyStations.slice(0,3);
        const topIds = top3.map(s => s.id_velov);
        const capacities:any = {};
        top3.forEach(s => capacities[s.id_velov] = s.bike_stands || 20);

        let empty = 0, normal = 0, full = 0;
        
        // Group by hour/day
        const timeMap:any = {};
        this.filteredData.filter(d => topIds.includes(d.id_velov)).forEach(d => {
            const key = \`\${d.day}-\${d.hour}\`;
            if(!timeMap[key]) timeMap[key] = {bikes:0, standCap:0};
            timeMap[key].bikes += d.bikes;
            timeMap[key].standCap += capacities[d.id_velov];
        });

        Object.values(timeMap).forEach((d:any) => {
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

        const width = container.clientWidth;
        const height = container.clientHeight || 200;
        const radius = Math.min(width, height) / 2 - 20;

        const svg = d3.select(container).append('svg')
            .attr('width', width).attr('height', height)
            .append('g').attr('transform', \`translate(\${width/2},\${height/2})\`);

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
            .attr('transform', d => \`translate(\${arcLabels.centroid(d)})\`)
            .style('text-anchor', 'middle').style('font-size', '10px').style('fill', 'white').style('font-weight', 'bold');

        // Legend below
        const legend = svg.append('g').attr('transform', \`translate(-${width / 2 - 10}, \${radius + 10})\`);
        let xOffset = 0;
        chartData.forEach((d, i) => {
            const g = legend.append('g').attr('transform', \`translate(\${xOffset}, 0)\`);
            g.append('rect').attr('w', 8).attr('h', 8).attr('fill', d.color).attr('rx', 2).attr('width', 8).attr('height', 8);
            g.append('text').attr('x', 12).attr('y', 7).text(d.label).style('font-size', '9px').style('fill', '#4B5563');
            xOffset += 80;
        });
    }

    // --- DASHBOARD 2 IMPLEMENTATIONS ---`;

ts = ts.replace('    // --- DASHBOARD 2 IMPLEMENTATIONS ---', newTsFunctions.trim());

fs.writeFileSync(tsPath, ts);

// NOW HTML REPLACEMENT
const htmlPath = 'src/app/components/charts/charts.component.html';
let html = fs.readFileSync(htmlPath, 'utf8');

const htmlAnchorRegex = /<ng-container \*ngIf="activeTabD1 === 'd1-apercu'">[\s\S]*?<\/ng-container>\s*<!-- ============================================== -->\s*<!-- STATION PANEL:/m;

const htmlReplacement = \`<ng-container *ngIf="activeTabD1 === 'd1-apercu'">
        <!-- KPIs -->
        <div class="grid grid-cols-3 gap-4 mb-4" id="d1-kpis">
            <div class="bg-white rounded-xl shadow-sm p-3 border border-gray-100 flex flex-col justify-center items-center relative z-10 group">
                <div class="text-[10px] uppercase font-bold text-gray-400 mb-1">Capacité (Quartier)</div>
                <div class="text-3xl font-black text-[#1D4ED8]" id="d1-kpi-places">0</div>
            </div>
            <div class="bg-white rounded-xl shadow-sm p-3 border border-gray-100 flex flex-col justify-center items-center relative z-10 group">
                <div class="text-[10px] uppercase font-bold text-gray-400 mb-1">Dynamisme (Mvt/Jour)</div>
                <div class="text-3xl font-black text-[#10B981]" id="d1-kpi-mvt">0</div>
            </div>
            <div class="bg-white rounded-xl shadow-sm p-3 border border-gray-100 flex flex-col justify-center items-center text-center relative z-10 group">
                <div class="text-[10px] uppercase font-bold text-gray-400 mb-1">Plus Proche</div>
                <div class="text-2xl font-black text-[#F59E0B] leading-none" id="d1-kpi-nearest-dist">0m</div>
                <div class="text-[9px] text-gray-400 font-bold truncate w-full px-2 mt-1" id="d1-kpi-nearest-name">...</div>
            </div>
        </div>

        <div class="grid grid-cols-2 gap-4 mb-6">
            <!-- Mes Voisins -->
            <div class="bg-white rounded-xl shadow-sm p-4 border border-gray-100 flex flex-col relative z-20 group">
                <h4 class="text-sm font-bold text-gray-800 mb-3 flex items-center justify-between">Mes Voisins
                    <svg tabindex="0" xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-gray-400 cursor-pointer outline-none transition-colors group-focus-within:text-[#1D4ED8]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </h4>
                <div class="absolute opacity-0 invisible group-focus-within:opacity-100 group-focus-within:visible transition-all duration-300 top-12 right-0 bg-black text-white text-xs rounded py-2 px-3 w-64 shadow-2xl z-50 pointer-events-none">
                    Liste des autres établissements dans la même zone d'influence.
                    <div class="absolute -top-1 right-2 w-2 h-2 bg-black rotate-45"></div>
                </div>
                <div class="flex-1 overflow-y-auto max-h-[160px]" id="d1-voisins-container"></div>
            </div>

            <!-- Parts de marché -->
            <div class="bg-white rounded-xl shadow-sm p-4 border border-gray-100 flex flex-col relative z-10 group">
                <h4 class="text-sm font-bold text-gray-800 mb-3 flex items-center justify-between">Parts de Trafic
                    <svg tabindex="0" xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-gray-400 cursor-pointer outline-none transition-colors group-focus-within:text-[#1D4ED8]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </h4>
                <div class="absolute opacity-0 invisible group-focus-within:opacity-100 group-focus-within:visible transition-all duration-300 top-12 right-0 bg-black text-white text-xs rounded py-2 px-3 w-64 shadow-2xl z-50 pointer-events-none">
                    Répartition des mouvements (arrivées + départs) sur les 5 stations les plus proches. Poids relatif de chaque station.
                    <div class="absolute -top-1 right-2 w-2 h-2 bg-black rotate-45"></div>
                </div>
                <div class="flex-1 w-full min-h-[160px]" #d1PartsMarche></div>
            </div>
        </div>
    </ng-container>

    <ng-container *ngIf="activeTabD1 === 'd1-dynamique'">
        <div class="grid grid-cols-2 gap-4 mb-4">
            <!-- Top 3 -->
            <div class="bg-white rounded-xl shadow-sm p-4 border border-gray-100 flex flex-col relative z-10 group">
                <h4 class="text-sm font-bold text-gray-800 mb-3 flex items-center justify-between">Heures d'affluence
                    <svg tabindex="0" xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-gray-400 cursor-pointer outline-none transition-colors group-focus-within:text-[#1D4ED8]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </h4>
                <div class="absolute opacity-0 invisible group-focus-within:opacity-100 group-focus-within:visible transition-all duration-300 top-12 right-0 bg-black text-white text-xs rounded py-2 px-3 w-64 shadow-2xl z-50 pointer-events-none">
                    Les 3 créneaux horaires enregistrant le plus grand nombre de mouvements sur les stations avoisinantes.
                    <div class="absolute -top-1 right-2 w-2 h-2 bg-black rotate-45"></div>
                </div>
                <div class="flex-1 flex flex-col justify-center space-y-3" id="d1-top3-container"></div>
            </div>

            <!-- Rotation -->
            <div class="bg-white rounded-xl shadow-sm p-4 border border-gray-100 flex flex-col relative z-10 group">
                <h4 class="text-sm font-bold text-gray-800 mb-3 flex items-center justify-between">Taux de Rotation
                    <svg tabindex="0" xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-gray-400 cursor-pointer outline-none transition-colors group-focus-within:text-[#1D4ED8]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </h4>
                <div class="absolute opacity-0 invisible group-focus-within:opacity-100 group-focus-within:visible transition-all duration-300 top-12 right-0 bg-black text-white text-xs rounded py-2 px-3 w-64 shadow-2xl z-50 pointer-events-none">
                    Nombre d'utilisations moyennes de chaque point d'attache par jour. Un taux élevé indique une station très dynamique.
                    <div class="absolute -top-1 right-2 w-2 h-2 bg-black rotate-45"></div>
                </div>
                <div class="flex-1 w-full min-h-[120px]" #d1RotationQuartier></div>
            </div>
        </div>

        <div class="bg-white rounded-xl shadow-sm p-5 border border-gray-100 mb-6 relative z-10 group">
            <h4 class="text-sm font-bold text-gray-800 mb-3 flex items-center justify-between">
                {{ temporalGranularity === 'day' ? 'Évolution de la journée (' + selectedDayStr + ')' : 'La Journée Type (Moyenne)' }}
            </h4>
            <div class="w-full h-[220px]" #d1LineChart></div>
        </div>

        <div class="grid grid-cols-2 gap-4 mb-6">
            <div class="bg-white rounded-xl shadow-sm p-5 border border-gray-100 relative z-10 group">
                <h4 class="text-sm font-bold text-gray-800 mb-3 flex items-center justify-between">Chassé-Croisé
                    <svg tabindex="0" xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-gray-400 cursor-pointer outline-none transition-colors group-focus-within:text-[#1D4ED8]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </h4>
                 <div class="absolute opacity-0 invisible group-focus-within:opacity-100 group-focus-within:visible transition-all duration-300 top-12 right-0 bg-black text-white text-xs rounded py-2 px-3 w-64 shadow-2xl z-50 pointer-events-none">
                    Arrivées vs Départs.
                    <div class="absolute -top-1 right-2 w-2 h-2 bg-black rotate-45"></div>
                </div>
                <div class="w-full h-[200px]" #d1StackedArea></div>
            </div>

            <!-- Dispo Distribution -->
            <div class="bg-white rounded-xl shadow-sm p-5 border border-gray-100 relative z-10 group">
                <h4 class="text-sm font-bold text-gray-800 mb-3 flex items-center justify-between">Disponibilité
                    <svg tabindex="0" xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-gray-400 cursor-pointer outline-none transition-colors group-focus-within:text-[#1D4ED8]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </h4>
                <div class="absolute opacity-0 invisible group-focus-within:opacity-100 group-focus-within:visible transition-all duration-300 top-12 right-0 bg-black text-white text-xs rounded py-2 px-3 w-64 shadow-2xl z-50 pointer-events-none">
                    Répartition du temps où le quartier est en pénurie (<10%), normal, ou saturé (>90%).
                    <div class="absolute -top-1 right-2 w-2 h-2 bg-black rotate-45"></div>
                </div>
                <div class="w-full h-[200px]" #d1DispoDistribution></div>
            </div>
        </div>
    </ng-container>

    <ng-container *ngIf="activeTabD1 === 'd1-analyse'">
        <div class="grid grid-cols-2 gap-4 mb-6">
            <!-- Match Jours -->
            <div class="bg-white rounded-xl shadow-sm p-5 border border-gray-100 relative z-10 group">
                <h4 class="text-sm font-bold text-gray-800 mb-3 flex items-center justify-between">Le Match des Jours
                    <svg tabindex="0" xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-gray-400 cursor-pointer outline-none transition-colors group-focus-within:text-[#1D4ED8]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </h4>
                <div class="absolute opacity-0 invisible group-focus-within:opacity-100 group-focus-within:visible transition-all duration-300 top-12 right-0 bg-black text-white text-xs rounded py-2 px-3 w-64 shadow-2xl z-50 pointer-events-none">
                    Volume de mouvements moyens pour le quartier par jour de la semaine.
                    <div class="absolute -top-1 right-2 w-2 h-2 bg-black rotate-45"></div>
                </div>
                <div class="w-full h-[180px]" #d1MatchJours></div>
            </div>

            <!-- Match Stations -->
            <div class="bg-white rounded-xl shadow-sm p-4 border border-gray-100 flex flex-col items-center relative z-10 group">
                <h4 class="text-sm font-bold text-gray-800 mb-3 w-full flex items-center justify-between">Match Stations</h4>
                <div class="w-[220px] h-[180px]" #d1RadarChart></div>
            </div>
        </div>
        
        <div class="grid grid-cols-2 gap-4 mb-6">
            <!-- Baromètre -->
            <div class="bg-white rounded-xl shadow-sm p-5 border border-gray-100 relative z-10 group overflow-x-auto">
                <h4 class="text-sm font-bold text-gray-800 mb-3 flex items-center justify-between">Baromètre (Vélos Dispos)</h4>
                <div class="w-full min-w-[300px] h-[200px]" #d1Heatmap></div>
            </div>

            <!-- Activity Heatmap -->
            <div class="bg-white rounded-xl shadow-sm p-5 border border-gray-100 relative z-10 group overflow-x-auto">
                <h4 class="text-sm font-bold text-gray-800 mb-3 flex items-center justify-between">Activité (Mouvements)
                    <svg tabindex="0" xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-gray-400 cursor-pointer outline-none transition-colors group-focus-within:text-[#1D4ED8]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </h4>
                <div class="absolute opacity-0 invisible group-focus-within:opacity-100 group-focus-within:visible transition-all duration-300 top-12 right-0 bg-black text-white text-xs rounded py-2 px-3 w-64 shadow-2xl z-50 pointer-events-none">
                    Intensité des arrivées et départs cumulés selon le jour et l'heure.
                    <div class="absolute -top-1 right-2 w-2 h-2 bg-black rotate-45"></div>
                </div>
                <div class="w-full min-w-[300px] h-[200px]" #d1ActivityHeatmap></div>
            </div>
        </div>
    </ng-container>
    <!-- ============================================== -->
    <!-- STATION PANEL:`;

html = html.replace(htmlAnchorRegex, htmlReplacement);
fs.writeFileSync(htmlPath, html);
console.log('done modifying dashboard 1');
