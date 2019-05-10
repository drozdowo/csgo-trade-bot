import SteamUser from "steam-user";
import steamtotp from "steam-totp";

function logIntoBot(details) {
  const myUser = new SteamUser({
    autoRelogin: false,
    singleSentryfile: false,
    enablePicsCache: false,
    langauge: "english",
    machineIdType: 3,
    dataDirectory: "./steamuser/data"
  });

  myUser.on("steamGuard", (domain, callback, lastCodeWrong) => {
    if (lastCodeWrong) {
      myUser.logOff();
    }
    console.log("Obtaining SteamGuard code for ", details.accountName, "...");
    var code = steamtotp.generateAuthCode(details.sharedSecret);
    console.log("Code obtained: ", code);
    callback(code);
  });

  myUser.on("error", err => {
    console.log("ERROR logging into ", details.accountName, ": ", err);
    myUser.logOff();
  });

  console.log("Attempting to log into: ", details.accountName, "...");
  myUser.logOn(details);

  return myUser;
}

export default logIntoBot;
