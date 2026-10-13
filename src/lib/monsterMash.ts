// Content for the seasonal "Monster Mash" Halloween page (/halloween). Each tribe links its
// featured commanders to their hub page (/decks/<name>), which every legal commander has.
// Commander names here are Scryfall-verified so the deep links resolve.

export interface Tribe {
  id: string;
  emoji: string;
  name: string;
  tagline: string;
  blurb: string;
  accent: string; // hex, for the tribe's accent bar
  commanders: { name: string; line: string }[];
}

export const TRIBES: Tribe[] = [
  {
    id: "vampires",
    emoji: "🧛",
    name: "Vampires",
    tagline: "Aristocrats, tokens and life drain",
    accent: "#c2334d",
    blurb:
      "The signature Halloween tribe: swarm with tokens, drain the table dry, and punish every life total that moves. Vampire decks reward going wide and bleeding your opponents one trigger at a time.",
    commanders: [
      { name: "Edgar Markov", line: "The definitive vampire general — eminence spits out a token for every vampire you cast, so the board snowballs before turn five." },
      { name: "Strefan, Maurer Progenitor", line: "Blink and attack-trigger value that floods the board with vampire tokens off your bigger threats." },
      { name: "Olivia Voldaren", line: "A grindy control vampire that steals creatures and pings the board all night." },
      { name: "Vito, Thorn of the Dusk Rose", line: "Turns every point of lifegain into life loss for the table — the classic drain finish." },
    ],
  },
  {
    id: "werewolves",
    emoji: "🐺",
    name: "Werewolves",
    tagline: "Day and night, then stomp",
    accent: "#6f8f3a",
    blurb:
      "Flip to night, transform the pack, and swing with trampling beaters. Werewolf decks live on the day/night mechanic — hold off on spells, let the moon rise, and watch your whole board get bigger at once.",
    commanders: [
      { name: "Tovolar, Dire Overlord", line: "The werewolf payoff: flips the game to night, pumps the pack, and draws cards when your wolves connect." },
      { name: "Ulrich of the Krallenhorde", line: "A beefy Gruul alpha that fights on transform and anthems the rest of the pack." },
    ],
  },
  {
    id: "zombies",
    emoji: "🧟",
    name: "Zombies",
    tagline: "They just keep coming back",
    accent: "#4a9a6a",
    blurb:
      "Endless tokens, graveyard recursion and attrition. Zombie decks don't mind trading — everything comes back, and the horde only gets wider. Play the long game and bury the table in bodies.",
    commanders: [
      { name: "Wilhelt, the Rotcleaver", line: "The modern zombie engine — decayed tokens, card draw, and a board that rebuilds itself every turn." },
      { name: "Gisa and Geralf", line: "Cast and recast zombies from the graveyard for pure value in mono-flavoured blue-black." },
      { name: "Varina, Lich Queen", line: "Go-wide zombies with card advantage and a looting engine to fuel the yard." },
      { name: "The Scarab God", line: "Reanimate the best creatures in every graveyard and scry-drain the table to death." },
    ],
  },
  {
    id: "spirits",
    emoji: "👻",
    name: "Ghosts & Spirits",
    tagline: "Evasive, flickering, hard to pin down",
    accent: "#5fb6c9",
    blurb:
      "Flying tokens, death triggers and recursion you can't catch. Spirit decks float above the ground game — chip in through the air, bring threats back from the dead, and slip the removal that would stop anyone else.",
    commanders: [
      { name: "Millicent, Restless Revenant", line: "Pumps out flying spirit tokens whenever your creatures die — a go-wide evasive army." },
      { name: "Shirei, Shizo's Caretaker", line: "Recurs your little spirits every end step for relentless, grindy value." },
    ],
  },
  {
    id: "monsters",
    emoji: "👹",
    name: "Monsters, Demons & Eldrazi",
    tagline: "The biggest, scariest things in the game",
    accent: "#b86a2e",
    blurb:
      "When subtlety isn't the point. Ramp into colossal threats, demons that demand a price, and Eldrazi titans that end games on cast. If you want your Halloween table to feel genuinely threatened, this is the shelf.",
    commanders: [
      { name: "Rakdos, Lord of Riots", line: "A demon that turns every point of damage into free mana for your biggest spells." },
      { name: "Kozilek, the Great Distortion", line: "Refills your hand on cast and hits like a truck — colourless big-mana payoff." },
      { name: "Ulamog, the Ceaseless Hunger", line: "Exiles permanents on cast and mills the game out — an inevitable finisher." },
      { name: "Emrakul, the Promised End", line: "The ultimate top-end: take an extra turn and seize a rival the moment she lands." },
    ],
  },
];
