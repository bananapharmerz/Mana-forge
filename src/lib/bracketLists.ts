// The card lists behind the "Estimated bracket" badge, apart from the Game Changers (those come
// from Scryfall's is:gamechanger tag, see gameChangers.ts, so they follow Wizards' list on their own).
// Built by hand from Wizards' Commander Brackets rules: mass land denial means cards that destroy,
// exile or bounce other lands, keep lands tapped, or change what mana four or more lands per player
// make (Wizards' own examples: Armageddon, Ruination, Sunder, Winter Orb, Blood Moon). Extra turns
// are cards whose text gives a player an extra turn. Bump UPDATED whenever you edit a list, because
// the badge shows that date so players know how fresh the check is.

export const BRACKET_LISTS_UPDATED = "2026-10-13";

export const MASS_LAND_DENIAL: readonly string[] = [
  "Armageddon",
  "Back to Basics",
  "Blood Moon",
  "Boom // Bust",
  "Burning of Xinye",
  "Cataclysm",
  "Catastrophe",
  "Decree of Annihilation",
  "Destructive Force",
  "Devastation",
  "Fall of the Thran",
  "Global Ruin",
  "Hokori, Dust Drinker",
  "Impending Disaster",
  "Jokulhaups",
  "Keldon Firebombers",
  "Magus of the Moon",
  "Obliterate",
  "Ravages of War",
  "Rising Waters",
  "Ruination",
  "Static Orb",
  "Sunder",
  "Tectonic Break",
  "Wildfire",
  "Winter Orb",
];

export const EXTRA_TURNS: readonly string[] = [
  "Alrund's Epiphany",
  "Beacon of Tomorrows",
  "Capture of Jingzhou",
  "Chance for Glory",
  "Expropriate",
  "Final Fortune",
  "Karn's Temporal Sundering",
  "Last Chance",
  "Lighthouse Chronologist",
  "Magistrate's Scepter",
  "Medomai the Ageless",
  "Nexus of Fate",
  "Notorious Throng",
  "Part the Waterveil",
  "Plea for Power",
  "Sage of Hours",
  "Savor the Moment",
  "Second Chance",
  "Seedtime",
  "Stitch in Time",
  "Temporal Extortion",
  "Temporal Manipulation",
  "Temporal Mastery",
  "Temporal Trespass",
  "Time Sieve",
  "Time Stretch",
  "Time Warp",
  "Timestream Navigator",
  "Walk the Aeons",
  "Wanderwine Prophets",
  "Warrior's Oath",
];
