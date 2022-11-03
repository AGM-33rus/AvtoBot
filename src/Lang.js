import { config } from './config';
import Helper from './Helper';

/**
 * Класс Lang
 */
export default class Lang {
  /**
   * Создаем объект Lang
   */
  constructor(userLang = 'ru') {
    // получаем данные из общих настроек
    this.langParams = config.langParams;
    // записываем языковую настроку пользователя
    this.setLang(userLang);
  }

  /**
   * Уставнавливаем параметр lang
   */
  setLang(userLang) {
    // если настроки по переданному параметру существуют
    this.lang = Helper.isSet(this.langParams[userLang])
      ? userLang // то устанавливаем
      : 'ru'; // иначе вернем по умолчанию
  }

  /**
   * Получаем значение из массива
   */
  getParamByDot(arr, obj) {
    // получаем первый элемент массива
    const name = arr.shift();
    // проверяем есть ли еще в массиве другие параметры
    if (arr.length > 0) {
      // направляем на рекурсию
      return this.getParamByDot(arr, obj[name]);
    }
    // вернем настройку
    return obj[name];
  }

  /**
   * Готовим значение
   */
  getParam(param, data = {}) {
    // получаем текстовую настройку
    let text = this.getParamByDot(param.split('.'), this.langParams[this.lang]);
    // если настройка не найдена
    if (!Helper.isSet(text)) {
      // то вернем заглушку
      return 'Unknown Text';
    }
    // проверяем переданы ли значения под замену
    if (Object.keys(data).length > 0) {
      // перебираем значения
      Object.keys(data).forEach((key) => {
        const templ = `{${key}}`;
        // создаем шаблон
        const template = new RegExp(templ, 'gi');
        // заменяем
        text = text.replace(template, data[key]);
      });
    }
    // вернем настройку
    return text;
  }
}
