import { config } from './config';
import Helper from './Helper';

/**
 * Класс Бот
 */
export default class Bot {
  /**
   * Создаем объект класса
   */
  constructor(data) {
    // и полученный объект с данными от Телеграм
    this.data = data;
  }

  /**
   * Получаем данные пользователя
   */
  getUserData() {
    // вернем данные для создания обновления пользователя
    return {
      // его uid
      uid: this.data.message.from.id ?? 0,
      // его первое имя
      firstName: this.data.message.from.first_name ?? '',
      // его второе имя
      lastName: this.data.message.from.last_name ?? '',
      // его username
      userName: this.data.message.from.username ?? '',
      // его языковую настройку
      lang: this.data.message.from.language_code ?? 'ru',
    };
  }

  /**
   * Entities - форматировние
   */
  getEntities() {
    // если это сообщение
    if (Helper.isSet(this.data.message)) {
      // если это текствое сообщение
      if (Helper.isSet(this.data.message.text)) {
        // вернем текстовое форматирование если оно существует
        return this.data.message.entities ?? null;
      }
      // если это не текствое сообщение, тогда вернем форматирование описания
      return this.data.message.caption_entities ?? null;
    }
    // если это другой тип данных вернем null
    return null;
  }

  /**
   * MessageText - получаем текст или описание объекта
   */
  getMessageText() {
    // медиа объекты с возможным описанием
    const medias = [
      'audio',
      'document',
      'photo',
      'animation',
      'video',
      'voice',
    ];
    // если это текствое сообщение
    if (Helper.isSet(this.data.message.text)) {
      // вернем текст сообщения
      return this.data.message.text ?? null;
    }
    // если это медиа сообщение с описанием
    if (medias.includes(this.getMessageType())) {
      // вернем описание объекта
      return this.data.message.caption ?? null;
    }
    // если не подходит условия вернем null
    return null;
  }

  /**
   * Message Type
   */
  getMessageType() {
    // получаем объект сообщения
    const message = { ...this.data.message };
    // начинаем проверки и при совпадении вернем тип сообщения
    if (Helper.isSet(message.text)) {
      return 'text'; // текстовое сообщение
    }
    if (Helper.isSet(message.photo)) {
      return 'photo'; // картинка
    }
    if (Helper.isSet(message.audio)) {
      return 'audio'; // аудио файл
    }
    if (Helper.isSet(message.document)) {
      return 'document'; // документ
    }
    if (Helper.isSet(message.animation)) {
      return 'animation'; // анимация
    }
    if (Helper.isSet(message.sticker)) {
      return 'sticker'; // стикер
    }
    if (Helper.isSet(message.voice)) {
      return 'voice'; // голосовая заметка
    }
    if (Helper.isSet(message.video_note)) {
      return 'video_note'; // видео заметка
    }
    if (Helper.isSet(message.video)) {
      return 'video'; // видео файл
    }
    if (Helper.isSet(message.location)) {
      return 'location'; // местоположение
    }
    // по умолчанию вернем null
    return null;
  }

  /**
   * Message File Id
   */
  getMessageFileId() {
    // получаем объект сообщения
    const message = { ...this.data.message };
    // определяем тип с вернем соответствующий file_id
    if (Helper.isSet(message.photo)) {
      // получаем массив картинок
      const photo = [...message.photo];
      // вернем самую последнюю - максимальный размер
      return photo[photo.length - 1].file_id;
    }
    if (Helper.isSet(message.audio)) {
      // аудио файл
      return message.audio.file_id;
    }
    if (Helper.isSet(message.document)) {
      // документ
      return message.document.file_id;
    }
    if (Helper.isSet(message.animation)) {
      // анимация
      return message.animation.file_id;
    }
    if (Helper.isSet(message.sticker)) {
      // стикер
      return message.sticker.file_id;
    }
    if (Helper.isSet(message.voice)) {
      // голосовая заметка
      return message.voice.file_id;
    }
    if (Helper.isSet(message.video_note)) {
      // видео заметка
      return message.video_note.file_id;
    }
    if (Helper.isSet(message.video)) {
      // видео файл
      return message.video.file_id;
    }
    // по умолчанию вернем null
    return null;
  }

  /**
   * Форматирование текста
   */
  static prepareMessageWithEntities(text, entities) {
    // проверяем наличие форматирования
    if (entities != null && entities.length > 0) {
      // готовим переменную в нее будем добавлять
      let prepareText = '';
      // перебираем форматирование
      entities.forEach((entity, idx, arr) => {
        // добавляем все что между форматированием
        if (entity.offset > 0) {
          // определяем начало
          const start =
            idx === 0 ? 0 : arr[idx - 1].offset + arr[idx - 1].length;
          // определяем длину
          const length = entity.offset - start;
          // добавляем
          prepareText += text.substr(start, length);
        }
        // выбираем текущий элемент форматирования
        let charts = text.substr(entity.offset, entity.length);
        // обрамляем в необходимый формат
        if (entity.type === 'bold') {
          // полужирный
          charts = `<b>${charts}</b>`;
        } else if (entity.type === 'italic') {
          // курсив
          charts = `<i>${charts}</i>`;
        } else if (entity.type === 'code') {
          // код
          charts = `<code>${charts}</code>`;
        } else if (entity.type === 'pre') {
          // inline код
          charts = `<pre>${charts}</pre>`;
        } else if (entity.type === 'strikethrough') {
          // зачеркнутый
          charts = `<s>${charts}</s>`;
        } else if (entity.type === 'underline') {
          // подчеркнутый
          charts = `<u>${charts}</u>`;
        } else if (entity.type === 'spoiler') {
          // скрытый
          charts = `<tg-spoiler>${charts}</tg-spoiler>`;
        } else if (entity.type === 'text_link') {
          // ссылка текстовая
          charts = `<a href="${entity.url}">${charts}</a>`;
        }
        // добавляем в переменную
        prepareText += charts;
      });
      // добавляем остатки текста если такие есть
      prepareText += text.substr(
        entities[entities.length - 1].offset +
          entities[entities.length - 1].length
      );
      // возвращаем результат
      return prepareText;
    }
    // по умолчанию вернем не форматированный текст
    return text;
  }

  /**
   * Отправляем сообщение
   */
  static sendMessage(chatId, text) {
    // готовим данные
    const data = {
      method: 'post',
      payload: {
        method: 'sendMessage',
        chat_id: String(chatId),
        text,
        parse_mode: 'HTML',
      },
    };
    // вернем результат отправки
    return Bot.query(data);
  }

  /**
   * Отправляем копию сообщения
   */
  static copyMessage(toId, fromId, messageId) {
    // готовим данные
    const data = {
      method: 'post',
      payload: {
        method: 'copyMessage',
        chat_id: String(toId), // кому
        from_chat_id: String(fromId), // откуда
        message_id: messageId, // что
      },
    };
    // вернем результат отправки
    return Bot.query(data);
  }

  /**
   * Запрос в Телеграм
   */
  static query(data) {
    return JSON.parse(
      UrlFetchApp.fetch(
        `${config.apiUrl}${config.token}/`,
        data
      ).getContentText()
    );
  }
}
