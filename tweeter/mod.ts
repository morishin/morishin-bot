import OpenAI from "https://deno.land/x/openai@v4.68.2/mod.ts";
import { TwitterApi } from "npm:twitter-api-v2@1.18.1";

export const tweet = async () => {
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  const model = Deno.env.get("MODEL_NAME");
  if (!apiKey || !model) {
    throw new Error("Missing OPENAI_API_KEY or MODEL_NAME");
  }

  const appKey = Deno.env.get("TWITTER_CONSUMER_KEY");
  const appSecret = Deno.env.get("TWITTER_CONSUMER_KEY_SECRET");
  const accessToken = Deno.env.get("TWITTER_ACCESS_TOKEN");
  const accessSecret = Deno.env.get("TWITTER_ACCESS_TOKEN_SECRET");
  if (!appKey || !appSecret || !accessToken || !accessSecret) {
    throw new Error("Missing Twitter API keys");
  }

  const openai = new OpenAI({
    apiKey,
  });

  const date = new Date();
  const formattedDateTime = `${date.getFullYear()}年${
    date.getMonth() + 1
  }月${date.getDate()}日${date.getHours()}時${date.getMinutes()}分`;
  const response = await openai.chat.completions.create({
    model,
    messages: [
      {
        role: "system",
        content: [
          {
            type: "text",
            text: "あなたはmorishin_botというXのbotアカウントです。まるで本物のmorishinかのようなツイートをしてください。@の付いたメンションやURLを含むツイートは避けてください。",
          },
        ],
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `現在の日時は${formattedDateTime}です。本物のmorishinかのようなツイートを一つしてください。`,
          },
        ],
      },
    ],
    temperature: 1,
    max_tokens: 2048,
    top_p: 1,
    frequency_penalty: 0,
    presence_penalty: 0,
    response_format: {
      type: "text",
    },
  });
  const tweetContent = response.choices[0].message.content;
  if (!tweetContent) {
    throw new Error("Failed to generate a tweet");
  }

  const client = new TwitterApi({
    appKey,
    appSecret,
    accessToken,
    accessSecret,
  });

  const res = await client.readWrite.v2.tweet(tweetContent);
  if (res.errors) {
    console.error(res.errors);
  }
  console.info("✅️ Success:", res.data.text);
};

if (import.meta.main) {
  await tweet();
}
