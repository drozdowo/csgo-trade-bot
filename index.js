import express from "express";
import config from "./config";
import accounts from "./steamuser/accounts";
import Bot from "./steamuser/bot";
import BotRouter from "./routers/bot/botRouter";
import BotManager from "./BotManager";
import bodyParser from "body-parser";

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

global._mckay_statistics_opt_out = 1;

app.listen(config.port, async () => {
  console.log("/============\\");
  console.log("| CSGO DUELS |");
  console.log("|    BOT     |");
  console.log("|  MANAGER   |");
  console.log("\\============/");
  console.log("CSGODuels Bot Manager Listening on Port:", config.port);

  console.log("Server Started. Attempting to log into bots...");

  accounts.map(a => {
    let bot = new Bot(a);
    bot.logIntoBot();
    BotManager().addBot(bot);
  });
});

app.use("/bots", BotRouter);
