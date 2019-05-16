import SteamUser from "steam-user";
import steamtotp from "steam-totp";
import SteamTradeOffers from "steam-tradeoffers";
import _ from "lodash";
import config from "../config";
import axios from "axios";

export default class Bot {
  //Fields
  steamUser = null;
  details = null;
  webApiKey = null;
  tradeOffers = null;
  webLogOn = null;
  cookies = null;

  constructor(details) {
    this.details = details;
  }

  logIntoBot = () => {
    this.steamUser = new SteamUser({
      autoRelogin: false,
      singleSentryfile: false,
      enablePicsCache: false,
      langauge: "english",
      machineIdType: 3,
      dataDirectory: "./steamuser/data"
    });
    this.setEventHandlers(this.steamUser);
    this.steamUser.logOn(this.details);
  };

  setEventHandlers = user => {
    this.steamUser.on("steamGuard", (domain, callback, lastCodeWrong) => {
      if (lastCodeWrong) {
        this.steamUser.logOff();
      }
      console.log(
        "Obtaining SteamGuard code for ",
        this.details.accountName,
        "..."
      );
      var code = steamtotp.generateAuthCode(this.details.sharedSecret);
      console.log("Code obtained: ", code);
      callback(code);
    });

    this.steamUser.on("error", err => {
      console.log("ERROR logging into ", this.details.accountName, ": ", err);
      this.steamUser.logOff();
    });

    this.steamUser.on("loggedOn", details => {
      console.log("Successful client login! ");
      this.steamUser.webLogOn();
      this.steamUser.setPersona(5); //Set us as looking to trade
    });

    this.steamUser.on("friendOrChatMessage", (senderID, message, room) => {
      if (message === "edart") {
        this.steamUser.trade(senderID);
      }
    });

    this.steamUser.on("tradeResponse", (steamID, response, restrictions) =>
      this.onTradeRequest(steamID, response, restrictions)
    );

    this.steamUser.on("webSession", (sessionId, cookies) => {
      this.cookies = {
        sessionId,
        cookies
      };
      console.log(this.cookies);
    });
  };

  onTradeRequest = (steamID, response, restrictions) => {
    logDebug("DEBUG: Trade Request Received from : " + steamID);
    console.log(restrictions);
  };

  getMyInventory = async () => {
    const mySteamId = this.steamUser.client_supplied_steamid;
    const res = await axios.get(
      `http://steamcommunity.com/profiles/${mySteamId}/inventory/json/730/1`
    );
    return res;
  };
}
