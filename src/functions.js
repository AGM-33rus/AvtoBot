import { config } from './config';

export function getMe() {
  const response = UrlFetchApp.fetch(`${config.apiUrl}${config.token}/getMe`);
  Logger.log(response.getContentText());
}

export function getWebHookInfo() {
  const response = UrlFetchApp.fetch(
    `${config.apiUrl}${config.token}/getWebHookInfo`
  );
  Logger.log(response.getContentText());
}

export function setWebHook() {
  const response = UrlFetchApp.fetch(
    `${config.apiUrl}${config.token}/setWebHook?url=${config.webUrl}`
  );
  Logger.log(response.getContentText());
}

export function logger(message, table = 'Logs') {
  try {
    const ss = SpreadsheetApp.openById(config.sheet);
    if (ss.getSheetByName(table) === null) {
      ss.insertSheet(table);
    }
    ss.getSheetByName(table).appendRow([message]);
  } catch (e) {
    Logger.log(e.getMessage());
  }
}
