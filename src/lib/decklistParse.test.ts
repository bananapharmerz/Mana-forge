// Checks the decklist import against the formats people paste from other sites, so a tweak to one
// format can't quietly break another. Run with `npm test`.
import { test } from "node:test";
import assert from "node:assert/strict";
import { MAX_IMPORT_LINES, cleanCardLine, parseDecklist } from "./decklistParse.ts";

const names = (text: string) => parseDecklist(text).lines.map((l) => l.name);

test("Moxfield export: set codes, collector numbers and foil tags are stripped", () => {
  const list = ["1 Sol Ring (C21) 263", "1 Arcane Signet (CMM) 371 *F*", "35 Plains (UNF) 235", "", "1 Atraxa, Praetors' Voice (2X2) 190"].join("\n");
  const { lines } = parseDecklist(list);
  assert.deepEqual(
    lines.map((l) => [l.qty, l.name]),
    [
      [1, "Sol Ring"],
      [1, "Arcane Signet"],
      [35, "Plains"],
      [1, "Atraxa, Praetors' Voice"],
    ],
  );
  // No headers, so the short last block after a blank line is read as the commander.
  assert.equal(lines[3].section, "tail");
  assert.equal(lines[0].section, "main");
});

test("Archidekt export with categories: the [Commander] tag marks the commander", () => {
  const list = [
    "1x Atraxa, Praetors' Voice (2x2) 190 [Commander{top}]",
    "1x Sol Ring (cmm) 400 [Ramp]",
    "1x Swords to Plowshares (sta) 10 [Removal,Instant]",
    "Creatures (1)",
    "1x Birds of Paradise (m12) 165 [Ramp] ^Have,#37d67a^",
  ].join("\n");
  const { lines } = parseDecklist(list);
  assert.deepEqual(
    lines.map((l) => l.name),
    ["Atraxa, Praetors' Voice", "Sol Ring", "Swords to Plowshares", "Birds of Paradise"],
  );
  assert.deepEqual(
    lines.map((l) => l.marked),
    [true, false, false, false],
  );
});

test("a list with Commander and Deck headings puts each card in its section", () => {
  const list = ["Name: Superfriends", "Commander", "1 Atraxa, Praetors' Voice", "", "Deck", "1 Sol Ring", "1 Doubling Season", "", "Sideboard", "1 Cyclonic Rift"].join("\n");
  const parsed = parseDecklist(list);
  assert.equal(parsed.name, "Superfriends");
  assert.deepEqual(
    parsed.lines.map((l) => [l.name, l.section]),
    [
      ["Atraxa, Praetors' Voice", "commander"],
      ["Sol Ring", "main"],
      ["Doubling Season", "main"],
    ],
  );
});

test("an over-long paste is cut at the line limit and quantities are capped", () => {
  const list = Array.from({ length: MAX_IMPORT_LINES + 100 }, (_, i) => `1 Card ${i}`).join("\n");
  assert.equal(names(list).length, MAX_IMPORT_LINES);
  assert.equal(cleanCardLine("150 Forest")?.qty, 99);
});

test("lines that aren't cards are ignored", () => {
  assert.equal(cleanCardLine(""), null);
  assert.equal(cleanCardLine("1x " + "a".repeat(200)), null);
  assert.deepEqual(names("// Ramp\n1x Sol Ring\nLands (2)\n2 Forest"), ["Sol Ring", "Forest"]);
});
