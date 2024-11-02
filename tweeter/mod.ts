import OpenAI from "https://deno.land/x/openai@v4.68.2/mod.ts";
import { TwitterApi } from "npm:twitter-api-v2@1.18.1";

const env = () => {
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  const model = Deno.env.get("MODEL_NAME");
  if (!apiKey || !model) {
    throw new Error("Missing OPENAI_API_KEY or MODEL_NAME");
  }
  const botUserId = Deno.env.get("TWITTER_BOT_USER_ID");
  if (!botUserId) {
    throw new Error("Missing TWITTER_BOT_USER_ID");
  }

  const appKey = Deno.env.get("TWITTER_CONSUMER_KEY");
  const appSecret = Deno.env.get("TWITTER_CONSUMER_KEY_SECRET");
  const accessToken = Deno.env.get("TWITTER_ACCESS_TOKEN");
  const accessSecret = Deno.env.get("TWITTER_ACCESS_TOKEN_SECRET");
  if (!appKey || !appSecret || !accessToken || !accessSecret) {
    throw new Error("Missing Twitter API keys");
  }

  return {
    apiKey,
    model,
    botUserId,
    appKey,
    appSecret,
    accessToken,
    accessSecret,
  };
};

export const tweet = async () => {
  const { apiKey, model, appKey, appSecret, accessToken, accessSecret } = env();

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

  const twitter = new TwitterApi({
    appKey,
    appSecret,
    accessToken,
    accessSecret,
  });

  const res = await twitter.readWrite.v2.tweet(tweetContent);
  if (res.errors) {
    console.error(res.errors);
  }
  console.info("✅️ Success:", res.data.text);
};

export const reply = async () => {
  const {
    apiKey,
    model,
    botUserId,
    appKey,
    appSecret,
    accessToken,
    accessSecret,
  } = env();

  const twitter = new TwitterApi({
    appKey,
    appSecret,
    accessToken,
    accessSecret,
  });

  const openai = new OpenAI({
    apiKey,
  });

  const kv = await Deno.openKv();
  const lastProcessedMentionId = (
    await kv.get<string>(["lastProcessedMentionId"])
  ).value;
  const { tweets: mentions, includes } = await twitter.readOnly.v2
    .userMentionTimeline(botUserId, {
      since_id: lastProcessedMentionId ?? undefined,
      // Ignore mentions older than 7 days
      start_time: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      "tweet.fields": ["conversation_id", "text", "author_id", "created_at"],
      expansions: ["referenced_tweets.id"],
    })
    .catch((err) => {
      console.error(err);
      throw err;
    });

  if (mentions.length === 0) {
    console.info("🔍 No new mentions found");
    return;
  }

  mentions.sort((a, b) =>
    !a.created_at || !b.created_at
      ? 0
      : a.created_at.localeCompare(b.created_at)
  );

  console.info("📥 Mentions:");
  console.dir(mentions);

  for (let i = 0; i < mentions.length; i++) {
    const mention = mentions[i];
    // Skip fetching conversation: https://devcommunity.x.com/t/get-2-tweets-search-recent-always-returns-503/228645
    // =============================================================================================================
    // if (!mention.conversation_id) {
    //   continue;
    // }
    // const { tweets: conversations } = await twitter.readOnly.v2.search({
    //   query: `conversation_id:${mention.conversation_id}`,
    //   "tweet.fields": "author_id,text",
    // });

    // console.info("📥 Conversations:");
    // console.dir(conversations);

    // const messages = conversations
    //   .slice(conversations.findIndex((tweet) => tweet.id === mention.id))
    //   .toReversed()
    //   .map((tweet) => ({
    //     role:
    //       tweet.author_id === botUserId
    //         ? ("assistant" as const)
    //         : ("user" as const),
    //     content: [
    //       {
    //         type: "text" as const,
    //         text: tweet.text,
    //       },
    //     ],
    //   }));
    // =============================================================================================================
    const messages = [
      {
        role: "assistant" as const,
        content: [
          {
            type: "text" as const,
            text: includes.tweets[i].text,
          },
        ],
      },
      {
        role: "user" as const,
        content: [
          {
            type: "text" as const,
            text: mention.text,
          },
        ],
      },
    ];
    // =============================================================================================================

    console.info("📥 Messages:");
    console.dir(messages);

    const response = await openai.chat.completions.create({
      model,
      messages: [
        {
          role: "system",
          content: [
            {
              type: "text",
              text: `あなたはmorishin_botというXのbotアカウントです。ユーザーの発言に対してまるで本物のmorishinかのようなリプライを行ってください。`,
            },
          ],
        },
        ...messages,
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

    const res = await twitter.readWrite.v2.tweet({
      text: tweetContent,
      reply: {
        in_reply_to_tweet_id: mention.id,
      },
    });
    if (res.errors) {
      console.error(res.errors);
      continue;
    }

    kv.set(["lastProcessedMentionId"], mention.id);
    console.info("✅️ Success:", res.data.text);
  }
};
