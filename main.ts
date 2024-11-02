import { reply, tweet } from "./tweeter/mod.ts";

// Due to the rate limit: 17 requests / 24 hours & 500 posts / month
Deno.cron("Post a tweet", "0 9-23 * * *", tweet, {
  backoffSchedule: [5 * 1000, 3 * 60 * 1000, 17 * 60 * 1000],
});

// Due to the rate limit: 1 requests / 15 mins & 50 posts / month
Deno.cron("Reply to mentions", { minute: { every: 16 } }, reply, {
  backoffSchedule: [],
});
