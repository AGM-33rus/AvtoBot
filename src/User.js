import { config } from './config';

/**
 * Класс Пользователь
 */
export default class User {
  /**
   * Создаем объект пользователя
   */
  constructor(userData) {
    // заполняем uid
    this.uid = userData.uid;
    // name сразу склеиваем из первого и второго имени
    this.name = `${userData.firstName} ${userData.lastName}`.trim();
    // заполняем lang из телеги
    this.lang = userData.lang;
    // username если есть
    this.userName = userData.userName;
    // сохраняем данные
    this.save();
  }

  /**
   * Получаем строку в таблице по uid
   */
  static getRowByUid(sheet, uid, range_ = 'A1:A') {
    // определяем диапазон ячеек в таблице
    const range = sheet.getRange(range_);
    // получаем через поиск по переданному uid
    const result = range.createTextFinder(uid).matchEntireCell(true).findNext();
    // вернем результат
    return result ? result.getRow() : null;
  }

  /**
   * Обновляем или добавляем пользователя в таблицу
   */
  save() {
    // определяем таблицу и в ней лист
    const sheet = SpreadsheetApp.openById(config.sheet).getSheetByName(config.db.users.table);
    // получаем номер строки или null
    const row = User.getRowByUid(sheet, this.uid);
    // получаем текущую дату-время
    const date = new Date();
    // проверяем строку
    if (row) {
      // обновляем имя пользователя
      sheet.getRange(row, config.db.users.name).setValue(this.name);
      // обновляем username
      sheet.getRange(row, config.db.users.userName).setValue(this.userName);
      // обновляем lang
      sheet.getRange(row, config.db.users.lang).setValue(this.lang);
      // обновляем дату-время последнего посещения
      sheet.getRange(row, config.db.users.updated_at).setValue(date.toString());
    } else {
      // если строка не найдена, значит добавляем пользователя в лист
      sheet.appendRow([this.uid, this.name, this.userName, this.lang, date.toString(), date.toString()]);
    }
  }
}
