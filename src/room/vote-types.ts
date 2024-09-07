
import { IVoteType } from "./i-vote-type"
export const voteTypes:IVoteType=
{
  name:"Fibonacci",
  identifier:"fibonacci",
  generateOptions: ()=>[
    {value:"1",icon:"icons/fibonacci/1.png"},
    {value:"2",icon:"icons/fibonacci/2.png"},
    {value:"3",icon:"icons/fibonacci/3.png"},
    {value:"5",icon:"icons/fibonacci/4.png"},
    {value:"8",icon:"icons/fibonacci/5.png"},
    {value:"13",icon:"icons/fibonacci/6.png"},
    {value:"21",icon:"icons/fibonacci/7.png"},
    {value:"34",icon:"icons/fibonacci/8.png"},
    {value:"55",icon:"icons/fibonacci/9.png"}
  ]

}