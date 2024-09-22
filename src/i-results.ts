export interface IResults {
    type:"result";
    roomID:string;
    reveal:boolean;
    votingCard:string;
    votes:IVotes
}

export interface IVotes{
    [key:string]:string;
}