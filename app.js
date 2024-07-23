import "dotenv/config";
import bot from "@bot-whatsapp/bot";
import { getDay } from "date-fns";
import QRPortalWeb from "@bot-whatsapp/portal";
import BaileysProvider from "@bot-whatsapp/provider/baileys";
import MockAdapter from "@bot-whatsapp/database/mock";

import GoogleSheetService from "./services/sheets/index.js";

const googleSheet = new GoogleSheetService(
  "1ZH3l40ZHy9o-4xiBfwzABvNFNrHjphbH2bE-LYd2bRk"
);

const GLOBAL_STATE = [];

const flowPrincipal = bot
  .addKeyword(["hola", "hi"])
  .addAnswer([
    `¡Bienvenido a mi restaurante! 🚀`,
    `Tenemos menús diarios variados.`,
    `¿Te gustaría conocerlos?`,
    `Escribe *menu*`,
  ]);

const flowMenu = bot
  .addKeyword(["menu", "menú", "men"])
  .addAnswer(
    `Hoy tenemos el siguiente menú:`,
    null,
    async (_, { flowDynamic }) => {
      const dayNumber = getDay(new Date());
      const getMenu = await googleSheet.retriveDayMenu(dayNumber);
      for (let i = 0; i < getMenu.length; i++) {
        GLOBAL_STATE.push(getMenu[i]);
        await flowDynamic(`${i + 1}. ${getMenu[i]}`);
      }
    }
  )
  .addAnswer(
    `¿Te interesa alguno? Por favor, selecciona el número de la opción.`,
    { capture: true },
    async (ctx, { gotoFlow, state }) => {
      const optionNumber = parseInt(ctx.body, 10);
      if (isNaN(optionNumber) || optionNumber < 1 || optionNumber > GLOBAL_STATE.length) {
        return gotoFlow(flowEmpty);
      } else {
        state.update({ pedido: GLOBAL_STATE[optionNumber - 1] });
        return gotoFlow(flowPedido);
      }
    }
  );

const flowEmpty = bot
  .addKeyword(bot.EVENTS.ACTION)
  .addAnswer("¡No te he entendido!", null, async (_, { gotoFlow }) => {
    return gotoFlow(flowMenu);
  });

const flowPedido = bot
  .addKeyword(["pedir"], { sensitive: true })
    .addAnswer(
    "¿Quieres dejarle alguna nota al restaurante?",
    { capture: true },
    async (ctx, { state }) => {
      state.update({ observaciones: ctx.body });
    }
   )
    .addAnswer(
    "¿Cuál es tu nombre?",
    { capture: true },
    async (ctx, { state }) => {
      state.update({ name: ctx.body });
    }
  )
  .addAnswer(
    "Perfecto, tu pedido estará listo en aproximadamente 20 minutos.",
    null,
    async (ctx, { state }) => {
      const currentState = state.getMyState();
      await googleSheet.saveOrder({
        fecha: new Date().toDateString(),
        telefono: ctx.from,
        nombre: currentState.name,
        pedido: currentState.pedido,
        observaciones: currentState.observaciones,
      });
    }
  );

const main = async () => {
  const adapterDB = new MockAdapter();
  const adapterFlow = bot.createFlow([
    flowPrincipal,
    flowMenu,
    flowPedido,
    flowEmpty,
  ]);
  const adapterProvider = bot.createProvider(BaileysProvider);

  bot.createBot({
    flow: adapterFlow,
    provider: adapterProvider,
    database: adapterDB,
  });

  QRPortalWeb();
};

main();
