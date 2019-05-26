import SteamUser from "steam-user";
import steamtotp from "steam-totp";
import getSteamAPIKey from "steam-web-api-key";
import SteamTradeOffers from "steam-tradeoffers";
import SteamCommunity from "SteamCommunity";
import TradeOfferManager from "steam-tradeoffer-manager";
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
  loggedIn = false;
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
      if (this.loggedIn) return;
      console.log("Successful client login! ");
      this.loggedIn = true;
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
          this.tradeOffers = new TradeOfferManager({
            steam: this.steamUser,
            domain: "www.csgoduels.com",
            language: "en"
          });
          this.tradeOffers.setCookies(webCookie);
          console.log(`${this.details.accountName} set up and ready to go!`);
          this.tradeOffers.on("newOffer", this.handleOffers);
        }
      );
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
          tradableOnly: false
        },
        (err, inv) => {
          if (err) reject(err);
          resolve(inv);
        }
      );
    });
  };

  getOtherInventory = async steamId => {
    return new Promise((resolve, reject) => {
      this.tradeOffers.loadPartnerInventory(
        {
          partnerSteamId: steamId,
          appId: 730,
          contextId: 2
        },
        (err, res) => {
          if (err) reject(err);
          resolve(res);
        }
      );
    }).catch(err => {
      console.log(`Error retrieving CSGO Inventory for: ${steamId} ${err}`);
      return null;
    });
  };

  makeTradeOffer = offer => {
    return new Promise((resolve, reject) => {
      this.tradeOffers.makeOffer(offer, (err, offerId) => {
        if (err) reject(err);
        this.acceptIds.push(offerId);
        resolve(offerId);
      });
    }).catch(err => {
      console.log(`Error making trade offer! ${err}`);
    });
  };

  // Check our offers, accept any donations and reject any offers that request any items from our inventory.
  // Run this on a poll, every 10 seconds we'll check. If this hampers performance at scale, increase the interval.
  handleOffers = async offer => {
    console.log(`[INFO] Bot ${this.details.accountName} got offer...`);
    if (offer.isGlitched()) {
      offer.decline();
    }
    if (offer.itemsToGive.length === 0) {
      console.log(
        `[INFO] Bot ${this.details.accountName} accepting donation from ${
          offer.partner.steamID
        }`
      );
      offer.accept();
    }
    console.log(`[INFO] Bot ${this.details.accountName} declining offer...`);
    offer.decline();
  };
}
