import { Routes } from '@angular/router';
import { CompassComponent } from './components/compass/compass.component';
import { ExplorerComponent } from './components/explorer/explorer.component';

export const routes: Routes = [
    { path: '', redirectTo: 'compass', pathMatch: 'full' },
    { path: 'compass', component: CompassComponent },
    { path: 'explorer', component: ExplorerComponent }
];
