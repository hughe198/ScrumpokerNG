export interface IVoteType {
    name: string;
    identifier:string;
    generateOptions: () => {value:string;icon:string}[];

}
