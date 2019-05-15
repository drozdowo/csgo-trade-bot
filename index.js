import express from "express";
import config from "./config";
import accounts from "./steamuser/accounts";
import Bot from "./steamuser/bot";
const app = express();

global._mckay_statistics_opt_out = 1;

let botArr = [];

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
    botArr.push(bot);
  });
});

app.get("/bots/getAllItems", async (req, res) => {
  let resJson = {};
  botArr.map(async bot => {
    resJson[bot.myDetails.accountName] = await bot.getMyInventory();
  });
  res.send(resJson);
});
