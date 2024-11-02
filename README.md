# morishin-bot

A 𝕏 bot trained on @morishin127’s tweets using ChatGPT’s fine-tuning.

https://x.com/morishin_bot

## modeler

1. Download your X archive: https://help.x.com/en/managing-your-account/how-to-download-your-x-archive
1. Copy and fill environment variables. Put the `tweets.js` in your X archive to somewhere and set the file URL to `TWEETSJS_URL`.
    ```sh
    cp modeler/.env.example modeler/.env
    ```
1. Create model
    ```sh
    deno run create-model
    ```
1. Access to OpenAI console: https://platform.openai.com/finetune/
1. Keep the created model name.

## tweeter

1. Copy and fill environment variables. Set the created model name to `MODEL_NAME`.
    ```sh
    cp tweeter/.env.example tweeter/.env
    ```
1. Post a tweet.
    ```sh
    deno run tweet
    ```
1. Reply to mentions
    ```sh
    deno run reply
    ```
