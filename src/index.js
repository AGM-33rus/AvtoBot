import { logger, getMe, getWebHookInfo, setWebHook } from './functions';
import WebHook from './WebHook';

/**
 * Получаем данные от Телеграм
 */
function doPost(request) {
  try {
    // получаем данные
    const response = JSON.parse(request.postData.contents);
    logger(response);
    // направляем данные в объект WebHook
    const webhook = new WebHook(response);
  } catch (et) {
    logger(et.getMessage());
  }
}

global.doPost = doPost;
global.logger = logger;
global.getMe = getMe;
global.setWebHook = setWebHook;
global.getWebHookInfo = getWebHookInfo;
