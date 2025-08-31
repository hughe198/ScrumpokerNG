import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { ChartConfiguration, ChartOptions } from 'chart.js';
import { NgChartsModule} from 'ng2-charts';
import { IResults, IVotes } from '../../i-results';
import { Subject, Subscription, takeUntil, combineLatest } from 'rxjs';
import { ApiService } from '../../api.service';
import { ISettings } from '../../i-settings';
import { getVoteByName, VoteName } from '../vote-types';

interface Statistics {
  mean: number;
  median: number;
  mode: number[];
  range: number;
}

interface ConsensusInfo {
  level: 'Excellent' | 'Good' | 'Fair' | 'Poor';
  recommendation: string;
  color: string;
  consensusPercentage: number; // How much consensus exists (0-100)
  modePercentage: number; // What % voted for the mode (for display text)
}

@Component({
  selector: 'app-barchart',
  standalone: true,
  imports: [NgChartsModule],
  templateUrl: './barchart.component.html',
  styleUrl: './barchart.component.css'
})
export class BarchartComponent implements OnInit, OnDestroy {
  groupedVotes: Record<string, number> = {}; // Groups by value (display string)
  votes: IVotes = {};
  statistics: Statistics = { mean: 0, median: 0, mode: [], range: 0 };
  consensus: ConsensusInfo = { level: 'Poor', recommendation: '', color: '#6c757d', consensusPercentage: 0, modePercentage: 0 };
  private destroy$ = new Subject<void>();
  
  votesSub!: Subscription;
  settingsSub!: Subscription;
  settings!: ISettings;

  constructor(private apiService: ApiService) {}

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    
    if (this.votesSub) {
      this.votesSub.unsubscribe();
    }
    if (this.settingsSub) {
      this.settingsSub.unsubscribe();
    }
  }

  ngOnInit(): void {
    // Use combineLatest to ensure both settings and votes are available
    this.settingsSub = combineLatest([
      this.apiService.getSettings(),
      this.apiService.getVotes()
    ]).pipe(takeUntil(this.destroy$)).subscribe({
      next: ([settings, votesData]) => {
        this.settings = settings;
        this.votes = votesData.votes;
        this.updateChart();
        this.calculateStatistics();
        this.calculateConsensus();
      },
      error: (err) => {
        console.log("Error loading data for bar chart", err);
      }
    });
  }

  private updateChart(): void {
    if (!this.settings || !this.votes) {
      return;
    }

    // Only process data if reveal is true
    if (!this.settings.reveal) {
      // Clear chart data when not revealed
      this.barChartData = {
        ...this.barChartData,
        labels: [],
        datasets: [{
          ...this.barChartData.datasets[0],
          data: []
        }]
      };
      this.groupedVotes = {};
      return;
    }

    // Clear previous data
    this.groupedVotes = {};

    // Get the vote type based on settings
    const voteType = getVoteByName(this.settings.votingCard as VoteName);
    const voteOptions = voteType.selectedOptions();

    // Count votes for each option (grouped by value/display string)
    for (const voteValue of Object.values(this.votes)) {
      // Find the matching vote option
      const voteOption = voteOptions.find(option => option.value === voteValue);
      
      if (voteOption) {
        const key = voteOption.value; // Use the value (display string) as the key for grouping
        this.groupedVotes[key] = (this.groupedVotes[key] || 0) + 1;
      }
    }

    // Initialize chart with all possible options (showing 0 for options with no votes)
    const labels: string[] = [];
    const data: number[] = [];

    // Sort options by rate for better display order
    const sortedOptions = voteOptions.sort((a, b) => a.rate - b.rate);

    sortedOptions.forEach(option => {
      labels.push(option.value);
      data.push(this.groupedVotes[option.value] || 0);
    });

    // Create a new data object to trigger chart update
    this.barChartData = {
      ...this.barChartData,
      labels: labels,
      datasets: [{
        ...this.barChartData.datasets[0],
        data: data
      }]
    };
  }

  private calculateStatistics(): void {
    if (!this.settings || !this.votes || !this.settings.reveal) {
      this.statistics = { mean: 0, median: 0, mode: [], range: 0 };
      return;
    }

    // Get the vote type and options
    const voteType = getVoteByName(this.settings.votingCard as VoteName);
    const voteOptions = voteType.selectedOptions();

    // Get all the rates (numeric values) for voted options
    const rates: number[] = [];
    for (const voteValue of Object.values(this.votes)) {
      const voteOption = voteOptions.find(option => option.value === voteValue);
      if (voteOption) {
        rates.push(voteOption.rate);
      }
    }

    if (rates.length === 0) {
      this.statistics = { mean: 0, median: 0, mode: [], range: 0 };
      return;
    }

    // Calculate Mean
    const mean = rates.reduce((sum, rate) => sum + rate, 0) / rates.length;

    // Calculate Median
    const sortedRates = [...rates].sort((a, b) => a - b);
    const median = sortedRates.length % 2 === 0
      ? (sortedRates[sortedRates.length / 2 - 1] + sortedRates[sortedRates.length / 2]) / 2
      : sortedRates[Math.floor(sortedRates.length / 2)];

    // Calculate Mode
    const frequency: Record<number, number> = {};
    rates.forEach(rate => {
      frequency[rate] = (frequency[rate] || 0) + 1;
    });

    const maxFrequency = Math.max(...Object.values(frequency));
    const mode = Object.keys(frequency)
      .filter(rate => frequency[Number(rate)] === maxFrequency)
      .map(Number);

    // Calculate Range
    const minRate = Math.min(...rates);
    const maxRate = Math.max(...rates);
    const range = maxRate - minRate;

    this.statistics = { mean, median, mode, range };
  }

  private calculateConsensus(): void {
    if (!this.settings || !this.votes || !this.settings.reveal) {
      this.consensus = { level: 'Poor', recommendation: 'No data available', color: '#6c757d', consensusPercentage: 0, modePercentage: 0 };
      return;
    }

    // Right then, let's bin the empty votes because they're about as useful as a chocolate teapot
    const validVotes = Object.values(this.votes).filter(vote => vote && vote.trim() !== '');
    const totalValidVotes = validVotes.length;
    
    if (totalValidVotes === 0) {
      this.consensus = { level: 'Poor', recommendation: 'No valid votes cast yet', color: '#6c757d', consensusPercentage: 0, modePercentage: 0 };
      return;
    }

    // With only two voters, can't really call it consensus unless they agree
    if (totalValidVotes === 2) {
      const uniqueVotes = [...new Set(validVotes)];
      if (uniqueVotes.length === 1) {
        // Both voted the same - that's consensus 
        this.consensus = { level: 'Excellent', recommendation: 'Perfect consensus between you two - crack on', color: '#28a745', consensusPercentage: 100, modePercentage: 100 };
      } else {
        // They disagree - no consensus possible
        this.consensus = { level: 'Poor', recommendation: 'Two people, two opinions - get more voters or flip a coin', color: '#dc3545', consensusPercentage: 0, modePercentage: 50 };
      }
      return;
    }

    const voteType = getVoteByName(this.settings.votingCard as VoteName);
    const voteOptions = voteType.selectedOptions().sort((a, b) => a.rate - b.rate);

    // Time to tally up votes like we're counting beans at the local parish fête
    const voteCounts: { [rate: number]: number } = {};
    const votePositions: { [rate: number]: number } = {};
    
    voteOptions.forEach((option, index) => {
      votePositions[option.rate] = index;
    });

    for (const voteValue of validVotes) {
      const voteOption = voteOptions.find(option => option.value === voteValue);
      if (voteOption) {
        voteCounts[voteOption.rate] = (voteCounts[voteOption.rate] || 0) + 1;
      }
    }

    // Sort by votes received - basically a popularity contest at the office Christmas do
    const sortedVotes = Object.entries(voteCounts)
      .map(([rate, count]) => ({ rate: Number(rate), count }))
      .sort((a, b) => b.count - a.count);

    // Time to measure just how spectacularly everyone disagrees
    const allVotedRates = Object.keys(voteCounts).map(Number);
    
    // 1. How scattered is this motley crew?
    const teamMinRate = Math.min(...allVotedRates);
    const teamMaxRate = Math.max(...allVotedRates);
    const teamRatio = teamMaxRate / teamMinRate;

    // 2. What the majority reckon (with a cheeky look at the third wheel)
    let cumulativeCount = 0;
    const coreVotes = [];
    
    // Keep adding votes until we've captured 70% of the rabble
    for (const vote of sortedVotes) {
      cumulativeCount += vote.count;
      coreVotes.push(vote);
      if (cumulativeCount / totalValidVotes >= 0.70) break;
    }
    
    // If there's a third option with more than one mate backing it, might as well let it join the party
    if (coreVotes.length === 2 && sortedVotes[2] && sortedVotes[2].count > 1) {
      coreVotes.push(sortedVotes[2]);
    }
    
    const coreRates = coreVotes.map(v => v.rate);
    const coreMinRate = Math.min(...coreRates);
    const coreMaxRate = Math.max(...coreRates);
    const coreRatio = coreRates.length > 1 ? coreMaxRate / coreMinRate : 1;

    // How many steps apart are we in the sequence? (Matters more than you'd think)
    const votedPositions = allVotedRates.map(rate => votePositions[rate]);
    const positionRange = Math.max(...votedPositions) - Math.min(...votedPositions);

    const topVote = sortedVotes[0];
    const secondVote = sortedVotes[1] || { rate: 0, count: 0 };
    const topPercentage = Math.round((topVote.count / totalValidVotes) * 100);
    const combinedTopTwoPercentage = Math.round(((topVote.count + (secondVote.count || 0)) / totalValidVotes) * 100);

    // Let's grade the level of chaos on our patented disagreement scale
    const classifyRange = (ratio: number): 'tiny' | 'small' | 'moderate' | 'large' | 'huge' => {
      if (ratio <= 1.5) return 'tiny';        // "Practically identical, innit"
      if (ratio <= 3) return 'small';         // "Near enough for government work"
      if (ratio <= 6) return 'moderate';      // "Getting somewhere now"
      if (ratio <= 15) return 'large';        // "Worlds apart, these are"
      return 'huge';                          // "Might as well be on different planets"
    };

    const teamRangeMagnitude = classifyRange(teamRatio);
    const coreRangeMagnitude = classifyRange(coreRatio);

    // Right, let's see how much consensus we can pretend exists
    let baseConsensusPercentage: number;
    let baseLevel: 'Excellent' | 'Good' | 'Fair' | 'Poor';
    let coreDescription: string;

    // Blimey, everyone actually agrees? Mark this date in the calendar
    if (positionRange === 0) {
      this.consensus = {
        level: 'Excellent',
        recommendation: 'Perfect consensus - proceed with estimate',
        color: '#28a745',
        consensusPercentage: 100,
        modePercentage: 100
      };
      return;
    }

    // Time to assess just how much agreement we can squeeze out of this lot
    
    // First check: Is there actually any meaningful winner? (minimum 40% threshold)
    if (topPercentage < 40) {
      // No clear winner - everyone's scattered about
      if (positionRange <= 2) {
        baseConsensusPercentage = 35;
        baseLevel = 'Fair';
        coreDescription = 'Everyone disagrees but at least they\'re in the same ballpark';
      } else if (positionRange <= 4) {
        baseConsensusPercentage = 25;
        baseLevel = 'Poor';
        coreDescription = 'No clear winner in this free-for-all';
      } else {
        baseConsensusPercentage = 15;
        baseLevel = 'Poor';
        coreDescription = 'Complete chaos with no discernible pattern';
      }
    }
    // There's a meaningful winner (40%+ support)
    else if (positionRange <= 2) {
      if (topPercentage >= 60) {
        baseConsensusPercentage = 90;
        baseLevel = 'Excellent';
        coreDescription = 'Team actually agrees on something';
      } else if (combinedTopTwoPercentage >= 70) {
        baseConsensusPercentage = 80;
        baseLevel = 'Good';
        coreDescription = 'Decent agreement between the main factions';
      } else {
        baseConsensusPercentage = 65;
        baseLevel = 'Good';
        coreDescription = 'Reasonable clustering, could be worse';
      }
    } else if (positionRange <= 4) {
      if (topPercentage >= 50) {
        baseConsensusPercentage = 75;
        baseLevel = 'Good';
        coreDescription = 'One option managed to rise above the rabble';
      } else if (combinedTopTwoPercentage >= 60) {
        baseConsensusPercentage = 60;
        baseLevel = 'Fair';
        coreDescription = 'Proper split between the leading contenders';
      } else {
        baseConsensusPercentage = 45;
        baseLevel = 'Fair';
        coreDescription = 'Votes scattered like autumn leaves';
      }
    } else {
      if (topPercentage >= 60) {
        baseConsensusPercentage = 50;
        baseLevel = 'Fair';
        coreDescription = 'One brave soul trying to lead this shambles';
      } else {
        baseConsensusPercentage = 25;
        baseLevel = 'Poor';
        coreDescription = 'Complete and utter pandemonium';
      }
    }

    // How far apart are the main players? Time for some penalties, I'm afraid
    let coreRangeModifier = '';
    let corePenalty = 0;

    switch (coreRangeMagnitude) {
      case 'tiny':
        coreRangeModifier = ' (practically carbon copies)';
        break;
      case 'small':
        coreRangeModifier = ' (close enough to call it a day)';
        corePenalty = 2;
        break;
      case 'moderate':
        coreRangeModifier = ' (with a bit of healthy disagreement)';
        corePenalty = 8;
        break;
      case 'large':
        coreRangeModifier = ' (despite talking completely different languages)';
        corePenalty = 15;
        if (baseLevel === 'Excellent') baseLevel = 'Good';
        break;
      case 'huge':
        coreRangeModifier = ' (somehow spanning the Grand Canyon of disagreement)';
        corePenalty = 25;
        if (baseLevel === 'Excellent') baseLevel = 'Good';
        else if (baseLevel === 'Good') baseLevel = 'Fair';
        break;
    }

    // Right, how scattered is the whole bleeding team? More penalties incoming
    let teamRangeModifier = '';
    let teamPenalty = 0;
    let discussionNeeded = 'crack on';

    switch (teamRangeMagnitude) {
      case 'tiny':
        teamRangeModifier = '';
        discussionNeeded = 'crack on'; // Miraculous, really
        break;
      case 'small':
        teamRangeModifier = '';
        discussionNeeded = 'quick word should do it'; // Living the dream
        break;
      case 'moderate':
        teamRangeModifier = ' with a few stragglers wandering off';
        teamPenalty = 5;
        discussionNeeded = 'brief chinwag required';
        break;
      case 'large':
        teamRangeModifier = ' but some are clearly living in cloud cuckoo land';
        teamPenalty = 15;
        discussionNeeded = 'time to herd the cats';
        if (baseLevel === 'Excellent' && coreRangeMagnitude !== 'tiny') baseLevel = 'Good';
        break;
      case 'huge':
        teamRangeModifier = ' but everyone might as well be in different postcodes';
        teamPenalty = 25;
        discussionNeeded = 'emergency powwow needed';
        if (baseLevel === 'Excellent') baseLevel = 'Fair';
        else if (baseLevel === 'Good' && (coreRangeMagnitude === 'large' || coreRangeMagnitude === 'huge')) baseLevel = 'Fair';
        break;
    }

    // Final tally - optimism minus harsh reality
    const consensusPercentage = Math.max(10, baseConsensusPercentage - corePenalty - teamPenalty);

    // Stick it all together like a proper British sandwich
    let recommendation = coreDescription + coreRangeModifier + teamRangeModifier + ' - ' + discussionNeeded;

    // Choose the appropriate shade of concern
    let color: string;
    switch (baseLevel) {
      case 'Excellent': color = '#28a745'; break; // Green like a lovely spring day
      case 'Good': color = '#17a2b8'; break;       // Blue like the sky on that one sunny day we had
      case 'Fair': color = '#ffc107'; break;       // Yellow like a warning triangle
      case 'Poor': color = '#dc3545'; break;       // Red like a proper emergency
    }

    this.consensus = {
      level: baseLevel,
      recommendation,
      color,
      consensusPercentage,
      modePercentage: topPercentage
    };
  }

  // Helper methods for template
  get formattedMean(): string {
    return this.statistics.mean.toFixed(1);
  }

  get formattedMedian(): string {
    return this.statistics.median.toFixed(1);
  }

  get formattedMode(): string {
    if (this.statistics.mode.length === 0) return 'N/A';
    if (this.statistics.mode.length === 1) return this.statistics.mode[0].toString();
    return this.statistics.mode.join(', ');
  }

  get formattedRange(): string {
    return this.statistics.range.toString();
  }

  get consensusDisplay(): string {
    return `${this.consensus.level} (${this.consensus.modePercentage}% agreement, Range: ${this.statistics.range})`;
  }
 
  barChartData: ChartConfiguration<'bar'>['data'] = {
    labels: [],
    datasets: [
      {
        label: 'Number of Voters',
        data: [],
        backgroundColor: 'rgba(66, 99, 246, 0.7)',
        borderColor: 'rgba(66, 99, 246, 1)',
        borderWidth: 1
      }
    ]
  };

  barChartOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 1000,
      easing: 'easeOutBounce'
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          stepSize: 1 // Ensure whole numbers for vote counts
        },
        // Add grace to provide white space above the highest bar
        grace: '10%'
      },
      x: {
        title: {
          display: true,
          text: 'Vote Options'
        }
      }
    },
    plugins: {
      legend: {
        display: true,
        position: 'top'
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            return `${context.dataset.label}: ${context.parsed.y} vote${context.parsed.y !== 1 ? 's' : ''}`;
          }
        }
      }
    }
  };

collapsed = {
  consensus: false,
  statistics: false,
  chart: false,
};

toggle(section: keyof typeof this.collapsed) {
  this.collapsed[section] = !this.collapsed[section];
}



}