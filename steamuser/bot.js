import SteamUser from "steam-user";
import steamtotp from "steam-totp";
import getSteamAPIKey from "steam-web-api-key";
import SteamTradeOffers from "steam-tradeoffers";
import SteamCommunity from "SteamCommunity";
import _ from "lodash";
import config from "../config";
import axios from "axios";

export default class Bot {
  //Fields
  steamUser = null;
  details = null;
  webApiKey = null;
  tradeOffers = null;
  steamCommunity = null;
  webAuth = null;
  isReady = null;
  acceptIds = null;

  constructor(details) {
    this.details = details;
    this.isReady = false;
    this.acceptIds = [];
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
    if (this.details.sharedSecret != undefined) {
      //If we have a shared secret, we'll handle it here. Otherwise, we'll take input from stdin
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
    }

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

    this.steamUser.on("tradeResponse", (steamID, response, restrictions) => {
      this.onTradeRequest(steamID, response, restrictions);
    });

    // We have logged into the web, so now we'll set our cookies.
    this.steamUser.on("webSession", (sessionID, webCookie) => {
      if (this.webAuth != null) {
        return;
      }
      if (this.steamCommunity == null) {
        this.steamCommunity = new SteamCommunity();
      }
      this.steamCommunity.setCookies(webCookie);
      this.webAuth = {
        APIKey: null,
        sessionID,
        webCookie
      };
      getSteamAPIKey(
        {
          sessionId: this.webAuth.sessionID,
          webCookie: this.webAuth.webCookie
        },
        (one, two) => {
          if (one != null) {
            console.log(
              `Error obtaining WebAPIKey for user: ${this.details.accountName}`,
              one
            );
            this.steamUser.logOff();
            return;
          }
          this.webAuth.APIKey = two;
          this.isReady = true;
          // Set up the tradeoffers
          this.tradeOffers = new SteamTradeOffers();
          console.log("webauth: ", this.webAuth);
          this.tradeOffers.setup(this.webAuth);
          console.log(`${this.details.accountName} set up and ready to go!`);
        }
      );
    });

    // Set up our new confirmation handler:
    this.steamCommunity.on("newConfirmation", confirmation => {
      // 'confirmation' is our CConfirmation Object https://github.com/DoctorMcKay/node-steamcommunity/wiki/CConfirmation
      if (this.details.sharedSecret != null) {
        var time = steamtotp.time();
        var code = steamtotp.getConfirmationKey(
          this.details.sharedSecret,
          time,
          "details"
        );
        confirmation.getOfferID(time, code, (err, offerId) => {
          if (err) throw new Error(err);
          this.processTradeOffer(confirmation, offerId);
        });
      }
    });
  };

  onTradeRequest = (steamID, response, restrictions) => {
    console.log(`trade from `, steamID, response, restrictions);
  };

  getMyInventory = async () => {
    return new Promise((resolve, reject) => {
      this.tradeOffers.loadMyInventory(
        {
          appId: 730,
          contextId: 2,
          tradeableOnly: true
        },
        (err, inv) => {
          if (err) throw reject(err);
          resolve(inv);
        }
      );
    });
  };

  makeTradeOffer = offer => {
    return new Promise((resolve, reject) => {
      this.tradeOffers.makeOffer(offer, (err, offerId) => {
        if (err) reject(err, offer);
        this.acceptIds.push(offerId);
        resolve(offerId);
      });
    });
  };

  // confirmation - CConfirm - https://github.com/DoctorMcKay/node-steamcommunity/wiki/CConfirmation
  // id - The trade offer ID
  processTradeOffer = (confirmation, id) => {
    if (this.acceptIds.indexOf(id) != -1) {
      // Then we should accept this offer, as we made it.
      var time = steamtotp.time();
      var code = steamtotp.getConfirmationKey(
        this.details.sharedSecret,
        time,
        "allow"
      );
      confirmation.respond(time, key, true, err => {
        if (err) throw new Error(err);
      });
      console.log(
        "[Info] BOT: " +
          this.details.accountName +
          " Has accepted trade offer: ",
        id
      );
    }
  };
}
