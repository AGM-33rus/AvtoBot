/**
 * Настройки роутера
 * @type {{buttonCommands: *[], linkCommands: *[]}}
 */
const config_route = {
  linkCommands: [
    {
      template: /^\/start$/,
      method: 'start::run'
    },
    {
      template: /^\/admin$/,
      method: 'admin::run'
    }
  ],
  buttonCommands: [
    {
      name: 'start.keyboard.btn_1', // Записаться
      method: 'appointment::run'
    },
    {
      name: 'start.keyboard.btn_2', // Мои записи
      method: 'notes::run'
    }
  ]
};

/**
 * Класс родитель Model
 */
class Model {
  /**
   * Получим новый объект
   */
  static find() {
    return new this();
  }

  /**
   * Получим занчение настроек колонок таблицы
   * @returns {string[]|string|number}
   */
  getColumns() {
    return mapClasses[this.constructor.name].table().columns;
  }

  /**
   * Получаем название листа
   * @returns {*}
   */
  getSheetName() {
    return mapClasses[this.constructor.name].table().name;
  }

  /**
   * Получаем файл таблицы
   * @returns {*}
   */
  getFile() {
    return SpreadsheetApp.openById(config.sheet);
  }

  /**
   * Получаем лист
   * @returns {*}
   */
  getSheet() {
    return this.getFile().getSheetByName(this.getSheetName());
  }

  /**
   * Получаем диапазон ячейки
   * @param column
   * @returns {string}
   */
  getRange(column) {
    // получаем буквенный индекс
    let letter = getLetterByIndex(column);
    // вернем диапазон столбца
    return letter + "1:" + letter;
  }

  /**
   * Сохраняекм объект
   * @returns {*}
   */
  save() {
    // проверим наличие hash
    if (isSet(this.hash)) {
      // если он есть - обновляем
      return this.update();
    } else {
      // если его нет добавляем
      return this.insert();
    }
  }

  /**
   * Создаем модель
   * @returns {Model}
   */
  insert() {
    // получим массив столбцов
    let columns = this.getColumns();
    // получим таблицу
    let sheet = this.getSheet();
    // создаем hash
    this.hash = getRandomStr(8);
    // перебираем
    let newData = columns.map(function (key) {
      // получим результат
      return isSet(this[key]) ? this[key] : null;
    }.bind(this));
    // записываем
    sheet.appendRow(newData);
    // вернем
    return this;
  }

  /**
   * Обновляем данные в таблице
   * @returns {Model}
   */
  update() {
    // получим индекс столбца
    let columnHashIdx = this.findIndex('hash');
    // получим данные из базы
    let objOldData = this.findOneBy('hash', this.hash);
    // проверим на наличие
    if (!isNull(objOldData)) {
      // получим таблицу
      let sheet = this.getSheet();
      // получим index строки
      let rowIdx = this.getRowIndex(columnHashIdx, this.hash);
      // перебирем данные из базы
      for (let key in objOldData) {
        // проверим
        if (objOldData[key] !== this[key]) {
          // получим index столбца
          let columnKeyIdx = this.findIndex(key);
          // запишем в таблицу
          sheet
            .getRange(rowIdx, columnKeyIdx)
            .setValue(this[key]);
        }
      }
    }
    // вернем текущий объект
    return this;
  }

  /**
   * Получаем индекс строки
   * @param column
   * @param value
   * @returns {number|null}
   */
  getRowIndex(column, value) {
    // определяем диапазон ячеек в таблице
    const range = this.getSheet().getRange(this.getRange(column));
    // получаем через поиск по переданному значению
    const result = range.createTextFinder(value).matchEntireCell(true).findNext();
    // вернем результат
    return !isNull(result) // если он не null
      ? result.getRow() // вернем номер строки
      : null; // или null
  }

  /**
   * Вернем результат: один или массив объектов
   * @param data
   * @param returnArray
   * @returns {*}
   */
  getResult(data, returnArray = false) {
    // проверим
    if (data.length) {
      // если не нужен массив объектов
      if (!returnArray) {
        // вернем первый объект
        return this.getSelfObject(data[0]);
      } else {
        // вернем массив объектов
        return data.map(function (item) {
          return this.getSelfObject(item);
        }.bind(this));
      }
    }
    // по умолчанию вернем null
    return returnArray ? [] : null;
  }

  /**
   * Преобразуем массив в объект по настройкам слобцов
   * @param data
   * @returns {*}
   */
  getSelfObject(data) {
    // если в данных есть значения
    if (data.length) {
      // создаем объект класса
      let object_ = new mapClasses[this.constructor.name]();
      // получаем массив столбцов
      let columns = this.getColumns();
      // перебираем ключи толбцов
      columns.forEach(function (key, idx) {
        // добавляем в объект
        object_[key] = data[idx]
      });
      // вернем объект
      return object_;
    }
    // по умолчанию вернем null
    return null;
  }

  /**
   * Получим индекс столбца
   * @param column
   * @returns {*}
   */
  findIndex(column) {
    return findIndex(this.getColumns(), column, 1);
  }

  /**
   * Получим все результаты
   * @returns {*}
   */
  all() {
    return this.getResult(this.getSheet().getDataRange().getValues(), true);
  }

  /**
   * Получим максимальное значение по столбцу
   * @param column
   * @returns {number}
   */
  getMaxByColumn(column) {
    let columnIdx = this.findIndex(column);
    let sheet = this.getSheet();
    let result = sheet.getRange(2, columnIdx, sheet.getLastRow()).getValues();
    return Math.max.apply(null, result);
  }

  /**
   * Поиск одного результата в таблице по значению
   * @param column
   * @param value
   * @returns {*}
   */
  findOneBy(column, value) {
    // получим index столбца
    let columnIdx = this.findIndex(column);
    // получим index строки
    let row_id = this.getRowIndex(columnIdx, value)
    // количество столбцов вправо
    let numCols = this.getColumns().length;
    // вернем результат (все результаты строки) если он есть
    return !isNull(row_id)
      ? this.getResult(this.getSheet().getRange(row_id, 1, 1, numCols).getValues())
      : null;
  }

  /**
   * Получаем значение по привязке
   * @param class_
   * @param foreignKey
   * @param localKey
   * @returns {*}
   */
  hasOne(class_, foreignKey, localKey) {
    return mapClasses[class_].find().findOneBy(foreignKey, this[localKey]);
  }

  /**
   * Получаем одну модель по параметрам
   * @param params
   * @param sort
   * @returns {*|Array}
   */
  findOneByParams(params = [], sort = null) {
    return this.getResultByParams(params, "one", sort);
  }

  /**
   * Получаем все модели по параметрам
   * @param params
   * @param sort
   * @returns {*|Array}
   */
  findAllByParams(params = [], sort = null) {
    return this.getResultByParams(params, "all", sort);
  }

  /**
   * Получим по параметрам и с сортировкой
   * @param params
   * @param type
   * @param sort
   * @returns {*}
   */
  getResultByParams(params, type, sort) {
    // получаем результаты по заданным параметрам
    let result = this.findByParams(params);
    // проверяем
    if (result.length) {
      // если задана сортировка
      if (!isNull(sort)) {
        // настройки сортровки
        let [column, direction] = sort;
        // сортируем
        result.sort(function (a, b) {
          return a[column] > b[column]
            ? (direction ? 1 : -1)
            : (direction ? -1 : 1);
        });
      }
      // вернем первый результат
      return type === "one" ? result[0] : result;
    }
    // по умолчанию вернем null
    return [];
  }

  /**
   * Вернем количество найденных
   * @param params
   * @returns {number}
   */
  getCountByParams(params = []) {
    return this.findByParams(params, false).length;
  }

  /**
   * Получаем результат по параметрам фильтрации
   * params = [
   *  {
   *    field: {
   *      column: "name_column"
   *      type: "number | string | date",
   *      action: "like | _like | like_ | not_like | === | !== | > | < | >= | <= | null | not_null | between | not_between"
   *      value: value | [values]
   *    }
   *  }
   * ]
   * @param params
   * @param returnAsObjects
   * @returns {*}
   */
  findByParams(params = [], returnAsObjects = true) {
    // проверяем
    if (params.length) {
      // получаем столбцы
      const columns = this.getColumns();
      // готовим массив фильтров
      let filters = {};
      // перебираем
      params.forEach(function (param) {
        // получим столбцы
        let [column, type, action, value] = param;
        // номер столбца
        let numColumn = columns.indexOf(column) + 1;
        // проверяем
        if (numColumn) {
          // получаем фильтр
          filters["_" + numColumn] = this.getFilterCriteria(column, type, action, value);
        }
      }.bind(this));
      // получаем таблицу
      const sheet = this.getSheet();
      // определяем диапазон
      const range = sheet.getRange(sheet.getDataRange().getA1Notation());
      // создаем фильр
      const filter = range.createFilter();
      // применяем настройки фитрации
      for (let key in filters) {
        filter.setColumnFilterCriteria(+key.slice(1), filters[key]);
      }
      // получаем результаты
      const result = this.getResultAfterFilter(returnAsObjects);
      // удалим фильтрацию
      filter.remove();
      // вернем результаты
      return result;
    }
    // вернем пустой массив
    return [];
  }

  /**
   * Получаем результат после фильтрации
   * @param returnAsObjects
   * @returns {*}
   */
  getResultAfterFilter(returnAsObjects = true) {
    // получим таблицу
    const sheet = this.getSheet();
    // получим данные с таблицы
    const data = sheet.getDataRange().getValues();
    // отфильруем данные
    let result = data.filter((item, key) => {
      // если это не первая строка и не скрыта фильтром
      return key ? !sheet.isRowHiddenByFilter(key += 1) : false;
    });
    // вернем массив с объектами или чистый массив
    return returnAsObjects ? this.getResult(result, true) : result;
  }

  /**
   * Вернем настройку фильтра
   * @param column
   * @param type
   * @param action
   * @param value
   * @returns {*}
   */
  getFilterCriteria(column, type, action, value) {
    /**
     * value - может быть
     *  строка ("tech")
     *  число (10)
     *  массив строк (["tech","business"])
     *  массив чисел ([10,20,30])
     *  диапазон из 2 чисел  (1, 25) только при between
     */
      // проверим action
    let isBetween = action.toLowerCase().includes("between");
    // проверим на массив
    let valueIsArray = Array.isArray(value);
    // подготовим массив для данных
    let values = [];
    // проверим
    if (isBetween) {
      // если это between - то заменим массив
      values = value;
    } else {
      // проверим на массив
      if (valueIsArray) {
        // получим диапазон столбца
        let range = this.getRange(this.findIndex(column));
        // рисуем формулу "=REGEXMATCH()"
        let formula = "REGEXMATCH(TO_TEXT(" + range + "); \"(" + value.join("|") + ")\")";
        // дополним
        values = action === "===" ? ["=" + formula] : ["=NOT(" + formula + ")"];
      } else {
        // добавим в массив
        values.push(value);
      }
    }
    // вернем настройку
    return SpreadsheetApp
      .newFilterCriteria()
      [this.getFilterCriteriaMethod(type, action, Array.isArray(value))](...values)
      .build();
  }

  /**
   * Получим необходимы метод фильтрации
   * @param type
   * @param action
   * @param isArray
   * @returns {string}
   */
  getFilterCriteriaMethod(type, action, isArray) {
    if (action === "null") {
      return "whenCellEmpty";
    } else if (action === "not_null") {
      return "whenCellNotEmpty";
    } else if (action === "like") {
      if (type === "string") {
        return "whenTextContains";
      }
    } else if (action === "_like") {
      if (type === "string") {
        return "whenTextStartsWith";
      }
    } else if (action === "like_") {
      if (type === "string") {
        return "whenTextEndsWith";
      }
    } else if (action === "not_like") {
      if (type === "string") {
        return "whenTextDoesNotContain";
      }
    } else if (action === "===") {
      if (type === "string") {
        return isArray
          ? "whenFormulaSatisfied"
          : "whenTextEqualTo";
      } else if (type === "number") {
        return isArray
          ? "whenFormulaSatisfied"
          : "whenNumberEqualTo";
      } else if (type === "date") {
        return isArray
          ? "whenFormulaSatisfied"
          : "whenDateEqualTo";
      }
    } else if (action === "!==") {
      if (type === "string") {
        return isArray
          ? "whenFormulaSatisfied"
          : "whenTextNotEqualTo";
      } else if (type === "number") {
        return isArray
          ? "whenFormulaSatisfied"
          : "whenNumberNotEqualTo";
      } else if (type === "date") {
        return isArray
          ? "whenFormulaSatisfied"
          : "whenDateNotEqualTo";
      }
    } else if (action === ">") {
      if (type === "number") {
        return "whenNumberGreaterThan";
      } else if (type === "date") {
        return "whenDateAfter";
      }
    } else if (action === ">=") {
      if (type === "number") {
        return "whenNumberGreaterThanOrEqualTo";
      }
    } else if (action === "<") {
      if (type === "number") {
        return "whenNumberLessThan";
      } else if (type === "date") {
        return "whenDateBefore";
      }
    } else if (action === "<=") {
      if (type === "number") {
        return "whenNumberLessThanOrEqualTo";
      }
    } else if (action === "between") {
      if (type === "number") {
        return "whenNumberBetween";
      }
    } else if (action === "not_between") {
      if (type === "number") {
        return "whenNumberNotBetween";
      }
    }
    // по умолчанию вернем
    return "whenCellEmpty";
  }

  /**
   * Удалим строку
   */
  delete() {
    // найти по hash
    let rowIndex = this.getRowIndex(this.findIndex('hash'), this.hash);
    // удалим
    this.getSheet().deleteRow(rowIndex);
  }

  /**
   * Получаем следующую позицию
   * @param column
   * @returns {number}
   */
  getNextPosition(column = "position") {
    // получим максимальное значение по столбцу
    let max = this.getMaxByColumn(column);
    // увеличим на 100
    return 100 - (max % 100) + max;
  }
}

/**
 * Класс Бот
 */
class Bot {
  /**
   * Создаем объект класса
   * @param token
   * @param data
   */
  constructor(token, data) {
    // записываем токен бота
    this.token = token;
    // и полученный объект с данными от Телеграм
    this.data = data;
  }

  /**
   * Получаем данные обновления
   * @returns {*|null}
   */
  getUpdate() {
    return this.data || null;
  }

  /**
   * Получим тип обновлений
   * @returns {*}
   */
  getUpdateType() {
    let update = this.getUpdate();
    let types = [
      'message',
      'callback_query',
      'edited_message',
      'inline_query',
      'channel_post'
    ];
    // перебираем
    for (let type of types) {
      if (type in update) {
        return type;
      }
    }
    // по умолчанию вернем null
    return null;
  }

  /**
   * Получим сообщение
   * @returns {*}
   */
  getMessage() {
    if (this.isMessage()) {
      return this.getUpdate().message || null;
    } else if (this.isCallBack()) {
      return this.getCallbackQuery().message || null;
    }
    return null;
  }

  /**
   * Получим callback объект
   * @returns {*|null}
   */
  getCallbackQuery() {
    return ('callback_query' in this.getUpdate()) ? this.getUpdate().callback_query : null;
  }

  /**
   * @return mixed
   * @returns {*|null}
   */
  getInlineQuery() {
    return ('inline_query' in this.getUpdate()) ? this.getUpdate().inline_query : null;
  }

  /**
   * Получаем данные автора сообщения
   * @returns {*}
   */
  getFrom() {
    if (this.isMessage()) {
      return ('from' in this.getMessage()) ? this.getMessage().from : null;
    } else if (this.isInline()) {
      return ('from' in this.getInlineQuery()) ? this.getInlineQuery().from : null;
    } else if (this.isCallBack()) {
      return ('from' in this.getCallbackQuery()) ? this.getCallbackQuery().from : null;
    }
    return null;
  }

  /**
   * Получим чат
   * @returns {*|null}
   */
  getChat() {
    return ('chat' in this.getMessage()) ? this.getMessage().chat : null;
  }

  /**
   * Получаем данные пользователя
   * @returns {{uid: (*|number), firstname: (string|string), lang: (string|string), lastname: (string|string), username: (string|string)}}
   */
  getUserData() {
    // вернем данные для создания обновления пользователя
    return {
      // его uid
      uid: this.getFrom().id,
      // его первое имя
      firstname: this.getFromFirstName(),
      // его второе имя
      lastname: this.getFromLastName(),
      // его username
      username: this.getFromUserName(),
      // его языковую настройку
      lang: this.getFromUserLang()
    }
  }

  /**
   * Entities - форматировние
   * @returns {*}
   */
  getEntities() {
    // если это сообщение
    if (this.isMessage()) {
      // если это текствое сообщение
      if (this.isText()) {
        // вернем текстовое форматирование если оно существует
        return ('entities' in this.getMessage())
          ? this.getMessage().entities
          : null;
      } else {
        // если это не текствое сообщение, тогда вернем форматирование описания
        return ('caption_entities' in this.getMessage())
          ? this.getMessage().caption_entities
          : null;
      }
    } else {
      // если это другой тип данных вернем null
      return null;
    }
  }

  /**
   * MessageText - получаем текст или описание объекта
   * @returns {*}
   */
  getMessageText() {
    // медиа объекты с возможным описанием
    let medias = [
      'audio',
      'document',
      'photo',
      'animation',
      'video',
      'voice'
    ];
    // если это текствое сообщение
    if (this.isText()) {
      // вернем текст сообщения
      return this.getMessage().text ?? null;
    } // если это медиа сообщение с описанием
    else if (medias.includes(this.getMessageType())) {
      // вернем описание объекта
      return this.getMessage().caption ?? null;
    } else {
      // если не подходит условия вернем null
      return null;
    }
  }

  /**
   * Message Type
   * @returns {*}
   */
  getMessageType() {
    // получаем объект сообщения
    let message = this.getMessage();
    let types = [
      'text',
      'photo',
      'audio',
      'document',
      'animation',
      'sticker',
      'voice',
      'video_note',
      'video',
      'location'
    ];
    // перебираем
    for (let type of types) {
      if (type in message) {
        return type;
      }
    }
    // по умолчанию вернем null
    return null;
  }

  /**
   * Message File Id
   * @returns {*}
   */
  getMessageFileId() {
    // получаем объект сообщения
    let message = this.data.message;
    // получим тип сообщения
    let type = this.getMessageType();
    // вернем результат
    return type === "photo"
      ? message.photo.pop().file_id
      : message[type].file_id;
  }

  /**
   * Message ID
   * @returns {any}
   */
  getMessageId() {
    return ('message_id' in this.getMessage()) ? this.getMessage().message_id : null;
  }

  /**
   * Значение на кнопке
   * @returns {null}
   */
  getCallbackQueryData() {
    return ('data' in this.getCallbackQuery()) ? this.getCallbackQuery().data : null;
  }

  /**
   * CallBack ID
   * @returns {null}
   */
  getCallbackQueryId() {
    return ('id' in this.getCallbackQuery()) ? this.getCallbackQuery().id : null;
  }

  /**
   * Тип чата
   * @returns {null}
   */
  getChatType() {
    return ('type' in this.getChat()) ? this.getChat().type : null;
  }

  /**
   * Чат ID
   * @returns {number}
   */
  getChatId() {
    return ('id' in this.getChat()) ? this.getChat().id : 0;
  }

  /**
   * Пользователь ID
   * @returns {number}
   */
  getFromId() {
    return ('id' in this.getFrom()) ? this.getFrom().id : 0;
  }

  /**
   * Фамилия
   * @returns {string}
   */
  getFromFirstName() {
    return ('first_name' in this.getFrom()) ? this.getFrom().first_name : "";
  }

  /**
   * Имя
   * @returns {string}
   */
  getFromLastName() {
    return ('last_name' in this.getFrom()) ? this.getFrom().last_name : "";
  }

  /**
   * Username
   * @returns {string}
   */
  getFromUserName() {
    return ('username' in this.getFrom()) ? this.getFrom().username : "";
  }

  /**
   * настройки языковые
   * @returns {string}
   */
  getFromUserLang() {
    return ('language_code' in this.getFrom()) ? this.getFrom().language_code : "ru";
  }

  /**
   * Полное имя
   * @returns {string}
   */
  getFromFullName() {
    return (this.getFromFirstName() + " " + this.getFromLastName()).trim();
  }

  /**
   * Проверка на сообщение
   * @returns {boolean}
   */
  isMessage() {
    return this.getUpdateType() === "message";
  }

  /**
   * Проверка на кнопку
   * @returns {boolean}
   */
  isCallBack() {
    return this.getUpdateType() === "callback_query";
  }

  /**
   * Проверка на встроенный запрос
   * @returns {boolean}
   */
  isInline() {
    return this.getUpdateType() === "inline_query";
  }

  /**
   * Проверка на текст
   * @returns {boolean}
   */
  isText() {
    return this.getMessageType() === "text";
  }

  /**
   * Проверка на картинку
   * @returns {boolean}
   */
  isPhoto() {
    return this.getMessageType() === "photo";
  }

  /**
   * Проверка на аудио
   * @returns {boolean}
   */
  isAudio() {
    return this.getMessageType() === "audio";
  }

  /**
   * Проверка на документ
   * @returns {boolean}
   */
  isDocument() {
    return this.getMessageType() === "document";
  }

  /**
   * Проверка на анимацию
   * @returns {boolean}
   */
  isAnimation() {
    return this.getMessageType() === "animation";
  }

  /**
   * Проверка на стикер
   * @returns {boolean}
   */
  isSticker() {
    return this.getMessageType() === "sticker";
  }

  /**
   * Проверка на голосовое сообщение
   * @returns {boolean}
   */
  isVoice() {
    return this.getMessageType() === "voice";
  }

  /**
   * Проверка на видео заметку
   * @returns {boolean}
   */
  isVideoNote() {
    return this.getMessageType() === "video_note";
  }

  /**
   * Проверка на видео
   * @returns {boolean}
   */
  isVideo() {
    return this.getMessageType() === "video";
  }

  /**
   * Проверка на локацию
   * @returns {boolean}
   */
  isLocation() {
    return this.getMessageType() === "location";
  }

  /**
   * Проверка на тип чата группа
   * @returns {boolean}
   */
  isGroup() {
    return ["group", "supergroup"].includes(this.getChatType());
  }

  /**
   * Проверка на тип чата приватный
   * @returns {boolean}
   */
  isPrivate() {
    return this.getChatType() === "private";
  }

  /**
   * Отправляем действие пользователю
   * @param chat_id
   * @param action
   *
   * typing
   * upload_photo
   * record_video
   * upload_video
   * record_voice
   * upload_voice
   * upload_document
   * choose_sticker
   * find_location
   * record_video_note
   * upload_video_note
   *
   * @param chat_id
   * @param action
   * @returns {*}
   */
  sendChatAction(chat_id, action = "typing") {
    // готовим данные
    let payload = {
      method: "sendChatAction",
      chat_id: String(chat_id),
      action: action,
    };
    // вернем результат отправки
    return this.query(payload);
  }

  /**
   * Уведомление в клиенте
   * @param text
   * @param type
   * @returns {*}
   */
  notice(text = null, type = false) {
    if (this.isCallBack()) {
      // готовим данные
      let payload = {
        method: "answerCallbackQuery",
        callback_query_id: String(this.getCallbackQueryId()),
        show_alert: type,
      };
      if (!isNull(text)) {
        payload.text = text;
      }
      // вернем результат отправки
      return this.query(payload);
    }
  }

  /**
   * Уведомление с удалением
   * @param text
   * @param type
   */
  noticeDelete(text = null, type = false) {
    if (this.isCallBack()) {
      this.notice(text, type);
      this.deleteMessageSelf();
    }
  }

  /**
   * Удаляем сообщение без параметров
   * @returns {*}
   */
  deleteMessageSelf() {
    // предотвращаем повторное удаление
    if (this.deleted_message !== this.getChatId() + "_" + this.getMessageId()) {
      return this.deleteMessage(this.getChatId(), this.getMessageId());
    }
  }

  /**
   * Удаляем сообщение
   * @param chat_id
   * @param message_id
   * @returns {*}
   */
  deleteMessage(chat_id, message_id) {
    // записываем какое сообщение удалили
    this.deleted_message = chat_id + "_" + message_id;
    // готовим данные
    let payload = {
      method: "deleteMessage",
      chat_id: String(chat_id),
      message_id: String(message_id)
    };
    // вернем результат
    return this.query(payload);
  }

  /**
   * Кнопка inline
   * @param text
   * @param callback_data
   * @param url
   * @param switch_inline_query
   * @returns {{text: *}}
   */
  buildInlineKeyboardButton(text, callback_data = null, url = null, switch_inline_query = null) {
    // рисуем кнопке текст
    let replyMarkup = {
      text: text
    };
    // пишем одно из обязательных дополнений кнопке
    if (!isNull(url)) {
      replyMarkup.url = url;
    } else if (!isNull(callback_data)) {
      replyMarkup.callback_data = callback_data;
    } else if (!isNull(switch_inline_query)) {
      replyMarkup.switch_inline_query = switch_inline_query;
    }
    // возвращаем кнопку
    return replyMarkup;
  }

  /**
   * Набор кнопок inline
   * @param options
   * @returns {string}
   */
  buildInlineKeyBoard(options) {
    // собираем кнопки
    return JSON.stringify({
      inline_keyboard: options,
    });
  }

  /**
   * Кнопка клавиатуры
   * @param text
   * @param request_contact
   * @param request_location
   * @returns {{request_location: boolean, text: *, request_contact: boolean}}
   */
  buildKeyboardButton(text, request_contact = false, request_location = false) {
    return {
      text: text,
      request_contact: request_contact,
      request_location: request_location,
    };
  }

  /**
   * Готовим набор кнопок клавиатуры
   * @param options
   * @param onetime
   * @param resize
   * @param selective
   * @returns {string}
   */
  buildKeyBoard(options, onetime = false, resize = true, selective = true) {
    return JSON.stringify({
      keyboard: options,
      one_time_keyboard: onetime,
      resize_keyboard: resize,
      selective: selective
    });
  }

  /**
   * Отправляем сообщение
   * @param chat_id
   * @param text
   * @param buttons
   * @param keyBoard
   * @param disableUrl
   * @returns {*}
   */
  sendMessage(chat_id, text, buttons = null, keyBoard = false, disableUrl = false) {
    // готовим данные
    let payload = {
      method: "sendMessage",
      chat_id: String(chat_id),
      text: text,
      parse_mode: "HTML",
      disable_web_page_preview: disableUrl
    };
    // если переданны кнопки то добавляем их к сообщению
    if (!isNull(buttons) && Array.isArray(buttons)) {
      payload.reply_markup = keyBoard
        ? this.buildKeyBoard(buttons)
        : this.buildInlineKeyBoard(buttons);
    }
    // вернем результат отправки
    return this.query(payload);
  }

  /**
   * Отправляем видео с inline кнопками
   * @param chat_id
   * @param video
   * @param caption
   * @param buttons
   * @param url
   * @returns {*}
   */
  sendVideo(chat_id, video, caption = null, buttons = null, url = false) {
    // готовим данные
    let payload = {
      method: "sendVideo",
      chat_id: String(chat_id),
      video: video,
      parse_mode: "HTML",
      disable_web_page_preview: url
    };
    // если есть описание
    if (!isNull(caption)) {
      payload.caption = caption;
    }
    // если переданны кнопки то добавляем их к сообщению
    if (!isNull(buttons) && Array.isArray(buttons)) {
      payload.reply_markup = this.buildInlineKeyBoard(buttons);
    }
    // вернем результат отправки
    return this.query(payload);
  }

  /**
   * Отправляем фотографию
   * @param chat_id
   * @param photo
   * @param caption
   * @param buttons
   * @param url
   * @returns {*}
   */
  sendPhoto(chat_id, photo, caption = null, buttons = null, url = false) {
    // готовим данные
    let payload = {
      method: "sendPhoto",
      chat_id: String(chat_id),
      photo: photo,
      parse_mode: "HTML",
      disable_web_page_preview: url
    };
    // если есть описание
    if (!isNull(caption)) {
      payload.caption = caption;
    }
    // если переданны кнопки то добавляем их к сообщению
    if (!isNull(buttons) && Array.isArray(buttons)) {
      payload.reply_markup = this.buildInlineKeyBoard(buttons);
    }
    // вернем результат отправки
    return this.query(payload);
  }

  /**
   * Обновляем клавиатуру
   * @param chat_id
   * @param message_id
   * @param buttons
   * @returns {*}
   */
  editMessageReplyMarkup(chat_id, message_id, buttons) {
    // готовим данные
    let payload = {
      method: "editMessageReplyMarkup",
      chat_id: String(chat_id),
      message_id: String(message_id),
      reply_markup: this.buildInlineKeyBoard(buttons)
    };
    // вернем результат отправки
    return this.query(payload);
  }

  /**
   * Редактируем сообщение
   * @param chat_id
   * @param message_id
   * @param text
   * @param buttons
   * @param keyBoard
   * @param disableUrl
   * @returns {*}
   */
  editMessageText(chat_id, message_id, text, buttons = null, keyBoard = false, disableUrl = false) {
    // готовим данные
    let payload = {
      method: "editMessageText",
      chat_id: String(chat_id),
      message_id: String(message_id),
      text: text,
      parse_mode: "HTML",
      disable_web_page_preview: disableUrl,
    };
    if (!isNull(buttons) && Array.isArray(buttons)) {
      payload.reply_markup = keyBoard
        ? this.buildKeyBoard(buttons)
        : this.buildInlineKeyBoard(buttons);
    }
    // вернем результат отправки
    return this.query(payload);
  }

  /**
   * Редактируем медиа
   * @param chat_id
   * @param message_id
   * @param media
   * @param buttons
   * @returns {*}
   */
  editMessageMedia(chat_id, message_id, media, buttons = null) {
    // готовим данные
    let payload = {
      method: "editMessageMedia",
      chat_id: String(chat_id),
      message_id: String(message_id),
      media: JSON.stringify(media),
    };
    // если переданны кнопки то добавляем их к сообщению
    if (!isNull(buttons) && Array.isArray(buttons)) {
      payload.reply_markup = this.buildInlineKeyBoard(buttons);
    }
    // вернем результат отправки
    return this.query(payload);
  }

  /**
   * Создадим объект медиа
   * @param media
   * @param type
   * @param caption
   * @returns {{parse_mode: string, media: *, type: *}}
   */
  inputMedia(media, type, caption = null) {
    // готовим данные
    let media_ = {
      type: type,
      media: media,
      parse_mode: 'html'
    };
    // если есть описание
    if (!isNull(caption)) {
      media_.caption = caption;
    }
    // отправляем объект
    return media_;
  }

  /**
   * Запрос в Телеграм
   * @param payload
   * @returns {any}
   */
  query(payload) {
    // готовим данные
    let data = {
      method: "post",
      payload: payload
    };
    return JSON.parse(UrlFetchApp.fetch(config.apiUrl + this.token + "/", data).getContentText());
  }
}

/**
 * Класс Lang
 */
class Lang {
  /**
   * Создаем объект Lang
   * @param userLang
   */
  constructor(userLang = 'ru') {
    // получаем данные из общих настроек
    this.langParams = config_lang;
    // записываем языковую настроку пользователя
    this.setLang(userLang);
  }

  /**
   * Уставнавливаем параметр lang
   * @param userLang
   */
  setLang(userLang) {
    // если настроки по переданному параметру существуют
    this.lang = isSet(this.langParams[userLang])
      ? userLang // то устанавливаем
      : 'ru'; // иначе вернем по умолчанию
  }

  /**
   * Получаем значение из массива
   * @param arr
   * @param obj
   * @returns {*}
   */
  getParamByDot(arr, obj) {
    // получаем первый элемент массива
    let name = arr.shift();
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
   * @param param
   * @param data
   * @returns {*}
   */
  getParam(param, data = {}) {
    // получаем текстовую настройку
    let text = this.getParamByDot(param.split('.'), this.langParams[this.lang]);
    // если настройка не найдена
    if (!isSet(text)) {
      // то вернем заглушку
      return "Unknown Text";
    } // Если настройка найдена
    else {
      // проверяем переданы ли значения под замену
      if (Object.keys(data).length > 0) {
        // перебираем значения
        for (let key in data) {
          // создаем шаблон
          let template = new RegExp('{' + key + '}', 'gi');
          // заменяем
          text = text.replace(template, data[key]);
        }
      }
      // вернем настройку
      return text;
    }
  }
}

class Note extends Model {
  /**
   * Настройки таблицы
   * @returns {{columns: string[], name: string}}
   */
  static table() {
    return {
      name: "Notes",
      columns: ['hash', 'uid', 'name', 'phone', 'pay', 'date', 'type', 'status', 'cal_id', 'created_at'],
    }
  }

  /**
   * Поля для заказа
   * @returns {*[]}
   */
  static getFields() {
    return [
      {
        type: "text",
        skip: false,
        validate: "^[+]{1}[1-9][0-9]{9,14}$",
        name: "phone",
        buttons: false
      },
      {
        type: "text",
        skip: false,
        validate: false,
        name: "name",
        buttons: false
      },
      {
        type: "callBack",
        skip: false,
        validate: false,
        name: "pay",
        buttons: 3
      },
    ];
  }

  /**
   * Создадим запись
   */
  static create(uid, time) {
    let model = new this();
    model.uid = uid;
    model.name = "";
    model.phone = "";
    model.pay = "";
    model.date = time;
    model.cal_id = "";
    model.status = "new";
    model.type = 0;
    model.created_at = getDateToSeconds();
    return model.save();
  }

  getName() {
    return this.name;
  }

  setName(name) {
    this.name=name;
    return this.save();
  }

  getPhone() {
    return this.phone;
  }

  setPhone(phone) {
    this.phone = phone;
    return this.save();
  }

  getPay() {
    return this.pay
  }

  setPay(pay) {
    this.pay = pay;
    return this.save();
  }

  getType() {
    return this.type;
  }

  setType(type) {
    this.type = type;
    return this.save();
  }

  getDate() {
    return this.date;
  }

  setDate(date) {
    this.type = date;
    return this.save();
  }

  getStatus() {
    return this.status;
  }

  setStatus(status) {
    this.status = status;
    return this.save();
  }

  getCalId() {
    return this.cal_id;
  }

  setCalId(cal_id) {
    this.cal_id = cal_id;
    return this.save();
  }

  setSuccess(cal_id) {
    this.type = 1;
    this.cal_id = cal_id;
    return this.save();
  }

  setCanceled() {
    this.status = "canceled";
    this.cal_id = "";
    return this.save();
  }

  /**
   * Получаем пользователя
   * @returns {*}
   * @private
   */
  _user() {
    return this.hasOne("User", "uid", "uid");
  }

  /**
   * Удаляем все недооформленные заказы пользователя
   * @param uid
   */
  static deleteOld(uid) {
    // получаем все незаполненные заказы
    this.find().findAllByParams([
      ["uid", "number", "===", uid],
      ["type", "number", "===", 0]
    ])
    // перебираем их
      .forEach(function (note) {
        // удаляем каждый
        note.delete();
      });
  }
}

/**
 * Класс вспомогательных страниц
 */
class Page extends Model {
  /**
   * Настройки таблицы
   * @returns {{columns: string[], name: string}}
   */
  static table() {
    return {
      name: "Pages",
      columns: ['hash', 'type', 'image', 'description', 'description_entities'],
    }
  }

  /**
   * Набор данных для формы
   * @returns {*[]}
   */
  static getFields() {
    return [
      {
        type: "text",
        db_name: "description",
        validate: "string",
        required: true
      },
      {
        type: "photo",
        db_name: "image",
        validate: false,
        required: false
      },
    ];
  }

  /**
   * Получаем страницу
   * @param type
   * @returns {*}
   */
  static getPage(type) {
    // ищем страницу в таблице
    let page = this.find().findOneBy("type", type);
    // если страницы нет
    if (!page) {
      // создаем
      page = this.create(type);
    }
    // вернем результат
    return page;
  }

  /**
   * Создаем страницу
   * @param type
   * @returns {*}
   */
  static create(type) {
    let model = new this();
    model.type = type;
    model.image = "";
    model.description = "";
    model.description_entities = "";
    model.entities = "";
    return model.save();
  }

  /**
   * Получаем описание
   * @returns {*}
   */
  getDescription() {
    return isEmpty(this.description)
      ? null
      : prepareMessageWithEntities(this.description, this.getDescriptionEntities());
  }

  /**
   * Устанавливаем описание
   * @param description
   * @returns {*}
   */
  setDescription(description) {
    this.description = description;
    return this.save();
  }

  /**
   * Получаем форматирование описания
   * @returns {null}
   */
  getDescriptionEntities() {
    return isEmpty(this.description_entities)
      ? null
      : JSON.parse(this.description_entities);
  }

  /**
   * Устанавливаем форматирование описанию
   * @param entities
   * @returns {*}
   */
  setDescriptionEntities(entities) {
    this.description_entities = entities;
    return this.save();
  }

  /**
   * Получаем картинку
   * @returns {null}
   */
  getImage() {
    return isEmpty(this.image)
      ? null
      : this.image;
  }

  /**
   * Устанавливаем картинку
   * @param image
   * @returns {*}
   */
  setImage(image) {
    this.image = image;
    return this.save();
  }
}


/**
 * Класс Роутер
 */
class Route {
  /**
   * Создаем экземпляр
   * @param wh
   */
  constructor(wh) {
    this.config = config_route;
    this.wh = wh;
  }

  /**
   * Получаем объект команды
   * @param text
   * @returns {*}
   */
  checkCommand(text) {
    // текстовые ссылки
    if (this.config.linkCommands.length > 0) {
      // перебираем команды
      for (let linkCommand of this.config.linkCommands) {
        // если есть совпадения
        if (linkCommand.template.test(text)) {
          // добавим флаг
          linkCommand.result = true;
          // вернем объект с методом
          return linkCommand;
        }
      }
    }
    // кнопки клавиатуры - текстовые команды
    if (this.config.buttonCommands.length > 0) {
      for (let buttonCommand of this.config.buttonCommands) {
        let template_ = new RegExp("^" + this.wh.lang.getParam(buttonCommand.name) + "$");
        if (template_.test(text)) {
          buttonCommand.result = true;
          return buttonCommand;
        }
      }
    }
    // если дошли до этой строчки то вернем флаг false
    return {
      result: false
    };
  }

  /**
   * Проверяем необходимость передать данные в запланированный метод
   * @returns {*}
   */
  write() {
    // получим запись действия пользователя
    let action = this.wh.user.getAction();
    // проверим
    if (action.length !== 0) {
      // вернем объект
      return {
        result: true,
        method: action
      };
    }
    // вернем по умолчанию
    return {
      result: false
    };
  }

  /**
   * Маршрутизируем
   */
  run() {
    // если это сообщение
    if (this.wh.bot.isMessage()) {
      // получаем данные для перехода пользователя в запланированный метод получения данных
      let write = this.write();
      // если это текстовое сообщение
      if (this.wh.bot.isText()) {
        // проверяем на команды
        let command = this.checkCommand(this.wh.bot.getMessageText());
        // если есть совпадение по шаблону
        if (write.result && !command.result) {
          // направим по заданному адресу
          this.goToAction(write.method);
        } else if (command.result) {
          // обнулим action
          this.wh.user.setAction("");
          // направим по заданному адресу
          this.goToAction(command.method);
        }
      } else {
        // если это какие-нибудь медиа
        if (write.result) {
          // направим по заданному адресу
          this.goToAction(write.method);
        }
      }
    } else if (this.wh.bot.isCallBack()) {
      // обнулим action
      this.wh.user.setAction("");
      // получим путь
      let method = this.wh.bot.getCallbackQueryData();
      // направим по заданному адресу
      this.goToAction(method);
    }
  }

  /**
   * Направим по адресу
   * @param method
   * @returns {boolean}
   */
  goToAction(method) {
    // парсим параметры
    let [class_, params] = method.split('::');
    // собираем название класса
    let class_name = 'Controller' + ucfirst(class_, false);
    // проверим наличие класса
    if (Object.keys(mapControllers).includes(class_name)) {
      // создадим объект класса
      let object = new mapControllers[class_name](this.wh);
      // парсим на метод
      let method_ = params.split("_").shift();
      // проверим наличие метода у класса
      if (typeof object[method_] === "function") {
        // вызываем метод контроллера
        object[method_]()
      }
    }
    // выходим
    return true;
  }
}

/**
 * Класс Пользователь
 */
class User extends Model {
  /**
   * Настройки таблицы
   * @returns {{columns: string[], name: string}}
   */
  static table() {
    return {
      name: "Users",
      columns: ['hash', 'uid', 'name', 'username', 'lang', 'action', 'created_at', 'updated_at'],
    }
  }

  /**
   * Получаем или обновляем объект пользователя
   * @param data
   * @returns {*}
   */
  static getUser(data) {
    // ищем пользователя в базе
    let user = this.find().findOneBy('uid', data.uid);
    // фиксируем дату-время
    const date = getDateToSeconds();
    // если пользователь не найден
    if (isNull(user)) {
      // создаем его
      user = new this();
      // заполняем неизменяемые поля
      user.uid = data.uid
      user.action = "";
      user.created_at = date;
    }
    // создаем или обновляем изменяемые поля
    user.name = (data.firstname + " " + data.lastname).trim();
    user.username = data.username;
    user.lang = data.lang;
    user.updated_at = date;
    // вернем или null или объект пользователя
    return user.save();
  }

  /**
   * Получаем действие
   * @returns {*}
   */
  getAction() {
    return this.action;
  }

  /**
   * Устанавливаем действие
   * @param action
   */
  setAction(action) {
    this.action = action;
    this.save();
  }
}

/**
 * Класс родитель для контроллеров
 */
class Controller {
  /**
   * Констуктор класса
   * @param wh
   */
  constructor(wh) {
    // записываем объект в свойство
    this.wh = wh;
  }
}


/**
 * Контроллер администратора
 */
class ControllerAdmin extends Controller {
  /**
   * Проверка на админа
   * @param wh
   * @returns {boolean}
   */
  static before(wh) {
    // закрываем доступ не для админов
    if (!wh.isAdmin()) {
      // гасим
      if (wh.bot.isCallBack()) {
        wh.bot.notice();
      }
      // выводим ошибку доступа
      wh.bot.sendMessage(wh.bot.getFromId(), wh.lang.getParam("error._403"));
      throw new Error("403 - stop");
    }
  }

  /**
   * Запускаем
   */
  run() {
    // гасим удаляем
    if (this.wh.bot.isCallBack()) {
      this.wh.bot.noticeDelete();
    }
    // ставим проверку на админа
    ControllerAdmin.before(this.wh);
    // готовим кнопки
    let buttons = [
      [this.wh.bot.buildInlineKeyboardButton(this.wh.lang.getParam("admin.controller.btn.about"), "adminAbout::run_0")],
      [this.wh.bot.buildInlineKeyboardButton(this.wh.lang.getParam("admin.controller.btn.notes"), "adminNotes::run_0")],
    ];
    // выводим сообщение админу
    this.wh.bot.sendMessage(this.wh.bot.getFromId(), this.wh.lang.getParam("admin.hello"), buttons);
  }
}

/**
 * Страница О мастере
 */
class ControllerAdminAbout extends Controller {
  /**
   * Запускаем
   */
  run() {
    // гасим удаляем
    if (this.wh.bot.isCallBack()) {
      this.wh.bot.noticeDelete();
    }
    // ставим проверку на админа
    ControllerAdmin.before(this.wh);
    // получаем страницу
    let page = Page.getPage("about");
    // получаем текст
    let text = isNull(page.getDescription())
      ? this.wh.lang.getParam("page.empty")
      : page.getDescription();
    // проверим картинку
    let image = page.getImage();
    // готовим кнопки
    let buttons = [
      [this.wh.bot.buildInlineKeyboardButton(this.wh.lang.getParam("admin.page.btn_edit"), "adminAbout::form_0")],
      [this.wh.bot.buildInlineKeyboardButton(this.wh.lang.getParam("go.back"), "admin::run_0")],
    ];
    // проверим как отправляем
    if (image) {
      this.wh.bot.sendPhoto(this.wh.bot.getFromId(), image, text, buttons);
    } else {
      this.wh.bot.sendMessage(this.wh.bot.getFromId(), text, buttons);
    }
  }

  /**
   * Форма редактирования
   * @param params_
   */
  form(params_ = null) {
    // гасим удаляем
    if (this.wh.bot.isCallBack()) {
      this.wh.bot.noticeDelete();
    }
    // ставим проверку на админа
    ControllerAdmin.before(this.wh);
    // 1 - step
    let params = paramsFromText(!isNull(params_) ? params_ : this.wh.bot.getCallbackQueryData());
    // объявим набор кнопок
    let buttons = [];
    // получим настройки для формы
    let formFields = Page.getFields();
    // какое поле заполняем
    let field = formFields[+params[1]];
    // проверим наличие
    if (isSet(field)) {
      // получаем модель
      let item = Page.getPage("about");
      // ставим пользователю метку
      this.wh.user.setAction("adminAbout::update_" + params[1]);
      // возможность пропустить
      let skip = !field.required;
      // получаем старое значение
      let methodGet = "get" + ucfirst(field.db_name);
      // здесь придет или null или текст
      let value = item[methodGet]();
      // старое значение по умолчанию пустое
      let oldValue = "";
      // объявляем
      let params_db = {};
      // заполняем запрос параметром
      params_db.db_name = this.wh.lang.getParam("admin.page." + field.db_name);
      // высчитываем следующий шаг
      let next_step = +params[1] + 1;
      // проверяем
      if (!isNull(value)) {
        params_db.value = value;
        // возможность пропустить
        skip = true;
        // проверяем по типу
        if (field.type === "photo") {
          // добавим кнопку
          buttons.push([
            this.wh.bot.buildInlineKeyboardButton(
              this.wh.lang.getParam("admin.icon.remove"),
              "adminAbout::deleteMedia_" + params[1]
            )
          ])
        } else if (field.type === "text") {
          // заполняем старое значение
          oldValue = this.wh.lang.getParam("admin.page.form." + field.type + "_old", params_db);
        }
      }
      // заполняем старое значение
      params_db.old_value = oldValue;
      // выводим кнопку пропустить
      if (skip) {
        // кнопка пропустить
        buttons.push([
          this.wh.bot.buildInlineKeyboardButton(
            this.wh.lang.getParam("go.skip"),
            "adminAbout::form_" + next_step
          )
        ]);
      }
      // готовим текст
      let text = this.wh.lang.getParam("admin.page.form." + field.type, params_db);
      // кнопка отменить
      buttons.push([
        this.wh.bot.buildInlineKeyboardButton(
          this.wh.lang.getParam("go.cancel"),
          "adminAbout::run_0"
        )
      ]);
      // выводим сообщение
      if (field.type === "photo" && !isNull(value)) {
        this.wh.bot.sendPhoto(this.wh.bot.getFromId(), value, text, buttons);
      } else {
        this.wh.bot.sendMessage(this.wh.bot.getFromId(), text, buttons);
      }
    } else {
      // если шагов больше нет то отправляем на начало
      this.run();
    }
  }

  /**
   * Метод обновления данных
   * @param params_
   */
  update(params_ = null) {
    // ставим проверку на админа
    ControllerAdmin.before(this.wh);
    // 1 - step
    let params = paramsFromText(this.wh.user.getAction());
    // получим настройки для формы
    let formFields = Page.getFields();
    // какое поле заполняем
    let field = formFields[+params[1]];
    // метод записи
    let methodSet = "set" + ucfirst(field.db_name);
    // метод проверки
    let methodIs = "is" + ucfirst(field.type);
    // объявим набор кнопок
    let buttons = [];
    // объявим переменную
    let result;
    // готовим кнопку на отмену для вывода с предупреждениями
    buttons.push([this.wh.bot.buildInlineKeyboardButton(this.wh.lang.getParam("go.back"), "adminAbout::run_0")]);
    // проверяем что пришло
    if (this.wh.bot[methodIs]()) {
      // получаем
      let item = Page.getPage("about");
      // если это загрузка картинки
      if (field.type === "photo") {
        // загружаем картинку
        result = !!item[methodSet](this.wh.bot.getMessageFileId());
      } // если это текст
      else if (field.type === "text") {
        // получим значение
        let variable_text = this.wh.bot.getMessageText();
        // если ждем число - приводим к нему
        if (field.validate && field.validate === "number") {
          variable_text = isNaN(+variable_text) ? 1 : +variable_text;
        } else {
          // получаем форматирование
          let entities = this.wh.bot.getEntities();
          // проверяем
          if (!isNull(entities)) {
            // определяем метод
            let entitiesMethod = "set" + this.wh.prepareMethod(field.db_name + "_entities");
            // записываем
            item[entitiesMethod](JSON.stringify(entities));
          }
        }
        // записываем в объект
        result = !!item[methodSet](variable_text);
      } else {
        // если не подходит запрос
        result = false;
      }
      // проверяем загрузку данных
      if (result) {
        // ставим пользователю пустой action
        this.wh.user.setAction("");
        // высчитываем следующий шаг
        let next_step = +params[1] + 1;
        // проверяем есть ли еще шаги
        if (isSet(formFields[next_step])) {
          // направляем на форму
          this.form("param_" + next_step);
        } else {
          // если шагов больше нет то отправляем на начало
          this.run();
        }
      } else {
        // если произошла ошибка загрузки данных выводим ошибку
        this.wh.bot.sendMessage(this.wh.bot.getFromId(), this.wh.lang.getParam("error.load"), buttons);
      }
    } else {
      // если это не тот метод которого ждем выводим предупреждение
      this.wh.bot.sendMessage(this.wh.bot.getFromId(), this.wh.lang.getParam("error.method"), buttons);
    }
  }

  /**
   * Удаляем медиа
   */
  deleteMedia() {
    // ставим проверку на админа
    ControllerAdmin.before(this.wh);
    // 1 - step
    let params = paramsFromText(this.wh.bot.getCallbackQueryData());
    // получаем медиа
    let page = Page.getPage("about");
    // гасим удаляем
    this.wh.bot.noticeDelete();
    // удаляем картинку
    page.setImage("");
    // переадресуем
    this.form("param_" + params[1]);
  }  
}

class ControllerAdminNotes extends Controller {
  /**
   * Запускаем
   */
  run(params_ = null) {
    // гасим
    if(this.wh.bot.isCallBack()) {
      this.wh.bot.noticeDelete();
    }
    // переадесуем на форму выбора даты
    this.date("params_" + setBeforeZero((new Date()).getMonth()) + "_" + (new Date()).getFullYear());
  }

  /**
   * Вывод календаря
   */
  date(params_ = null) {
    // гасим
    if(this.wh.bot.isCallBack() && isNull(params_)) {
      this.wh.bot.notice();
    }
    // ставим проверку на админа
    ControllerAdmin.before(this.wh);
    // 1 - month, 2 - year, 
    let params = paramsFromText(!isNull(params_) ? params_ : this.wh.bot.getCallbackQueryData());
    // дата переданного периода
    let currentMonthDate = new Date(+params[2], +params[1]);
    // дата предыдущего месяца
    let prevMonthDate = (new Date((new Date(currentMonthDate)).setMonth(currentMonthDate.getMonth() - 1)))
    // дата следующего месяца
    let nextMonthDate = (new Date((new Date(currentMonthDate)).setMonth(currentMonthDate.getMonth() + 1)))
    // объявим набор кнопок
    let buttons = [];
    // добавим кнопки переключения
    buttons.push([
      this.wh.bot.buildInlineKeyboardButton(
        "<<<",
        "adminNotes::date_" + setBeforeZero(prevMonthDate.getMonth()) + "_" + prevMonthDate.getFullYear()
      ),
      this.wh.bot.buildInlineKeyboardButton(setBeforeZero(+params[1] + 1) + "." + params[2], "appointment::inline_0"),
      this.wh.bot.buildInlineKeyboardButton(
        ">>>", 
        "adminNotes::date_" + setBeforeZero(nextMonthDate.getMonth()) + "_" + nextMonthDate.getFullYear()
      )
    ]);
    // получим значение дней для отрисовки календаря
    let dayLines = createCalendar(+params[2], (+params[1] + 1));
    // получим все записи по месяцу
    let orders = Note.find().findAllByParams([
      ["type", "number", "===", 1],
      ["date", "number", "between", [getDateToSeconds(currentMonthDate), getDateToSeconds(nextMonthDate)]]
    ]);
    // объявим объект по датам
    let eventsByDay = {};
    // переберем записи
    orders.forEach(function(order, idx) {
      // получим дату
      let date_ = new Date(+order.date * 1000);
      // получим день
      let day_ = "_" + date_.getDate();
      // проверим
      if(!isSet(eventsByDay[day_])) {
        // создаем его
        eventsByDay[day_] = [];
      }
      // добавим
      eventsByDay[day_].push(order.hash);
    });
    // переберем
    dayLines.forEach(function(line) {
      // добавим ряд кнопок
      buttons[buttons.length] = [];
      // переберем линию дней
      line.forEach(function(day) {
        // создадим дату из дня
        currentMonthDate = day > 0 
          ? new Date((new Date(currentMonthDate)).setDate(day)) 
          : currentMonthDate;
        // значение
        let day__ = "_" + day;
        // проверим
        let isDay = (day__ in eventsByDay);
        // добавим кнопку
        buttons[buttons.length - 1].push(
          this.wh.bot.buildInlineKeyboardButton(
            isDay ? "*" + day : day, 
            isDay 
              ? "adminNotes::viewDay_" + getDateToSeconds(currentMonthDate)
              : "appointment::inline_0"
          )
        );
      }, this);
    }, this);
    // текст сообщения
    let text = this.wh.lang.getParam("admin.order.all.selectDay");
    // выведем сообщение
    !isNull(params_) 
      ? this.wh.bot.sendMessage(
          this.wh.user.uid, 
          text, 
          buttons
        )
      : this.wh.bot.editMessageText(
          this.wh.user.uid, 
          this.wh.bot.getMessageId(), 
          text, 
          buttons
        )
  }

  /**
   * Просмотр записей дня
   */
  viewDay(params_ = null) {
    // ставим проверку на админа
    ControllerAdmin.before(this.wh);
    // 1 - date, 2 - page, 3 - type_send
    let params = paramsFromText(!isNull(params_)
      ? params_
      : (this.wh.bot.isCallBack()
        ? this.wh.bot.getCallbackQueryData()
        : "param_0_0_0")
    );
    // подстрахуем
    params[2] = isSet(params[2]) ? +params[2] : 0;
    params[3] = isSet(params[3]) ? +params[3] : 0;
    // получаем записи по дню
    let orders = Note.find().findAllByParams([
      ["type", "number", "===", 1],
      ["date", "number", "between", [+params[1], (+params[1] + 86400)]]
    ], ["date", true]);    
    // получим общее количество заказов
    let orders_count = orders.length;
    // отфильтруем заказы
    orders = orders.filter(function (order, idx) {
      return idx >= +params[2] && idx < +params[2] + 1;
    })
    // проверим
    if (orders.length) {
      // получим значение заказа
      let order = orders[0];
      // получаем текст
      let text = this.getTextOrder(order, +params[2], orders_count);
      // получаем кнопки
      let buttons = this.getButtonsOrder(params[1], orders_count, +params[2], order);
      // выводим сообщение
      if (!+params[3]) {
        // гасим удалим
        if (this.wh.bot.isCallBack()) {
          this.wh.bot.noticeDelete();
        }
        // отправляем
        this.wh.bot.sendMessage(this.wh.bot.getFromId(), text, buttons);
      } else {
        // гасим
        if (this.wh.bot.isCallBack()) {
          this.wh.bot.notice();
        }
        // редактируем сообщение
        this.wh.bot.editMessageText(this.wh.bot.getFromId(), this.wh.bot.getMessageId(), text, buttons);
      }
    } else {
      // если это не первая страница
      if(+params[2] > 0) {
        // переадресуем на начало
        this.viewDay("params_" + params[1] + "_0_0");
      } else {
        // если это по кнопке
        if(isNull(params_)) {
          // выведем уведомление
          this.wh.bot.notice(this.wh.lang.getParam("order.empty"));
        } else {
          if(this.wh.bot.isCallBack()) {
            this.wh.bot.noticeDelete();
          }
          // получим дату
          let date_ = new Date(+params[1] * 1000);
          // добавим кнопку
          let buttons = [[
            this.wh.bot.buildInlineKeyboardButton(
              this.wh.lang.getParam("go.back"), 
              "adminNotes::date_" + setBeforeZero(date_.getMonth()) + "_" + date_.getFullYear())
          ]];
          // выведем сообщение
          this.wh.bot.sendMessage(this.wh.user.uid, this.wh.lang.getParam("order.empty"), buttons);
        }
      }
    }
  }

  /**
   * Текст для экрана
   * @param order
   * @param page
   * @param total
   * @returns {*}
   */
  getTextOrder(order, page, total) {
    let today = new Date();
    // получим пользователя
    let user = order._user();
    // вернем результат
    return this.wh.lang.getParam("order.body_admin", {
      hash: order.hash.toUpperCase(),
      user: user ? order._user().name : "Unknown user",
      date: getDateToFormat(order.date).slice(0, -3),
      phone: order.getPhone(),
      name: order.getName(),
      pay: this.wh.lang.getParam("order.pay._" + order.getPay()),
      status: (order.date > getDateToSeconds(today))
        ? this.wh.lang.getParam("order.getStatus", { status: this.wh.lang.getParam("order.status." + order.getStatus()) }) 
        : "",
      page: +page + 1,
      total: total
    }); 
  }

  /**
   * Кнопки для экрана
   * @param total
   * @param page
   * @returns {Array}
   */
  getButtonsOrder(date, total, page, order) {
    // получим дату
    let date__ = new Date(+date * 1000);
    // текущая дата
    let today = new Date();
    // объявим кнопки
    let buttons = [];
    // проверяем пагинацию
    if (total > 1) {
      // парамерт для кнопки назад
      let prev = ((page - 1) < 0) ? (total - 1) : (page - 1);
      // параметр для кнопки вперед
      let next = ((page + 1) >= total) ? 0 : (page + 1);
      // готовим кнопки туда - сюда
      buttons.push([
        this.wh.bot.buildInlineKeyboardButton(
          this.wh.lang.getParam("order.prev"),
          "adminNotes::viewDay_" + date + "_" + prev + "_1"
        ),
        this.wh.bot.buildInlineKeyboardButton(
          this.wh.lang.getParam("order.next"),
          "adminNotes::viewDay_" + date + "_" + next + "_1"
        ),
      ]);
    }
    // добавим кнопку подтвердить 
    if(order.date > getDateToSeconds(today)) {
      if(order.status === "new") {
        // кнопка подтвердить
        buttons.push([this.wh.bot.buildInlineKeyboardButton(
          this.wh.lang.getParam("order.setAccept"),
          "adminNotes::accept_" + order.hash + "_" + date + "_" + total + "_" + page
        )]);
      } 

      if(order.status !== "canceled") {
        // кнопка отклонить и удалить
        buttons.push([this.wh.bot.buildInlineKeyboardButton(
          this.wh.lang.getParam("order.cancel"),
          "adminNotes::cancelAsk_" + order.hash + "_" + date + "_" + order.date + "_" + total + "_" + page
        )]);
      }
    }
    // вернуться
    buttons.push([this.wh.bot.buildInlineKeyboardButton(
      this.wh.lang.getParam("go.back"),
      "adminNotes::date_" + setBeforeZero(date__.getMonth()) + "_" + date__.getFullYear()
    )]);
    // вернем кнопки
    return buttons;
  }

  /**
   * Подтвердим
   */
  accept() {
    // ставим проверку на админа
    ControllerAdmin.before(this.wh);
    // 1 - hash, 2 - date, 3 - total, 4 - page
    let params = paramsFromText(this.wh.bot.getCallbackQueryData());
    // получим запись
    let order = Note.find().findOneBy("hash", params[1]);
    // проверим
    if(order) {
      // переведем статус
      order.setStatus("inWork");
      // уведомляем пользователя
      this.noticeUser(order, true);
      // получим текст
      let text = this.getTextOrder(order, params[4], params[3]);
      // получим новый набор кнопко
      let buttons = this.getButtonsOrder(params[2], params[3], params[4], order);
      // заменим кнопки
      this.wh.bot.editMessageText(this.wh.user.uid, this.wh.bot.getMessageId(), text, buttons);
    } else {
      // выводим уведомление
      this.wh.bot.notice(this.wh.lang.getParam("error._404"));
    }
  }

  /**
   * Уточняем
   */
  cancelAsk() {
    // гасим удаляем
    this.wh.bot.noticeDelete();
    // ставим проверку на админа
    ControllerAdmin.before(this.wh);
    // 1 - hash, 2 - day, 3 - date, 4 - total, 5 - page
    let params = paramsFromText(this.wh.bot.getCallbackQueryData());
    // готовим текст
    let text = this.wh.lang.getParam("admin.order.askCancel", {date: getDateToFormat(+params[3]).slice(0, -3)});
    // готовим кнопки
    let buttons = [
      [
        this.wh.bot.buildInlineKeyboardButton(
          this.wh.lang.getParam("go.yes"), 
          "adminNotes::cancel_" + params[1] + "_" + params[2] + "_" + params[4] + "_" + params[5]
        ),
        this.wh.bot.buildInlineKeyboardButton(
          this.wh.lang.getParam("go.no"), 
          "adminNotes::viewDay_" + params[2] + "_0_0"
        ),
      ]
    ];
    // выводим сообщение
    this.wh.bot.sendMessage(this.wh.user.uid, text, buttons);
  }

  /**
   * Отменяем запись
   */
  cancel() {
    // 1 - hash, 2 - day, 3 - total, 4 - page
    let params = paramsFromText(this.wh.bot.getCallbackQueryData());
    // получим запись
    let order = Note.find().findOneBy("hash", params[1]);
    // проверим
    if(order) {
      // получим календарь
      let cal = CalendarApp.getCalendarById(config.calendar);
      // получим событие из календаря
      let event = cal.getEventById(order.cal_id);
      // проверим
      if(!isNull(event)) {
        // гасим
        this.wh.bot.notice();
        // уведомим админа
        this.noticeUser(order);
        // удаляем в календаре
        event.deleteEvent();
        // переведем статус отмененный
        order.setCanceled();
        // получим текст
        let text = this.getTextOrder(order, params[4], params[3]);
        // получим новый набор кнопко
        let buttons = this.getButtonsOrder(params[2], params[3], params[4], order);
        // заменим кнопки
        this.wh.bot.editMessageText(this.wh.user.uid, this.wh.bot.getMessageId(), text, buttons);
      } 
    } else {
      this.wh.bot.notice(this.wh.lang.getParam("error._404"));
    }
  }

  /**
   * Уведомим пользователя
   */
  noticeUser(order, type = false) {
    // кнопка перейти в свои записи
    let buttons = [[this.wh.bot.buildInlineKeyboardButton(
      this.wh.lang.getParam("order.orders"),
      "notes::run_" + +!+type + "_0"
    )]];
    // готовим текст
    let text = this.wh.lang.getParam("order.noticeUser_" + +type, { 
      date: getDateToFormat(order.date).slice(0, -3),
      hash: order.hash.toUpperCase()
    });
    // отправляем сообщение пользователю
    this.wh.bot.sendMessage(+order.uid, text, buttons);
  }
}

class ControllerAppointment extends Controller {
  /**
   * Запускаем форму добавления
   */
  run(params_ = null) {
    // переадесуем на форму выбора даты
    this.dateForm("params_" + setBeforeZero((new Date()).getMonth()) + "_" + (new Date()).getFullYear());
  }

  /**
   * Выбор даты
   */
  dateForm(params_ = null) {
    // гасим
    if(this.wh.bot.isCallBack()) {
      this.wh.bot.notice();
    }
    // 1 - month, 2 - year, 
    let params = paramsFromText(!isNull(params_) ? params_ : this.wh.bot.getCallbackQueryData());
    // текущая дата
    let today = new Date();
    // обнулим время
    today.setHours(0, 0, 0, 0);
    // лимит вперед
    let afterToday = new Date(new Date().setDate(today.getDate() + config.afterToday));
    // обнулим время
    afterToday.setHours(0, 0, 0, 0);
    // дата переданного периода
    let currentMonthDate = new Date(+params[2], +params[1]);
    // дата предыдущего месяца
    let prevMonthDate = (new Date((new Date(currentMonthDate)).setMonth(currentMonthDate.getMonth() - 1)))
    // дата следующего месяца
    let nextMonthDate = (new Date((new Date(currentMonthDate)).setMonth(currentMonthDate.getMonth() + 1)))
    // календарь
    let cal = CalendarApp.getCalendarById(config.calendar);
    // связка год_месяц переданного периода
    let yearMonth = params[2] + "-" + setBeforeZero(+params[1] + 1);
    // получим последний месяц
    let lastDayOfMonth = (new Date(+params[2], (+params[1] + 1), 0)).getDate();
    // получим все события периода
    let events = cal.getEvents(
      // начало запрашиваемого периода событий
      new Date(yearMonth + "-01 00:00:00"), 
      // конец запрашиваемого периода событий
      new Date(yearMonth + "-" + lastDayOfMonth + " 23:59:59")
    );
    // проверим количество событий 
    let eventsOfDay = parseEvents(events, currentMonthDate);
    // объявим набор кнопок
    let buttons = [];
    // проверка предыдущего месяца
    let prevCheck = today < currentMonthDate;
    // проверка следующего месяца
    let nextCheck = afterToday > nextMonthDate;
    // добавим кнопки переключения
    buttons.push([
      this.wh.bot.buildInlineKeyboardButton(
        prevCheck ? "<<<" : "✖️✖️✖️", 
        prevCheck 
          ? "appointment::dateForm_" + setBeforeZero(prevMonthDate.getMonth()) + "_" + prevMonthDate.getFullYear()
          : "appointment::inline_0"
      ),
      this.wh.bot.buildInlineKeyboardButton(setBeforeZero(+params[1] + 1) + "." + params[2], "appointment::inline_0"),
      this.wh.bot.buildInlineKeyboardButton(
        nextCheck ? ">>>" : "✖️✖️✖️", 
        nextCheck
          ? "appointment::dateForm_" + setBeforeZero(nextMonthDate.getMonth()) + "_" + nextMonthDate.getFullYear()
          : "appointment::inline_0"
      )
    ]);
    // получим значение дней для отрисовки календаря
    let dayLines = createCalendar(+params[2], (+params[1] + 1));
    // заготовим кол-во отрисованных дней
    let drawDay = 0;
    // переберем
    dayLines.forEach(function(line) {
      // добавим ряд кнопок
      buttons[buttons.length] = [];
      // переберем линию дней
      line.forEach(function(day) {
        // получим график приема
        let workTimes = getServiceTimes();
        // создадим дату из дня
        currentMonthDate = day > 0 
          ? new Date((new Date(currentMonthDate)).setDate(day)) 
          : currentMonthDate;
        // если это текущая дата
        if(getDateToSeconds(today) === getDateToSeconds(currentMonthDate)) {
          // удалим прошедшее время
          workTimes = this.workTimeFilter(workTimes);
        }
        // если есть время для записи 
        let name = (checkDateNotes((("_" + day in eventsOfDay) ? eventsOfDay["_" + day] : []), workTimes).length > 0 ? day : "✖️");
        // дополнительно проверим
        if(name > 0) {
          // проверим на прошедшую дату или на от текущей на возможный срок 
          name = (
            // если сегодня меньше даты
            today <= currentMonthDate 
            // и дата меньше резрешенного периода
            && currentMonthDate <= afterToday
          ) 
            ? name 
            : "✖️";
        }
        // проверим - это день месяца или Х
        let isDay = name > 0;
        // увеличим кол-во отрисованных дней
        drawDay += +isDay;
        // добавим кнопку
        buttons[buttons.length - 1].push(
          this.wh.bot.buildInlineKeyboardButton(
            name, 
            isDay 
              ? "appointment::timeForm_" + getDateToSeconds(currentMonthDate)
              : "appointment::inline_0"
          )
        );
      }, this);
    }, this);
    // проверим есть ли что выводить и это не по кнопке
    if(!drawDay && !isNull(params_)) {
      // проверим есть ли возможность двигаться дальше
      if(nextCheck) {
        // переадресуем на следующий месяц
        this.dateForm("params_" + setBeforeZero(nextMonthDate.getMonth()) + "_" + nextMonthDate.getFullYear());
      } else {
        // выводим что нет данных для записи
        this.wh.bot.sendMessage(
          this.wh.user.uid, 
          this.wh.lang.getParam("order.form.error.noTimes")
        );
      }
    } else {
    // текст сообщения
    let text = this.wh.lang.getParam("order.form.date");
    // выведем сообщение
    !isNull(params_) 
      ? this.wh.bot.sendMessage(
          this.wh.user.uid, 
          text, 
          buttons
        )
      : this.wh.bot.editMessageText(
          this.wh.user.uid, 
          this.wh.bot.getMessageId(), 
          text, 
          buttons
        );
    }
  }

  /**
   * Запрашиваем время
   */
  timeForm(params_ = null) {
    // 1 - date
    let params = paramsFromText(!isNull(params_) ? params_ : this.wh.bot.getCallbackQueryData());
    // создаем дату из переданного значения
    let paramDate = new Date(+params[1] * 1000);
    // получим текщую дату
    let today = new Date();
    // обнулим время
    today.setHours(0,0,0,0);
    // календарь
    let cal = CalendarApp.getCalendarById(config.calendar);
    // получим все события
    let events = cal.getEventsForDay(paramDate);
    // проверим количество событий 
    let eventsOfDay = parseEvents(events, new Date(paramDate.getFullYear(), paramDate.getMonth(), 1));
    // получим график приема
    let workTimes = getServiceTimes();
    // если это текущая дата - удалим прошедшее время
    if(getDateToSeconds(paramDate) === getDateToSeconds(today)) {
      // удалим прошедшее время
      workTimes = this.workTimeFilter(workTimes);
    }
    // определим день
    let day_ = "_" + paramDate.getDate();
    // получим свободное время
    let freeTimes = checkDateNotes(((day_ in eventsOfDay) ? eventsOfDay[day_] : []), workTimes);
    // проверим наличие времени
    if(freeTimes.length) {
      // если это по кнопке
      if(this.wh.bot.isCallBack()) {
        // гасим удаляем
        this.wh.bot.noticeDelete();
      }
      // объявим кнопки 
      let buttons = [];
      // переберем время
      freeTimes.forEach(function(time, idx) {
        // получим значения
        let [start, end] = time;
        // определим час
        let hours = Math.floor(start / 3600);
        // определим минуты
        let mins = (start / 60) % 60;
        // добавим кнопку
        buttons.push(
          [
            this.wh.bot.buildInlineKeyboardButton(
              setBeforeZero(hours) + ":" + setBeforeZero(mins), 
              "appointment::create_" + (+params[1] + start)
            )
          ]
        );
      }, this);
      // добавим кнопку вернуться
      buttons[buttons.length] = [
        this.wh.bot.buildInlineKeyboardButton(
          this.wh.lang.getParam("go.back"),
          "appointment::dateForm_" + setBeforeZero(paramDate.getMonth()) + "_" + paramDate.getFullYear()
        )
      ];
      // выведем сообщение
      this.wh.bot.sendMessage(
        this.wh.user.uid,
        this.wh.lang.getParam("order.form.time", {
          date: getDateToFormat(+params[1]).slice(0, -10)
        }),
        buttons
      );
    } else {
      // если это по кнопке
      if(this.wh.bot.isCallBack()) {
        // выводим уведомление об отсутствии времени
        this.wh.bot.noticeDelete(this.wh.lang.getParam("order.form.error.noTimes"));
        // выведем заново календарь
        this.run();
      }
    }
  }

  /**
   * Создаем
   */
  create(params_ = null) {
    // гасим удаляем
    if (this.wh.bot.isCallBack() && isNull(params_)) {
      this.wh.bot.noticeDelete();
    }
    // удаляем все старые 
    Note.deleteOld(this.wh.user.uid)
    // 1 - time
    let params = paramsFromText(!isNull(params_) ? params_ : this.wh.bot.getCallbackQueryData());
    // создаем запись
    let note = Note.create(this.wh.user.uid, params[1]);
    // переадресуем на форму
    this.form("params_" + note.hash + "_0");
  }

  /**
   * Выведем форму оформления заказа
   * @param params_
   * @returns {*}
   */
  form(params_ = null) {
      // гасим
      if (this.wh.bot.isCallBack() && isNull(params_)) {
        this.wh.bot.noticeDelete();
      }
      // 1 - hash, 2 - field, 3 - error
      let params = paramsFromText(!isNull(params_) ? params_ : this.wh.bot.getCallbackQueryData());
      // подстрахуем
      params[3] = isSet(params[3]) ? params[3] : null;
      // получим запись
      let order = Note.find().findOneByParams([["hash", "string", "===", params[1]], ["type", "number", "===", 0]]);
      // проверим
      if (!Array.isArray(order)) {
        // получаем настройки поля формы
        let field = Note.getFields()[+params[2]];
        // проверим
        if (isSet(field)) {
          // запишем действие пользователю
          this.wh.user.setAction("appointment::update_" + order.hash + "_" + params[2]);
          // получим текст + если есть ошибка - добавим ее
          let text = this.wh.lang.getParam("order.form.text._" + params[2], {
            error: !isNull(params[3]) ? this.wh.lang.getParam("order.form.error._" + params[3]) : ""
          });
          // добавим кнопки
          let buttons = [];
          // если это запрос на нажатие кнопок добавим их
          if (field.type === "callBack") {
            for (let i = 0; i < field.buttons; i += 1) {
              buttons.push([this.wh.bot.buildInlineKeyboardButton(
                this.wh.lang.getParam("order." + field.name + "._" + i),
                "appointment::update_" + order.hash + "_" + params[2] + "_" + i
              )]);
            }
          }
          // выводим сообщение
          return this.wh.bot.sendMessage(
            this.wh.bot.getFromId(),
            text,
            buttons.length
              ? buttons
              : null
          );
        } else {
          // переадресовать на preview
          return this.preview("params_" + order.hash);
        }
      }
  }

  /**
   * Сохраняем данные заказа
   * @returns {*}
   */
  update() {
    // 1 - hash, 2 - field, 3 - ?button_answer
    let params = paramsFromText(
      this.wh.bot.isCallBack()
        ? this.wh.bot.getCallbackQueryData()
        : this.wh.user.getAction()
    );
    // получим заказ
    let order = Note.find().findOneByParams([["hash", "string", "===", params[1]], ["type", "number", "===", 0]]);
    // проверим
    if (!Array.isArray(order)) {
      // получаем настройки поля формы
      let field = Note.getFields()[+params[2]];
      // проверим
      if (isSet(field)) {
        // проверим что пришло
        if (this.wh.bot["is" + ucfirst(field.type, false)]()) {
          // получим значение
          let value = field.type === "callBack" ? params[3] : this.wh.bot.getMessageText();
          // гасим удаляем
          if (this.wh.bot.isCallBack()) {
            this.wh.bot.noticeDelete();
          }
          // проверим валидацию
          if (field.validate) {
            // создадим шаблон
            let template = new RegExp(field.validate);
            // проверим
            if (!template.test(value)) {
              // вернем ошибку
              return this.form("params_" + params[1] + "_" + params[2] + "_" + params[2]);
            }
          }
          // удалим action
          this.wh.user.setAction("");
          // запишем результат
          order["set" + ucfirst(field.name, false)](value);
          // определим следующий шаг
          let nextStep = +params[2] + 1;
          // получим его
          let nextField = Note.getFields()[nextStep];
          // проверим
          if (nextField) {
            // проверим есть ли необходимость пропускать шаг
            if (nextField.skip) {
              // проверим условия
              if (order["get" + ucfirst(nextField.skip.step, false)]() == nextField.skip.value) {
                // перешагнем
                nextStep += 1;
              }
            }
            // переадресуем на форму"
            return this.form("params_" + params[1] + "_" + (nextStep))
          } else {
            // переадресовать на preview
            return this.preview("params_" + order.hash);
          }
        }
      }
    }
    // по умолчанию выведем ошибку
    this.wh.bot.notice(this.wh.lang.getParam("error.again"));
  }

  /**
   * Предпросмотр заказа
   * @param params_
   */
  preview(params_ = null) {
    // гасим удаляем
    if (this.wh.bot.isCallBack()) {
      this.wh.bot.noticeDelete();
    }
    // 1 - order_hash
    let params = paramsFromText(!isNull(params_) ? params_ : this.wh.bot.getCallbackQueryData());
    // получим закза
    let order = Note.find().findOneBy("hash", params[1]);
    // проверим
    if (order) {
      // готовим текст
      let text = this.getPreviewText(order, "main");
      // кнопки
      let buttons = [
        [this.wh.bot.buildInlineKeyboardButton(this.wh.lang.getParam("order.finish"), "appointment::finish_" + order.hash)],
        [this.wh.bot.buildInlineKeyboardButton(this.wh.lang.getParam("go.cancel"), "start::run_0")],
      ];
      // выведем инфо
      this.wh.bot.sendMessage(this.wh.bot.getFromId(), text, buttons);
    } else {
      // выводим предупреждение
      this.wh.bot.sendMessage(this.wh.bot.getFromId(), this.wh.lang.getParam("error.again"));
    }
  }

  /**
   * Завершаем оформление
   */
  finish() {
    // 1 - order_hash
    let params = paramsFromText(this.wh.bot.getCallbackQueryData());
    // получаем заявку
    let order = Note.find().findOneByParams([
      ["hash", "string", "===", params[1]],
      ["type", "number", "===", 0]
    ]);
    // проверяем
    if (!Array.isArray(order)) {
      // нужно проверить время записи на прошлое
      if(+order.date > getDateToSeconds()) {
        // создаем дату 
        let noteDate = new Date(+order.date * 1000);
        // обнулим время
        noteDate.setHours(0,0,0,0);
        // текущая дата
        let today = new Date();
        // обнулим время
        today.setHours(0,0,0,0);
        // получим календарь
        let cal = CalendarApp.getCalendarById(config.calendar);
        // получим события
        let events = cal.getEventsForDay(noteDate);
        // проверим количество событий 
        let eventsOfDay = parseEvents(events, new Date(noteDate.getFullYear(), noteDate.getMonth(), 1));
        // получим график приема
        let workTimes = getServiceTimes();
        // переданный день в секундах
        let noteDateToSeconds = getDateToSeconds(noteDate);
        // если это текущая дата - удалим прошедшее время
        if(noteDateToSeconds === getDateToSeconds(today)) {
          // удалим прошедшее время
          workTimes = this.workTimeFilter(workTimes);
        }
        // определим день
        let day_ = "_" + noteDate.getDate();
        // получим свободное время
        let freeTimes = checkDateNotes(((day_ in eventsOfDay) ? eventsOfDay[day_] : []), workTimes);
        // проверим наличие времени
        if(freeTimes.length) {
          // время записи в секундах
          let noteTimeToSeconds = +order.date - noteDateToSeconds;
          // нужно проверить наличие времени для записи
          freeTimes = freeTimes.filter(function(time, idx) {
            // получим параметры
            let [start_, end_] = time;
            // оставим только тот который нам нужен
            return start_ === noteTimeToSeconds;
          });
          // проверим
          if(freeTimes.length) {
            // создаем событие в календаре
            let cal_event = cal.createEvent(
              order.name + " [#" + order.hash + "]", 
              new Date(+order.date * 1000),  
              new Date((+order.date + (config.serviceDurationInMinutes * 60)) * 1000), 
              {
                description: 
                  this.wh.lang.getParam("order.preview.phone", {phone: order.phone}) +  
                  " " + this.wh.lang.getParam("order.preview.name", {name: order.name}) +
                  " " + this.wh.lang.getParam("order.preview.pay", {pay: this.wh.lang.getParam("order.pay._" + order.pay)})
              }
            );
            // переводим заявку в статус заказано
            order.setSuccess(cal_event.getId());
            // удаляем сообщение
            this.wh.bot.noticeDelete();
            // уведомление админу и в группу
            this.noticeAdmin(order);
            // переадресуем на "Спасибо"
            this.thanks();
          }
        }
      }
    } else {
      // выводим предупреждение
      this.wh.bot.noticeDelete(this.wh.lang.getParam("error._404"));
    }
  }

  /**
   * Уведомление админу
   * @param order
   */
  noticeAdmin(order) {
    // получим дату
    let orderDate = new Date(+order.date * 1000);
    // обнулим время
    orderDate.setHours(0,0,0,0);
    // готовим текст
    let text = this.getPreviewText(order, "toAdminMain");
    // кнопки
    let buttons = [
      // подтвердить
      [this.wh.bot.buildInlineKeyboardButton(
        this.wh.lang.getParam("admin.order.goToDay"), 
        "adminNotes::viewDay_" + getDateToSeconds(orderDate)
      )],
    ];
    // отправим админу
    this.wh.bot.sendMessage(config.admin_uid, text, buttons);
  }

  /**
   * Текст для 
   */
  getPreviewText(order, name) {
    // готовим текст
    return this.wh.lang.getParam("order.preview." + name, {
      hash: order.hash.toUpperCase(),
      body: this.wh.lang.getParam("order.preview.body", {
        date_body: this.wh.lang.getParam("order.preview.date", {
          date: getDateToFormat(order.date).slice(0, -3)
        }),
        phone_body: this.wh.lang.getParam("order.preview.phone", {
          phone: order.phone
        }),
        name_body: this.wh.lang.getParam("order.preview.name", {
          name: order.name
        }),
        pay_body: this.wh.lang.getParam("order.preview.pay", {
          pay: this.wh.lang.getParam("order.pay._" + order.pay)
        })
      })
    });
  }

  /**
   * Выводим благодарность
   */
  thanks() {
    // выводим сообщение
    this.wh.bot.sendMessage(
      this.wh.bot.getFromId(),
      this.wh.lang.getParam("order.success"),
      [
        [this.wh.bot.buildInlineKeyboardButton(this.wh.lang.getParam("order.orders"), "notes::run_0_0")],
      ]
    );
  }

  /**
   * Отфильтруем по прошедшему времени
   */
  workTimeFilter(workTimes) {
    // получим текущее время
    let currentTime = new Date();
    // текущее время в секундах
    let currentTimeInSec = (currentTime.getHours() * 3600) + (currentTime.getMinutes() * 60) + currentTime.getSeconds();
    // удалим прошедшее время
    return workTimes.filter(function(time) {
      // получим данные
      let [timeSatrt__, timeEnd__] = time;
      // оставим если это не прошедшее время
      return currentTimeInSec < timeSatrt__;
    }, this);
  }

  inline() {
    this.wh.bot.notice("- - -");
  }
}

class ControllerNotes extends Controller {
  /**
   * Выводим заказы
   * @param params_
   */
  run(params_ = null) {
    // 1 - type orders [1 - archive, 0 - active], 2 - page, 3 - type_send
    let params = paramsFromText(!isNull(params_)
      ? params_
      : (this.wh.bot.isCallBack()
        ? this.wh.bot.getCallbackQueryData()
        : "param_0_0_0")
    );
    // подстрахуем
    params[1] = isSet(params[1]) ? +params[1] : 0;
    params[2] = isSet(params[2]) ? +params[2] : 0;
    params[3] = isSet(params[3]) ? +params[3] : 0;
    // получаем заказы по статусам
    let orders = Note.find().findAllByParams([
      ["uid", "number", "===", this.wh.user.uid],
      ["type", "number", "===", 1],
    ], [
      "date", true
    ]);
    // текущая дата
    let today = getDateToSeconds();
    // отфильтруем по типу запроса
    orders = orders.filter(function (order, idx) {
      // архивные записи
      if(params[1]) {
        // если дата уже прошла или статусы canceled
        return +order.date < today || order.status === "canceled";
      } else {
        // активные записи
        return +order.date > today && ['new', 'inWork'].includes(order.status);
      }
    });
    // получим общее количество заказов
    let orders_count = orders.length;
    // отфильтруем заказы
    orders = orders.filter(function (order, idx) {
      // оставим только тот который нужен по page
      return idx >= +params[2] && idx < +params[2] + 1;
    })
    // проверим
    if (orders.length) {
      // получим значение заказа
      let order = orders[0];
      // получаем текст
      let text = this.getTextOrder(order, +params[1], +params[2], orders_count);
      // получаем кнопки
      let buttons = this.getButtonsOrder(+params[1], orders_count, +params[2], order);
      // выводим сообщение
      if (!+params[3]) {
        // гасим удалим
        if (this.wh.bot.isCallBack()) {
          this.wh.bot.noticeDelete();
        }
        // отправляем
        this.wh.bot.sendMessage(this.wh.bot.getFromId(), text, buttons);
      } else {
        // гасим
        if (this.wh.bot.isCallBack()) {
          this.wh.bot.notice();
        }
        // редактируем сообщение
        this.wh.bot.editMessageText(this.wh.bot.getFromId(), this.wh.bot.getMessageId(), text, buttons);
      }
    } else {
      if (this.wh.bot.isCallBack()) {
        this.wh.bot.noticeDelete();
      }
      // если это не первая страница
      if(+params[2] > 0) {
        // переадресуем на начало
        this.run("params_" + params[1] + "_0_0");
      } else {
        // выводим уведомление
        this.wh.bot.sendMessage(
          this.wh.bot.getFromId(),
          this.wh.lang.getParam("order.empty", {
            type: this.wh.lang.getParam("order.type_" + params[1])
          }),
          [[
            this.wh.bot.buildInlineKeyboardButton(
              this.wh.lang.getParam("order.type_" + +!+params[1]),
              "notes::run_" + +!+params[1] + "_0")
          ]]
        );
      }
    }
  }

  /**
   * Текст для экрана
   * @param order
   * @param type_orders
   * @param page
   * @param total
   * @returns {*}
   */
  getTextOrder(order, type_orders, page, total) {
    // вернем результат
    return this.wh.lang.getParam("order.body", {
      type: this.wh.lang.getParam("order.type_" + type_orders),
      hash: order.hash.toUpperCase(),
      date: getDateToFormat(order.date).slice(0, -3),
      phone: order.getPhone(),
      name: order.getName(),
      pay: this.wh.lang.getParam("order.pay._" + order.getPay()),
      status: !+type_orders || order.getStatus() === "canceled"
        ? this.wh.lang.getParam("order.getStatus", { status: this.wh.lang.getParam("order.status." + order.getStatus()) }) 
        : "",
      page: +page + 1,
      total: total
    }); 
  }

  /**
   * Кнопки для экрана
   * @param type_orders
   * @param total
   * @param page
   * @returns {Array}
   */
  getButtonsOrder(type_orders, total, page, order) {
    let buttons = [];
    // проверяем пагинацию
    if (total > 1) {
      // парамерт для кнопки назад
      let prev = ((page - 1) < 0) ? (total - 1) : (page - 1);
      // параметр для кнопки вперед
      let next = ((page + 1) >= total) ? 0 : (page + 1);
      // готовим кнопки туда - сюда
      buttons.push([
        this.wh.bot.buildInlineKeyboardButton(
          this.wh.lang.getParam("order.prev"),
          "notes::run_" + type_orders + "_" + prev + "_1"
        ),
        this.wh.bot.buildInlineKeyboardButton(
          this.wh.lang.getParam("order.next"),
          "notes::run_" + type_orders + "_" + next + "_1"
        ),
      ]);
    }
    // добавим кнопку отменить если это активный статус
    if(!+type_orders) {
      buttons.push([this.wh.bot.buildInlineKeyboardButton(
        this.wh.lang.getParam("order.setCancel"),
        "notes::cancelAsk_" + order.hash + "_" + type_orders + "_" + order.date
      )]);
    }
    // переключатель между типами
    buttons.push([this.wh.bot.buildInlineKeyboardButton(
      this.wh.lang.getParam("order.type_" + +!+type_orders),
      "notes::run_" + +!+type_orders + "_0"
    )]);
    // вернем кнопки
    return buttons;
  }

  /**
   * Уточняем
   */
  cancelAsk() {
    // гасим удаляем
    this.wh.bot.noticeDelete();
    // 1 - hash, 2 - types, 3 - date
    let params = paramsFromText(this.wh.bot.getCallbackQueryData());
    // готовим текст
    let text = this.wh.lang.getParam("order.askCancel", {date: getDateToFormat(+params[3]).slice(0, -3)});
    // готовим кнопки
    let buttons = [
      [
        this.wh.bot.buildInlineKeyboardButton(this.wh.lang.getParam("go.yes"), "notes::cancel_" + params[1] + "_" + params[2]),
        this.wh.bot.buildInlineKeyboardButton(this.wh.lang.getParam("go.no"), "notes::run_" + params[2] + "_0_0"),
      ]
    ];
    // выводим сообщение
    this.wh.bot.sendMessage(this.wh.user.uid, text, buttons);
  }

  /**
   * Отменяем запись
   */
  cancel() {
    // 1 - hash, 2 - types
    let params = paramsFromText(this.wh.bot.getCallbackQueryData());
    // получим запись
    let order = Note.find().findOneBy("hash", params[1]);
    // определим текст уведомления
    let text = this.wh.lang.getParam("error._404");
    // проверим
    if(order) {
      // если есть id события
      if(!isEmpty(order.cal_id)) {
        // получим календарь
        let cal = CalendarApp.getCalendarById(config.calendar);
        // получим событие из календаря
        let event = cal.getEventById(order.cal_id);
        // проверим
        if(!isNull(event)) {
          // уведомим админа
          this.adminNotice(order, event);
          // удаляем в календаре
          event.deleteEvent();
        }  
      }
      // обнулим текст уведомления
      text = "";
      // удалим запись в таблице
      order.delete();
    } 
    // выводим уведомление
    this.wh.bot.noticeDelete(text);
    // переадресуем назад
    this.run("params_" + params[2] + "_0_0");
  }

  /**
   * Уведомим админа об удалении
   */
  adminNotice(order, event) {
    // готовим текст
    let text = this.wh.lang.getParam("order.noticeDeleteAdmin", { 
      date: getDateToFormat(order.date).slice(0, -3),
      description: event.getDescription(),
      hash: order.hash.toUpperCase()
    });
    // отправляем сообщение админу
    this.wh.bot.sendMessage(config.admin_uid, text);
  }
}

/**
 * Контроллер Старт Бота
 */
class ControllerStart extends Controller {
  /**
   * Запускаем
   */
  run() {
    // гасим удаляем
    if (this.wh.bot.isCallBack()) {
      this.wh.bot.noticeDelete();
    } else {
      // готовим клавиатуру для пользователя
      let keyboard = ControllerStart.getStartKeyboard(this.wh);
      // выводим клавиатуру
      this.wh.bot.sendMessage(this.wh.bot.getChatId(), "...", keyboard, true);
    }
    // готовим кнопки
    let buttons = null;
    if (this.wh.isAdmin()) {
      buttons = [[this.wh.bot.buildInlineKeyboardButton("AdminPanel /admin", "admin::run_0")]];
    }
    // получаем страницу
    let page = Page.getPage("about");
    // получим описание
    let description = page.getDescription();
    // получаем текст
    let text = isNull(description)
      ? this.wh.lang.getParam("page.empty")
      : description;
    // проверим картинку
    let image = page.getImage();
    // проверим как отправляем
    if (!isNull(image)) {
      this.wh.bot.sendPhoto(this.wh.bot.getFromId(), image, text);
    } else {
      this.wh.bot.sendMessage(this.wh.bot.getFromId(), text);
    }
  }

  /**
   * Получаем кнопки клавиатуры
   * @param wh
   * @returns {{request_location: boolean, text: *, request_contact: boolean}[][]}
   */
  static getStartKeyboard(wh) {
    // вернем массив кнопок
    return [
      [
        wh.bot.buildKeyboardButton(wh.lang.getParam("start.keyboard.btn_1")),
        wh.bot.buildKeyboardButton(wh.lang.getParam("start.keyboard.btn_2")),
      ]
    ];
  }
}


/**
 * Получаем данные от Телеграм
 * @param request
 */
function doPost(request) {
  // проверяем что запрос от телеграм с токеном
  if(request.parameter.token === config.token) {
    // получаем данные
    let update = JSON.parse(request.postData.contents);
    // направляем данные в объект WebHook
    new WebHook(update);
  }
}

/**
 * Получаем информацию о боте
 */
function getMe() {
  let response = UrlFetchApp.fetch(config.apiUrl + config.token + "/getMe");
  console.log(response.getContentText());
}

/**
 * Получаем информацию о Вебхуке
 */
function getWebHookInfo() {
  let response = UrlFetchApp.fetch(config.apiUrl + config.token + "/getWebHookInfo");
  console.log(response.getContentText());
}

/**
 * Устанавливаем Вебхук
 */
function setWebHook() {
  let response = UrlFetchApp.fetch(config.apiUrl + config.token + "/setWebHook?url=" + config.webhook + "?token=" + config.token);
  console.log(response.getContentText());
}

/**
 * Удалим Вебхук
 */
function deleteWebHook() {
  let response = UrlFetchApp.fetch(config.apiUrl + config.token + "/deleteWebhook?drop_pending_updates=true");
  console.log(response.getContentText());
}


/**
 * Инициируем приложение
 */
function initApp() {
  try {
    // получаем таблицу
    let spreadSheet = SpreadsheetApp.openById(config.sheet);
    // перебираем настройки таблиц классов
    for (let class_ in mapClasses) {
      // получаем класс
      const this_class = mapClasses[class_];
      // получаем настройки таблицы
      const table_config = this_class.table();
      // проверяем если отсутствует лист
      if (isNull(spreadSheet.getSheetByName(table_config.name))) {
        // создаем лист
        spreadSheet.insertSheet(table_config.name);
        // добавляем название столбцов
        new this_class().getSheet().appendRow(table_config.columns);
      }
    }
    // выводим в консоль уведомление
    console.log("Complete");
  } catch (e) {
    // выводим в консоль ошибку
    console.log(e.message)
  }
}

/**
 * Проверяем на существование
 * @param variable
 * @returns {boolean}
 */
function isSet(variable) {
  return typeof variable !== "undefined";
}

/**
 * Проверяем на пустое значение
 * @param variable
 * @returns {boolean}
 */
function isEmpty(variable) {
  return variable === "";
}

/**
 * Проверяем на null
 * @param variable
 * @returns {boolean}
 */
function isNull(variable) {
  return variable === null;
}

/**
 * Логгер
 * @param message
 * @param table
 */
function logger(message, table = "Logs") {
  try {
    // получаем таблицу
    let ss = SpreadsheetApp.openById(config.sheet);
    // проверяем наличие листа
    if (ss.getSheetByName(table) === null) {
      // создаем лист если его нет
      ss.insertSheet(table);
    }
    // записываем сообщение
    ss.getSheetByName(table).appendRow([message]);
  } catch (e) {
  }
}

/**
 * Преобразуем слово - первый символ большая буква
 * @param word
 * @param type
 * @returns {string}
 */
function ucfirst(word, type = true) {
  let param_1 = word[0].toUpperCase();
  let param_2 = word.slice(1);
  return param_1 + (type ? param_2.toLowerCase() : param_2);
}

/**
 * Получаем индекс элемента в массиве
 * @param array
 * @param value
 * @param digit
 * @returns {number}
 */
function findIndex(array, value, digit = 0) {
  let idx = array.indexOf(value);
  return idx += digit;
}

/**
 * Получаем буквенное значение столбца по индексу
 * @param n
 * @returns {string}
 */
function getLetterByIndex(n) {
  return (a = Math.floor(--n / 26)) >= 0
    ? getLetterByIndex(a - 1) + String.fromCharCode(65 + (n % 26))
    : '';
}

/**
 * Генерируем случайную строку
 * @param length
 * @returns {string}
 */
function getRandomStr(length = 16) {
  return Array(length)
    .fill("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz")
    .map(function (x) {
      return x[Math.floor(Math.random() * x.length)]
    })
    .join('')
    .toLowerCase();
}

/**
 * Получаем текущее время в секундах
 * @param datetime
 * @returns {number}
 */
function getDateToSeconds(datetime = null) {
  const date = !isNull(datetime) ? new Date(datetime) : new Date();
  return Math.floor(date.getTime() / 1000);
}

/**
 * Конвертируем время в локаль
 * @param seconds
 * @param locale
 * @returns {string}
 */
function getDateToFormat(seconds, locale = "ru") {
  // "d.m.Y в H:i"
  let date = new Date(seconds * 1000);
  // опции
  let options = {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    timezone: 'UTC'
  };
  // вернем отформатированное
  return date.toLocaleString(locale, options);
}

/**
 * Получим параметры
 * @param text
 * @returns {*}
 */
function paramsFromText(text) {
  return text.split("_");
}

/**
 * Форматирование текста
 * @param text
 * @param entities
 * @returns {*}
 */
function prepareMessageWithEntities(text, entities) {
  // проверяем наличие форматирования
  if (entities !== null && entities.length > 0) {
    // готовим переменную в нее будем добавлять
    let prepareText = "";
    // перебираем форматирование
    entities.forEach(function (entity, idx, arr) {
      // добавляем все что между форматированием
      if (entity.offset > 0) {
        /*
          * старт = если начало больше 0 и это первый элемент то берем сначала с нуля
          * если не первый то берем сразу после предыдущего элемента
          *
          * длина = это разница между стартом и текущим началом
          */
        // определяем начало
        let start = (idx === 0)
          ? 0
          : (arr[idx - 1].offset + arr[idx - 1].length);
        // определяем длину
        let length = entity.offset - start;
        // добавляем
        prepareText = prepareText + text.substr(start, length);
      }
      // выбираем текущий элемент форматирования
      let charts = text.substr(entity.offset, entity.length);
      // обрамляем в необходимый формат
      if (entity.type === "bold") {
        // полужирный
        charts = "<b>" + charts + "</b>";
      } else if (entity.type === "italic") {
        // курсив
        charts = "<i>" + charts + "</i>";
      } else if (entity.type === "code") {
        // код
        charts = "<code>" + charts + "</code>";
      } else if (entity.type === "pre") {
        // inline код
        charts = "<pre>" + charts + "</pre>";
      } else if (entity.type === "strikethrough") {
        // зачеркнутый
        charts = "<s>" + charts + "</s>";
      } else if (entity.type === "underline") {
        // подчеркнутый
        charts = "<u>" + charts + "</u>";
      } else if (entity.type === "spoiler") {
        // скрытый
        charts = "<tg-spoiler>" + charts + "</tg-spoiler>";
      } else if (entity.type === "text_link") {
        // ссылка текстовая
        charts = "<a href='" + entity.url + "'>" + charts + "</a>";
      }
      // добавляем в переменную
      prepareText = prepareText + charts;
    });
    // добавляем остатки текста если такие есть
    prepareText = prepareText + text.substr((entities[entities.length - 1].offset + entities[entities.length - 1].length));
    // возвращаем результат
    return prepareText;
  }
  // по умолчанию вернем не форматированный текст
  return text;
}

/**
 * Получаем массив дней для календаря
 */
function createCalendar(year, month) {
  // месяц в формате js
  let mon = month - 1;
  // получаем дату
  let d = new Date(year, mon);
  // объявляем массив
  let dateArray = [];
  // добавляем первую строку
  dateArray[dateArray.length] = [];
  // добавляем в первую строку пустые значения
  for (let i = 0; i < getDay(d); i++) {
    dateArray[dateArray.length - 1].push("-");
  }
  // выходим пока месяц не перешел на другой
  while (d.getMonth() == mon) {
    // добавляем в строку дни
    dateArray[dateArray.length - 1].push(d.getDate());
    // вс, последний день - перевод строки
    if (getDay(d) % 7 == 6) { 
      // добавляем новую строку
      dateArray[dateArray.length] = [];
    }
    // переходим на следующий день
    d.setDate(d.getDate() + 1);
  }
  // дозаполняем последнюю строку пустыми значениями
  if (getDay(d) != 0) {
    for (let i = getDay(d); i < 7; i++) {
      dateArray[dateArray.length - 1].push("-");
    }
  }
  // вернем массив
  return dateArray;
}

/**
 * Доп функция для получения дня недели в рус формате
 */
function getDay(date) { 
  let day = date.getDay();
  if (day == 0) day = 7; 
  return day - 1;
}

/**
 * 
 */
function setBeforeZero(num) {
  return ("0" + (num)).slice(-2);
}

/**
 * Собираем объект с занятым временем из календаря
 */
function addEvent(day, start, end, array) {
  // получаем разницу в секундах между началом и окончанием
  let diff = parseInt((end - start) / 1000);
  // поставим проверку если разница больше 0 
  if(diff) {
    // получаем начало события в секундах от начала дня
    let startInSec = (start.getHours() * 3600) + (start.getMinutes() * 60);
    // если разница от начала события больше или равно сутокам - то это перенос на следующий день
    let toNextDay = (startInSec + diff) >= 86400;
    // если в объекте такого значения нет
    if(!isSet(array[day])) {
      // создаем его
      array[day] = [];
    }
    // добавляем 
    array[day].push([
      // начало в секундах от начала дня
      startInSec, 
      // окончание в секундах от начала дня
      toNextDay ? 86400 : (end.getHours() * 3600) + (end.getMinutes() * 60), 
    ]);
    // если это следующий день
    if(toNextDay) {
      // получаем дату следующего дня
      let nextStartDate = new Date(start.getFullYear(), start.getMonth(), (start.getDate() + 1));
      // проверим не перескочили ли на следующий месяц
      if(nextStartDate.getMonth() === start.getMonth()) {
        // направим на рекусию
        addEvent("_" + nextStartDate.getDate(), nextStartDate, end, array);
      }
    }
  }
}

/**
 * Получим режим работы в минутах
 */
function getConfigWorkHours() {
  // получим начало и окончание режима
  let [start, end] = config.workHours;
  // разложим начало на часы и минуты
  let [start_hour, start_min] = start.split(":");
  // разложим окончание на часы и минуты
  let [end_hour, end_min] = end.split(":");
  // переведем в минуты от начала дня
  return [((+start_hour * 60) + +start_min), ((+end_hour * 60) + +end_min)];
}

/**
 * Получим продолжительность приема
 */
function getServiceDurationInMinutes() {
  return config.serviceDurationInMinutes < 15 
    ? 15 
    : config.serviceDurationInMinutes; 
}

/**
 * Получим возможное время записи
 */
function getServiceTimes() {
  // получим в минутах начало и окончание рабочего дня
  let [start, end] = getConfigWorkHours();
  // получим продолжительность приема
  let serviceDuration = getServiceDurationInMinutes();
  // получим количество приемов
  let countTimes = Math.floor((end - start) / serviceDuration);
  // объявим массив
  let array = [];
  // перебирем кол-во приемов
  for(let time = 0; time < countTimes; time += 1) {
    // получим период расчета в минутах
    let minutes = (start % 60) + (time * serviceDuration);
    // начало приема в минутах от начала дня
    let newStartInMinutes = ((((Math.floor(start / 60) + Math.floor(minutes / 60))) * 60) + (minutes % 60));
    // добавим в секундах начало и окончание приема от начала дня
    array.push([
      // начало приема
      (newStartInMinutes * 60), 
      // окончание приема = начало приема + продолжительность приема
      ((newStartInMinutes + getServiceDurationInMinutes()) * 60)
    ]);
  }
  // вернем массив
  return array;
}

/**
 * Проверим возможность записи по дню
 */
function checkDateNotes(events, workTimes) {
  // отсортируем события по началу
  events.sort(function(a,b) {
    return a[0] - b[0];
  });
  // вернем массив возможного времени для записи
  return workTimes.filter(function(time) {
    // получим значения времени у режима
    let [startTime, endTime] = time;
    // по умолчанию оставим массива
    let result = true;
    // переберем события 
    for(let ei = 0; ei < events.length; ei += 1){
      // получим значения времени у события
      let [eventStart, eventEnd] = events[ei];
      // проверим наличие в событии
      if(
        // начало записи
        startTime >= eventStart && startTime < eventEnd 
        // или конца записи
        || endTime > eventStart && endTime <= eventEnd
      ) {
        // удалим из массива
        result = false;
        // выйдем из цикла
        break;
      }
    }
    // вернем результат
    return result;
  });
}

/**
 * Парсим события в объект даты в секундах
 */
function parseEvents(events, currentMonthDate) {
  // создадим объект для событий
  let eventsOfDay = {};
  // проверим количество событий 
  if(events.length) {
    // переберем события
    events.forEach(function(event) {
      // получим дату начала события
      let start_ = event.getStartTime();
      // если старт из прошлого периода
      if(currentMonthDate.getMonth() > start_.getMonth() && currentMonthDate.getFullYear() >= start_.getFullYear()) {
        // то старт переназначаем на начало запрашиваего месяца
        start_ = currentMonthDate;
      }
      // получим окончание события
      let end_ = event.getEndTime();
      // день начала события
      let day_ = "_" + start_.getDate();
      // добавим событие в список
      addEvent(day_, start_, end_, eventsOfDay);
    });
  }
  // вернем объект
  return eventsOfDay;
}

/**
 * Класс WebHook
 */
class WebHook {
  /**
   * Создаем объект WebHook
   * @param update
   * @returns {boolean}
   */
  constructor(update) {
    try {
      // деббагер
      if (config.debugger) {
        logger(JSON.stringify(update))
      }
      // создаем объект бота
      this.bot = new Bot(config.token, update);
      // проверим на частный запрос
      if (!this.bot.isPrivate()) {
        // выйдем если это группа или канал
        return true;
      }
      // создаем объект пользователя
      this.user = User.getUser(this.bot.getUserData());
      // создаем объект языковых настроек
      this.lang = new Lang(this.user.lang);
      // запускаем роутер
      new Route(this).run();
    } catch (e) {
      logger(e.message);
    }
  }

  /**
   * Проверяем на Админа
   * @returns {boolean}
   */
  isAdmin() {
    // сравним текущего пользователя с админом из настроек
    return config.admin_uid === this.user.uid;
  }

  /**
   * Преобразуем переданную строку в camelCase
   * @param method
   * @returns {*}
   */
  prepareMethod(method) {
    return method.split('_') // разделяем по знаку _ в массив
      .map(function (word, index) { // перебираем все значения
        // преобразуем первый символ в верхний регистр, остальное в нижний
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      })
      .join(''); // собираем в одно слово без пробелов
  }
}

/**
 * Карта классов сущностей
 */
const mapClasses = {
  User,
  Note,
  Page
};

/**
 * Карта контроллеров бота
 */
const mapControllers = {
  ControllerStart,
  ControllerAdmin,
  ControllerAdminAbout,
  ControllerAdminNotes,
  ControllerNotes,
  ControllerAppointment
};