import { BuildbotClient } from './buildbot_client.js';

const UI = {
  init() {
    this._elements = {};
    ['pull-request-id',
     'get-status',
     'in-progress',
     'cancel'].forEach(id => {
      const name = id.replace(/-(.)/g, function(str, p1) {
        return p1.toUpperCase();
      });
      this._elements[name] = document.getElementById(id);
    });

    this._elements.getStatus.addEventListener('click', this.getStatus.bind(this));
    this._elements.cancel.addEventListener('click', this.cancel.bind(this));
  },

  getStatus() {
    const id = this._elements.pullRequestId.value;
    if (!id || !id.length) {
      // XXX error feedback. Paint input in red.
      return;
    }
    this._elements.getStatus.classList.add('hidden');
    this._elements.cancel.classList.remove('hidden');
    this._elements.inProgress.classList.remove('hidden');

    this._client = new BuildbotClient();
    this._client.fetchBuilds(id);
  },

  cancel() {
    this._elements.cancel.classList.add('hidden');
    this._elements.inProgress.classList.add('hidden');
    this._elements.getStatus.classList.remove('hidden');

    this._client.cancel();
    this._client = null;
  }
};

export { UI };
