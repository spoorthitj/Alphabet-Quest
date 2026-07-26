export const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
export const EMOJI_MAP = {
  A:"🍎",B:"🐻",C:"🐱",D:"🐶",E:"🥚",F:"🐸",G:"🍇",H:"🏠",I:"🍦",J:"🧃",
  K:"🪁",L:"🦁",M:"🐵",N:"🥜",O:"🐙",P:"🐧",Q:"👸",R:"🌈",S:"⭐",T:"🐯",
  U:"☂️",V:"🌋",W:"🍉",X:"🩻",Y:"🧶",Z:"🦓"
};
export const DIFF = {
  easy:{attempts:7, timeAttackSecs:75, memoryLen:4, memoryShow:4500},
  medium:{attempts:5, timeAttackSecs:60, memoryLen:5, memoryShow:3000},
  hard:{attempts:3, timeAttackSecs:45, memoryLen:6, memoryShow:2000}
};
export const ACHV_LIST = {
  first_win:{name:"First Flight", desc:"Win your first round", icon:"🐣"},
  streak5:{name:"Hot Streak", desc:"5 wins in a row", icon:"🔥"},
  alphabet_master:{name:"Alphabet Master", desc:"Clear Emoji Hint Mode fully", icon:"🎓"},
  speedy:{name:"Speed Demon", desc:"Score 10+ in Time Attack", icon:"⚡"},
  memory_king:{name:"Memory Master", desc:"Win Memory Mode on Hard", icon:"🧠"},
  perfect:{name:"Perfectionist", desc:"Win Classic Mode on the first guess", icon:"💎"}
};

export const MODES = [
  {id:'classic', emoji:'🎯', title:'Classic Mode', desc:'Guess the hidden letter in the fewest tries.'},
  {id:'timeattack', emoji:'⏱️', title:'Time Attack', desc:'Guess as many letters as you can in 60 seconds.'},
  {id:'order', emoji:'🔤', title:'Alphabet Order', desc:'Fill in the missing letter in a sequence.'},
  {id:'emoji', emoji:'🍎', title:'Emoji Hint Mode', desc:'Match the emoji to its letter. Great for kids!'},
  {id:'reverse', emoji:'↔️', title:'Reverse Guess', desc:'"Comes after H, before J." What letter is it?'},
  {id:'scramble', emoji:'🔀', title:'Scramble Mode', desc:'Arrange jumbled letters into alphabetical order.'},
  {id:'memory', emoji:'🧠', title:'Memory Mode', desc:'Memorize the sequence, then type it back.'},
  {id:'sound', emoji:'🔊', title:'Sound Mode', desc:'Hear a letter spoken aloud, then pick it.'}
];
