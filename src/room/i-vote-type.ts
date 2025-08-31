export interface IVoteType {
    name: string;
    identifier:string;
    selectedOptions: () => {rate:number;value:string;icon:string}[];

}
