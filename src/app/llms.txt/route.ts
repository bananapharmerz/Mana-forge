import { SITE } from "@/lib/site";

// /llms.txt: a plain summary of the site for AI assistants and answer engines (llmstxt.org).
export const dynamic = "force-static";
export const revalidate = 86400;

export function GET() {
  const u = (p: string) => `${SITE.url}${p}`;
  const body = `# ${SITE.name}

> ${SITE.description}

${SITE.name} is a free Magic: The Gathering site focused on Commander (EDH). No account is needed to start building a deck; a free account saves up to 10 decks, and Premium adds unlimited decks, price alerts, deck value graphs and budget upgrade ideas.

## Main pages
- [Deck builder](${u("/deck-builder")}): build a 100-card Commander deck, see what other players run with your commander, and what the deck costs.
- [Every commander](${u("/commanders")}): browse every legal commander by color identity, tribe and archetype; each has a page with top cards and decklists, e.g. ${u("/decks/Krenko%2C%20Mob%20Boss")}.
- [Public decks](${u("/decks")}): decks other players have shared; copy one in a click.
- [Card prices](${u("/prices")}): daily card prices with week, month and year graphs, and a watchlist.
- [Play online](${u("/play")}): a shared tabletop to play Commander with friends in the browser.
- [Premium](${u("/premium")}): what Premium includes and what it costs.

## About
- [Contact](${u("/contact")})
- [Privacy policy](${u("/legal/privacy")})
- [Terms](${u("/legal/terms")})

Card data and images come from Scryfall. Portions of ${SITE.name} are unofficial Fan Content permitted under the Wizards of the Coast Fan Content Policy; not approved or endorsed by Wizards.
`;
  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=3600" } });
}
