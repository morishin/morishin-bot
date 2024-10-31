// deno-lint-ignore-file no-explicit-any
import OpenAI from "https://deno.land/x/openai@v4.68.2/mod.ts";
import { sortBy } from "https://deno.land/std@0.224.0/collections/mod.ts";

async function downloadTweetsFile(url: string, outputFilePath: string) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download tweets file: ${response.statusText}`);
  }
  const fileContent = await response.text();
  await Deno.writeTextFile(outputFilePath, fileContent);
  console.log(`File downloaded successfully: ${outputFilePath}`);
}

async function parseTweets(filePath: string, maxTweetsCount?: number) {
  const fileContent = await Deno.readTextFile(filePath);

  let tweets = eval(fileContent.replace("window.YTD.tweets.part0 = ", ""));
  tweets = tweets.filter(
    ({ tweet }: any) =>
      tweet.entities.user_mentions.length === 0 &&
      tweet.full_text.includes("http") === false
  );
  tweets = sortBy(tweets, ({ tweet }: any) => -new Date(tweet.created_at));
  tweets = sortBy(tweets, ({ tweet }: any) => -Number(tweet.favorite_count));
  if (maxTweetsCount) {
    tweets = tweets.slice(0, maxTweetsCount);
  }

  const fineTuningData: any[] = [];
  tweets.forEach(({ tweet }: any) => {
    const tweetText = tweet.full_text;
    const date = new Date(tweet.created_at);
    const formattedDateTime = `${date.getFullYear()}年${
      date.getMonth() + 1
    }月${date.getDate()}日${date.getHours()}時${date.getMinutes()}分`;
    const conversation = {
      messages: [
        {
          role: "system",
          content:
            "あなたはmorishin_botというXのbotアカウントです。まるで本物のmorishinかのようなツイートをしてください。@の付いたメンションやURLを含むツイートは避けてください。",
        },
        {
          role: "user",
          content: `現在の日時は${formattedDateTime}です。本物のmorishinかのようなツイートを一つしてください。`,
        },
        {
          role: "assistant",
          content: tweetText,
        },
      ],
    };
    fineTuningData.push(conversation);
  });

  return fineTuningData;
}

async function writeToJSONL(
  data: Array<{ prompt: string; completion: string }>,
  outputFilePath: string
) {
  const jsonlData = data.map((item) => JSON.stringify(item)).join("\n");
  await Deno.writeTextFile(outputFilePath, jsonlData);
  console.log(`JSONL file written successfully: ${outputFilePath}`);
}

async function uploadDataset(openai: OpenAI, filePath: string) {
  const fileContent = await Deno.readTextFile(filePath);

  const response = await openai.files.create({
    purpose: "fine-tune",
    file: new File([fileContent], "fine_tuning_data.jsonl", {
      type: "application/jsonl",
    }),
  });

  console.log("File uploaded successfully:", response);
  return response.id;
}

async function startFineTuning(openai: OpenAI, fileId: string) {
  const response = await openai.fineTuning.jobs.create({
    training_file: fileId,
    model: "gpt-4o-mini-2024-07-18",
  });

  console.log("Fine-tuning started:", response);
  return response;
}

if (import.meta.main) {
  const TWEETSJS_URL = Deno.env.get("TWEETSJS_URL");
  const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
  const MAX_TWEETS_COUNT = Number(Deno.env.get("MAX_TWEETS_COUNT")) || 100;
  if (!TWEETSJS_URL || !OPENAI_API_KEY) {
    throw new Error("TWEETSJS_URL and OPENAI_API_KEY are required");
  }
  const openai = new OpenAI({
    apiKey: OPENAI_API_KEY,
  });

  const tweetsJsFilePath = await Deno.makeTempFile();
  await downloadTweetsFile(TWEETSJS_URL, tweetsJsFilePath);

  const parsedTweets = await parseTweets(tweetsJsFilePath, MAX_TWEETS_COUNT);

  const jsonlFilePath = await Deno.makeTempFile();
  await writeToJSONL(parsedTweets, jsonlFilePath);

  const fileId = await uploadDataset(openai, jsonlFilePath);

  if (fileId) {
    await startFineTuning(openai, fileId);
  }
}
