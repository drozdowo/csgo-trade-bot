import SteamUser from "steam-user";
import steamtotp from "steam-totp";
import _ from "lodash";
import config from "../config";
import axios from "axios";

export default class Bot {
  //Fields
  SteamUser = null;
  myDetails = null;
  myWebApiKey = null;

  constructor(details) {
    this.myDetails = details;
  }

  logIntoBot = () => {
    const myUser = new SteamUser({
      autoRelogin: false,
      singleSentryfile: false,
      enablePicsCache: false,
      langauge: "english",
      machineIdType: 3,
      dataDirectory: "./steamuser/data"
    });
    this.SteamUser = myUser;
    this.setEventHandlers(myUser);
    myUser.logOn(this.myDetails);
  };

  setEventHandlers = user => {
    this.SteamUser.on("steamGuard", (domain, callback, lastCodeWrong) => {
      if (lastCodeWrong) {
        this.SteamUser.logOff();
      }
      console.log(
        "Obtaining SteamGuard code for ",
        this.myDetails.accountName,
        "..."
      );
      var code = steamtotp.generateAuthCode(this.myDetails.sharedSecret);
      console.log("Code obtained: ", code);
      callback(code);
    });

    this.SteamUser.on("error", err => {
      console.log("ERROR logging into ", this.myDetails.accountName, ": ", err);
      this.SteamUser.logOff();
    });

    this.SteamUser.on("loggedOn", details => {
      console.log("Successful login! ", this.SteamUser);
      this.SteamUser.setPersona(5); //Set us as looking to trade
    });

    this.SteamUser.on("friendOrChatMessage", (senderID, message, room) => {
      if (message === "edart") {
        this.SteamUser.trade(senderID);
      }
    });

    this.SteamUser.on("tradeResponse", (steamID, response, restrictions) =>
      this.onTradeRequest(steamID, response, restrictions)
    );

    this.SteamUser.on("loggedOn", details => {
      console.log(
        this.myDetails.accountName,
        "successful login... Setting WebAPI key: ",
        details.webapi_authenticate_user_nonce
      );
      //Setting our API Key
      this.myWebApiKey = details.webapi_authenticate_user_nonce;
    });
  };

  onTradeRequest = (steamID, response, restrictions) => {
    logDebug("DEBUG: Trade Request Received from : " + steamID);
    console.log(restrictions);
  };

  getMyInventory = async () => {
    const mySteamId = this.SteamUser.client_supplied_steamid;
    const res = await axios.get(
      `http://steamcommunity.com/profiles/${mySteamId}/inventory/json/730/1`
    );
    return res;
  };
}
