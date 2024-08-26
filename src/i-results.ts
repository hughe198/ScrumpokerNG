export interface IResults {
    type:"result";
    roomID:string;
    reveal:boolean;
    votes:{[key:string]:string};
}
