import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from "@angular/router";
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

@Component({
    selector: 'app-id',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterLink],
    templateUrl: './id.component.html',
    styleUrls: ['./id.component.css']
})
export class IdComponent implements OnInit {
    userId: string | null = null;
    officialNickname: string = '';
    statsData: any[] = [];
    filteredStatsData: any[] = [];
    sortColumn: string = '';
    sortDirection: 'asc' | 'desc' = 'asc';
    loading: boolean = true;
    minGames: number = 0;
    errorMessage: string = '';
    maxGames: number = 0;
    isModalOpen: boolean = false;

    columns: string[] = [
        'relative_official_nickname', 'games', 'overall_win_rate', 'same_red_win_rate',
        'same_black_win_rate', 'overall_same_team_win_rate', 'cross_team_red_black_win_rate',
        'cross_team_black_red_win_rate', 'overall_cross_team_win_rate'
    ];
    columnVisibility: { [key: string]: boolean } = {};
    columnLabels: { [key: string]: string } = {
        'relative_official_nickname': 'Игрок',
        'games': 'Всего игр',
        'overall_win_rate': 'Общий',
        'same_red_win_rate': 'Оба красные',
        'same_black_win_rate': 'Оба черные',
        'overall_same_team_win_rate': 'В одноцвете',
        'cross_team_red_black_win_rate': 'Красный vs черного',
        'cross_team_black_red_win_rate': 'Черный vs красного',
        'overall_cross_team_win_rate': 'В разноцвете'
    };

    constructor(private route: ActivatedRoute, private http: HttpClient) {}

    ngOnInit(): void {
        this.userId = this.route.snapshot.paramMap.get('id');
        if (!this.userId) {
            console.warn('No userId found in route parameters.');
            this.errorMessage = 'Invalid user ID.';
            this.loading = false;
            return;
        }
        this.fetchUserStatistics();
        this.columns.forEach(column => {
            this.columnVisibility[column] = true; // Default to showing all columns
        });
    }

    fetchUserStatistics(): void {
        const apiUrl = 'https://ozpxrqruih.execute-api.us-east-1.amazonaws.com/prod/id';
        const payload = { id: this.userId };

        this.http.post<any>(apiUrl, payload).pipe(
            catchError((error) => {
                console.error('Error fetching statistics:', error);
                this.errorMessage = error.status === 404
                    ? 'No statistics found for this user.'
                    : error.status === 400
                        ? 'Invalid user ID provided.'
                        : 'An unexpected error occurred. Please try again later.';
                this.loading = false;
                return of([]);
            }),
            map(response => {
                if (Array.isArray(response) && response.length > 0) {
                    this.officialNickname = response[0].targetOfficialNickname || `User #${this.userId}`;
                    this.statsData = response.map(item => this.mapWinRates(item));
                    this.maxGames = Math.max(...this.statsData.map(item => item.games || 0), 0);
                    this.filterStats();
                    this.sortColumn = 'games';
                    this.sortDirection = 'asc';
                    this.sortBy('games');
                } else {
                    this.errorMessage = 'No statistics available for this user.';
                }
                this.loading = false;
            })
        ).subscribe();
    }

    mapWinRates(item: any): any {
        return {
            ...item,
            overall_win_rate: this.calculateWinRate(item.wins, item.games),
            same_red_win_rate: this.calculateTeamWinRate(item, ['civilian_civilian', 'sheriff_civilian', 'civilian_sheriff']),
            same_black_win_rate: this.calculateTeamWinRate(item, ['mafia_mafia', 'godfather_mafia', 'mafia_godfather']),
            overall_same_team_win_rate: this.calculateTeamWinRate(item, [
                'civilian_civilian', 'sheriff_civilian', 'civilian_sheriff',
                'mafia_mafia', 'godfather_mafia', 'mafia_godfather'
            ]),
            cross_team_red_black_win_rate: this.calculateTeamWinRate(item, [
                'civilian_mafia', 'civilian_godfather', 'sheriff_mafia', 'sheriff_godfather'
            ]),
            cross_team_black_red_win_rate: this.calculateTeamWinRate(item, [
                'mafia_civilian', 'mafia_sheriff', 'godfather_civilian', 'godfather_sheriff'
            ]),
            overall_cross_team_win_rate: this.calculateTeamWinRate(item, [
                'civilian_mafia', 'civilian_godfather', 'sheriff_mafia', 'sheriff_godfather',
                'mafia_civilian', 'mafia_sheriff', 'godfather_civilian', 'godfather_sheriff'
            ]),
        };
    }

    calculateWinRate(wins: number = 0, games: number = 0): number {
        return this.capPercentage(games > 0 ? (wins / games) * 100 : 0);
    }

    calculateTeamWinRate(item: any, keys: string[]): number {
        const wins = keys.reduce((sum, key) => sum + (item[`${key}_wins`] || 0), 0);
        const games = keys.reduce((sum, key) => sum + (item[`${key}_games`] || 0), 0);
        return this.calculateWinRate(wins, games);
    }

    capPercentage(value: number): number {
        return Math.max(0, Math.min(value, 100));
    }

    onMinGamesChange(): void {
        this.filterStats();
    }

    filterStats(): void {
        this.filteredStatsData = this.statsData.filter(item => (item.games || 0) >= this.minGames);
    }

    sortBy(column: string): void {
        if (this.sortColumn === column) {
            this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            this.sortDirection = 'asc';
            this.sortColumn = column;
        }

        this.filteredStatsData.sort((a, b) => {
            const valA = a[column] ?? 0;
            const valB = b[column] ?? 0;

            if (typeof valA === 'number' && typeof valB === 'number') {
                return this.sortDirection === 'asc' ? valA - valB : valB - valA;
            }

            return this.sortDirection === 'asc'
                ? String(valA).localeCompare(String(valB))
                : String(valB).localeCompare(String(valA));
        });
    }

    openFilterModal(): void {
        this.isModalOpen = true;
    }


    closeSortModal(): void {
        this.isModalOpen = false;
    }

    applySort(): void {
        this.filteredStatsData.sort((a, b) => {
            const valA = a[this.sortColumn] ?? 0;
            const valB = b[this.sortColumn] ?? 0;

            if (typeof valA === 'number' && typeof valB === 'number') {
                return this.sortDirection === 'asc' ? valA - valB : valB - valA;
            }

            return this.sortDirection === 'asc'
                ? String(valA).localeCompare(String(valB))
                : String(valB).localeCompare(String(valA));
        });
    }
}
