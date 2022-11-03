import { config } from './config';
import Helper from './Helper';
import Bot from './Bot';
import User from './User';
import Lang from './Lang';

/**
 * Класс WebHook
 */
export default class WebHook {
  /**
   * Создаем объект WebHook
   */
  constructor(update) {
    this.update = update;
    // создаем объект бота
    this.bot = new Bot(this.update);
    // создаем объект пользователя
    this.user = new User(this.bot.getUserData());
    // создаем объект языковых настроек
    this.lang = new Lang(this.user.lang);
    // получаем набор команд с шаблонами
    this.linkCommands = config.linkCommands;
    // запускаем роутер
    this.route();
  }

  /**
   * Получаем объект команды
   */
  checkCommand(text) {
    //
    let result = {
      result: false,
    };
    // текстовые ссылки
    if (this.linkCommands.length > 0) {
      // перебираем команды
      this.linkCommands.forEach((linkCommand, idx) => {
        // добавим флаг
        this.linkCommands[idx].result = linkCommand.template.test(text);
        // вернем объект с методом
        if (this.linkCommands[idx].result) {
          result = { ...this.linkCommands[idx] };
        }
      });
    }
    // если дошли до этой строчки то вернем флаг false
    return result;
  }

  /**
   * Маршрутизируем
   */
  route() {
    if (this.bot.data.message.chat.type !== 'private') {
      throw new Error('403 - stop');
    }
    // если это сообщение
    if (Helper.isSet(this.bot.data.message)) {
      // если это текстовое сообщение
      if (Helper.isSet(this.bot.data.message.text)) {
        // проверяем на команды
        const command = this.checkCommand(this.bot.data.message.text);
        // если есть совпадение по шаблону
        if (command.result) {
          // вызываем метод
          this[command.method]();
          // выходим
          return;
        }
      }
      // если пишет админ
      if (this.isAdmin()) {
        // если это ответ на сообщение
        if (Helper.isSet(this.bot.data.message.reply_to_message)) {
          // получаем текст из отвечаемого сообщения
          const textT = Helper.isSet(this.bot.data.message.reply_to_message.text)
            ? this.bot.data.message.reply_to_message.text // текстовое сообщение
            : this.bot.data.message.reply_to_message.caption; // медиа сообщение
          // если ответ самому себе
          if (this.user.uid === this.bot.data.message.reply_to_message.from.id) {
            // уведомляем админа, что ответ самому себе
            Bot.sendMessage(config.botAdmin, this.lang.getParam('admin.answer.self'));
          } // если ответ на сообщение бота
          else if (this.isReplyBot() && !/^USER_ID::[\d]+::/.test(textT)) {
            // уведомляем, что ответ боту
            Bot.sendMessage(config.botAdmin, this.lang.getParam('admin.answer.bot'));
          } else {
            // получить id пользователя из сообщения
            const matches = textT.match(/^USER_ID::(\d+)::/);
            // проверяем
            if (matches) {
              // все нормально отправляем копию сообщения пользователю
              Bot.copyMessage(matches[1], config.botAdmin, this.bot.data.message.message_id);
            } else {
              // уведомляем, что не удалось направить сообщение пользователю
              Bot.sendMessage(config.botAdmin, this.lang.getParam('admin.answer.error.send'));
            }
          }
        } else {
          // уведомление нажать кнопку ответить
          Bot.sendMessage(config.botAdmin, this.lang.getParam('admin.answer.button.reply'));
        }
      } else {
        // Если это написал пользователь то отправляем копию админу
        this.sendCopyToAdmin();
      }
    }
  }

  /**
   * Проверяем на Админа
   */
  isAdmin() {
    // сравним текущего пользователя с админом из настроек
    return config.botAdmin === this.user.uid;
  }

  /**
   * Локальная проверка на бота
   */
  isReplyBot() {
    // вернем кто владелец сообщения на которое отвечаем
    return this.bot.data.message.reply_to_message.from.is_bot;
  }

  /**
   * Старт бота
   */
  start() {
    // определяем текст
    const text = this.isAdmin() // проверяем кто стартанул
      ? this.lang.getParam('admin.hello') // если стартанул админ
      : this.lang.getParam('user.hello', {
          name: this.user.name,
        });
    // выводим сообщение
    Bot.sendMessage(this.user.uid, text);
  }

  /**
   * Отправляем копию
   */
  sendCopyToAdmin() {
    // создаем ссылку на просмотр профиля
    const link =
      this.user.userName.length > 0
        ? `@${this.user.userName}`
        : `<a href="tg://user?id=${this.user.uid}">${this.user.name}</a>`;
    // дополнение к сообщению с id пользователя
    const dop = `USER_ID::${this.user.uid}::\nот <b>${this.user.name}</b> | ${link}\n-----\n`;
    // определяем данные по умолчанию
    const typeMessage = this.bot.getMessageType();
    let dopSend = false;
    const data = {
      chat_id: String(config.botAdmin),
      disable_web_page_preview: true,
      parse_mode: 'HTML',
      method: null,
    };
    // если это текстовое сообщение
    if (typeMessage === 'text') {
      // формируем доп с текстом
      data.text = dop + Bot.prepareMessageWithEntities(this.bot.getMessageText(), this.bot.getEntities());
      // переопределяем метод
      data.method = 'sendMessage';
    } else {
      // проверяем нужно ли отправлять dop отдельным сообщением
      dopSend = Helper.isNull(this.bot.getMessageText());
      // заполняем данные
      if (typeMessage === 'location') {
        // определяем координаты
        data.longitude = this.bot.data.message.location.longitude;
        data.latitude = this.bot.data.message.location.latitude;
        data.live_period = this.bot.data.message.location.live_period;
        data.horizontal_accuracy = this.bot.data.message.location.horizontal_accuracy;
      } else {
        // запоняем файлом
        data[typeMessage] = this.bot.getMessageFileId();
      }
      // если не надо доп, значит описание не пустое
      if (!dopSend) {
        // дополняем описание
        data.caption = dop + Bot.prepareMessageWithEntities(this.bot.getMessageText(), this.bot.getEntities());
      }
      // переопределяем метод
      data.method = `send${WebHook.prepareMethod(typeMessage)}`;
    }
    // если метод определен
    if (!Helper.isNull(data.method)) {
      // и нужно отправить доп отдельным сообщением
      if (dopSend) {
        // отправляем админу доп
        Bot.sendMessage(config.botAdmin, dop);
      }
      // отправляем копию
      Bot.query({
        method: 'post',
        payload: data,
      });
    }
  }

  /**
   * Преобразуем переданную строку в camelCase
   */
  static prepareMethod(method) {
    return method
      .split('_')
      .map((word) => {
        // преобразуем первый символ в верхний регистр, остальное в нижний
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      })
      .join('');
  }
}
