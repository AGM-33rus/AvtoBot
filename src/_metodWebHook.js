import Bot from './Bot';

export default {
  start() {
    // определяем текст
    const text = this.isAdmin() // проверяем кто стартанул
      ? this.lang.getParam('admin.hello') // если стартанул админ
      : this.lang.getParam('user.hello', {
          name: this.user.name,
        });
    // выводим сообщение
    Bot.sendMessage(this.user.uid, text);
  },
};
