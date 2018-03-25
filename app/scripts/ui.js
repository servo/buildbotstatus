import { BuildbotClient } from './buildbot_client.js';
import { GithubClient } from './github.js';
import { DEFAULT_WORKERS, MAX_WORKERS } from './config';

const BUILD_BASE_PATH = 'http://build.servo.org/builders/';

const UI = {
  init() {
    this._elements = {};
    ['workers',
     'pull-request-id',
     'get-status',
     'cancel',
     'spinner',
     'content',
     'not-found',
     'time',
     'seconds',
     'builds',
     'github',
     'pr-state',
     'pr-author',
     'pr-title',
     'progress',
     'progress-build',
     'progress-total'].forEach(id => {
      const name = id.replace(/-(.)/g, function(str, p1) {
        return p1.toUpperCase();
      });
      this._elements[name] = document.getElementById(id);
    });

    this._initWorkersSelect(this._elements.workers);

    this._elements.getStatus.addEventListener('click', this.getStatus.bind(this));
    this._elements.cancel.addEventListener('click', this.cancel.bind(this));
  },

  getStatus() {
    const id = this._elements.pullRequestId.value;
    if (!id || !id.length) {
      return;
    }
    ['getStatus', 'time'].forEach(name => {
      this._elements[name].classList.add('hidden');
    });
    ['cancel', 'content', 'spinner'].forEach(name => {
      this._elements[name].classList.remove('hidden');
    });
    this._elements.workers.disabled = true;

    this._elements.builds.textContent = "";
    this._builds = {};
    this._startTime = Date.now();

    this._client = new BuildbotClient(this._elements.workers.value);
    this._client.fetchBuilds(id,
                             this.onprogress.bind(this),
                             this.onbuild.bind(this),
                             this.ondone.bind(this));

    this._github = new GithubClient();
    this._github.fetchPullRequestInfo(id)
    .then(pullRequest => {
      if (!pullRequest) {
        /// XXX show pull request not found error.
        return this.cancel();
      }
      this._showPullRequest(pullRequest);
    }).catch(e => {
      console.error(e);
      // XXX show error feedback.
    });
  },

  cancel() {
    ['cancel',
     'content',
     'spinner',
     'notFound',
     'github',
     'progress'].forEach(name => {
      this._elements[name].classList.add('hidden');
    });
    this._elements.prState.classList.remove('state');
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

  _showPullRequest(pullRequest) {
    const { prState, prAuthor, prTitle, github } = this._elements;
    prState.textContent = pullRequest.state;
    prState.classList.add('state', pullRequest.state);
    prAuthor.textContent = pullRequest.author;
    prAuthor.href = pullRequest.authorUrl;
    prTitle.textContent = pullRequest.title;
    prTitle.href = pullRequest.url;
    github.classList.remove('hidden');
  },

  _showBuild(rev) {
    const builds = this._builds[rev];

    let buildEl = document.createElement('div');
    buildEl.classList.add('build');

    let title = document.createElement('div');
    title.classList.add('details');
    title.classList.add('title');
    title.textContent = rev;

    let startTime, endTime, inProg = false;

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
      a.target = '_blank';
      a.title = build.builder;
      const title = document.createTextNode(build.builder);
      a.appendChild(title);
      td.appendChild(a);

      if (build.inprogress) {
        td.classList.add('inprogress');
        inProg = true;
      } else if (build.success) {
        td.classList.add('success');
      } else {
        td.classList.add('error');
      }
      tr.appendChild(td);

      if (!startTime) {
        startTime = build.start * 1000;
      }

      if (!endTime || endTime < build.end * 1000) {
        endTime = build.end * 1000;
      }

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
    if (startTime) {
      let buildsStartTime = document.createElement('div');
      buildsStartTime.classList.add('timestamp');
      buildsStartTime.textContent = "First build started at: " + new Date(startTime).toString().slice(4, 24);
      buildEl.appendChild(buildsStartTime);
    }
    let buildsEndTime = document.createElement('div');
    buildsEndTime.classList.add('timestamp');
    if (!inProg) {
      buildsEndTime.textContent = "Last build ended at: " + new Date(endTime).toString().slice(4, 24);
    } else {
      buildsEndTime.textContent = "Builds in-progress";
    }
    buildEl.appendChild(buildsEndTime);
    buildEl.appendChild(details);

    this._elements.builds.appendChild(buildEl);

    if (this._elements.content.classList.contains('hidden')) {
      this._elements.content.classList.remove('hidden');
    }
  },

  onprogress(progress) {
    this._elements.progressBuild.textContent =
      `${progress.builder}/${progress.number}`;
    this._elements.progressTotal.textContent = `${progress.progress}`;
    if (this._elements.progress.classList.contains('hidden')) {
      this._elements.progress.classList.remove('hidden');;
    }
  },

  onbuild(build) {
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

    ['cancel', 'spinner', 'progress'].forEach(name => {
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

  _initWorkersSelect(select) {
    const firstOption = select.firstElementChild;
    firstOption.value = DEFAULT_WORKERS;
    firstOption.textContent =
      `Number of workers (defaults to ${DEFAULT_WORKERS})`;
    Array.from({ length: MAX_WORKERS }).forEach((_v, k) => {
      const number = k + 1;
      const option = document.createElement('option');
      option.value = number;
      option.text = number;
      select.appendChild(option);
    })
  }
};

export { UI };
