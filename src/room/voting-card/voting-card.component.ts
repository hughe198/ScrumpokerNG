import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { voteExponential, voteFibonacci, voteLinear, voteTshirts,voteStandard } from '../vote-types';
import { FormsModule } from '@angular/forms';
import { IUserDetails } from '../../i-user-details';
import { LocalStorageService } from '../../local-storage.service';
import { ApiService } from '../../api.service';
import { ISettings } from '../../i-settings';
import { ICommand } from '../../i-command';
import { ICardChange } from '../../i-card-change';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-voting-card',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './voting-card.component.html',
  styleUrl: './voting-card.component.css'
})
export class VotingCardComponent implements OnInit {

  @Input() clearVotes!: Observable<void>;

  @Output() vote = new EventEmitter<string>
  selectedOption?: string
  settings!:ISettings  
  fibonacciCards = voteFibonacci
  linearCards = voteLinear
  tshirtsCards = voteTshirts
  exponetialCards = voteExponential
  standardVote = voteStandard
  
  votingCard = [this.standardVote,this.fibonacciCards,this.exponetialCards, this.linearCards, this.tshirtsCards]
  selectedOptions = this.standardVote.selectedOptions()
  
  constructor(private localService: LocalStorageService, private api: ApiService) {
    const settings = api.getSettings()
    settings.subscribe((data)=>{
      this.settings = data
      this.selectedOption = this.settings.votingCard
      const newCard = this.votingCard.find((x) => x.name === this.selectedOption)
      if (newCard){
        this.selectedOptions = newCard!.selectedOptions()
      }
    })
  }
  ngOnInit(): void {
    this.clearVotes.subscribe(()=>{
      this.resetVoteCard()
    })
    
  }
  onCardChange(card: Event) {
    const selectElement = card.target as HTMLSelectElement
    const selectCard = selectElement.value
    // console.log(selectCard)
    if (selectCard) {
      const newCard = this.votingCard.find((x) => x.name === selectCard)
      this.selectedOptions = newCard!.selectedOptions()
      this.selectedOption = newCard!.name
      const card:ICardChange ={Card_Change:this.selectedOption}
      this.api.changeCards(card)
      this.localService.changeVotingCard(this.selectedOption)
    }
  }

  voteClicked(voteValue: string) {

    console.log(`Voted:${voteValue}`)
    this.toggleVoteButton(voteValue)
    this.vote.emit(voteValue)
    
  }
  
  toggleVoteButton(voteValue:string){
    const votebutton = document.querySelector(`#option-${voteValue}`) as HTMLElement
    const buttons = document.querySelectorAll(".votingOption")
    buttons?.forEach(option => {
      if (option instanceof HTMLElement){
        if(option.id != votebutton.id){
          option.classList.remove("voteSelected")}
        else{
          option.classList.add("voteSelected")
        }
      }
    });
  }

  resetVoteCard()
    {
    const buttons = document.querySelectorAll(".votingOption")
    buttons?.forEach(option => {
      if (option instanceof HTMLElement){
          option.classList.remove("voteSelected")}    
  
    })}
}
