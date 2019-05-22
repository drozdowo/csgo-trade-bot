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
  const id = await (await BotManager().getBotByName("m0tcsgo")).makeTradeOffer(
    req.body
  );
  res.send(id);
});

const processJson = json => {
  let items = [];
  json.map(item => {
    items.push({
      id: item.id,
      classId: item.classid,
      instanceId: item.instanceid,
      amount: item.amount,
      pos: item.pos,
      appId: item.appid,
      name: item.name,
      marketName: item.market_name,
      nameColor: item.name_color
    });
  });
  return items;
};

export default router;
