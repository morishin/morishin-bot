import { reply, tweet } from "./tweeter/mod.ts";

const HTML = await Deno.readFile("./static/index.html");

Deno.serve(async (req) => {
  const url = new URL(req.url);
  if (req.method === "GET" && url.pathname === "/") {
    return new Response(HTML, {
      headers: { "content-type": "text/html" },
    });
  }
  if (req.method === "POST" && url.pathname === "/tweet") {
    await tweet();
    return new Response("Tweet posted", { status: 200 });
  }
  if (req.method === "POST" && url.pathname === "/reply") {
    await reply();
    return new Response("Reply checked and posted if needed", { status: 200 });
  }
  return new Response("Not found", { status: 404 });
});

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
