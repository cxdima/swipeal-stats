import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { catchError, map } from 'rxjs/operators';
import { of } from 'rxjs';

@Component({
  selector: 'app-leaderboard',
  standalone: true,
  imports: [CommonModule, HttpClientModule, FormsModule],
  templateUrl: './leaderboard.component.html',
  styleUrls: ['./leaderboard.component.css'],
})
export class LeaderboardComponent implements OnInit {
  winrate_by_player: any[] = [];
  sortedData: any[] = [];
  filteredPlayers: any[] = [];
  loading: boolean = true;
  errorMessage: string = '';
  minGames: number = 0;
  maxGames: number = 0;
  isModalOpen: boolean = false;

  // Default sort: by total_games in descending order
  sortColumn: string = 'total_games';
  sortDirection: 'asc' | 'desc' = 'desc';

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.fetchLeaderboard();
  }

  fetchLeaderboard() {
    const apiUrl = 'https://hvfypzqu57.execute-api.us-east-1.amazonaws.com/prod/api/winrate_by_player';

    this.http.get<any>(apiUrl).pipe(
        catchError((error) => {
          console.error('Error fetching leaderboard:', error);
          this.errorMessage = error.status === 404
              ? 'No data found.'
              : error.status === 400
                  ? 'Bad request.'
                  : 'An unexpected error occurred. Please try again later.';
          this.loading = false;
          return of({ winrate_by_player: [] });
        }),
        map((response) => {
          if (
              !response.winrate_by_player ||
              !Array.isArray(response.winrate_by_player) ||
              response.winrate_by_player.length === 0
          ) {
            this.errorMessage = 'No data found for the leaderboard.';
          } else {
            this.winrate_by_player = response.winrate_by_player;
            this.sortedData = [...this.winrate_by_player];
            this.maxGames = Math.max(...this.sortedData.map(item => item.total_games || 0), 0);
            // Apply default sorting on data load
            this.sortData(this.sortColumn);
            // Apply initial filtering
            this.filterPlayers();
          }
          this.loading = false;
        })
    ).subscribe();
  }

  sortData(column: string) {
    // If the same column is clicked again, toggle sort direction
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'desc';
    } else {
      this.sortColumn = column;
      this.sortDirection = 'asc';
    }
    this.applySort();
  }

  applySort() {
    this.sortedData.sort((a, b) => {
      let valueA = a[this.sortColumn];
      let valueB = b[this.sortColumn];

      // Attempt to parse numeric values for correct numerical sorting
      const numA = parseFloat(valueA);
      const numB = parseFloat(valueB);
      if (!isNaN(numA) && !isNaN(numB)) {
        valueA = numA;
        valueB = numB;
      }

      if (valueA < valueB) {
        return this.sortDirection === 'asc' ? -1 : 1;
      } else if (valueA > valueB) {
        return this.sortDirection === 'asc' ? 1 : -1;
      }
      return 0;
    });

    this.filterPlayers();
  }

  onMinGamesChange() {
    this.filterPlayers();
  }

  filterPlayers() {
    this.filteredPlayers = this.sortedData.filter(
        (player) => (player.total_games || 0) >= this.minGames
    );
  }

  openFilterModal() {
    this.isModalOpen = true;
  }

  closeFilterModal() {
    this.isModalOpen = false;
  }
}
