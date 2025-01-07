import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from "@angular/common";
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-detail',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './details.component.html',
  styleUrls: ['./details.component.css']
})
export class DetailsComponent implements OnInit {
  target: string | null = '';
  relative: string | null = '';
  detailStats: any = null;
  loading = true;

  officialNickname: string = '';

  selectedTargetRole: string = '';
  selectedRelativeRole: string = '';

  // Win Rate Properties
  overallWinRate: number = 0;
  overallSameTeamWinRate: number = 0;

  sameRedWinRate: number = 0;
  sameBlackWinRate: number = 0;

  // Cross-Team Properties
  crossTeamRedBlackWinRate: number = 0;
  crossTeamRedBlackGames: number = 0;
  crossTeamRedBlackWins: number = 0;

  crossTeamBlackRedWinRate: number = 0;
  crossTeamBlackRedGames: number = 0;
  crossTeamBlackRedWins: number = 0;

  // Overall Cross-Team Win Rate Property
  overallCrossTeamWinRate: number = 0;

  // Combination-specific properties
  combinationWinRate: number = 0;
  combinationGames: number = 0;
  combinationWins: number = 0;
  combinationLosses: number = 0;

  constructor(private route: ActivatedRoute, private http: HttpClient) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      this.target = params.get('target');
      this.relative = params.get('relative');
      if (this.target && this.relative) {
        this.fetchDetailStats();
      } else {
        this.loading = false;
      }
    });
  }

  fetchDetailStats(): void {
    if (this.target && this.relative) {
      const url = 'https://ozpxrqruih.execute-api.us-east-1.amazonaws.com/prod/detail';
      const payload = { target: parseInt(this.target, 10), relative: parseInt(this.relative, 10) };

      this.loading = true;
      this.http.post<any>(url, payload).subscribe({
        next: data => {
          this.detailStats = data;
          this.loading = false;
          this.calculateOverallWinRate();
          this.calculateSameTeamWinRates();
          this.calculateCrossTeamWinRates();
        },
        error: err => {
          console.error('Error fetching detailed stats:', err);
          this.detailStats = null;
          this.loading = false;
        }
      });
    } else {
      this.detailStats = null;
      this.loading = false;
    }
  }

  getRoleName(role: string): string {
    const roles: { [key: string]: string } = {
      'civilian': 'Мирный',
      'sheriff': 'Шериф',
      'mafia': 'Мафия',
      'godfather': 'Дон'
    };
    return roles[role] || 'Неизвестно';
  }

  // Utility Method to Cap Percentage Between 0 and 100
  private capPercentage(value: number): number {
    if (value < 0) return 0;
    if (value > 100) return 100;
    return value;
  }

  // Overall Win Rate Calculation
  calculateOverallWinRate(): void {
    const totalWins = this.detailStats['wins'] || 0;
    const totalGames = this.detailStats['games'] || 0;
    this.overallWinRate = this.capPercentage(totalGames > 0 ? (totalWins / totalGames) * 100 : 0);
    console.log('Overall Win Rate:', this.overallWinRate);
  }

  // Same Team Win Rates Calculation
  calculateSameTeamWinRates(): void {
    // Calculate Same Team Red Wins
    const sameTeamRedWins =
        (this.detailStats['civilian_civilian_wins'] || 0) +
        (this.detailStats['sheriff_civilian_wins'] || 0) +
        (this.detailStats['civilian_sheriff_wins'] || 0);

    const sameTeamRedGames =
        (this.detailStats['civilian_civilian_games'] || 0) +
        (this.detailStats['sheriff_civilian_games'] || 0) +
        (this.detailStats['civilian_sheriff_games'] || 0);

    // Prevent wins from exceeding games
    const cappedSameTeamRedWins = Math.min(sameTeamRedWins, sameTeamRedGames);

    this.sameRedWinRate = this.capPercentage(
        sameTeamRedGames > 0 ? (cappedSameTeamRedWins / sameTeamRedGames) * 100 : 0
    );
    console.log('Same Red Win Rate:', this.sameRedWinRate);

    // Calculate Same Team Black Wins
    const sameTeamBlackWins =
        (this.detailStats['mafia_mafia_wins'] || 0) +
        (this.detailStats['mafia_godfather_wins'] || 0) +
        (this.detailStats['godfather_mafia_wins'] || 0);

    const sameTeamBlackGames =
        (this.detailStats['mafia_mafia_games'] || 0) +
        (this.detailStats['mafia_godfather_games'] || 0) +
        (this.detailStats['godfather_mafia_games'] || 0);

    // Prevent wins from exceeding games
    const cappedSameTeamBlackWins = Math.min(sameTeamBlackWins, sameTeamBlackGames);

    this.sameBlackWinRate = this.capPercentage(
        sameTeamBlackGames > 0 ? (cappedSameTeamBlackWins / sameTeamBlackGames) * 100 : 0
    );
    console.log('Same Black Win Rate:', this.sameBlackWinRate);

    // Calculate Overall Same Team Win Rate
    const totalSameTeamWins = cappedSameTeamRedWins + cappedSameTeamBlackWins;
    const totalSameTeamGames = sameTeamRedGames + sameTeamBlackGames;

    this.overallSameTeamWinRate = this.capPercentage(
        totalSameTeamGames > 0 ? (totalSameTeamWins / totalSameTeamGames) * 100 : 0
    );
    console.log('Overall Same Team Win Rate:', this.overallSameTeamWinRate);
  }

  // Cross-Team Win Rates Calculation
  calculateCrossTeamWinRates(): void {
    // Target Red & Relative Black
    this.crossTeamRedBlackGames =
        (this.detailStats['civilian_mafia_games'] || 0) +
        (this.detailStats['civilian_godfather_games'] || 0) +
        (this.detailStats['sheriff_mafia_games'] || 0) +
        (this.detailStats['sheriff_godfather_games'] || 0);

    this.crossTeamRedBlackWins =
        (this.detailStats['civilian_mafia_wins'] || 0) +
        (this.detailStats['civilian_godfather_wins'] || 0) +
        (this.detailStats['sheriff_mafia_wins'] || 0) +
        (this.detailStats['sheriff_godfather_wins'] || 0);

    // Prevent wins from exceeding games
    this.crossTeamRedBlackWins = Math.min(this.crossTeamRedBlackWins, this.crossTeamRedBlackGames);

    this.crossTeamRedBlackWinRate = this.capPercentage(
        this.crossTeamRedBlackGames > 0 ? (this.crossTeamRedBlackWins / this.crossTeamRedBlackGames) * 100 : 0
    );
    console.log('Cross Team Red-Black Win Rate:', this.crossTeamRedBlackWinRate);

    // Target Black & Relative Red
    this.crossTeamBlackRedGames =
        (this.detailStats['mafia_civilian_games'] || 0) +
        (this.detailStats['mafia_sheriff_games'] || 0) +
        (this.detailStats['godfather_civilian_games'] || 0) +
        (this.detailStats['godfather_sheriff_games'] || 0);

    this.crossTeamBlackRedWins =
        (this.detailStats['mafia_civilian_wins'] || 0) +
        (this.detailStats['mafia_sheriff_wins'] || 0) +
        (this.detailStats['godfather_civilian_wins'] || 0) +
        (this.detailStats['godfather_sheriff_wins'] || 0);

    // Prevent wins from exceeding games
    this.crossTeamBlackRedWins = Math.min(this.crossTeamBlackRedWins, this.crossTeamBlackRedGames);

    this.crossTeamBlackRedWinRate = this.capPercentage(
        this.crossTeamBlackRedGames > 0 ? (this.crossTeamBlackRedWins / this.crossTeamBlackRedGames) * 100 : 0
    );
    console.log('Cross Team Black-Red Win Rate:', this.crossTeamBlackRedWinRate);

    // Overall Cross-Team Win Rate Calculation
    const totalCrossTeamGames = this.crossTeamRedBlackGames + this.crossTeamBlackRedGames;
    const totalCrossTeamWins = this.crossTeamRedBlackWins + this.crossTeamBlackRedWins;

    this.overallCrossTeamWinRate = this.capPercentage(
        totalCrossTeamGames > 0 ? (totalCrossTeamWins / totalCrossTeamGames) * 100 : 0
    );
    console.log('Overall Cross Team Win Rate:', this.overallCrossTeamWinRate);
  }

  // Combination-Specific Calculations
  calculateCombinationWinRate(): void {
    if (this.selectedTargetRole && this.selectedRelativeRole) {
      this.combinationGames = this.getCombinationGames(this.selectedTargetRole, this.selectedRelativeRole);
      this.combinationWins = this.getCombinationWins(this.selectedTargetRole, this.selectedRelativeRole);
      this.combinationLosses = this.getCombinationLosses(this.selectedTargetRole, this.selectedRelativeRole);
      // Prevent wins from exceeding games
      this.combinationWins = Math.min(this.combinationWins, this.combinationGames);
      this.combinationWinRate = this.capPercentage(this.combinationGames > 0 ? (this.combinationWins / this.combinationGames) * 100 : 0);
    } else {
      this.combinationGames = 0;
      this.combinationWins = 0;
      this.combinationLosses = 0;
      this.combinationWinRate = 0;
    }
    console.log('Combination Win Rate:', this.combinationWinRate);
  }

  getCombinationKey(targetRole: string, relativeRole: string): string {
    return `${targetRole}_${relativeRole}`;
  }

  getCombinationWinKey(targetRole: string, relativeRole: string): string {
    return `${targetRole}_${relativeRole}`;
  }

  getCombinationGames(targetRole: string, relativeRole: string): number {
    const key = this.getCombinationKey(targetRole, relativeRole) + '_games';
    return this.detailStats[key] || 0;
  }

  getCombinationWins(targetRole: string, relativeRole: string): number {
    const key = this.getCombinationWinKey(targetRole, relativeRole) + '_wins';
    return this.detailStats[key] || 0;
  }

  getCombinationLosses(targetRole: string, relativeRole: string): number {
    const games = this.getCombinationGames(targetRole, relativeRole);
    const wins = this.getCombinationWins(targetRole, relativeRole);
    return games > 0 ? Math.max(games - wins, 0) : 0;
  }

  // Role Change Handler
  onRoleChange(): void {
    this.calculateCombinationWinRate();
  }
}
