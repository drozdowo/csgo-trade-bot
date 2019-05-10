import express from "express";
import config from "./config";
import logIntoBot from "./steamuser/bot";
import accounts from "./steamuser/accounts";
const app = express();

global._mckay_statistics_opt_out = 1;

app.listen(config.port, async () => {
  console.log("/============\\");
  console.log("| CSGO DUELS |");
  console.log("|    BOT     |");
  console.log("|  MANAGER   |");
  console.log("\\============/");
  console.log("CSGODuels Bot Manager Listening on Port:", config.port);

  console.log("Server Started. Attempting to log into bot...");
  const myUser = logIntoBot(accounts[0]);

  myUser.on("loggedOn", details => {
    console.log("Successful login! ", myUser);
  });
});
