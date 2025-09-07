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

interface VotingGroup {
  rate: number;
  value: string;  
  count: number;
  percentage: number;
}

interface VotingPattern {
  camps: VotingGroup[];
  pattern: 'single' | 'twocamp' | 'threecamp' | 'scattered';
  description: string;
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

    // Get all the rates (numeric values) for voted options, excluding coffee votes
    const rates: number[] = [];
    for (const voteValue of Object.values(this.votes)) {
      // Skip coffee votes (value "Coffee" or "☕") as they're not estimation votes
      if (voteValue === 'Coffee' || voteValue === '☕') {
        continue;
      }
      
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

  private detectVotingCamps(validVotes: string[]): VotingPattern {
    if (!this.settings || validVotes.length === 0) {
      return { camps: [], pattern: 'scattered', description: 'No valid votes to analyze' };
    }

    const voteType = getVoteByName(this.settings.votingCard as VoteName);
    const voteOptions = voteType.selectedOptions().sort((a, b) => a.rate - b.rate);

    // Count votes and create voting groups
    const voteCounts: { [rate: number]: { count: number, value: string } } = {};
    
    for (const voteValue of validVotes) {
      const voteOption = voteOptions.find(option => option.value === voteValue);
      if (voteOption) {
        if (!voteCounts[voteOption.rate]) {
          voteCounts[voteOption.rate] = { count: 0, value: voteOption.value };
        }
        voteCounts[voteOption.rate].count++;
      }
    }

    // Convert to VotingGroup array and sort by count (descending)
    const allGroups: VotingGroup[] = Object.entries(voteCounts)
      .map(([rate, data]) => ({
        rate: Number(rate),
        value: data.value,
        count: data.count,
        percentage: Math.round((data.count / validVotes.length) * 100)
      }))
      .sort((a, b) => b.count - a.count);

    // Team size-based camp detection thresholds
    const teamSize = validVotes.length;
    let minCampSize: number;
    let minCampPercentage: number;

    if (teamSize <= 4) {
      // Small teams: need 2+ people per camp
      minCampSize = 2;
      minCampPercentage = 0; // Percentage not relevant for small teams
    } else if (teamSize <= 7) {
      // Medium teams: need 2+ people OR 20%+ support per camp
      minCampSize = 2;
      minCampPercentage = 20;
    } else {
      // Large teams: need 15%+ support OR 2+ people per camp
      minCampSize = 2;
      minCampPercentage = 15;
    }

    // Filter groups that qualify as "camps"
    const significantCamps = allGroups.filter(group => 
      group.count >= minCampSize || group.percentage >= minCampPercentage
    );

    // Determine pattern based on number of significant camps
    let pattern: VotingPattern['pattern'];
    let description: string;

    if (significantCamps.length === 0) {
      pattern = 'scattered';
      description = 'No significant voting groups formed';
    } else if (significantCamps.length === 1) {
      pattern = 'single';
      description = `Single dominant group with ${significantCamps[0].percentage}% support`;
    } else if (significantCamps.length === 2) {
      pattern = 'twocamp';
      description = `Two camps: ${significantCamps[0].percentage}% vs ${significantCamps[1].percentage}%`;
    } else if (significantCamps.length === 3) {
      pattern = 'threecamp';
      description = `Three camps: ${significantCamps[0].percentage}% vs ${significantCamps[1].percentage}% vs ${significantCamps[2].percentage}%`;
    } else {
      pattern = 'scattered';
      description = `${significantCamps.length} camps detected - highly fragmented`;
    }

    return {
      camps: significantCamps,
      pattern,
      description
    };
  }

  // Enhanced comment system with multiple variants
  private readonly commentVariants = {
    singleWinner: [
      "Team actually agrees on something",
      "Miracles do happen after all",
      "Stars have aligned magnificently",
      "Everyone's singing from the same hymn sheet",
      "Consensus achieved - mark this day in history",
      "Unity at last - who'd have thought it possible",
      "Team's found their collective voice",
      "Perfect harmony in this digital democracy",
      "Agreement reached without bloodshed",
      "Synchronicity in the workplace - rare as hen's teeth",
      "Team's channeling their inner hive mind",
      "Collective wisdom has emerged from chaos"
    ],
    twoCamps: [
      "Two tribes have spoken",
      "Team's split into opposing factions", 
      "Classic battle of perspectives unfolds",
      "Democracy divided into a neat binary",
      "Team's gone full parliamentary - government vs opposition",
      "Two-party system has emerged from the masses",
      "Camps have been drawn in the digital sand",
      "Tale of two estimates - Dickensian in scope",
      "Team's playing estimate ping-pong",
      "Dueling banjos of estimation",
      "Two schools of thought have formed academic departments"
    ],
    threeCamps: [
      "Three-way philosophical divide detected",
      "Team's formed a voting triangle of confusion",
      "Democracy in action - three-party coalition needed", 
      "Triple threat estimation scenario",
      "Team's gone full three-ring circus",
      "Triumvirate of opinions has emerged",
      "Three wise monkeys approach to estimation",
      "Team's achieved perfect triangulation of disagreement",
      "Three-course meal of varying opinions served",
      "Trinity of estimates - biblical proportions",
      "Three musketeers of estimation dysfunction",
      "Trio of trouble in the voting booth"
    ],
    scattered: [
      "Complete and utter pandemonium reigns",
      "Votes scattered like autumn leaves in a hurricane",
      "Team's gone completely rogue",
      "Estimation anarchy has been declared",
      "Everyone's marching to their own drummer",
      "Chaos theory in practical demonstration",
      "Team's embracing their inner rebel",
      "Democratic process has turned into a free-for-all",
      "Voting has devolved into beautiful madness",
      "Team's achieving peak disagreement efficiency",
      "Estimates scattered across the known universe",
      "Collective decision-making has left the building"
    ],
    rangeModifiers: {
      tiny: [
        "(practically carbon copies)",
        "(basically identical twins)", 
        "(within spitting distance)",
        "(close enough to share a brew)",
        "(near as makes no difference)",
        "(splitting hairs at this point)",
        "(practically joined at the hip)",
        "(close enough for jazz)",
        "(within margin of error territory)",
        "(almost telepathically aligned)",
        "(difference barely measurable by science)",
        "(so close they might be related)"
      ],
      small: [
        "(close enough to share a pint)",
        "(near enough for government work)",
        "(within polite disagreement range)",
        "(minor philosophical differences)",
        "(slight variations on a theme)",
        "(small gaps in the grand scheme)",
        "(close enough to call it quits)",
        "(minor turbulence in agreement)",
        "(tiny rifts in the consensus fabric)",
        "(manageable differences of opinion)",
        "(small potatoes in estimation terms)",
        "(close enough to not lose sleep over)"
      ],
      moderate: [
        "(with some healthy disagreement)",
        "(showing creative differences)",
        "(moderate gaps in understanding)",
        "(reasonable distance between camps)",
        "(respectable disagreement detected)",
        "(moderate turbulence ahead)",
        "(healthy debate territory)",
        "(manageable philosophical divide)",
        "(reasonable spread of opinion)",
        "(moderate estimation weather conditions)",
        "(civilized disagreement zone)",
        "(acceptable variance detected)"
      ],
      large: [
        "(despite talking completely different languages)",
        "(bridging significant philosophical chasms)",
        "(spanning considerable intellectual real estate)",
        "(covering substantial disagreement territory)",
        "(major gaps in team consensus)",
        "(significant estimation weather disturbance)",
        "(large philosophical continents apart)",
        "(substantial rifts in the team fabric)",
        "(major differences requiring diplomatic intervention)",
        "(significant estimation earthquake detected)",
        "(large-scale consensus breakdown)",
        "(major disagreement storm brewing)"
      ],
      huge: [
        "(spanning the Grand Canyon of disagreement)",
        "(linking different geological eras)",
        "(connecting parallel universes of thought)",
        "(bridging continental drift levels of difference)",
        "(somehow spanning intergalactic distances)",
        "(covering light-years of estimation space)",
        "(touching different dimensions of disagreement)",
        "(reaching epic proportions of variance)",
        "(achieving legendary levels of discord)",
        "(spanning oceanic depths of difference)",
        "(reaching astronomical levels of disagreement)",
        "(covering vast wilderness of estimation chaos)"
      ]
    },
    discussionActions: {
      single: [
        "crack on with confidence",
        "Bob's your uncle and Fanny's your aunt",
        "proceed with all due haste",
        "job's a good'un - carry on",
        "mission accomplished - time for tea",
        "sorted - no drama required",
        "in the bag - champagne time",
        "done and dusted like Sunday roast",
        "sealed deal - victory lap warranted",
        "consensus achieved - celebration pending",
        "agreement locked in - keys thrown away",
        "decision made - universe aligned"
      ],
      twocamp: [
        "mediate between the two factions",
        "bridge the divide between the duo", 
        "find middle ground between the two tribes",
        "negotiate a peace treaty between the pair",
        "diplomatic summit required for the two camps",
        "marriage counseling for the two opposing sides",
        "United Nations intervention for the binary divide",
        "peace talks needed between the warring duo",
        "compromise conference for the two factions",
        "neutral territory meeting for the opposing camps",
        "diplomatic breakthrough needed for the pair",
        "ceasefire negotiations for the two armies"
      ],
      threecamp: [
        "United Nations summit required for the trio",
        "group therapy for the three warring factions",
        "tri-party negotiation session needed",
        "three-way peace conference immediately",
        "triangular diplomacy summit required",
        "trinity of discussion needed urgently",
        "three-ring negotiation circus time",
        "triple threat mediation session",
        "trilateral peace accords needed",
        "three-course diplomatic dinner required",
        "triumvirate resolution meeting called",
        "three-party coalition government assembly"
      ],
      scattered: [
        "emergency all-hands meeting immediately",
        "full team intervention required urgently",
        "crisis management protocols activated",
        "everyone back to the drawing board",
        "emergency powwow needed desperately",
        "immediate team realignment session",
        "urgent collective therapy required",
        "emergency consensus building workshop",
        "immediate democratic reconstruction needed",
        "crisis resolution summit called",
        "emergency team alignment intervention",
        "immediate estimation rehabilitation program"
      ]
    }
  };

  private getRandomVariant(variants: string[]): string {
    return variants[Math.floor(Math.random() * variants.length)];
  }

  private generateRecommendation(votingPattern: VotingPattern, teamRangeMagnitude: string, coreRangeMagnitude: string, totalCoffeeVotes: number): string {
    let coreDescription: string;
    let discussionAction: string;
    let rangeModifier: string;

    // Select core description based on voting pattern
    switch (votingPattern.pattern) {
      case 'single':
        coreDescription = this.getRandomVariant(this.commentVariants.singleWinner);
        discussionAction = this.getRandomVariant(this.commentVariants.discussionActions.single);
        break;
      case 'twocamp':
        coreDescription = this.getRandomVariant(this.commentVariants.twoCamps);
        discussionAction = this.getRandomVariant(this.commentVariants.discussionActions.twocamp);
        break;
      case 'threecamp':
        coreDescription = this.getRandomVariant(this.commentVariants.threeCamps);
        discussionAction = this.getRandomVariant(this.commentVariants.discussionActions.threecamp);
        break;
      case 'scattered':
      default:
        coreDescription = this.getRandomVariant(this.commentVariants.scattered);
        discussionAction = this.getRandomVariant(this.commentVariants.discussionActions.scattered);
        break;
    }

    // Select range modifier based on magnitude (prioritize core range for camps, team range for scattered)
    const primaryRangeMagnitude = votingPattern.pattern === 'scattered' ? teamRangeMagnitude : coreRangeMagnitude;
    
    switch (primaryRangeMagnitude) {
      case 'tiny':
        rangeModifier = this.getRandomVariant(this.commentVariants.rangeModifiers.tiny);
        break;
      case 'small':
        rangeModifier = this.getRandomVariant(this.commentVariants.rangeModifiers.small);
        break;
      case 'moderate':
        rangeModifier = this.getRandomVariant(this.commentVariants.rangeModifiers.moderate);
        break;
      case 'large':
        rangeModifier = this.getRandomVariant(this.commentVariants.rangeModifiers.large);
        break;
      case 'huge':
        rangeModifier = this.getRandomVariant(this.commentVariants.rangeModifiers.huge);
        break;
      default:
        rangeModifier = '';
        break;
    }

    // Build the recommendation
    let recommendation = `${coreDescription} ${rangeModifier} - ${discussionAction}`;

    // Add coffee note if some people need caffeine
    if (totalCoffeeVotes > 0) {
      const coffeeNote = totalCoffeeVotes === 1 
        ? ' (1 person desperately needs coffee)'
        : ` (${totalCoffeeVotes} people desperately need coffee)`;
      recommendation += coffeeNote;
    }

    return recommendation;
  }

  private calculateConsensus(): void {
    if (!this.settings || !this.votes || !this.settings.reveal) {
      this.consensus = { level: 'Poor', recommendation: 'No data available', color: '#6c757d', consensusPercentage: 0, modePercentage: 0 };
      return;
    }

    // Right then, let's bin the empty votes because they're about as useful as a chocolate teapot
    const allVotes = Object.values(this.votes).filter(vote => vote && vote.trim() !== '');
    
    // Identify coffee votes (value "Coffee" or "☕") as non-votes - they're just wanting a brew break
    const coffeeVotes = allVotes.filter(vote => vote === 'Coffee' || vote === '☕');
    const validVotes = allVotes.filter(vote => vote !== 'Coffee' && vote !== '☕');
    const totalValidVotes = validVotes.length;
    const totalCoffeeVotes = coffeeVotes.length;
    const totalAllVotes = allVotes.length;
    
    // Check for coffee break scenarios - when everyone's gagging for a brew
    if (totalValidVotes === 0) {
      if (totalCoffeeVotes === totalAllVotes && totalCoffeeVotes > 0) {
        // Everyone voted for coffee - time for a proper break!
        this.consensus = { 
          level: 'Excellent', 
          recommendation: `Perfect consensus - everyone's crying out for a coffee break! Time to down tools and put the kettle on (${totalCoffeeVotes} coffee votes)`, 
          color: '#6f4e37', // Coffee brown color
          consensusPercentage: 100, 
          modePercentage: 100 
        };
      } else {
        this.consensus = { level: 'Poor', recommendation: 'No valid votes cast yet', color: '#6c757d', consensusPercentage: 0, modePercentage: 0 };
      }
      return;
    }

    // Check if large proportion wants coffee break
    const coffeePercentage = (totalCoffeeVotes / totalAllVotes) * 100;
    if (coffeePercentage >= 50) {
      // Half or more want coffee - that's a strong signal
      this.consensus = { 
        level: 'Good', 
        recommendation: `${Math.round(coffeePercentage)}% of the team needs a coffee break - maybe address the caffeine crisis before estimating further`, 
        color: '#6f4e37', // Coffee brown color
        consensusPercentage: Math.round(coffeePercentage), 
        modePercentage: Math.round(coffeePercentage)
      };
      return;
    }

    // With only two voters, can't really call it consensus unless they agree
    if (totalValidVotes === 2) {
      const uniqueVotes = [...new Set(validVotes)];
      if (uniqueVotes.length === 1) {
        // Both voted the same - that's consensus 
        const twoVoterConsensusPattern: VotingPattern = { camps: [], pattern: 'single', description: 'Two-voter consensus' };
        this.consensus = { 
          level: 'Excellent', 
          recommendation: this.generateRecommendation(twoVoterConsensusPattern, 'tiny', 'tiny', totalCoffeeVotes), 
          color: '#28a745', 
          consensusPercentage: 100, 
          modePercentage: 100 
        };
      } else {
        // They disagree - no consensus possible
        const twoVoterDisagreementPattern: VotingPattern = { camps: [], pattern: 'scattered', description: 'Two-voter disagreement' };
        this.consensus = { 
          level: 'Poor', 
          recommendation: this.generateRecommendation(twoVoterDisagreementPattern, 'huge', 'huge', totalCoffeeVotes), 
          color: '#dc3545', 
          consensusPercentage: 0, 
          modePercentage: 50 
        };
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

    // Detect voting camps for enhanced commentary
    const votingPattern = this.detectVotingCamps(validVotes);

    // Right, let's see how much consensus we can pretend exists
    let baseConsensusPercentage: number;
    let baseLevel: 'Excellent' | 'Good' | 'Fair' | 'Poor';
    let coreDescription: string;

    // Blimey, everyone actually agrees? Mark this date in the calendar
    if (positionRange === 0) {
      const perfectConsensusPattern: VotingPattern = { camps: [], pattern: 'single', description: 'Perfect consensus' };
      this.consensus = {
        level: 'Excellent',
        recommendation: this.generateRecommendation(perfectConsensusPattern, 'tiny', 'tiny', totalCoffeeVotes),
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

    // Use enhanced comment system for better variety and camp-aware recommendations
    const recommendation = this.generateRecommendation(votingPattern, teamRangeMagnitude, coreRangeMagnitude, totalCoffeeVotes);

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