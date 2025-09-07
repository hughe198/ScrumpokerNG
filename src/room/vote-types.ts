
import { IVoteType } from "./i-vote-type"
export const voteStandard:IVoteType=
{
  name:"Standard",
  identifier:"standard",
  selectedOptions: ()=>[
    {rate:0, value:"Coffee",icon:"assets/icons/coffee/coffee-mug.png"},
    {rate:1, value:"1",icon:"assets/icons/fibonacci/1.png"},
    {rate:2, value:"2",icon:"assets/icons/fibonacci/2.png"},
    {rate:3, value:"3",icon:"assets/icons/fibonacci/3.png"},
    {rate:5, value:"5",icon:"assets/icons/fibonacci/4.png"},
    {rate:8, value:"8",icon:"assets/icons/fibonacci/5.png"},
    {rate:13, value:"13",icon:"assets/icons/fibonacci/6.png"},
    {rate:20, value:"20",icon:"assets/icons/fibonacci/7.png"},
    {rate:40, value:"40",icon:"assets/icons/fibonacci/8.png"},
    {rate:100, value:"100",icon:"assets/icons/fibonacci/9.png"}
  ],
  }
export const voteFibonacci:IVoteType=
{
  name:"Fibonacci",
  identifier:"fibonacci",
  selectedOptions: ()=>[
    {rate:0,value:"Coffee",icon:"assets/icons/coffee/coffee-mug.png"},
    {rate:1,value:"1",icon:"assets/icons/fibonacci/1.png"},
    {rate:2,value:"2",icon:"assets/icons/fibonacci/2.png"},
    {rate:3,value:"3",icon:"assets/icons/fibonacci/3.png"},
    {rate:5,value:"5",icon:"assets/icons/fibonacci/4.png"},
    {rate:8,value:"8",icon:"assets/icons/fibonacci/5.png"},
    {rate:13,value:"13",icon:"assets/icons/fibonacci/6.png"},
    {rate:21,value:"21",icon:"assets/icons/fibonacci/7.png"},
    {rate:34,value:"34",icon:"assets/icons/fibonacci/8.png"},
    {rate:100,value:"100",icon:"assets/icons/fibonacci/9.png"}
  ],
  }

  export const voteExponential:IVoteType={
  name:"Exponential",
  identifier:"exponential",
  selectedOptions: ()=>[
    {rate:0,value:"Coffee",icon:"assets/icons/coffee/coffee-mug.png"},
    {rate:1,value:"1",icon:"assets/icons/exponential/1.png"},
    {rate:2,value:"2",icon:"assets/icons/exponential/2.png"},
    {rate:4,value:"4",icon:"assets/icons/exponential/3.png"},
    {rate:8,value:"8",icon:"assets/icons/exponential/4.png"},
    {rate:16,value:"16",icon:"assets/icons/exponential/5.png"},
    {rate:32,value:"32",icon:"assets/icons/exponential/6.png"},
    {rate:64,value:"64",icon:"assets/icons/exponential/7.png"},
    {rate:128,value:"128",icon:"assets/icons/exponential/8.png"},
    {rate:256,value:"256",icon:"assets/icons/exponential/9.png"}
  ]

  }
  export const voteLinear:IVoteType={
  name:"Linear",
  identifier:"linear",
  selectedOptions: ()=>[
    {rate:0,value:"Coffee",icon:"assets/icons/coffee/coffee-mug.png"},
    {rate:1,value:"1",icon:"assets/icons/linear/1.png"},
    {rate:2,value:"2",icon:"assets/icons/linear/2.png"},
    {rate:3,value:"3",icon:"assets/icons/linear/3.png"},
    {rate:4,value:"4",icon:"assets/icons/linear/4.png"},
    {rate:5,value:"5",icon:"assets/icons/linear/5.png"},
    {rate:6,value:"6",icon:"assets/icons/linear/6.png"},
    {rate:7,value:"7",icon:"assets/icons/linear/7.png"},
    {rate:8,value:"8",icon:"assets/icons/linear/8.png"},
    {rate:9,value:"9",icon:"assets/icons/linear/9.png"}
  ]

  }
export const voteTshirts:IVoteType={
  name:"T-Shirt Sizes",
  identifier:"t-shirts",
  selectedOptions: ()=>[
    {rate:0,value:"☕",icon:"assets/icons/coffee/coffee-mug.png"},
    {rate:1,value:"XS",icon:"assets/icons/t-shirts/1.png"},
    {rate:2,value:"S",icon:"assets/icons/t-shirts/2.png"},
    {rate:3,value:"M",icon:"assets/icons/t-shirts/3.png"},
    {rate:4,value:"L",icon:"assets/icons/t-shirts/4.png"},
    {rate:5,value:"XL",icon:"assets/icons/t-shirts/5.png"},
    {rate:6,value:"XXL",icon:"assets/icons/t-shirts/6.png"},
    {rate:7,value:"XXXL",icon:"assets/icons/t-shirts/7.png"},
    {rate:8,value:"XXXXL",icon:"assets/icons/t-shirts/8.png"},
    {rate:9,value:"XXXXXL",icon:"assets/icons/t-shirts/9.png"}
  ]
  }
export const VOTE_NAMES = [
  "Standard",
  "Fibonacci",
  "Exponential",
  "Linear",
  "T-Shirt Sizes",
] as const;
export type VoteName = typeof VOTE_NAMES[number];


export const voteByName: Record<VoteName, IVoteType> = {
  Standard:        voteStandard,
  Fibonacci:       voteFibonacci,
  Exponential:     voteExponential,
  Linear:          voteLinear,
  "T-Shirt Sizes": voteTshirts,
} as const;


export function getVoteByName<N extends VoteName>(name: N): (typeof voteByName)[N] {
  return voteByName[name];
}