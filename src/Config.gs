const config = {
  // id администратора в телеграм
  admin_uid: 0,
  // токен бота
  token: "", 
  // id таблицы
  sheet: "",
  // адрем веб-приложения App Script
  webhook: "",
  // Телеграм api
  apiUrl: "https://api.telegram.org/bot",
  // дебагер
  debugger: true,
  // идентификатор календаря
  calendar: "",
  // режим работы
  workHours: ["09:00", "17:00"],
  // длительность услуги в минутах
  serviceDurationInMinutes: 30,
  // на сколько можно в днях записаться вперед
  afterToday: 90
};

const config_lang = {
  ru: {
    name_lang: "🇷🇺 Русский",
    start: {
      keyboard: {
        btn_1: "Записаться",
        btn_2: "Мои записи",       
      }
    },
    admin: {
      hello: "Приветствую, Администратор. Выберите действие:",
      controller: {
        btn: {
          about: "Об услуге",
          notes: "Записи на услугу",
        }
      },
      set: {
        hide: "Видимость объекта изменена"
      },
      icon: {
          hide_0: "\uD83D\uDE48",
          hide_1: "\uD83D\uDC35",
          edit: "✏️",
          remove: "❌"
      },
      order: {
        all: {
          selectDay: "Выберите дату для просмотра записей\n---\n* отмечены даты в которых есть записи созданые через бот"
        },
        goToDay: "Перейти в день записи",
        status: {
          accept: "Подтвердить",
          cancel: "Отклонить"
        },
        askCancel: "Вы уверены, что хотите оклонить запись на {date}?"
      },
      page: {
        btn_edit: "✏️ Редактировать",
        form: {
          text: "{old_value}Введите значение для поля <b>{db_name}</b>",
          text_old: "Старое значение для <b>{db_name}</b>: {value}\n-----\n",
          photo: "{old_value}Отправьте картинку для поля <b>{db_name}</b>",
          photo_old: "Старое значение для <b>{db_name}</b>\n-----\n"
        },
        description: "Описание",
        image: "Изображение",
      }
    },
    page: {
      empty: "Раздел не наполнен"
    },
    order:{
      form: {
        date: "Выберите желаемый день получения улуги:",
        time: "Дата записи: {date}\n\nВыберите время получения улуги:",
        text: {
          _0: "<b>Оформление записи</b>\n\nУкажите ваш телефон в формате +79991234567{error}",
          _1: "<b>Оформление записи</b>\n\nУкажите ваше ФИО",
          _2: "<b>Оформление записи</b>\n\nВыберите тип оплаты"
        },
        error: {
          noTimes: "Не времени для записи",
          _0: "\n---\nВы указали не верный формат телефона"
        }
      },
      pay: {
        _0: "Наличными",
        _1: "Картой через терминал",
        _2: "С карты на карту",
      },
      preview: {
        toAdminMain: "<b>Новая запись №{hash}</b>\n{body}",
        main: "<b>Оформление записи №{hash}</b>\n{body}",
        body: "{date_body}{phone_body}{name_body}{pay_body}",
        date: "\n\uD83D\uDD38 <b>Дата и время:</b> {date}",
        phone: "\n\uD83D\uDD38 <b>Телефон:</b> {phone}",
        name: "\n\uD83D\uDD38 <b>ФИО:</b> {name}",
        pay: "\n\uD83D\uDD38 <b>Оплата:</b> {pay}\n",
      },
      status: {
        new: "ожидает подтверждения",
        inWork: "подтверждена",
        canceled: "отменена"
      },
      body: "<b>{type} - Запись №{hash}</b>\n\n\uD83D\uDD38 <b>Дата:</b> {date}\n\uD83D\uDD38 <b>Телефон:</b> {phone}\n\uD83D\uDD38 <b>ФИО:</b> {name}\n\uD83D\uDD38 <b>Оплата:</b> {pay}{status}\n\nПоказан {page} из {total}",
      body_admin: "<b>ADMIN - Запись №{hash}</b>\n\n\uD83D\uDD38 <b>Пользователь:</b> {user}\n\uD83D\uDD38 <b>Дата:</b> {date}\n\uD83D\uDD38 <b>Телефон:</b> {phone}\n\uD83D\uDD38 <b>ФИО:</b> {name}\n\uD83D\uDD38 <b>Оплата:</b> {pay}{status}\n\nПоказан {page} из {total}",
      getStatus: "\n\uD83D\uDD38 <b>Статус записи:</b> {status}",
      finish: "✔ Оформить запись",
      success: "Спасибо. Запись успешно оформлена.",
      orders: "Посмотреть свои записи",
      askCancel: "Вы уверены, что хотите отменить запись на {date}?",
      empty: "Нет записей",
      prev: "<<<",
      next: ">>>",
      setCancel: "Отменить запись",
      setAccept: "Подтвердить запись",
      delete: "Удалить запись",
      cancel: "Отклонить",
      type_0: "Активные записи",
      type_1: "Архивные записи",
      noticeDeleteAdmin: "<b>Внимание!</b>\n\nЗапись №{hash} от {date} удалена пользователем\n{description}",
      noticeUser_0: "<b>Внимание!</b>\nЗапись №{hash} от {date} отменена",
      noticeUser_1: "<b>Внимание!</b>\nЗапись №{hash} от {date} подтверждена"
    },
    go: {
      back: "Вернуться",
      yes: "Да",
      no: "Нет",
      finish: "Завершить",
      cancel: "Отменить",
      skip: "Пропустить",
    },
    error: {
      _403: "Доступ запрещен",
      _404: "Объект не найден",
      again: "Попробуйте позже",
      load: "Ошибка записи переданных данных. Попробуйте позже.",
      method: "Вы отправили не тот тип данных",
    }
  }
}