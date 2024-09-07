export interface IResults {
    type:"result";
    roomID:string;
    reveal:boolean;
    votes:IVotes
}

export interface IVotes{
    [key:string]:string;
}