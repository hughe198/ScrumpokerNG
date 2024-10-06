export interface IVoteType {
    name: string;
    identifier:string;
    selectedOptions: () => {value:string;icon:string}[];

}
