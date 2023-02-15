# forked from yubinTW/discord-typescript-demo

# Discordjs with TypeScript

This project is for TRPG.
Use mongoDb to restore card information, player's character inforamtion, etc...
Use [discord.js](https://github.com/discordjs/discord.js) to create discord bot. This enable players to interact with db.

## Development

### Clone project

```
git clone https://github.com/thumbd78492/discord-dream-bot.git
cd discord-dream-bot
```

### Install Dependency

```
npm i
```

### Create your own mongodb

```
Reference: https://ithelp.ithome.com.tw/articles/10273876
```

### Create your `.env`

```
cp .env.sample .env
```

set your environment variable according to your app

### Build and Start App

```
npm run build
npm run start
```

or use `npm run dev` for developing

## Deployment

use [Google Cloud CLI](https://cloud.google.com/sdk/docs/install-sdk#linux)

```
npm run deploy
```

See [App Engin Guide](./app-engine-guide.md)
