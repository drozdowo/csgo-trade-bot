import express from "express";
import BotManager from "../../BotManager";

var router = express.Router();

router.get("/getAllItems", async (req, res) => {
  let resJson = {};
  await Promise.all(
    BotManager()
      .getAllBots()
      .map(async bot => {
        resJson[bot.details.accountName] = processJson(
          await bot.getMyInventory()
        );
      })
  );
  res.send(resJson);
});

router.get("/getOtherInventory/:STEAMID", async (req, res) => {
  res.send(
    processJson(
      await BotManager()
        .getRandomBot()
        .getOtherInventory(req.params.STEAMID)
    )
  );
});

router.get("/getAllBots", async (req, res) => {
  res.send(BotManager().getAllBotsStatus());
});

router.get("/getReadyBots", async (req, res) => {
  res.send(BotManager().getReadyBots());
});

router.get("/getBotNames", async (req, res) => {
  res.send(BotManager().getBotNames());
});

router.post("/makeTradeOffer", async (req, res) => {
  const id = await BotManager()
    .getRandomBot()
    .makeTradeOffer(req.body);
  res.send(id);
});

router.get("/getItemPrice/:itemHash", async (req, res) => {
  const price = await BotManager()
    .getRandomBot()
    .getPriceOfItem(req.params.itemHash);
  if (price instanceof Number) {
    res.send("" + price + "");
  }
  res.send("0");
});

const processJson = json => {
  let items = [];
  json.map(item => {
    items.push({
      assetId: item.id,
      assetid: item.id,
      classId: item.classid,
      instanceId: item.instanceid,
      amount: item.amount,
      pos: item.pos,
      appId: item.appid,
      appid: item.appid,
      name: item.name,
      icon: item.icon_url,
      contextid: item.contextid,
      marketName: item.market_name,
      marketPrice: item.marketPrice,
      nameColor: item.name_color,
      statTrak:
        item.tags.find(tagObj => tagObj.category === "Quality")
          .internal_name === "strange"
    });
  });
  return items;
};

export default router;
