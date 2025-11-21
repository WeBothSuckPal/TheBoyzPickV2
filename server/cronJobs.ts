import cron from "node-cron";
import { storage } from "./storage";
import { log } from "./vite";

const SPORTS = [
  "americanfootball_ncaaf",
  "americanfootball_nfl",
  "baseball_mlb",
  "basketball_ncaab",
  "basketball_nba",
];

async function fetchGamesForAllSports() {
  try {
    log("Starting daily game fetch for all sports...");
    
    const apiKey = process.env.ODDS_API_KEY;
    if (!apiKey) {
      log("Error: ODDS_API_KEY not configured");
      return;
    }

    const activeWeek = await storage.getActiveWeek();
    if (!activeWeek) {
      log("No active week found");
      return;
    }

    let totalGames = 0;

    for (const sportKey of SPORTS) {
      try {
        const response = await fetch(
          `https://api.the-odds-api.com/v4/sports/${sportKey}/odds?apiKey=${apiKey}&regions=us&markets=spreads,totals&oddsFormat=american`
        );

        if (!response.ok) {
          log(`Failed to fetch ${sportKey} games: ${response.status}`);
          continue;
        }

        const oddsData = await response.json();

        await storage.deleteGamesByWeekAndSport(activeWeek.id, sportKey);

        for (const game of oddsData) {
          let homeSpread = null;
          let awaySpread = null;
          let overUnder = null;

          if (game.bookmakers && game.bookmakers.length > 0) {
            const bookmaker = game.bookmakers[0];
            const spreadsMarket = bookmaker.markets?.find((m: any) => m.key === "spreads");
            const totalsMarket = bookmaker.markets?.find((m: any) => m.key === "totals");

            if (spreadsMarket) {
              const homeOutcome = spreadsMarket.outcomes.find((o: any) => o.name === game.home_team);
              const awayOutcome = spreadsMarket.outcomes.find((o: any) => o.name === game.away_team);
              if (homeOutcome) homeSpread = `${homeOutcome.point > 0 ? '+' : ''}${homeOutcome.point}`;
              if (awayOutcome) awaySpread = `${awayOutcome.point > 0 ? '+' : ''}${awayOutcome.point}`;
            }

            if (totalsMarket) {
              const overOutcome = totalsMarket.outcomes.find((o: any) => o.name === "Over");
              if (overOutcome) overUnder = `${overOutcome.point}`;
            }
          }

          await storage.createGame({
            id: game.id,
            weekId: activeWeek.id,
            sportKey: game.sport_key,
            commenceTime: new Date(game.commence_time),
            homeTeam: game.home_team,
            awayTeam: game.away_team,
            homeSpread,
            awaySpread,
            overUnder,
          });
          totalGames++;
        }

        log(`Fetched ${oddsData.length} ${sportKey} games`);
      } catch (error: any) {
        log(`Error fetching ${sportKey}: ${error.message}`);
      }
    }

    log(`Daily game fetch completed. Total games: ${totalGames}`);
  } catch (error: any) {
    log(`Error in daily game fetch: ${error.message}`);
  }
}

export function startCronJobs() {
  // Run daily at 6:00 AM
  cron.schedule("0 6 * * *", fetchGamesForAllSports, {
    timezone: "America/New_York"
  });

  log("Cron jobs scheduled: Daily game fetch at 6:00 AM EST");
}
