import Bot from "./steamuser/bot";

class BotManager {
  botList = null;

  constructor() {
    this.botList = [];
  }

  addBot = bot => {
    if (bot instanceof Bot && this.botList.indexOf(bot) == -1) {
      // New bot
      this.botList.push(bot);
    }
  };

  getAllBots = () => {
    return this.botList;
  };

  getBotNames = () => {
    let names = [];
    this.botList.map(bot => {
      names.push(bot.details.accountName);
    });
    return names;
  };

  getReadyBots = () => {
    let names = [];
    this.botList.map(bot => {
      if (bot.isReady) {
        names.push(bot.details.accountName);
      }
    });
    return names;
  };
}

let BotManagerInstance = null;

export default () => {
  if (BotManagerInstance == null) {
    BotManagerInstance = new BotManager();
  }
  return BotManagerInstance;
};
