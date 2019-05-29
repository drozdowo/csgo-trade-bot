import SteamUser from "steam-user";
import steamtotp from "steam-totp";
import getSteamAPIKey from "steam-web-api-key";
import SteamCommunity from "steamcommunity";
import TradeOfferManager from "steam-tradeoffer-manager";
import _ from "lodash";

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
      console.log(
        "ERROR logging into ",
        this.details.accountName,
        ": ",
        err.message
      );
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
              one.message
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
          this.tradeOffers.on("sentOfferChanged", this.offerChange);
        }
      );
    });
  };

  onTradeRequest = (steamID, response, restrictions) => {
    console.log(`trade from `, steamID, response, restrictions);
  };

  getMyInventory = async () => {
    return new Promise((resolve, reject) => {
      //change false to true later
      this.tradeOffers.getInventoryContents(730, 2, false, async (err, inv) => {
        if (err) reject(err.message);
        await Promise.all(
          inv.map(async item => {
            inv[inv.indexOf(item)]["marketPrice"] = await this.getPriceOfItem(
              item.market_hash_name
            );
          })
        );
        resolve(inv);
      });
    });
  };

  getOtherInventory = async steamId => {
    return new Promise((resolve, reject) => {
      this.tradeOffers.getUserInventoryContents(
        steamId,
        730,
        2,
        1,
        async (err, inv, currencies) => {
          if (err) reject(err.message);
          await Promise.all(
            inv.map(async item => {
              inv[inv.indexOf(item)]["marketPrice"] = await this.getPriceOfItem(
                item.market_hash_name
              );
            })
          );
          resolve(inv);
        }
      );
    }).catch(err => {
      console.log(
        `Error retrieving CSGO Inventory for: ${steamId} ${err.message}`
      );
      return null;
    });
  };

  makeTradeOffer = offer => {
    console.log(offer);
    return new Promise((resolve, reject) => {
      let tradeOffer = null;
      if (offer.token != null) {
        tradeOffer = this.tradeOffers.createOffer(
          offer.partnerSteamId,
          offer.token
        );
      } else {
        tradeOffer = this.tradeOffers.createOffer(offer.partnerSteamId);
      }
      tradeOffer.addMyItems(offer.itemsFromMe);
      tradeOffer.addTheirItems(offer.itemsFromThem);
      tradeOffer.setMessage(offer.message);
      tradeOffer.send((err, status) => {
        if (err) reject(err.message);
        resolve(status);
      });
    }).catch(err => {
      console.log(`Error making trade offer! ${err.message}`);
    });
  };

  offerChange = async (offer, oldState) => {
    console.log(
      `[INFO] Bot ${this.details.accountName} recieved an offer update... `,
      offer
    );
  };

  getPriceOfItem = async hashName => {
    console.log(`Getting price for ${hashName}`);
    return new Promise((resolve, reject) => {
      this.steamCommunity.getMarketItem(730, hashName, (err, item) => {
        if (err) reject(err.message);
        if (item) {
          resolve(item.lowestPrice);
        }
        resolve(0);
      });
    }).catch(err => {
      console.log(`Error getting price for ${hashName}`, err.message);
      return err;
    });
  };

  handleOffers = async offer => {
    console.log(`[INFO] Bot ${this.details.accountName} got offer...`);
    if (offer.isGlitched()) {
      offer.decline();
    }
    if (offer.itemsToGive.length === 0) {
      console.log(
        `[INFO] Bot ${this.details.accountName} accepting donation from ${
          offer.partner.accountid
        }...`
      );
      offer.accept();
      return;
    }
    console.log(
      `[INFO] Bot ${this.details.accountName} declining offer from ${
        offer.partner.accountid
      }...`
    );
    offer.decline();
  };
}
