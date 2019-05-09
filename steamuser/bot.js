import SteamUser from "steam-user";

function logIntoBot(details) {
  const myUser = new SteamUser({
    autoRelogin: true,
    singleSentryfile: false,
    enablePicsCache: false,
    langauge: "english",
    machineIdType: 3,
    dataDirectory: "./steamuser/data"
  });

  console.log("Attempting to log into: ", details.accountName);
  myUser.logOn(details);
  return myUser;
}

export default logIntoBot;
