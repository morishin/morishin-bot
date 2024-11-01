import { tweet } from "./tweeter/mod.ts";

Deno.cron("Post a tweet", "0 * * * *", tweet, {
  backoffSchedule: [5 * 1000, 3 * 60 * 1000, 17 * 60 * 1000],
});
