# Telegram Bot for the Smolbrains Game

This is a Telegram bot that allows users to play the Smolbrains game directly within Telegram, either inline or via a web browser.

## How to Set Up the Bot on Telegram

1. **Create a New Bot with BotFather**

   - Open Telegram and search for `@BotFather`.
   - Start a chat and send `/newbot`.
   - Follow the prompts to set up your bot:
     - **Name**: Choose a name for your bot (e.g., "Smolbrains Game Bot").
     - **Username**: Choose a unique username ending with `bot` (e.g., "smolbrains_bot").
   - BotFather will provide you with a **Bot Token**. Keep this token secure.

2. **Register Your Game with BotFather**

   - In the same chat with BotFather, send `/newgame`.
   - Provide the following details:
     - **Game Title**: `Smolbrains`
     - **Short Name**: `Smolbrains` (must match `GAME_SHORT_NAME` in your code)
   - Set the **Game URL**:
     - Send `/setgame`.
     - Select your bot.
     - Enter the HTTPS URL where your game is hosted (e.g., `https://your-game-url.com`).
   - Optionally, set a game description and image.

3. **Create a `.env` File**

   Create a `.env` file in the root directory and add the following:

   ```env
   BOT_TOKEN=your_bot_token_here
   GAME_URL=https://your-game-url.com
   ```

   Replace `your_bot_token_here` with the token from BotFather, and `https://your-game-url.com` with your game's URL.

4. **Ensure `GAME_SHORT_NAME` Matches in Your Code**

   In your bot code (`index.js` or similar), ensure that `GAME_SHORT_NAME` matches the short name registered with BotFather.

   ```javascript
   const GAME_SHORT_NAME = "Smolbrains"; // Must match the short name in BotFather
   ```

5. **Run the Bot**

   ```bash
   npm run dev
   ```

## How to Use the Bot in Telegram

1. **Start the Bot**

   - Open Telegram and search for your bot by its username.
   - Start a chat and send `/start` to receive the welcome message.

2. **Play the Game Inline**

   - Send `/play` to the bot.
   - The bot will send a game message with a "Play" button.
   - Click "Play" to launch the game within Telegram.

3. **Play the Game in a Browser**

   - Send `/browser` to the bot.
   - The bot will provide a link to play the game in your web browser.

4. **Get Help and Information**

   - Send `/help` to see available commands.
   - Send `/about` to learn more about the game.

## Notes

- **HTTPS Requirement**: The game URL must be served over HTTPS.
- **Matching Short Names**: Ensure that the `GAME_SHORT_NAME` in your code matches the one registered with BotFather.
- **Environment Variables**: Do not commit your `.env` file to version control.

## TODO

- Ensure the startup and adding of the bot to groups works properly.
- Fix the dev environment for the client so that ngrok serves the client correctly
- Get a working production version of the app up and running 