import { BuildbotClient } from './buildbot_client.js';
import { DEFAULT_WORKERS, MAX_WORKERS } from './config';

const BUILD_BASE_PATH = 'http://build.servo.org/builders/';

const UI = {
  init() {
    this._elements = {};
    ['workers',
     'pull-request-id',
     'get-status',
     'in-progress',
     'cancel',
     'spinner',
     'content',
     'not-found',
     'time',
     'seconds',
     'builds'].forEach(id => {
      const name = id.replace(/-(.)/g, function(str, p1) {
        return p1.toUpperCase();
      });
      this._elements[name] = document.getElementById(id);
    });

    this.initWorkerSelect(this._elements.workers);

    this._elements.getStatus.addEventListener('click', this.getStatus.bind(this));
    this._elements.cancel.addEventListener('click', this.cancel.bind(this));
  },

  getStatus() {
    const id = this._elements.pullRequestId.value;
    if (!id || !id.length) {
      // XXX error feedback. Paint input in red.
      return;
    }
    ['getStatus', 'time'].forEach(name => {
      this._elements[name].classList.add('hidden');
    });
    ['cancel', 'inProgress', 'content', 'spinner'].forEach(name => {
      this._elements[name].classList.remove('hidden');
    });
    this._elements.workers.disabled = true;

    this._elements.builds.textContent = "";
    this._builds = {};
    this._startTime = Date.now();

    this._client = new BuildbotClient(this._elements.workers.value);
    this._client.fetchBuilds(id, this.onprogress.bind(this), this.ondone.bind(this));
  },

  cancel() {
    ['cancel', 'inProgress', 'content', 'spinner', 'notFound'].forEach(name => {
      this._elements[name].classList.add('hidden');
    });
    this._elements.getStatus.classList.remove('hidden');
    this._elements.workers.disabled = undefined;

    this._client.cancel();

    this._cleanup();
  },

  _cleanup() {
    this._builds = null;
    this._startTime = null;
    this._client = null;
  },

  _showBuild(rev) {
    const builds = this._builds[rev];

    let buildEl = document.createElement('div');
    buildEl.classList.add('build');

    let title = document.createElement('div');
    title.classList.add('details');
    title.classList.add('title');
    title.textContent = rev;

    let table = document.createElement('table');
    let tr = document.createElement('tr');
    let details = document.createElement('div');
    details.classList.add('details');
    details.classList.add('hidden');
    Object.keys(builds).forEach(key => {
      const build = builds[key];
      let td = document.createElement('td');
      let label = build.builder;
      let a = document.createElement('a');
      a.href = `${BUILD_BASE_PATH}${build.builder}/builds/${build.id}`;
      a.title = build.builder;
      const title = document.createTextNode(build.builder);
      a.appendChild(title);
      td.appendChild(a);

      if (build.inprogress) {
        td.classList.add('inprogress');
      } else if (build.success) {
        td.classList.add('success');
      } else {
        td.classList.add('error');
      }
      tr.appendChild(td);
    });
    table.appendChild(tr);
    details.appendChild(table);

    let expand = document.createElement('div');
    expand.classList.add('expand');
    expand.classList.add('more');
    expand.addEventListener('click', () => {
      if (expand.classList.contains('more')) {
        expand.classList.remove('more');
        expand.classList.add('less');
        details.classList.remove('hidden');
      } else {
        expand.classList.remove('less');
        expand.classList.add('more');
        details.classList.add('hidden');
      }
    });

    buildEl.appendChild(expand);
    buildEl.appendChild(title);
    buildEl.appendChild(details);

    this._elements.builds.appendChild(buildEl);

    if (this._elements.content.classList.contains('hidden')) {
      this._elements.content.classList.remove('hidden');
    }
  },

  onprogress(build) {
    const rev = build.revision;
    if (!rev) {
      console.warn("Invalid build", build);
    }

    if (!this._builds[rev]) {
      this._builds[rev] = [];
    }
    this._builds[rev].push(build);
  },

  ondone(error) {
    // XXX handle error.

    this._elements.seconds.textContent = (Date.now() - this._startTime) / 1000;

    ['cancel', 'inProgress', 'spinner'].forEach(name => {
      this._elements[name].classList.add('hidden');
    });
    ['getStatus', 'time'].forEach(name => {
      this._elements[name].classList.remove('hidden');
    });
    this._elements.workers.disabled = undefined;

    if (!Object.keys(this._builds).length) {
      this._elements.spinner.classList.add('hidden');
      this._elements.notFound.classList.remove('hidden');
    } else {
      Object.keys(this._builds).forEach(build => {
        this._showBuild(build);
      });
    }

    this._cleanup();
  },

  initWorkerSelect(runningWorkersElem) {
    Array.from({ length: MAX_WORKERS }).forEach((_v, k) => {
      const number = k + 1;
      const option = document.createElement('option');
      option.value = number;
      option.text = number;
      if (number === DEFAULT_WORKERS) {
        option.selected = true;
      }
      runningWorkersElem.appendChild(option);
    })
  }
};

export { UI };
