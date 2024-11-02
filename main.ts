import { reply, tweet } from "./tweeter/mod.ts";

// Rate limit: https://developer.x.com/en/portal/products
Deno.cron(
  "Post a tweet and reply to mentions",
  // Due to the rate limit for GET /2/users/:id/mentions
  // => 1 requests / 15 mins
  { minute: { every: 20 } },
  async () => {
    await reply();
    const now = new Date();
    const minute = now.getMinutes();
    const hour = now.getHours();
    // Due to the rate limit for POST /2/tweets
    // => 17 requests / 24 hours & 500 posts / month
    if (7 <= hour && Math.floor(minute / 20) < 1) {
      await tweet();
    } else {
      console.info("Skip posting a tweet");
    }
  },
  {
    backoffSchedule: [],
  }
);
