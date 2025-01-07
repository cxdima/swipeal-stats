// statistics.component.ts
import { Component, OnInit, AfterViewInit, ViewChild, ElementRef, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule, HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';
import Chart from 'chart.js/auto';
import {IdComponent} from "../id/id.component";

interface UserStatistics {
  votes_for_black: number;
  missed_shots: number;
  total_votes: number;
  checked_by_godfather_when_sheriff: number;
  godfather_checks_civilian: number;
  black_votes_own_team: number;
  godfather_checks_total: number;
  checked_by_sheriff_total: number;
  checked_by_sheriff_when_mafia: number;
  sheriff_checks_civilian: number;
  black_votes_total: number;
  id: number;
  red_votes_against_sheriff: number;
  total_shots: number;
  sheriff_checks_godfather: number;
  checked_by_godfather_total: number;
  official_nickname: string;
  red_votes_total: number;
  checked_by_sheriff_when_godfather: number;
  checked_by_sheriff_when_civilian: number;
  red_votes_against_black: number;
  checked_by_godfather_when_civilian: number;
  voted_off_round_1: number;
  black_misses_total: number;
  voted_off_round_2: number;
  voted_off_round_6: number;
  voted_off_round_3: number;
  sheriff_checks_total: number;
  voted_off_round_4: number;
  godfather_checks_sheriff: number;
  sheriff_checks_mafia: number;
  black_shots_total: number;
  voted_off_round_5?: number;
  voted_off_round_7?: number;
  voted_off_round_8?: number;
}

type VotedOffRoundKey =
    | 'voted_off_round_1'
    | 'voted_off_round_2'
    | 'voted_off_round_3'
    | 'voted_off_round_4'
    | 'voted_off_round_5'
    | 'voted_off_round_6'
 ;

@Component({
  selector: 'app-statistics',
  standalone: true,
  imports: [CommonModule, HttpClientModule, FormsModule, IdComponent],
  templateUrl: './statistics.component.html',
  styleUrls: ['./statistics.component.css'],
})
export class StatisticsComponent implements OnInit, AfterViewInit {
  // ViewChild references for all charts
  @ViewChild('checksGodfatherChart') checksGodfatherChartCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('checksSheriffChart') checksSheriffChartCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('blackVotesChart') blackVotesChartCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('shotAccuracyChart') shotAccuracyChartCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('votesForSheriffChart') votesForSheriffChartCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('votedOffChart') votedOffChartCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('checksFromGodfatherChart') checksFromGodfatherChartCanvas!: ElementRef<HTMLCanvasElement>;

  // Chart instances
  private checksGodfatherChart: Chart | null = null;
  private checksSheriffChart: Chart | null = null;
  private blackVotesChart: Chart | null = null;
  private shotAccuracyChart: Chart | null = null;
  private votedOffChart: Chart | null = null;
  private votesForSheriffChart: Chart | null = null;
  private checksFromGodfatherChart: Chart | null = null;

  // Component state
  statistics: UserStatistics | null = null;
  isLoading: boolean = false;
  errorMessage: string = '';

  // Data for donut charts
  checksGodfatherData: { label: string; value: number }[] = [];
  checksSheriffData: { label: string; value: number }[] = [];
  blackVotesData: { label: string; value: number }[] = [];
  shotAccuracyData: { label: string; value: number }[] = [];
  votesForSheriffData: { label: string; value: number }[] = [];
  checksFromGodfatherData: { label: string; value: number }[] = [];


  // Calculated metrics
  successfulShots: number = 0;
  totalShots: number = 0;
  shotAccuracy: number = 0;
  godfather_sheriff_accuracy: number = 0;
  sheriffAccuracy: number = 0;
  sheriffBlack: number = 0;
  votingInaccuracy: number = 0;
  votesForBlackPercentage: number = 0;
  godfather_finds_you_sheriff_accuracy: number = 0;

  // Data for bar chart
  votedOffRounds: { round: number; count: number }[] = [];

  private apiUrl: string = 'https://ozpxrqruih.execute-api.us-east-1.amazonaws.com/prod/stats';

  constructor(
      private http: HttpClient,
      private route: ActivatedRoute,
      private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const idParam = params.get('id');
      if (idParam) {
        const id = parseInt(idParam, 10);
        if (!isNaN(id)) {
          this.fetchStatistics(id);
        } else {
          this.errorMessage = 'Неверный формат ID. ID должен быть числом.';
        }
      } else {
        this.errorMessage = 'ID не предоставлен в маршруте.';
      }
    });
  }

  ngAfterViewInit(): void {
    // Charts will be built after data is fetched
  }

  fetchStatistics(id: number): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.statistics = null;
    this.checksGodfatherData = [];
    this.checksSheriffData = [];
    this.blackVotesData = [];
    this.shotAccuracyData = [];
    this.votedOffRounds = [];
    this.successfulShots = 0;
    this.totalShots = 0;
    this.shotAccuracy = 0;
    this.godfather_sheriff_accuracy = 0;


    this.http.get<UserStatistics>(`${this.apiUrl}?id=${id}`)
        .pipe(
            catchError((error: HttpErrorResponse) => {
              this.isLoading = false;
              if (error.error instanceof ErrorEvent) {
                this.errorMessage = `Произошла ошибка: ${error.error.message}`;
              } else {
                this.errorMessage = `Сервер вернул код ${error.status}: ${error.message}`;
              }
              return throwError(error);
            })
        )
        .subscribe({
          next: (data: UserStatistics) => {
            this.isLoading = false;
            this.statistics = data;
            console.log('Полученные данные:', this.statistics);
            this.processStatistics();
            this.cdr.detectChanges();
            this.buildChecksGodfatherChart();
            this.buildChecksSheriffChart();
            this.buildBlackVotesChart();
            this.buildShotAccuracyChart();
            this.buildVotesForSheriffChart();
            this.buildVotedOffChart();
            this.buildChecksFromGodfatherChart();
          },
          error: () => {}
        });
  }

  processStatistics(): void {
    if (!this.statistics) return;
    const stats = this.statistics;

    // Данные для донат-чарта "Проверки за дона"
    const godfatherTotal = Number(stats.godfather_checks_total) || 0;
    const godfatherCivilians = Number(stats.godfather_checks_civilian) || 0;
    const godfatherSheriff = Number(stats.godfather_checks_sheriff) || 0;
    this.checksGodfatherData = [
      { label: 'Проверок шерифа', value: godfatherSheriff },
      { label: 'Проверок гражданских', value: godfatherCivilians },
    ];

    // Расчет точности проверок за дона против шерифа
    this.godfather_sheriff_accuracy = godfatherTotal > 0
        ? (godfatherSheriff / godfatherTotal) * 100
        : 0;

    // Данные для донат-чарта "Проверки от дона"
    this.checksFromGodfatherData = [
      { label: 'Вы шериф', value: this.statistics.checked_by_godfather_when_sheriff },
      { label: 'Вы красный', value: this.statistics.checked_by_godfather_when_civilian },
      { label: 'Вы черный', value: (this.statistics.checked_by_godfather_total - (this.statistics.checked_by_godfather_when_civilian + this.statistics.checked_by_godfather_when_sheriff))},
    ];

    // Расчет точности проверок за дона против шерифа
    this.godfather_finds_you_sheriff_accuracy = this.statistics.checked_by_godfather_total > 0
        ? (this.statistics.checked_by_godfather_when_sheriff / this.statistics.checked_by_godfather_total) * 100
        : 0;

    // Данные для донат-чарта "Проверки за шерифа"
    const sheriffTotal = Number(stats.sheriff_checks_total) || 0;
    const sheriffCivilians = Number(stats.sheriff_checks_civilian) || 0;
    const sheriffMafia = Number(stats.sheriff_checks_mafia) || 0;
    const sheriffGodfather = Number(stats.sheriff_checks_godfather) || 0;
    this.sheriffBlack = Number(stats.sheriff_checks_godfather + stats.sheriff_checks_mafia) || 0;
    this.checksSheriffData = [
      { label: 'Проверок мафии', value: sheriffMafia },
      { label: 'Проверок дона', value: sheriffGodfather },
      { label: 'Проверок мирных', value: sheriffCivilians },
    ];

    this.sheriffAccuracy = this.statistics.sheriff_checks_total > 0
        ? ( (this.sheriffBlack) / sheriffTotal) * 100
        : 0;

    // Данные для донат-чарта "Продажа черных"
    const blackVotesTotal = Number(stats.black_votes_total) || 0;
    const blackVotesOwn = Number(stats.black_votes_own_team) || 0;
    const blackVotesAgainstRed = blackVotesTotal - blackVotesOwn;

    this.votesForBlackPercentage = blackVotesTotal > 0 ? (blackVotesOwn / blackVotesTotal) * 100 : 0;

    this.blackVotesData = [
      { label: 'Руки в своих черных', value: blackVotesOwn },
      { label: 'Руки в красных', value: blackVotesAgainstRed },
    ];

    // Данные для донат-чарта "Точность выстрелов"
    const missedShots = Number(stats.missed_shots) || 0;
    const totalShots = Number(stats.total_shots) || 0;
    const successfulShots = totalShots - missedShots;
    const shotAccuracy = totalShots > 0 ? (successfulShots / totalShots) * 100 : 0;
    this.shotAccuracy = shotAccuracy;
    this.successfulShots = successfulShots;
    this.totalShots = totalShots;
    this.shotAccuracyData = [
      { label: 'Успешные выстрелы', value: successfulShots },
      { label: 'Промахи', value: missedShots },
    ];

    // Данные для донат-чарта "Точность выстрелов"
    const red_votes_against_sheriff = Number(stats.red_votes_against_sheriff) || 0;
    const red_votes_against_black = Number(stats.red_votes_against_black)
    const red_votes_total = Number(stats.red_votes_total)
    const red_votes_against_civilian = stats.red_votes_total - (stats.red_votes_against_black)

    this.votingInaccuracy = stats.red_votes_total > 0 ? (red_votes_against_sheriff / red_votes_total) * 100 : 0;

    this.votesForSheriffData = [
      { label: 'Голоса в шерифа', value: red_votes_against_sheriff },
      { label: 'Голоса в черных', value: red_votes_against_black },
      { label: 'Голоса в мирных', value: red_votes_against_civilian },
    ];

    // Данные для бар-чарта "Выбывания по раундам"
    const rounds = [1, 2, 3, 4, 5, 6];
    rounds.forEach(round => {
      const key = `voted_off_round_${round}` as VotedOffRoundKey;
      const rawCount = stats[key];
      const count = typeof rawCount === 'number' ? rawCount : Number(rawCount) || 0;
      this.votedOffRounds.push({ round, count });
    });
    console.log('Выбывания по раундам:', this.votedOffRounds);
  }

  buildChecksGodfatherChart(): void {
    if (!this.checksGodfatherChartCanvas || !this.statistics) return;

    if (this.checksGodfatherChart) {
      this.checksGodfatherChart.destroy();
    }

    const ctx = this.checksGodfatherChartCanvas.nativeElement.getContext('2d');
    if (!ctx) {
      this.errorMessage = 'Не удалось получить контекст Canvas для донат-чарта "Проверки за дона".';
      return;
    }

    this.checksGodfatherChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: this.checksGodfatherData.map(item => item.label),
        datasets: [
          {
            data: this.checksGodfatherData.map(item => item.value),
            backgroundColor: ['rgb(255, 199, 0)', 'rgb(193, 41, 68)'],
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '65%',
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                const label = context.label || '';
                const value = context.parsed || 0;
                return `${label}: ${value}`;
              }
            }
          }
        },
      },
    });
  }

  buildChecksFromGodfatherChart(): void {
    if (!this.checksFromGodfatherChartCanvas || !this.statistics) return;

    if (this.checksFromGodfatherChart) {
      this.checksFromGodfatherChart.destroy();
    }

    const ctx = this.checksFromGodfatherChartCanvas.nativeElement.getContext('2d');
    if (!ctx) {
      this.errorMessage = 'Не удалось получить контекст Canvas для донат-чарта "Проверки за дона".';
      return;
    }

    this.checksGodfatherChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: this.checksFromGodfatherData.map(item => item.label),
        datasets: [
          {
            data: this.checksFromGodfatherData.map(item => item.value),
            backgroundColor: ['rgb(255, 199, 0)', 'rgb(193, 41, 68)', 'black'],
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '65%',
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                const label = context.label || '';
                const value = context.parsed || 0;
                return `${label}: ${value}`;
              }
            }
          }
        },
      },
    });
  }

  buildChecksSheriffChart(): void {
    if (!this.checksSheriffChartCanvas || !this.statistics) return;

    if (this.checksSheriffChart) {
      this.checksSheriffChart.destroy();
    }

    const ctx = this.checksSheriffChartCanvas.nativeElement.getContext('2d');
    if (!ctx) {
      this.errorMessage = 'Не удалось получить контекст Canvas для донат-чарта "Проверки за шерифа".';
      return;
    }

    this.checksSheriffChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: this.checksSheriffData.map(item => item.label),
        datasets: [
          {
            data: this.checksSheriffData.map(item => item.value),
              backgroundColor: ['black', 'black', 'rgb(193, 41, 68)'],
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '65%',
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                const label = context.label || '';
                const value = context.parsed || 0;
                return `${label}: ${value}`;
              }
            }
          }
        },
      },
    });
  }

  buildBlackVotesChart(): void {
    if (!this.blackVotesChartCanvas || !this.statistics) return;

    if (this.blackVotesChart) {
      this.blackVotesChart.destroy();
    }

    const ctx = this.blackVotesChartCanvas.nativeElement.getContext('2d');
    if (!ctx) {
      this.errorMessage = 'Не удалось получить контекст Canvas для донат-чарта "Продажа черных".';
      return;
    }

    this.blackVotesChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: this.blackVotesData.map(item => item.label),
        datasets: [
          {
            data: this.blackVotesData.map(item => item.value),
            backgroundColor: ['rgb(193, 41, 68)', 'lightgrey'],
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '65%',
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                const label = context.label || '';
                const value = context.parsed || 0;
                return `${label}: ${value}`;
              }
            }
          }
        },
      },
    });
  }

  buildVotesForSheriffChart(): void {
    if (!this.votesForSheriffChartCanvas || !this.statistics) return;

    if (this.votesForSheriffChart) {
      this.votesForSheriffChart.destroy();
    }

    const ctx = this.votesForSheriffChartCanvas.nativeElement.getContext('2d');
    if (!ctx) {
      this.errorMessage = 'Не удалось получить контекст Canvas для донат-чарта "Голосования в шерифа".';
      return;
    }

    this.votesForSheriffChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: this.votesForSheriffData.map(item => item.label),
        datasets: [
          {
            data: this.votesForSheriffData.map(item => item.value),
            backgroundColor: ['rgb(255, 199, 0)', 'black', 'rgb(193, 41, 68)'],
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '65%',
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                const label = context.label || '';
                const value = context.parsed || 0;
                return `${label}: ${value}`;
              }
            }
          }
        },
      },
    });
  }

  buildShotAccuracyChart(): void {
    if (!this.shotAccuracyChartCanvas || !this.statistics) return;

    if (this.shotAccuracyChart) {
      this.shotAccuracyChart.destroy();
    }

    const ctx = this.shotAccuracyChartCanvas.nativeElement.getContext('2d');
    if (!ctx) {
      this.errorMessage = 'Не удалось получить контекст Canvas для донат-чарта "Точность выстрелов".';
      return;
    }

    this.shotAccuracyChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: this.shotAccuracyData.map(item => item.label),
        datasets: [
          {
            data: this.shotAccuracyData.map(item => item.value),
            backgroundColor: ['#198754', '#6c757d'],
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '65%',
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                const label = context.label || '';
                const value = context.parsed || 0;
                return `${label}: ${value}`;
              }
            }
          }
        },
      },
    });
  }

  buildVotedOffChart(): void {
    if (!this.votedOffChartCanvas || !this.statistics) return;

    if (this.votedOffChart) {
      this.votedOffChart.destroy();
    }

    const ctx = this.votedOffChartCanvas.nativeElement.getContext('2d');
    if (!ctx) {
      this.errorMessage = 'Не удалось получить контекст Canvas для бар-чарта "Выбывания по раундам".';
      return;
    }

    const labels = this.votedOffRounds.map(item => `Раунд ${item.round}`);
    const data = this.votedOffRounds.map(item => item.count);

    this.votedOffChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Количество выбываний',
            data: data,
            backgroundColor: '#FFCE56',
            borderColor: '#FFCE56',
            borderWidth: 1,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'Количество выбываний',
            },
          },
          x: {
            title: {
              display: false,
              text: 'Раунды',
            },
          },
        },
        plugins: {
          legend: {
            display: false,
          },
          title: {
            display: false,
            text: 'Выбывания по раундам',
            font: {
              size: 16,
            },
          },
        },
      },
    });
  }
}
