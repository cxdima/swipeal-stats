import {Routes} from '@angular/router';
import {HomeComponent} from './pages/home/home.component';
import {IdComponent} from './pages/id/id.component';
import {DetailsComponent} from "./pages/details/details.component";
import {StatisticsComponent} from "./pages/statistics/statistics.component";
import {LeaderboardComponent} from "./pages/leaderboard/leaderboard.component";

export const appRoutes: Routes = [
    {path: 'home', component: HomeComponent},
    {path: 'leaderboard', component: LeaderboardComponent},
    {path: 'stats/:id', component: StatisticsComponent},
    {path: 'id/:id', component: IdComponent},
    {path: 'detail/:target/:relative', component: DetailsComponent},
    {path: '', redirectTo: '/home', pathMatch: 'full'},
];
