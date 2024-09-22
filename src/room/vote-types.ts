
import { IVoteType } from "./i-vote-type"
export const voteFibonacci:IVoteType=
{
  name:"Fibonacci",
  identifier:"fibonacci",
  generateOptions: ()=>[
    {value:"1",icon:"assets/icons/fibonacci/1.png"},
    {value:"2",icon:"assets/icons/fibonacci/2.png"},
    {value:"3",icon:"assets/icons/fibonacci/3.png"},
    {value:"5",icon:"assets/icons/fibonacci/4.png"},
    {value:"8",icon:"assets/icons/fibonacci/5.png"},
    {value:"13",icon:"assets/icons/fibonacci/6.png"},
    {value:"21",icon:"assets/icons/fibonacci/7.png"},
    {value:"34",icon:"assets/icons/fibonacci/8.png"},
    {value:"55",icon:"assets/icons/fibonacci/9.png"}
  ],
  }

  export const voteExponential:IVoteType={
  name:"Exponential",
  identifier:"exponential",
  generateOptions: ()=>[
    {value:"1",icon:"assets/icons/exponential/1.png"},
    {value:"2",icon:"assets/icons/exponential/2.png"},
    {value:"4",icon:"assets/icons/exponential/3.png"},
    {value:"8",icon:"assets/icons/exponential/4.png"},
    {value:"16",icon:"assets/icons/exponential/5.png"},
    {value:"32",icon:"assets/icons/exponential/6.png"},
    {value:"64",icon:"assets/icons/exponential/7.png"},
    {value:"128",icon:"assets/icons/exponential/8.png"},
    {value:"256",icon:"assets/icons/exponential/9.png"}
  ]

  }
  export const voteLinear:IVoteType={
  name:"Linear",
  identifier:"linear",
  generateOptions: ()=>[
    {value:"1",icon:"assets/icons/linear/1.png"},
    {value:"2",icon:"assets/icons/linear/2.png"},
    {value:"3",icon:"assets/icons/linear/3.png"},
    {value:"4",icon:"assets/icons/linear/4.png"},
    {value:"5",icon:"assets/icons/linear/5.png"},
    {value:"6",icon:"assets/icons/linear/6.png"},
    {value:"7",icon:"assets/icons/linear/7.png"},
    {value:"8",icon:"assets/icons/linear/8.png"},
    {value:"9",icon:"assets/icons/linear/9.png"}
  ]

  }
  export const voteTshirts:IVoteType={
  name:"T-Shirt Sizes",
  identifier:"t-shirts",
  generateOptions: ()=>[
    {value:"XS",icon:"assets/icons/t-shirts/1.png"},
    {value:"S",icon:"assets/icons/t-shirts/2.png"},
    {value:"M",icon:"assets/icons/t-shirts/3.png"},
    {value:"L",icon:"assets/icons/t-shirts/4.png"},
    {value:"XL",icon:"assets/icons/t-shirts/5.png"},
    {value:"XXL",icon:"assets/icons/t-shirts/6.png"},
    {value:"XXXL",icon:"assets/icons/t-shirts/7.png"},
    {value:"XXXXL",icon:"assets/icons/t-shirts/8.png"},
    {value:"XXXXXL",icon:"assets/icons/t-shirts/9.png"}
  ]

  }


