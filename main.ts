import { reply, tweet } from "./tweeter/mod.ts";

// Due to the rate limit for `POST /2/tweets`
// => 17 requests / 24 hours & 500 posts / month
// See: https://developer.x.com/en/portal/products
Deno.cron(
  "Post a tweet",
  // JST 8:00-23:00 every hour
  "0 23,0-14 * * *",
  {
    backoffSchedule: [],
  },
  tweet
);

// Due to the rate limit for `GET /2/users/:id/mentions`
// => 1 requests / 15 mins
// See: https://developer.x.com/en/portal/products
Deno.cron(
  "Reply to mentions if exist",
  { minute: { every: 20 } },
  {
    backoffSchedule: [],
  },
  reply
);
