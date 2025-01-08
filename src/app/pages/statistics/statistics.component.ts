import { Component, OnInit, AfterViewInit, ViewChild, ElementRef, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule, HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';
import Chart from 'chart.js/auto';
import { IdComponent } from "../id/id.component";

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

interface DonutChartConfig {
  canvas: ElementRef<HTMLCanvasElement>;
  data: { label: string; value: number }[];
  backgroundColors: string[];
  cutout?: string;
  chartInstance?: Chart;
}

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

  // Chart instances are now managed within DonutChartConfig
  private donutCharts: DonutChartConfig[] = [];
  private votedOffChart: Chart | null = null;

  // Component state
  statistics: UserStatistics | null = null;
  isLoading: boolean = false;
  errorMessage: string = '';

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
    this.votedOffRounds = [];
    this.resetMetrics();

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
            this.initializeDonutCharts();
            this.buildVotedOffChart();
          },
          error: () => {}
        });
  }

  resetMetrics(): void {
    this.successfulShots = 0;
    this.totalShots = 0;
    this.shotAccuracy = 0;
    this.godfather_sheriff_accuracy = 0;
    this.sheriffAccuracy = 0;
    this.sheriffBlack = 0;
    this.votingInaccuracy = 0;
    this.votesForBlackPercentage = 0;
    this.godfather_finds_you_sheriff_accuracy = 0;
  }

  processStatistics(): void {
    if (!this.statistics) return;
    const stats = this.statistics;

    // Данные для донат-чартов
    // Проверки за дона
    const godfatherTotal = Number(stats.godfather_checks_total) || 0;
    const godfatherCivilians = Number(stats.godfather_checks_civilian) || 0;
    const godfatherSheriff = Number(stats.godfather_checks_sheriff) || 0;
    this.godfather_sheriff_accuracy = godfatherTotal > 0
        ? (godfatherSheriff / godfatherTotal) * 100
        : 0;

    // Проверки от дона
    this.godfather_finds_you_sheriff_accuracy = this.statistics.checked_by_godfather_total > 0
        ? (this.statistics.checked_by_godfather_when_sheriff / this.statistics.checked_by_godfather_total) * 100
        : 0;

    // Проверки за шерифа
    const sheriffTotal = Number(stats.sheriff_checks_total) || 0;
    const sheriffCivilians = Number(stats.sheriff_checks_civilian) || 0;
    const sheriffMafia = Number(stats.sheriff_checks_mafia) || 0;
    const sheriffGodfather = Number(stats.sheriff_checks_godfather) || 0;
    this.sheriffBlack = Number(stats.sheriff_checks_godfather + stats.sheriff_checks_mafia) || 0;
    this.sheriffAccuracy = sheriffTotal > 0
        ? (this.sheriffBlack / sheriffTotal) * 100
        : 0;

    // Продажа черных
    const blackVotesTotal = Number(stats.black_votes_total) || 0;
    const blackVotesOwn = Number(stats.black_votes_own_team) || 0;
    const blackVotesAgainstRed = blackVotesTotal - blackVotesOwn;
    this.votesForBlackPercentage = blackVotesTotal > 0 ? (blackVotesOwn / blackVotesTotal) * 100 : 0;

    // Точность выстрелов
    const missedShots = Number(stats.missed_shots) || 0;
    const totalShots = Number(stats.total_shots) || 0;
    const successfulShots = totalShots - missedShots;
    this.shotAccuracy = totalShots > 0 ? (successfulShots / totalShots) * 100 : 0;
    this.successfulShots = successfulShots;
    this.totalShots = totalShots;

    // Голоса за шерифа
    const red_votes_against_sheriff = Number(stats.red_votes_against_sheriff) || 0;
    const red_votes_against_black = Number(stats.red_votes_against_black) || 0;
    const red_votes_total = Number(stats.red_votes_total) || 0;
    const red_votes_against_civilian = red_votes_total - (red_votes_against_black);

    this.votingInaccuracy = red_votes_total > 0 ? (red_votes_against_sheriff / red_votes_total) * 100 : 0;

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

  initializeDonutCharts(): void {
    const donutChartConfigs: DonutChartConfig[] = [
      {
        canvas: this.checksGodfatherChartCanvas,
        data: [
          { label: 'Проверок шерифа', value: this.statistics?.godfather_checks_sheriff || 0 },
          { label: 'Проверок гражданских', value: this.statistics?.godfather_checks_civilian || 0 },
        ],
        backgroundColors: ['rgb(255, 199, 0)', 'rgb(193, 41, 68)'],
        cutout: '65%',
      },
      {
        canvas: this.checksSheriffChartCanvas,
        data: [
          { label: 'Проверок мафии', value: this.statistics?.sheriff_checks_mafia || 0 },
          { label: 'Проверок дона', value: this.statistics?.sheriff_checks_godfather || 0 },
          { label: 'Проверок мирных', value: this.statistics?.sheriff_checks_civilian || 0 },
        ],
        backgroundColors: ['black', 'black', 'rgb(193, 41, 68)'],
        cutout: '65%',
      },
      {
        canvas: this.blackVotesChartCanvas,
        data: [
          { label: 'Руки в своих черных', value: this.statistics?.black_votes_own_team || 0 },
          { label: 'Руки в красных', value: this.votesForBlackPercentage ? (this.statistics?.black_votes_total || 0) - (this.statistics?.black_votes_own_team || 0) : 0 },
        ],
        backgroundColors: ['rgb(193, 41, 68)', 'lightgrey'],
        cutout: '65%',
      },
      {
        canvas: this.shotAccuracyChartCanvas,
        data: [
          { label: 'Успешные выстрелы', value: this.successfulShots },
          { label: 'Промахи', value: this.statistics?.missed_shots || 0 },
        ],
        backgroundColors: ['#198754', '#6c757d'],
        cutout: '65%',
      },
      {
        canvas: this.votesForSheriffChartCanvas,
        data: [
          { label: 'Голоса в шерифа', value: this.statistics?.red_votes_against_sheriff || 0 },
          { label: 'Голоса в черных', value: this.statistics?.red_votes_against_black || 0 },
          { label: 'Голоса в мирных', value: this.votingInaccuracy ? (this.statistics?.red_votes_total || 0) - (this.statistics?.red_votes_against_black || 0) - (this.statistics?.red_votes_against_sheriff || 0) : 0 },
        ],
        backgroundColors: ['rgb(255, 199, 0)', 'black', 'rgb(193, 41, 68)'],
        cutout: '65%',
      },
      {
        canvas: this.checksFromGodfatherChartCanvas,
        data: [
          { label: 'Вы шериф', value: this.statistics?.checked_by_godfather_when_sheriff || 0 },
          { label: 'Вы красный', value: this.statistics?.checked_by_godfather_when_civilian || 0 },
          { label: 'Вы черный', value: (this.statistics?.checked_by_godfather_total || 0) - (this.statistics?.checked_by_godfather_when_civilian || 0) - (this.statistics?.checked_by_godfather_when_sheriff || 0) },
        ],
        backgroundColors: ['rgb(255, 199, 0)', 'rgb(193, 41, 68)', 'black'],
        cutout: '65%',
      },
    ];

    this.donutCharts = donutChartConfigs;
    this.donutCharts.forEach(config => this.buildDonutChart(config));
  }

  buildDonutChart(config: DonutChartConfig): void {
    if (!config.canvas || !this.statistics) return;

    if (config.chartInstance) {
      config.chartInstance.destroy();
    }

    const ctx = config.canvas.nativeElement.getContext('2d');
    if (!ctx) {
      this.errorMessage = `Не удалось получить контекст Canvas для донат-чарта.`;
      return;
    }

    config.chartInstance = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: config.data.map(item => item.label),
        datasets: [
          {
            data: config.data.map(item => item.value),
            backgroundColor: config.backgroundColors,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: config.cutout || '65%',
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
