import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { ChartConfiguration, ChartOptions } from 'chart.js';
import { NgChartsModule} from 'ng2-charts';
import { IResults, IVotes } from '../../i-results';
import { BehaviorSubject, Subject, takeUntil } from 'rxjs';
import { ApiService } from '../../api.service';
@Component({
  selector: 'app-barchart',
  standalone: true,
  imports: [NgChartsModule],
  templateUrl: './barchart.component.html',
  styleUrl: './barchart.component.css'
})
export class BarchartComponent implements OnInit, OnDestroy {
  groupedVotes:Record<number,number> = {}
  votes:IVotes= {}
  private destroy$ = new Subject<void>();
  constructor(private apiService:ApiService){
    const votesApiService = this.apiService.getVotes().pipe(takeUntil(this.destroy$))
  }
  ngOnDestroy(): void {
    this.destroy$.complete()
  }
  ngOnInit(): void {
    this.apiService.getVotes().subscribe({
      next:(data:IResults)=>{
        this.votes = data.votes
      }
    })






        for (const voteStr of Object.values(this.votes)){
      const vote = parseInt(voteStr,10)
      if(!isNaN(vote)){
        this.groupedVotes[vote] = (this.groupedVotes[vote] || 0) +1.
      }
    }
    this.barChartData.labels = Object.entries(this.groupedVotes).map(([vote])=>vote)
    this.barChartData.datasets[0].data =Object.entries(this.groupedVotes).map(([,count])=>count)
  }
  
  
  barChartData: ChartConfiguration<'bar'>['data'] = {
    labels: [],
    datasets: [
      {
        label: 'Number of Voters',
        data: [],
        backgroundColor: 'rgba(66, 99, 246, 0.7)',
        borderWidth: 1
      }
    ]
  };

  barChartOptions: ChartOptions<'bar'> = {
    responsive: true,
    animation: {
      duration: 1000,
      easing: 'easeOutBounce'
    },
    scales: {
      y: {
        beginAtZero: true
      }
    }
  };
}
