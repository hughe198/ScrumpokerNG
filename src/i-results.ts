export interface IResults {
    type:"result";
    roomID:string;
    votingCard:string;
    votes:IVotes
}

export interface IVotes{
    [key:string]:string;
}