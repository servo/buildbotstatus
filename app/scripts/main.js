import { UI } from './ui.js';

const Main = {
  init() {
    UI.init();
    window.onhashchange = UI.getStatus.bind(UI);
  }
};

window.onload = Main.init;
