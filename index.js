import express from "express";
import config from "./config";
import logIntoBot from "./steamuser/bot";
const app = express();

global._mckay_statistics_opt_out = 1;

app.listen(config.port, async () => {
  console.log("/============\\");
  console.log("| CSGO DUELS |");
  console.log("|    BOT     |");
  console.log("|  MANAGER   |");
  console.log("\\============/");
  console.log("CSGODuels Bot Manager Listening on Port:", config.port);

  console.log(
    "Server Started. Attempting to log into bot...",
    global._mckay_statistics_opt_out
  );
  const myUser = logIntoBot({
    accountName: "m0tcsgo",
    password: "fredbald"
  });

  myUser.on("loggedOn", details => {
    console.log(details);
  });
});
