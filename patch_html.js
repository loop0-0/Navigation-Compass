const fs = require('fs');

const htmlPath = 'src/app/components/charts/charts.component.html';
let html = fs.readFileSync(htmlPath, 'utf8');

const htmlReplacement = `        <ng-container *ngIf="activeTabD1 === 'd1-apercu'">
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
                        Répartition des mouvements (arrivées + départs) sur les 5 stations les plus proches.
                        <div class="absolute -top-1 right-2 w-2 h-2 bg-black rotate-45"></div>
                    </div>
                    <div class="flex-1 w-full min-h-[160px]" #d1PartsMarche></div>
                </div>
            </div>
        </ng-container>

        <ng-container *ngIf="activeTabD1 === 'd1-dynamique'">
            <div class="grid grid-cols-2 gap-4 mb-4">
                <!-- Top 3 -->
                <div class="bg-white rounded-xl shadow-sm p-4 border border-gray-100 flex flex-col relative z-20 group">
                    <h4 class="text-sm font-bold text-gray-800 mb-3 flex items-center justify-between">Heures d'affluence
                        <svg tabindex="0" xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-gray-400 cursor-pointer outline-none transition-colors group-focus-within:text-[#1D4ED8]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </h4>
                    <div class="absolute opacity-0 invisible group-focus-within:opacity-100 group-focus-within:visible transition-all duration-300 top-12 right-0 bg-black text-white text-xs rounded py-2 px-3 w-64 shadow-2xl z-50 pointer-events-none">
                        Les 3 créneaux horaires enregistrant le plus de mouvements sur le quartier.
                        <div class="absolute -top-1 right-2 w-2 h-2 bg-black rotate-45"></div>
                    </div>
                    <div class="flex-1 flex flex-col justify-center space-y-3" id="d1-top3-container"></div>
                </div>

                <!-- Rotation -->
                <div class="bg-white rounded-xl shadow-sm p-4 border border-gray-100 flex flex-col relative z-20 group">
                    <h4 class="text-sm font-bold text-gray-800 mb-3 flex items-center justify-between">Taux de Rotation
                        <svg tabindex="0" xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-gray-400 cursor-pointer outline-none transition-colors group-focus-within:text-[#1D4ED8]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </h4>
                    <div class="absolute opacity-0 invisible group-focus-within:opacity-100 group-focus-within:visible transition-all duration-300 top-12 right-0 bg-black text-white text-xs rounded py-2 px-3 w-64 shadow-2xl z-50 pointer-events-none">
                        Utilisations moyennes de chaque point d'attache par jour. Un taux élevé indique une station très dynamique.
                        <div class="absolute -top-1 right-2 w-2 h-2 bg-black rotate-45"></div>
                    </div>
                    <div class="flex-1 w-full min-h-[120px]" #d1RotationQuartier></div>
                </div>
            </div>

            <!-- Journee type -->
            <div class="bg-white rounded-xl shadow-sm p-5 border border-gray-100 mb-6 relative z-10 group">
                <h4 class="text-sm font-bold text-gray-800 mb-3 flex items-center justify-between">
                    {{ temporalGranularity === 'day' ? 'Évolution de la journée (' + selectedDayStr + ')' : 'La Journée Type (Moyenne)' }}
                </h4>
                <div class="w-full h-[220px]" #d1LineChart></div>
            </div>

            <div class="grid grid-cols-2 gap-4 mb-6">
                <!-- Chasse croise -->
                <div class="bg-white rounded-xl shadow-sm p-5 border border-gray-100 relative z-10 group">
                    <h4 class="text-sm font-bold text-gray-800 mb-3 flex items-center justify-between">Chassé-Croisé
                        <svg tabindex="0" xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-gray-400 cursor-pointer outline-none transition-colors group-focus-within:text-[#1D4ED8]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </h4>
                    <div class="absolute opacity-0 invisible group-focus-within:opacity-100 group-focus-within:visible transition-all duration-300 top-12 right-0 bg-black text-white text-xs rounded py-2 px-3 w-64 shadow-2xl z-50 pointer-events-none">
                        Arrivées (Vert) vs Départs (Orange).
                        <div class="absolute -top-1 right-2 w-2 h-2 bg-black rotate-45"></div>
                    </div>
                    <div class="w-full h-[200px]" #d1StackedArea></div>
                </div>

                <!-- Dispo Distribution -->
                <div class="bg-white rounded-xl shadow-sm p-5 border border-gray-100 relative z-10 group">
                    <h4 class="text-sm font-bold text-gray-800 mb-3 flex items-center justify-between">Disponibilité Globale
                        <svg tabindex="0" xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-gray-400 cursor-pointer outline-none transition-colors group-focus-within:text-[#1D4ED8]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </h4>
                    <div class="absolute opacity-0 invisible group-focus-within:opacity-100 group-focus-within:visible transition-all duration-300 top-12 right-0 bg-black text-white text-xs rounded py-2 px-3 w-64 shadow-2xl z-50 pointer-events-none">
                        Répartition du temps où le quartier est en pénurie globale (<10% de vélos dispos), normal, ou saturé (>90%).
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
                    <h4 class="text-sm font-bold text-gray-800 mb-3 w-full flex items-center justify-between">Score Multicritère</h4>
                    <div class="w-[220px] h-[180px]" #d1RadarChart></div>
                </div>
            </div>
            
            <div class="grid grid-cols-2 gap-4 mb-6">
                <!-- Baromètre -->
                <div class="bg-white rounded-xl shadow-sm p-5 border border-gray-100 relative z-10 group overflow-x-auto">
                    <h4 class="text-sm font-bold text-gray-800 mb-3 flex items-center justify-between">Baromètre (Dispos)</h4>
                    <div class="w-full min-w-[300px] h-[200px]" #d1Heatmap></div>
                </div>

                <!-- Activity Heatmap -->
                <div class="bg-white rounded-xl shadow-sm p-5 border border-gray-100 relative z-10 group overflow-x-auto">
                    <h4 class="text-sm font-bold text-gray-800 mb-3 flex items-center justify-between">Activité (Intensité)
                        <svg tabindex="0" xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-gray-400 cursor-pointer outline-none transition-colors group-focus-within:text-[#1D4ED8]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </h4>
                    <div class="absolute opacity-0 invisible group-focus-within:opacity-100 group-focus-within:visible transition-all duration-300 top-12 right-0 bg-black text-white text-xs rounded py-2 px-3 w-64 shadow-2xl z-50 pointer-events-none">
                        Intensité des arrivées et départs cumulés selon le jour et l'heure (en Orange).
                        <div class="absolute -top-1 right-2 w-2 h-2 bg-black rotate-45"></div>
                    </div>
                    <div class="w-full min-w-[300px] h-[200px]" #d1ActivityHeatmap></div>
                </div>
            </div>
        </ng-container>`;

const startAnchor = \`<ng-container *ngIf="activeTabD1 === 'd1-apercu'">\`;
const endAnchor = \`<!-- ============================================== -->
    <!-- STATION PANEL: FOCUS STATION (Mode Station)    -->\`;

const startIndex = html.indexOf(startAnchor);
const endIndex = html.indexOf(endAnchor);

if (startIndex > -1 && endIndex > -1) {
    const toReplace = html.substring(startIndex, endIndex);
    // Find the LAST </ng-container> in this substring
    const lastNgContainerIndex = toReplace.lastIndexOf('</ng-container>');
    if (lastNgContainerIndex > -1) {
        
        let beforeStr = html.substring(0, startIndex);
        let afterStr = html.substring(endIndex);
        
        let newContent = beforeStr + htmlReplacement + "\n    </ng-container>\n\n    " + afterStr;
        fs.writeFileSync(htmlPath, newContent);
        console.log("Replaced successfully");
    } else {
        console.log("Failed to find closing ng-container");
    }
} else {
    console.log("Indexes not found");
}
