import { Component, EventEmitter, Input, Output } from '@angular/core';
import { voteExponential, voteFibonacci, voteLinear, voteTshirts } from '../vote-types';
import { FormsModule } from '@angular/forms';
import { IUserDetails } from '../../i-user-details';
import { LocalStorageService } from '../../local-storage.service';
import { ApiService } from '../../api.service';
import { ISettings } from '../../i-settings';
import { ICommand } from '../../i-command';
import { ICardChange } from '../../i-card-change';

@Component({
  selector: 'app-voting-card',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './voting-card.component.html',
  styleUrl: './voting-card.component.css'
})
export class VotingCardComponent {

  @Output() vote = new EventEmitter<string>
  selectedOption?: string
  settings!:ISettings  
  fibonacciCards = voteFibonacci
  linearCards = voteLinear
  tshirtsCards = voteTshirts
  exponetialCards = voteExponential
  
  votingCard = [this.exponetialCards, this.fibonacciCards, this.linearCards, this.tshirtsCards]
  selectedOptions = this.fibonacciCards.selectedOptions()
  constructor(private localService: LocalStorageService, private api: ApiService) {
    const settings = api.getSettings()
    settings.subscribe((data)=>{
      this.settings = data
      this.selectedOption = this.settings.votingCard
      const newCard = this.votingCard.find((x) => x.name === this.selectedOption)
      this.selectedOptions = newCard!.selectedOptions()
    })
  }
  onCardChange(card: Event) {
    const selectElement = card.target as HTMLSelectElement
    const selectCard = selectElement.value
    console.log(selectCard)
    if (selectCard) {
      const newCard = this.votingCard.find((x) => x.name === selectCard)
      this.selectedOptions = newCard!.selectedOptions()
      this.selectedOption = newCard!.name
      const card:ICardChange ={Card_Change:this.selectedOption}
      this.api.changeCards(card)
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
}
