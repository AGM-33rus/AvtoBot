/**
 * Класс Helper
 */
export default class Helper {
  /**
   * Проверяем на существование
   */
  static isSet(variable) {
    return typeof variable !== 'undefined';
  }

  /**
   * Проверяем на null
   */
  static isNull(variable) {
    return variable === null;
  }
}
