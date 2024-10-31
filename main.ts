import { tweet } from "./tweeter/mod.ts";

Deno.cron("Post a tweet", "0 * * * *", tweet);
