(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/**
 * @typedef BuildData
 * @property {number} id - The build unique identifier.
 * @property {string} builder - The owner of the build.
 * @property {string} revision = The build revision hash.
 * @property {bool} success - Whether the build succeeded or not.
 * @property {bool} inprogress - Whether the build is still in progress or not.
 * @property {number} start - The build's start timestamp.
 * @property {number} end - The build's end timestamp.
 */

/**
 * Represents a build from http://build.servo.org/
 */
var Build = function () {
  /**
   * Creates a Build.
   *
   * @param {BuildData}
   */
  function Build(data) {
    _classCallCheck(this, Build);

    this._id = data.id;
    this._builder = data.builder;
    this._revision = data.revision;
    this._success = data.success;
    this._inprogress = data.inprogress;
    this._start = data.start;
    this._end = data.end;
  }

  _createClass(Build, [{
    key: "id",
    get: function get() {
      return this._id;
    }
  }, {
    key: "builder",
    get: function get() {
      return this._builder;
    }
  }, {
    key: "revision",
    get: function get() {
      return this._revision;
    }
  }, {
    key: "success",
    get: function get() {
      return this._success;
    }
  }, {
    key: "inprogress",
    get: function get() {
      return this._inprogress;
    }
  }, {
    key: "start",
    get: function get() {
      return this._start;
    }
  }, {
    key: "end",
    get: function get() {
      return this._end;
    }
  }]);

  return Build;
}();

exports.default = Build;

},{}],2:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.BuildbotClient = undefined;

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _config = require('./config.js');

var _build2 = require('./build.js');

var _build3 = _interopRequireDefault(_build2);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var AUTOMERGE = 'Auto merge of #';
var CACHED = 'cachedBuilds';
var CURRENT = 'currentBuilds';
var SUCCESS = 'successful';

/**
 * Servo's Buildbot JSON API client.
 * Reference: http://build.servo.org/json/help
 */

var BuildbotClient = exports.BuildbotClient = function () {
  /**
   * Initializes the client with the API endpoint URL and the number of workers
   * the user wants to use.
   *
   * @param {number} workers Number of desired worker threads.
   */
  function BuildbotClient(workers) {
    _classCallCheck(this, BuildbotClient);

    this._api = _config.BUILDBOT_API_URL;
    this._onprogress = this.onprogress.bind(this);
    this._maxWorkers = workers && workers <= _config.MAX_WORKERS ? workers : _config.DEFAULT_WORKERS;
    this._fetchedBuilds = 0;
  }

  /**
   * Get the list of builds associated with a specific pull request.
   *
   * @param {string} pullRequestId Unique identifier of a Servo pull request.
   * @param {Function} onprogressCb Function called every time the client
   *                                fetches and checks a build.
   * @param {Function} onbuildCb Function called every time the client fetches
   *                             a build associated with the pull request number given by the user.
   * @param {Function} ondoneCb Function called once the client is done
   *                            fetching builds.
   * @return {Promise<>} A promise resolving with the list of builds associated with the given pull request ID.
   * @throws {Promise<>} The promise could reject with an error if something goes wrong fetching the builds.
   */


  _createClass(BuildbotClient, [{
    key: 'fetchBuilds',
    value: function fetchBuilds(pullRequestId, onprogressCb, onbuildCb, ondoneCb) {
      var _this = this;

      this._pullRequestId = pullRequestId;
      this._onprogressCb = onprogressCb;
      this._onbuildCb = onbuildCb;
      this._ondoneCb = ondoneCb;
      // Create a pool of worker threads. Each build request will be passed to the
      // pool which it will queue and pass to the next idle worker thread.
      this._pool = new thread.Pool(this._maxWorkers);
      // For each build we check if it belongs to the pull request corresponding
      // to the given ID. And, in that case, we store the build for later return
      // and display.
      return this._fetchBuilders().then(function (builders) {
        _this._numberOfBuilds = 0;
        Object.keys(builders).map(function (builder) {
          var builds = builders[builder].cachedBuilds.length;
          if (builds) {
            _this._numberOfBuilds += builds;
          }
        });
        // FIXME (ferjm): check that we really want to fetch from all the builders.
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
          navigator.serviceWorker.controller.postMessage('current');
        }
        _this._pool.run(_this._fetchBuildRunnable);
        return _this._fetchBuilds(builders, CURRENT);
      }).then(function (_ref) {
        var builders = _ref.builders;

        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
          navigator.serviceWorker.controller.postMessage('cached');
        }
        // For each builder we get the list of current and cached builds.
        // We start with the current builds, so we can display their progress
        // as soon as possible.
        return _this._fetchBuilds(builders, CACHED);
      }).then(function (_ref2) {
        var builders = _ref2.builders;

        console.log("Done");
        if (_this._ondoneCb) {
          _this._ondoneCb();
        }
        _this._cleanup();
      }).catch(function (error) {
        console.error(error);
        if (_this._ondoneCb) {
          _this._ondoneCb(error);
        }
        _this._cleanup();
      });
    }
  }, {
    key: '_cleanup',
    value: function _cleanup() {
      this._onprogressCb = null;
      this._onbuildCb = null;
      this._ondoneCb = null;
      this._pullRequestId = null;
      if (!this._pool) {
        return;
      }
      this._pool.killAll();
    }
  }, {
    key: 'cancel',
    value: function cancel() {
      this._cleanup();
    }
  }, {
    key: 'onprogress',
    value: function onprogress(build) {
      this._fetchedBuilds++;
      this._onprogressCb({
        builder: build.builderName,
        number: build.number,
        progress: parseInt(this._fetchedBuilds / this._numberOfBuilds * 100)
      });
      // For each build fetched from the server we get a progress
      // event with the details of that build.
      var changes = build.sourceStamps[0].changes;
      if (!changes || !Array.isArray(changes) || !changes.length) {
        return;
      }
      var pattern = '' + AUTOMERGE + this._pullRequestId;
      if (changes[0].comments.indexOf(pattern) === -1) {
        return;
      }
      var _build = new _build3.default({
        id: build.number,
        builder: build.builderName,
        revision: build.properties[8][1],
        success: build.text[1] == SUCCESS,
        inprogress: build.inprogress,
        start: build.times[0],
        end: build.times[1]
      });
      if (this._onbuildCb) {
        this._onbuildCb(_build);
      }
    }
  }, {
    key: '_fetchBuilders',
    value: function _fetchBuilders() {
      return fetch(this._api + 'builders').then(function (res) {
        return res.json();
      }).then(function (json) {
        return json;
      });
    }
  }, {
    key: '_fetchBuilds',
    value: function _fetchBuilds(builders, type) {
      var _this2 = this;

      return Promise.all(Object.keys(builders).map(function (name) {
        var builder = builders[name];
        var basePath = _this2._api + 'builders/' + builder.basedir + '/builds/';
        return Promise.all(builder[type].map(function (id) {
          var path = '' + basePath + id;
          var inprogress = type == CURRENT;
          return _this2._pool.send({ path: path, inprogress: inprogress }).on('progress', _this2._onprogress).promise();
        }));
      })).then(function () {
        return { builders: builders };
      });
    }
  }, {
    key: '_fetchBuildRunnable',
    value: function _fetchBuildRunnable(data, done, progress) {
      return fetch(data.path, { mode: 'cors' }).then(function (res) {
        return res.json();
      }).then(function (json) {
        json.inprogress = data.inprogress;
        progress(json);
      });
    }
  }]);

  return BuildbotClient;
}();

},{"./build.js":1,"./config.js":3}],3:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
var BUILDBOT_API_URL = exports.BUILDBOT_API_URL = 'https://build.servo.org/json/';
var DEFAULT_WORKERS = exports.DEFAULT_WORKERS = 4;
var GITHUB_API_URL = exports.GITHUB_API_URL = 'https://api.github.com/repos/servo/servo/';
var MAX_WORKERS = exports.MAX_WORKERS = 16;

},{}],4:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.GithubClient = undefined;

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _config = require('./config.js');

var _pullrequest = require('./pullrequest.js');

var _pullrequest2 = _interopRequireDefault(_pullrequest);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/**
 * Partial Github REST API client.
 * Reference: https://developer.github.com/v3
 */
var GithubClient = exports.GithubClient = function () {
  /**
   * Initializes the client with the API endpoint URL.
   */
  function GithubClient() {
    _classCallCheck(this, GithubClient);

    this._apiUrl = _config.GITHUB_API_URL;
  }

  /**
   * Get information about a pull request matching a given id.
   *
   * @param {string} id Pull request identifier.
   * @return {Promise} A promise resolving with the pull request details.
   */


  _createClass(GithubClient, [{
    key: 'fetchPullRequestInfo',
    value: function fetchPullRequestInfo(id) {
      return fetch(this._apiUrl + 'pulls/' + id, { mode: 'cors' }).then(function (response) {
        if (response.status == 200) {
          return response.json();
        }
      }).then(function (json) {
        if (!json) {
          return;
        }
        return new _pullrequest2.default({
          id: json.id,
          author: json.user.login,
          authorUrl: json.user.html_url,
          title: json.title,
          url: json._links.html.href,
          state: json.merged ? 'merged' : json.state
        });
      });;
    }
  }]);

  return GithubClient;
}();

},{"./config.js":3,"./pullrequest.js":6}],5:[function(require,module,exports){
'use strict';

var _ui = require('./ui.js');

var Main = {
  init: function init() {
    _ui.UI.init();
  }
};

window.onload = Main.init;

},{"./ui.js":7}],6:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/**
 * @typedef PullRequestData
 * @property {number} id
 * @property {string} author
 * @property {string} authorUrl
 * @property {string} title
 * @property {string} url
 * @property {string} state
 */

/**
 * Represents a pull request from https://github.com/servo/servo
 */
var PullRequest = function () {
  /**
   * Creates a PullRequest. Its representation, not the real thing.
   *
   * @param {PullRequestData}
   */
  function PullRequest(data) {
    _classCallCheck(this, PullRequest);

    this._id = data.id;
    this._author = data.author;
    this._authorUrl = data.authorUrl;
    this._title = data.title;
    this._url = data.url;
    this._state = data.state;
  }

  _createClass(PullRequest, [{
    key: "id",
    get: function get() {
      return this._id;
    }
  }, {
    key: "author",
    get: function get() {
      return this._author;
    }
  }, {
    key: "authorUrl",
    get: function get() {
      return this._authorUrl;
    }
  }, {
    key: "title",
    get: function get() {
      return this._title;
    }
  }, {
    key: "url",
    get: function get() {
      return this._url;
    }
  }, {
    key: "state",
    get: function get() {
      return this._state;
    }
  }]);

  return PullRequest;
}();

exports.default = PullRequest;

},{}],7:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.UI = undefined;

var _buildbot_client = require('./buildbot_client.js');

var _github = require('./github.js');

var _config = require('./config');

var BUILD_BASE_PATH = 'http://build.servo.org/builders/';

var UI = {
  init: function init() {
    var _this = this;

    this._elements = {};
    ['workers', 'pull-request-id', 'get-status', 'cancel', 'spinner', 'content', 'not-found', 'time', 'seconds', 'builds', 'github', 'pr-state', 'pr-author', 'pr-title', 'progress', 'progress-build', 'progress-total'].forEach(function (id) {
      var name = id.replace(/-(.)/g, function (str, p1) {
        return p1.toUpperCase();
      });
      _this._elements[name] = document.getElementById(id);
    });

    this._initWorkersSelect(this._elements.workers);

    this._elements.getStatus.addEventListener('click', this.getStatus.bind(this));
    this._elements.cancel.addEventListener('click', this.cancel.bind(this));
  },
  getStatus: function getStatus() {
    var _this2 = this;

    var id = this._elements.pullRequestId.value;
    if (!id || !id.length) {
      // XXX error feedback. Paint input in red.
      return;
    }
    ['getStatus', 'time'].forEach(function (name) {
      _this2._elements[name].classList.add('hidden');
    });
    ['cancel', 'content', 'spinner'].forEach(function (name) {
      _this2._elements[name].classList.remove('hidden');
    });
    this._elements.workers.disabled = true;

    this._elements.builds.textContent = "";
    this._builds = {};
    this._startTime = Date.now();

    this._client = new _buildbot_client.BuildbotClient(this._elements.workers.value);
    this._client.fetchBuilds(id, this.onprogress.bind(this), this.onbuild.bind(this), this.ondone.bind(this));

    this._github = new _github.GithubClient();
    this._github.fetchPullRequestInfo(id).then(function (pullRequest) {
      if (!pullRequest) {
        /// XXX show pull request not found error.
        return _this2.cancel();
      }
      _this2._showPullRequest(pullRequest);
    }).catch(function (e) {
      console.error(e);
      // XXX show error feedback.
    });
  },
  cancel: function cancel() {
    var _this3 = this;

    ['cancel', 'content', 'spinner', 'notFound', 'github', 'progress'].forEach(function (name) {
      _this3._elements[name].classList.add('hidden');
    });
    this._elements.prState.classList.remove('state');
    this._elements.getStatus.classList.remove('hidden');
    this._elements.workers.disabled = undefined;

    this._client.cancel();

    this._cleanup();
  },
  _cleanup: function _cleanup() {
    this._builds = null;
    this._startTime = null;
    this._client = null;
  },
  _showPullRequest: function _showPullRequest(pullRequest) {
    var _elements = this._elements,
        prState = _elements.prState,
        prAuthor = _elements.prAuthor,
        prTitle = _elements.prTitle,
        github = _elements.github;

    prState.textContent = pullRequest.state;
    prState.classList.add('state', pullRequest.state);
    prAuthor.textContent = pullRequest.author;
    prAuthor.href = pullRequest.authorUrl;
    prTitle.textContent = pullRequest.title;
    prTitle.href = pullRequest.url;
    github.classList.remove('hidden');
  },
  _showBuild: function _showBuild(rev) {
    var builds = this._builds[rev];

    var buildEl = document.createElement('div');
    buildEl.classList.add('build');

    var title = document.createElement('div');
    title.classList.add('details');
    title.classList.add('title');
    title.textContent = rev;

    var startTime = void 0,
        endTime = void 0,
        inProg = false;

    var table = document.createElement('table');
    var tr = document.createElement('tr');
    var details = document.createElement('div');
    details.classList.add('details');
    details.classList.add('hidden');
    Object.keys(builds).forEach(function (key) {
      var build = builds[key];
      var td = document.createElement('td');
      var label = build.builder;
      var a = document.createElement('a');
      a.href = '' + BUILD_BASE_PATH + build.builder + '/builds/' + build.id;
      a.target = '_blank';
      a.title = build.builder;
      var title = document.createTextNode(build.builder);
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

    var expand = document.createElement('div');
    expand.classList.add('expand');
    expand.classList.add('more');
    expand.addEventListener('click', function () {
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
      var buildsStartTime = document.createElement('div');
      buildsStartTime.classList.add('timestamp');
      buildsStartTime.textContent = "First build started at: " + new Date(startTime).toString().slice(4, 24);
      buildEl.appendChild(buildsStartTime);
    }
    var buildsEndTime = document.createElement('div');
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
  onprogress: function onprogress(progress) {
    this._elements.progressBuild.textContent = progress.builder + '/' + progress.number;
    this._elements.progressTotal.textContent = '' + progress.progress;
    if (this._elements.progress.classList.contains('hidden')) {
      this._elements.progress.classList.remove('hidden');;
    }
  },
  onbuild: function onbuild(build) {
    var rev = build.revision;
    if (!rev) {
      console.warn("Invalid build", build);
    }

    if (!this._builds[rev]) {
      this._builds[rev] = [];
    }
    this._builds[rev].push(build);
  },
  ondone: function ondone(error) {
    var _this4 = this;

    // XXX handle error.

    this._elements.seconds.textContent = (Date.now() - this._startTime) / 1000;

    ['cancel', 'spinner', 'progress'].forEach(function (name) {
      _this4._elements[name].classList.add('hidden');
    });
    ['getStatus', 'time'].forEach(function (name) {
      _this4._elements[name].classList.remove('hidden');
    });
    this._elements.workers.disabled = undefined;

    if (!Object.keys(this._builds).length) {
      this._elements.spinner.classList.add('hidden');
      this._elements.notFound.classList.remove('hidden');
    } else {
      Object.keys(this._builds).forEach(function (build) {
        _this4._showBuild(build);
      });
    }

    this._cleanup();
  },
  _initWorkersSelect: function _initWorkersSelect(select) {
    var firstOption = select.firstElementChild;
    firstOption.value = _config.DEFAULT_WORKERS;
    firstOption.textContent = 'Number of workers (defaults to ' + _config.DEFAULT_WORKERS + ')';
    Array.from({ length: _config.MAX_WORKERS }).forEach(function (_v, k) {
      var number = k + 1;
      var option = document.createElement('option');
      option.value = number;
      option.text = number;
      select.appendChild(option);
    });
  }
};

exports.UI = UI;

},{"./buildbot_client.js":2,"./config":3,"./github.js":4}]},{},[1,2,3,4,5,6,7])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJhcHAvc2NyaXB0cy9idWlsZC5qcyIsImFwcC9zY3JpcHRzL2J1aWxkYm90X2NsaWVudC5qcyIsImFwcC9zY3JpcHRzL2NvbmZpZy5qcyIsImFwcC9zY3JpcHRzL2dpdGh1Yi5qcyIsImFwcC9zY3JpcHRzL21haW4uanMiLCJhcHAvc2NyaXB0cy9wdWxscmVxdWVzdC5qcyIsImFwcC9zY3JpcHRzL3VpLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7Ozs7OztBQ0FBOzs7Ozs7Ozs7OztBQVdBOzs7SUFHTSxLO0FBQ0o7Ozs7O0FBS0EsaUJBQVksSUFBWixFQUFrQjtBQUFBOztBQUNoQixTQUFLLEdBQUwsR0FBVyxLQUFLLEVBQWhCO0FBQ0EsU0FBSyxRQUFMLEdBQWdCLEtBQUssT0FBckI7QUFDQSxTQUFLLFNBQUwsR0FBaUIsS0FBSyxRQUF0QjtBQUNBLFNBQUssUUFBTCxHQUFnQixLQUFLLE9BQXJCO0FBQ0EsU0FBSyxXQUFMLEdBQW1CLEtBQUssVUFBeEI7QUFDQSxTQUFLLE1BQUwsR0FBYyxLQUFLLEtBQW5CO0FBQ0EsU0FBSyxJQUFMLEdBQVksS0FBSyxHQUFqQjtBQUNEOzs7O3dCQUVRO0FBQ1AsYUFBTyxLQUFLLEdBQVo7QUFDRDs7O3dCQUVhO0FBQ1osYUFBTyxLQUFLLFFBQVo7QUFDRDs7O3dCQUVjO0FBQ2IsYUFBTyxLQUFLLFNBQVo7QUFDRDs7O3dCQUVhO0FBQ1osYUFBTyxLQUFLLFFBQVo7QUFDRDs7O3dCQUVnQjtBQUNmLGFBQU8sS0FBSyxXQUFaO0FBQ0Q7Ozt3QkFFVztBQUNWLGFBQU8sS0FBSyxNQUFaO0FBQ0Q7Ozt3QkFFUztBQUNSLGFBQU8sS0FBSyxJQUFaO0FBQ0Q7Ozs7OztrQkFHWSxLOzs7Ozs7Ozs7Ozs7QUMzRGY7O0FBQ0E7Ozs7Ozs7O0FBRUEsSUFBTSxZQUFZLGlCQUFsQjtBQUNBLElBQU0sU0FBUyxjQUFmO0FBQ0EsSUFBTSxV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LGFBQVQsQ0FBdUIsUUFBdkIsQ0FBZjtBQUNBLGFBQU8sS0FBUCxHQUFlLE1BQWY7QUFDQSxhQUFPLElBQVAsR0FBYyxNQUFkO0FBQ0EsYUFBTyxXQUFQLENBQW1CLE1BQW5CO0FBQ0QsS0FORDtBQU9EO0FBL1BRLENBQVg7O1FBa1FTLEUsR0FBQSxFIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIi8qKlxuICogQHR5cGVkZWYgQnVpbGREYXRhXG4gKiBAcHJvcGVydHkge251bWJlcn0gaWQgLSBUaGUgYnVpbGQgdW5pcXVlIGlkZW50aWZpZXIuXG4gKiBAcHJvcGVydHkge3N0cmluZ30gYnVpbGRlciAtIFRoZSBvd25lciBvZiB0aGUgYnVpbGQuXG4gKiBAcHJvcGVydHkge3N0cmluZ30gcmV2aXNpb24gPSBUaGUgYnVpbGQgcmV2aXNpb24gaGFzaC5cbiAqIEBwcm9wZXJ0eSB7Ym9vbH0gc3VjY2VzcyAtIFdoZXRoZXIgdGhlIGJ1aWxkIHN1Y2NlZWRlZCBvciBub3QuXG4gKiBAcHJvcGVydHkge2Jvb2x9IGlucHJvZ3Jlc3MgLSBXaGV0aGVyIHRoZSBidWlsZCBpcyBzdGlsbCBpbiBwcm9ncmVzcyBvciBub3QuXG4gKiBAcHJvcGVydHkge251bWJlcn0gc3RhcnQgLSBUaGUgYnVpbGQncyBzdGFydCB0aW1lc3RhbXAuXG4gKiBAcHJvcGVydHkge251bWJlcn0gZW5kIC0gVGhlIGJ1aWxkJ3MgZW5kIHRpbWVzdGFtcC5cbiAqL1xuXG4vKipcbiAqIFJlcHJlc2VudHMgYSBidWlsZCBmcm9tIGh0dHA6Ly9idWlsZC5zZXJ2by5vcmcvXG4gKi9cbmNsYXNzIEJ1aWxkIHtcbiAgLyoqXG4gICAqIENyZWF0ZXMgYSBCdWlsZC5cbiAgICpcbiAgICogQHBhcmFtIHtCdWlsZERhdGF9XG4gICAqL1xuICBjb25zdHJ1Y3RvcihkYXRhKSB7XG4gICAgdGhpcy5faWQgPSBkYXRhLmlkO1xuICAgIHRoaXMuX2J1aWxkZXIgPSBkYXRhLmJ1aWxkZXI7XG4gICAgdGhpcy5fcmV2aXNpb24gPSBkYXRhLnJldmlzaW9uO1xuICAgIHRoaXMuX3N1Y2Nlc3MgPSBkYXRhLnN1Y2Nlc3M7XG4gICAgdGhpcy5faW5wcm9ncmVzcyA9IGRhdGEuaW5wcm9ncmVzcztcbiAgICB0aGlzLl9zdGFydCA9IGRhdGEuc3RhcnQ7XG4gICAgdGhpcy5fZW5kID0gZGF0YS5lbmQ7XG4gIH1cblxuICBnZXQgaWQoKSB7XG4gICAgcmV0dXJuIHRoaXMuX2lkO1xuICB9XG5cbiAgZ2V0IGJ1aWxkZXIoKSB7XG4gICAgcmV0dXJuIHRoaXMuX2J1aWxkZXI7XG4gIH1cblxuICBnZXQgcmV2aXNpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMuX3JldmlzaW9uO1xuICB9XG5cbiAgZ2V0IHN1Y2Nlc3MoKSB7XG4gICAgcmV0dXJuIHRoaXMuX3N1Y2Nlc3M7XG4gIH1cblxuICBnZXQgaW5wcm9ncmVzcygpIHtcbiAgICByZXR1cm4gdGhpcy5faW5wcm9ncmVzcztcbiAgfVxuXG4gIGdldCBzdGFydCgpIHtcbiAgICByZXR1cm4gdGhpcy5fc3RhcnQ7XG4gIH1cblxuICBnZXQgZW5kKCkge1xuICAgIHJldHVybiB0aGlzLl9lbmQ7XG4gIH1cbn1cblxuZXhwb3J0IGRlZmF1bHQgQnVpbGQ7XG4iLCJpbXBvcnQgeyBCVUlMREJPVF9BUElfVVJMLCBERUZBVUxUX1dPUktFUlMsIE1BWF9XT1JLRVJTIH0gZnJvbSAnLi9jb25maWcuanMnO1xuaW1wb3J0IEJ1aWxkIGZyb20gJy4vYnVpbGQuanMnO1xuXG5jb25zdCBBVVRPTUVSR0UgPSAnQXV0byBtZXJnZSBvZiAjJztcbmNvbnN0IENBQ0hFRCA9ICdjYWNoZWRCdWlsZHMnO1xuY29uc3QgQ1VSUkVOVCA9ICdjdXJyZW50QnVpbGRzJztcbmNvbnN0IFNVQ0NFU1MgPSAnc3VjY2Vzc2Z1bCc7XG5cbi8qKlxuICogU2Vydm8ncyBCdWlsZGJvdCBKU09OIEFQSSBjbGllbnQuXG4gKiBSZWZlcmVuY2U6IGh0dHA6Ly9idWlsZC5zZXJ2by5vcmcvanNvbi9oZWxwXG4gKi9cbmV4cG9ydCBjbGFzcyBCdWlsZGJvdENsaWVudCB7XG4gIC8qKlxuICAgKiBJbml0aWFsaXplcyB0aGUgY2xpZW50IHdpdGggdGhlIEFQSSBlbmRwb2ludCBVUkwgYW5kIHRoZSBudW1iZXIgb2Ygd29ya2Vyc1xuICAgKiB0aGUgdXNlciB3YW50cyB0byB1c2UuXG4gICAqXG4gICAqIEBwYXJhbSB7bnVtYmVyfSB3b3JrZXJzIE51bWJlciBvZiBkZXNpcmVkIHdvcmtlciB0aHJlYWRzLlxuICAgKi9cbiAgY29uc3RydWN0b3Iod29ya2Vycykge1xuICAgIHRoaXMuX2FwaSA9IEJVSUxEQk9UX0FQSV9VUkw7XG4gICAgdGhpcy5fb25wcm9ncmVzcyA9IHRoaXMub25wcm9ncmVzcy5iaW5kKHRoaXMpO1xuICAgIHRoaXMuX21heFdvcmtlcnMgPSB3b3JrZXJzICYmIHdvcmtlcnMgPD0gTUFYX1dPUktFUlMgPyB3b3JrZXJzXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA6IERFRkFVTFRfV09SS0VSUztcbiAgICB0aGlzLl9mZXRjaGVkQnVpbGRzID0gMDtcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXQgdGhlIGxpc3Qgb2YgYnVpbGRzIGFzc29jaWF0ZWQgd2l0aCBhIHNwZWNpZmljIHB1bGwgcmVxdWVzdC5cbiAgICpcbiAgICogQHBhcmFtIHtzdHJpbmd9IHB1bGxSZXF1ZXN0SWQgVW5pcXVlIGlkZW50aWZpZXIgb2YgYSBTZXJ2byBwdWxsIHJlcXVlc3QuXG4gICAqIEBwYXJhbSB7RnVuY3Rpb259IG9ucHJvZ3Jlc3NDYiBGdW5jdGlvbiBjYWxsZWQgZXZlcnkgdGltZSB0aGUgY2xpZW50XG4gICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmZXRjaGVzIGFuZCBjaGVja3MgYSBidWlsZC5cbiAgICogQHBhcmFtIHtGdW5jdGlvbn0gb25idWlsZENiIEZ1bmN0aW9uIGNhbGxlZCBldmVyeSB0aW1lIHRoZSBjbGllbnQgZmV0Y2hlc1xuICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYSBidWlsZCBhc3NvY2lhdGVkIHdpdGggdGhlIHB1bGwgcmVxdWVzdCBudW1iZXIgZ2l2ZW4gYnkgdGhlIHVzZXIuXG4gICAqIEBwYXJhbSB7RnVuY3Rpb259IG9uZG9uZUNiIEZ1bmN0aW9uIGNhbGxlZCBvbmNlIHRoZSBjbGllbnQgaXMgZG9uZVxuICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICBmZXRjaGluZyBidWlsZHMuXG4gICAqIEByZXR1cm4ge1Byb21pc2U8Pn0gQSBwcm9taXNlIHJlc29sdmluZyB3aXRoIHRoZSBsaXN0IG9mIGJ1aWxkcyBhc3NvY2lhdGVkIHdpdGggdGhlIGdpdmVuIHB1bGwgcmVxdWVzdCBJRC5cbiAgICogQHRocm93cyB7UHJvbWlzZTw+fSBUaGUgcHJvbWlzZSBjb3VsZCByZWplY3Qgd2l0aCBhbiBlcnJvciBpZiBzb21ldGhpbmcgZ29lcyB3cm9uZyBmZXRjaGluZyB0aGUgYnVpbGRzLlxuICAgKi9cbiAgZmV0Y2hCdWlsZHMocHVsbFJlcXVlc3RJZCwgb25wcm9ncmVzc0NiLCBvbmJ1aWxkQ2IsIG9uZG9uZUNiKSB7XG4gICAgdGhpcy5fcHVsbFJlcXVlc3RJZCA9IHB1bGxSZXF1ZXN0SWQ7XG4gICAgdGhpcy5fb25wcm9ncmVzc0NiID0gb25wcm9ncmVzc0NiO1xuICAgIHRoaXMuX29uYnVpbGRDYiA9IG9uYnVpbGRDYjtcbiAgICB0aGlzLl9vbmRvbmVDYiA9IG9uZG9uZUNiO1xuICAgIC8vIENyZWF0ZSBhIHBvb2wgb2Ygd29ya2VyIHRocmVhZHMuIEVhY2ggYnVpbGQgcmVxdWVzdCB3aWxsIGJlIHBhc3NlZCB0byB0aGVcbiAgICAvLyBwb29sIHdoaWNoIGl0IHdpbGwgcXVldWUgYW5kIHBhc3MgdG8gdGhlIG5leHQgaWRsZSB3b3JrZXIgdGhyZWFkLlxuICAgIHRoaXMuX3Bvb2wgPSBuZXcgdGhyZWFkLlBvb2wodGhpcy5fbWF4V29ya2Vycyk7XG4gICAgLy8gRm9yIGVhY2ggYnVpbGQgd2UgY2hlY2sgaWYgaXQgYmVsb25ncyB0byB0aGUgcHVsbCByZXF1ZXN0IGNvcnJlc3BvbmRpbmdcbiAgICAvLyB0byB0aGUgZ2l2ZW4gSUQuIEFuZCwgaW4gdGhhdCBjYXNlLCB3ZSBzdG9yZSB0aGUgYnVpbGQgZm9yIGxhdGVyIHJldHVyblxuICAgIC8vIGFuZCBkaXNwbGF5LlxuICAgIHJldHVybiB0aGlzLl9mZXRjaEJ1aWxkZXJzKClcbiAgICAudGhlbihidWlsZGVycyA9PiB7XG4gICAgICB0aGlzLl9udW1iZXJPZkJ1aWxkcyA9IDA7XG4gICAgICBPYmplY3Qua2V5cyhidWlsZGVycykubWFwKGJ1aWxkZXIgPT4ge1xuICAgICAgICBjb25zdCBidWlsZHMgPSBidWlsZGVyc1tidWlsZGVyXS5jYWNoZWRCdWlsZHMubGVuZ3RoO1xuICAgICAgICBpZiAoYnVpbGRzKSB7XG4gICAgICAgICAgdGhpcy5fbnVtYmVyT2ZCdWlsZHMgKz0gYnVpbGRzO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICAgIC8vIEZJWE1FIChmZXJqbSk6IGNoZWNrIHRoYXQgd2UgcmVhbGx5IHdhbnQgdG8gZmV0Y2ggZnJvbSBhbGwgdGhlIGJ1aWxkZXJzLlxuICAgICAgaWYgKCdzZXJ2aWNlV29ya2VyJyBpbiBuYXZpZ2F0b3IgJiYgbmF2aWdhdG9yLnNlcnZpY2VXb3JrZXIuY29udHJvbGxlcikge1xuICAgICAgICBuYXZpZ2F0b3Iuc2VydmljZVdvcmtlci5jb250cm9sbGVyLnBvc3RNZXNzYWdlKCdjdXJyZW50Jyk7XG4gICAgICB9XG4gICAgICB0aGlzLl9wb29sLnJ1bih0aGlzLl9mZXRjaEJ1aWxkUnVubmFibGUpO1xuICAgICAgcmV0dXJuIHRoaXMuX2ZldGNoQnVpbGRzKGJ1aWxkZXJzLCBDVVJSRU5UKTtcbiAgICB9KVxuICAgIC50aGVuKCh7YnVpbGRlcnN9KSA9PiB7XG4gICAgICBpZiAoJ3NlcnZpY2VXb3JrZXInIGluIG5hdmlnYXRvciAmJiBuYXZpZ2F0b3Iuc2VydmljZVdvcmtlci5jb250cm9sbGVyKSB7XG4gICAgICAgIG5hdmlnYXRvci5zZXJ2aWNlV29ya2VyLmNvbnRyb2xsZXIucG9zdE1lc3NhZ2UoJ2NhY2hlZCcpO1xuICAgICAgfVxuICAgICAgLy8gRm9yIGVhY2ggYnVpbGRlciB3ZSBnZXQgdGhlIGxpc3Qgb2YgY3VycmVudCBhbmQgY2FjaGVkIGJ1aWxkcy5cbiAgICAgIC8vIFdlIHN0YXJ0IHdpdGggdGhlIGN1cnJlbnQgYnVpbGRzLCBzbyB3ZSBjYW4gZGlzcGxheSB0aGVpciBwcm9ncmVzc1xuICAgICAgLy8gYXMgc29vbiBhcyBwb3NzaWJsZS5cbiAgICAgIHJldHVybiB0aGlzLl9mZXRjaEJ1aWxkcyhidWlsZGVycywgQ0FDSEVEKTtcbiAgICB9KVxuICAgIC50aGVuKCh7YnVpbGRlcnN9KSA9PiB7XG4gICAgICBjb25zb2xlLmxvZyhcIkRvbmVcIik7XG4gICAgICBpZiAodGhpcy5fb25kb25lQ2IpIHtcbiAgICAgICAgdGhpcy5fb25kb25lQ2IoKTtcbiAgICAgIH1cbiAgICAgIHRoaXMuX2NsZWFudXAoKTtcbiAgICB9KVxuICAgIC5jYXRjaChlcnJvciA9PiB7XG4gICAgICBjb25zb2xlLmVycm9yKGVycm9yKTtcbiAgICAgIGlmICh0aGlzLl9vbmRvbmVDYikge1xuICAgICAgICB0aGlzLl9vbmRvbmVDYihlcnJvcik7XG4gICAgICB9XG4gICAgICB0aGlzLl9jbGVhbnVwKCk7XG4gICAgfSk7XG4gIH1cblxuICBfY2xlYW51cCgpIHtcbiAgICB0aGlzLl9vbnByb2dyZXNzQ2IgPSBudWxsO1xuICAgIHRoaXMuX29uYnVpbGRDYiA9IG51bGw7XG4gICAgdGhpcy5fb25kb25lQ2IgPSBudWxsO1xuICAgIHRoaXMuX3B1bGxSZXF1ZXN0SWQgPSBudWxsO1xuICAgIGlmICghdGhpcy5fcG9vbCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB0aGlzLl9wb29sLmtpbGxBbGwoKTtcbiAgfVxuXG4gIGNhbmNlbCgpIHtcbiAgICB0aGlzLl9jbGVhbnVwKCk7XG4gIH1cblxuICBvbnByb2dyZXNzKGJ1aWxkKSB7XG4gICAgdGhpcy5fZmV0Y2hlZEJ1aWxkcysrO1xuICAgIHRoaXMuX29ucHJvZ3Jlc3NDYih7XG4gICAgICBidWlsZGVyOiBidWlsZC5idWlsZGVyTmFtZSxcbiAgICAgIG51bWJlcjogYnVpbGQubnVtYmVyLFxuICAgICAgcHJvZ3Jlc3M6IHBhcnNlSW50KCh0aGlzLl9mZXRjaGVkQnVpbGRzIC8gdGhpcy5fbnVtYmVyT2ZCdWlsZHMpICogMTAwKVxuICAgIH0pO1xuICAgIC8vIEZvciBlYWNoIGJ1aWxkIGZldGNoZWQgZnJvbSB0aGUgc2VydmVyIHdlIGdldCBhIHByb2dyZXNzXG4gICAgLy8gZXZlbnQgd2l0aCB0aGUgZGV0YWlscyBvZiB0aGF0IGJ1aWxkLlxuICAgIGNvbnN0IGNoYW5nZXMgPSBidWlsZC5zb3VyY2VTdGFtcHNbMF0uY2hhbmdlcztcbiAgICBpZiAoIWNoYW5nZXMgfHwgIUFycmF5LmlzQXJyYXkoY2hhbmdlcykgfHwgIWNoYW5nZXMubGVuZ3RoKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGNvbnN0IHBhdHRlcm4gPSBgJHtBVVRPTUVSR0V9JHt0aGlzLl9wdWxsUmVxdWVzdElkfWA7XG4gICAgaWYgKGNoYW5nZXNbMF0uY29tbWVudHMuaW5kZXhPZihwYXR0ZXJuKSA9PT0gLTEpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgY29uc3QgX2J1aWxkID0gbmV3IEJ1aWxkKHtcbiAgICAgIGlkOiBidWlsZC5udW1iZXIsXG4gICAgICBidWlsZGVyOiBidWlsZC5idWlsZGVyTmFtZSxcbiAgICAgIHJldmlzaW9uOiBidWlsZC5wcm9wZXJ0aWVzWzhdWzFdLFxuICAgICAgc3VjY2VzczogYnVpbGQudGV4dFsxXSA9PSBTVUNDRVNTLFxuICAgICAgaW5wcm9ncmVzczogYnVpbGQuaW5wcm9ncmVzcyxcbiAgICAgIHN0YXJ0OiBidWlsZC50aW1lc1swXSxcbiAgICAgIGVuZDogYnVpbGQudGltZXNbMV1cbiAgICB9KTtcbiAgICBpZiAodGhpcy5fb25idWlsZENiKSB7XG4gICAgICB0aGlzLl9vbmJ1aWxkQ2IoX2J1aWxkKTtcbiAgICB9XG4gIH1cblxuICBfZmV0Y2hCdWlsZGVycygpIHtcbiAgICByZXR1cm4gZmV0Y2godGhpcy5fYXBpICsgJ2J1aWxkZXJzJylcbiAgICAudGhlbihyZXMgPT4ge1xuICAgICAgcmV0dXJuIHJlcy5qc29uKCk7XG4gICAgfSkudGhlbihqc29uID0+IHtcbiAgICAgIHJldHVybiBqc29uO1xuICAgIH0pO1xuICB9XG5cbiAgX2ZldGNoQnVpbGRzKGJ1aWxkZXJzLCB0eXBlKSB7XG4gICAgcmV0dXJuIFByb21pc2UuYWxsKE9iamVjdC5rZXlzKGJ1aWxkZXJzKS5tYXAobmFtZSA9PiB7XG4gICAgICBjb25zdCBidWlsZGVyID0gYnVpbGRlcnNbbmFtZV07XG4gICAgICBjb25zdCBiYXNlUGF0aCA9IGAke3RoaXMuX2FwaX1idWlsZGVycy8ke2J1aWxkZXIuYmFzZWRpcn0vYnVpbGRzL2A7XG4gICAgICByZXR1cm4gUHJvbWlzZS5hbGwoYnVpbGRlclt0eXBlXS5tYXAoaWQgPT4ge1xuICAgICAgICBjb25zdCBwYXRoID0gYCR7YmFzZVBhdGh9JHtpZH1gO1xuICAgICAgICBjb25zdCBpbnByb2dyZXNzID0gdHlwZSA9PSBDVVJSRU5UO1xuICAgICAgICByZXR1cm4gdGhpcy5fcG9vbC5zZW5kKHtwYXRoLCBpbnByb2dyZXNzfSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAub24oJ3Byb2dyZXNzJywgdGhpcy5fb25wcm9ncmVzcylcbiAgICAgICAgICAgICAgICAgICAgICAgICAucHJvbWlzZSgpO1xuICAgICAgfSkpO1xuICAgIH0pKS50aGVuKCgpID0+IHtcbiAgICAgIHJldHVybiB7IGJ1aWxkZXJzIH07XG4gICAgfSk7XG4gIH1cblxuICBfZmV0Y2hCdWlsZFJ1bm5hYmxlKGRhdGEsIGRvbmUsIHByb2dyZXNzKSB7XG4gICAgcmV0dXJuIGZldGNoKGRhdGEucGF0aCwgeyBtb2RlOiAnY29ycycgfSlcbiAgICAudGhlbihyZXMgPT4ge1xuICAgICAgcmV0dXJuIHJlcy5qc29uKCk7XG4gICAgfSkudGhlbihqc29uID0+IHtcbiAgICAgIGpzb24uaW5wcm9ncmVzcyA9IGRhdGEuaW5wcm9ncmVzcztcbiAgICAgIHByb2dyZXNzKGpzb24pO1xuICAgIH0pO1xuICB9XG59XG4iLCJleHBvcnQgY29uc3QgQlVJTERCT1RfQVBJX1VSTCA9ICdodHRwczovL2J1aWxkLnNlcnZvLm9yZy9qc29uLyc7XG5leHBvcnQgY29uc3QgREVGQVVMVF9XT1JLRVJTID0gNDtcbmV4cG9ydCBjb25zdCBHSVRIVUJfQVBJX1VSTCA9ICdodHRwczovL2FwaS5naXRodWIuY29tL3JlcG9zL3NlcnZvL3NlcnZvLyc7XG5leHBvcnQgY29uc3QgTUFYX1dPUktFUlMgPSAxNjtcbiIsImltcG9ydCB7IEdJVEhVQl9BUElfVVJMIH0gZnJvbSAnLi9jb25maWcuanMnO1xuaW1wb3J0IFB1bGxSZXF1ZXN0IGZyb20gJy4vcHVsbHJlcXVlc3QuanMnO1xuXG4vKipcbiAqIFBhcnRpYWwgR2l0aHViIFJFU1QgQVBJIGNsaWVudC5cbiAqIFJlZmVyZW5jZTogaHR0cHM6Ly9kZXZlbG9wZXIuZ2l0aHViLmNvbS92M1xuICovXG5leHBvcnQgY2xhc3MgR2l0aHViQ2xpZW50IHtcbiAgLyoqXG4gICAqIEluaXRpYWxpemVzIHRoZSBjbGllbnQgd2l0aCB0aGUgQVBJIGVuZHBvaW50IFVSTC5cbiAgICovXG4gIGNvbnN0cnVjdG9yKCkge1xuICAgIHRoaXMuX2FwaVVybCA9IEdJVEhVQl9BUElfVVJMO1xuICB9XG5cbiAgLyoqXG4gICAqIEdldCBpbmZvcm1hdGlvbiBhYm91dCBhIHB1bGwgcmVxdWVzdCBtYXRjaGluZyBhIGdpdmVuIGlkLlxuICAgKlxuICAgKiBAcGFyYW0ge3N0cmluZ30gaWQgUHVsbCByZXF1ZXN0IGlkZW50aWZpZXIuXG4gICAqIEByZXR1cm4ge1Byb21pc2V9IEEgcHJvbWlzZSByZXNvbHZpbmcgd2l0aCB0aGUgcHVsbCByZXF1ZXN0IGRldGFpbHMuXG4gICAqL1xuICBmZXRjaFB1bGxSZXF1ZXN0SW5mbyhpZCkge1xuICAgIHJldHVybiBmZXRjaChgJHt0aGlzLl9hcGlVcmx9cHVsbHMvJHtpZH1gLCB7IG1vZGU6ICdjb3JzJyB9KVxuICAgIC50aGVuKHJlc3BvbnNlID0+IHtcbiAgICAgIGlmIChyZXNwb25zZS5zdGF0dXMgPT0gMjAwKSB7XG4gICAgICAgIHJldHVybiByZXNwb25zZS5qc29uKCk7XG4gICAgICB9XG4gICAgfSkudGhlbihqc29uID0+IHtcbiAgICAgIGlmICghanNvbikge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICByZXR1cm4gbmV3IFB1bGxSZXF1ZXN0KHtcbiAgICAgICAgaWQ6IGpzb24uaWQsXG4gICAgICAgIGF1dGhvcjoganNvbi51c2VyLmxvZ2luLFxuICAgICAgICBhdXRob3JVcmw6IGpzb24udXNlci5odG1sX3VybCxcbiAgICAgICAgdGl0bGU6IGpzb24udGl0bGUsXG4gICAgICAgIHVybDoganNvbi5fbGlua3MuaHRtbC5ocmVmLFxuICAgICAgICBzdGF0ZToganNvbi5tZXJnZWQgPyAnbWVyZ2VkJyA6IGpzb24uc3RhdGVcbiAgICAgIH0pO1xuICAgIH0pOztcbiAgfVxufVxuIiwiaW1wb3J0IHsgVUkgfSBmcm9tICcuL3VpLmpzJztcblxuY29uc3QgTWFpbiA9IHtcbiAgaW5pdCgpIHtcbiAgICBVSS5pbml0KCk7XG4gIH1cbn07XG5cbndpbmRvdy5vbmxvYWQgPSBNYWluLmluaXQ7XG4iLCIvKipcbiAqIEB0eXBlZGVmIFB1bGxSZXF1ZXN0RGF0YVxuICogQHByb3BlcnR5IHtudW1iZXJ9IGlkXG4gKiBAcHJvcGVydHkge3N0cmluZ30gYXV0aG9yXG4gKiBAcHJvcGVydHkge3N0cmluZ30gYXV0aG9yVXJsXG4gKiBAcHJvcGVydHkge3N0cmluZ30gdGl0bGVcbiAqIEBwcm9wZXJ0eSB7c3RyaW5nfSB1cmxcbiAqIEBwcm9wZXJ0eSB7c3RyaW5nfSBzdGF0ZVxuICovXG5cbi8qKlxuICogUmVwcmVzZW50cyBhIHB1bGwgcmVxdWVzdCBmcm9tIGh0dHBzOi8vZ2l0aHViLmNvbS9zZXJ2by9zZXJ2b1xuICovXG5jbGFzcyBQdWxsUmVxdWVzdCB7XG4gIC8qKlxuICAgKiBDcmVhdGVzIGEgUHVsbFJlcXVlc3QuIEl0cyByZXByZXNlbnRhdGlvbiwgbm90IHRoZSByZWFsIHRoaW5nLlxuICAgKlxuICAgKiBAcGFyYW0ge1B1bGxSZXF1ZXN0RGF0YX1cbiAgICovXG4gIGNvbnN0cnVjdG9yKGRhdGEpIHtcbiAgICB0aGlzLl9pZCA9IGRhdGEuaWQ7XG4gICAgdGhpcy5fYXV0aG9yID0gZGF0YS5hdXRob3I7XG4gICAgdGhpcy5fYXV0aG9yVXJsID0gZGF0YS5hdXRob3JVcmw7XG4gICAgdGhpcy5fdGl0bGUgPSBkYXRhLnRpdGxlO1xuICAgIHRoaXMuX3VybCA9IGRhdGEudXJsO1xuICAgIHRoaXMuX3N0YXRlID0gZGF0YS5zdGF0ZTtcbiAgfVxuXG4gIGdldCBpZCgpIHtcbiAgICByZXR1cm4gdGhpcy5faWQ7XG4gIH1cblxuICBnZXQgYXV0aG9yKCkge1xuICAgIHJldHVybiB0aGlzLl9hdXRob3I7XG4gIH1cblxuICBnZXQgYXV0aG9yVXJsKCkge1xuICAgIHJldHVybiB0aGlzLl9hdXRob3JVcmw7XG4gIH1cblxuICBnZXQgdGl0bGUoKSB7XG4gICAgcmV0dXJuIHRoaXMuX3RpdGxlO1xuICB9XG5cbiAgZ2V0IHVybCgpIHtcbiAgICByZXR1cm4gdGhpcy5fdXJsO1xuICB9XG5cbiAgZ2V0IHN0YXRlKCkge1xuICAgIHJldHVybiB0aGlzLl9zdGF0ZTtcbiAgfVxufVxuXG5leHBvcnQgZGVmYXVsdCBQdWxsUmVxdWVzdDtcbiIsImltcG9ydCB7IEJ1aWxkYm90Q2xpZW50IH0gZnJvbSAnLi9idWlsZGJvdF9jbGllbnQuanMnO1xuaW1wb3J0IHsgR2l0aHViQ2xpZW50IH0gZnJvbSAnLi9naXRodWIuanMnO1xuaW1wb3J0IHsgREVGQVVMVF9XT1JLRVJTLCBNQVhfV09SS0VSUyB9IGZyb20gJy4vY29uZmlnJztcblxuY29uc3QgQlVJTERfQkFTRV9QQVRIID0gJ2h0dHA6Ly9idWlsZC5zZXJ2by5vcmcvYnVpbGRlcnMvJztcblxuY29uc3QgVUkgPSB7XG4gIGluaXQoKSB7XG4gICAgdGhpcy5fZWxlbWVudHMgPSB7fTtcbiAgICBbJ3dvcmtlcnMnLFxuICAgICAncHVsbC1yZXF1ZXN0LWlkJyxcbiAgICAgJ2dldC1zdGF0dXMnLFxuICAgICAnY2FuY2VsJyxcbiAgICAgJ3NwaW5uZXInLFxuICAgICAnY29udGVudCcsXG4gICAgICdub3QtZm91bmQnLFxuICAgICAndGltZScsXG4gICAgICdzZWNvbmRzJyxcbiAgICAgJ2J1aWxkcycsXG4gICAgICdnaXRodWInLFxuICAgICAncHItc3RhdGUnLFxuICAgICAncHItYXV0aG9yJyxcbiAgICAgJ3ByLXRpdGxlJyxcbiAgICAgJ3Byb2dyZXNzJyxcbiAgICAgJ3Byb2dyZXNzLWJ1aWxkJyxcbiAgICAgJ3Byb2dyZXNzLXRvdGFsJ10uZm9yRWFjaChpZCA9PiB7XG4gICAgICBjb25zdCBuYW1lID0gaWQucmVwbGFjZSgvLSguKS9nLCBmdW5jdGlvbihzdHIsIHAxKSB7XG4gICAgICAgIHJldHVybiBwMS50b1VwcGVyQ2FzZSgpO1xuICAgICAgfSk7XG4gICAgICB0aGlzLl9lbGVtZW50c1tuYW1lXSA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKGlkKTtcbiAgICB9KTtcblxuICAgIHRoaXMuX2luaXRXb3JrZXJzU2VsZWN0KHRoaXMuX2VsZW1lbnRzLndvcmtlcnMpO1xuXG4gICAgdGhpcy5fZWxlbWVudHMuZ2V0U3RhdHVzLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgdGhpcy5nZXRTdGF0dXMuYmluZCh0aGlzKSk7XG4gICAgdGhpcy5fZWxlbWVudHMuY2FuY2VsLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgdGhpcy5jYW5jZWwuYmluZCh0aGlzKSk7XG4gIH0sXG5cbiAgZ2V0U3RhdHVzKCkge1xuICAgIGNvbnN0IGlkID0gdGhpcy5fZWxlbWVudHMucHVsbFJlcXVlc3RJZC52YWx1ZTtcbiAgICBpZiAoIWlkIHx8ICFpZC5sZW5ndGgpIHtcbiAgICAgIC8vIFhYWCBlcnJvciBmZWVkYmFjay4gUGFpbnQgaW5wdXQgaW4gcmVkLlxuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBbJ2dldFN0YXR1cycsICd0aW1lJ10uZm9yRWFjaChuYW1lID0+IHtcbiAgICAgIHRoaXMuX2VsZW1lbnRzW25hbWVdLmNsYXNzTGlzdC5hZGQoJ2hpZGRlbicpO1xuICAgIH0pO1xuICAgIFsnY2FuY2VsJywgJ2NvbnRlbnQnLCAnc3Bpbm5lciddLmZvckVhY2gobmFtZSA9PiB7XG4gICAgICB0aGlzLl9lbGVtZW50c1tuYW1lXS5jbGFzc0xpc3QucmVtb3ZlKCdoaWRkZW4nKTtcbiAgICB9KTtcbiAgICB0aGlzLl9lbGVtZW50cy53b3JrZXJzLmRpc2FibGVkID0gdHJ1ZTtcblxuICAgIHRoaXMuX2VsZW1lbnRzLmJ1aWxkcy50ZXh0Q29udGVudCA9IFwiXCI7XG4gICAgdGhpcy5fYnVpbGRzID0ge307XG4gICAgdGhpcy5fc3RhcnRUaW1lID0gRGF0ZS5ub3coKTtcblxuICAgIHRoaXMuX2NsaWVudCA9IG5ldyBCdWlsZGJvdENsaWVudCh0aGlzLl9lbGVtZW50cy53b3JrZXJzLnZhbHVlKTtcbiAgICB0aGlzLl9jbGllbnQuZmV0Y2hCdWlsZHMoaWQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMub25wcm9ncmVzcy5iaW5kKHRoaXMpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLm9uYnVpbGQuYmluZCh0aGlzKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5vbmRvbmUuYmluZCh0aGlzKSk7XG5cbiAgICB0aGlzLl9naXRodWIgPSBuZXcgR2l0aHViQ2xpZW50KCk7XG4gICAgdGhpcy5fZ2l0aHViLmZldGNoUHVsbFJlcXVlc3RJbmZvKGlkKVxuICAgIC50aGVuKHB1bGxSZXF1ZXN0ID0+IHtcbiAgICAgIGlmICghcHVsbFJlcXVlc3QpIHtcbiAgICAgICAgLy8vIFhYWCBzaG93IHB1bGwgcmVxdWVzdCBub3QgZm91bmQgZXJyb3IuXG4gICAgICAgIHJldHVybiB0aGlzLmNhbmNlbCgpO1xuICAgICAgfVxuICAgICAgdGhpcy5fc2hvd1B1bGxSZXF1ZXN0KHB1bGxSZXF1ZXN0KTtcbiAgICB9KS5jYXRjaChlID0+IHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoZSk7XG4gICAgICAvLyBYWFggc2hvdyBlcnJvciBmZWVkYmFjay5cbiAgICB9KTtcbiAgfSxcblxuICBjYW5jZWwoKSB7XG4gICAgWydjYW5jZWwnLFxuICAgICAnY29udGVudCcsXG4gICAgICdzcGlubmVyJyxcbiAgICAgJ25vdEZvdW5kJyxcbiAgICAgJ2dpdGh1YicsXG4gICAgICdwcm9ncmVzcyddLmZvckVhY2gobmFtZSA9PiB7XG4gICAgICB0aGlzLl9lbGVtZW50c1tuYW1lXS5jbGFzc0xpc3QuYWRkKCdoaWRkZW4nKTtcbiAgICB9KTtcbiAgICB0aGlzLl9lbGVtZW50cy5wclN0YXRlLmNsYXNzTGlzdC5yZW1vdmUoJ3N0YXRlJyk7XG4gICAgdGhpcy5fZWxlbWVudHMuZ2V0U3RhdHVzLmNsYXNzTGlzdC5yZW1vdmUoJ2hpZGRlbicpO1xuICAgIHRoaXMuX2VsZW1lbnRzLndvcmtlcnMuZGlzYWJsZWQgPSB1bmRlZmluZWQ7XG5cbiAgICB0aGlzLl9jbGllbnQuY2FuY2VsKCk7XG5cbiAgICB0aGlzLl9jbGVhbnVwKCk7XG4gIH0sXG5cbiAgX2NsZWFudXAoKSB7XG4gICAgdGhpcy5fYnVpbGRzID0gbnVsbDtcbiAgICB0aGlzLl9zdGFydFRpbWUgPSBudWxsO1xuICAgIHRoaXMuX2NsaWVudCA9IG51bGw7XG4gIH0sXG5cbiAgX3Nob3dQdWxsUmVxdWVzdChwdWxsUmVxdWVzdCkge1xuICAgIGNvbnN0IHsgcHJTdGF0ZSwgcHJBdXRob3IsIHByVGl0bGUsIGdpdGh1YiB9ID0gdGhpcy5fZWxlbWVudHM7XG4gICAgcHJTdGF0ZS50ZXh0Q29udGVudCA9IHB1bGxSZXF1ZXN0LnN0YXRlO1xuICAgIHByU3RhdGUuY2xhc3NMaXN0LmFkZCgnc3RhdGUnLCBwdWxsUmVxdWVzdC5zdGF0ZSk7XG4gICAgcHJBdXRob3IudGV4dENvbnRlbnQgPSBwdWxsUmVxdWVzdC5hdXRob3I7XG4gICAgcHJBdXRob3IuaHJlZiA9IHB1bGxSZXF1ZXN0LmF1dGhvclVybDtcbiAgICBwclRpdGxlLnRleHRDb250ZW50ID0gcHVsbFJlcXVlc3QudGl0bGU7XG4gICAgcHJUaXRsZS5ocmVmID0gcHVsbFJlcXVlc3QudXJsO1xuICAgIGdpdGh1Yi5jbGFzc0xpc3QucmVtb3ZlKCdoaWRkZW4nKTtcbiAgfSxcblxuICBfc2hvd0J1aWxkKHJldikge1xuICAgIGNvbnN0IGJ1aWxkcyA9IHRoaXMuX2J1aWxkc1tyZXZdO1xuXG4gICAgbGV0IGJ1aWxkRWwgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICBidWlsZEVsLmNsYXNzTGlzdC5hZGQoJ2J1aWxkJyk7XG5cbiAgICBsZXQgdGl0bGUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICB0aXRsZS5jbGFzc0xpc3QuYWRkKCdkZXRhaWxzJyk7XG4gICAgdGl0bGUuY2xhc3NMaXN0LmFkZCgndGl0bGUnKTtcbiAgICB0aXRsZS50ZXh0Q29udGVudCA9IHJldjtcblxuICAgIGxldCBzdGFydFRpbWUsIGVuZFRpbWUsIGluUHJvZyA9IGZhbHNlO1xuXG4gICAgbGV0IHRhYmxlID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgndGFibGUnKTtcbiAgICBsZXQgdHIgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCd0cicpO1xuICAgIGxldCBkZXRhaWxzID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgZGV0YWlscy5jbGFzc0xpc3QuYWRkKCdkZXRhaWxzJyk7XG4gICAgZGV0YWlscy5jbGFzc0xpc3QuYWRkKCdoaWRkZW4nKTtcbiAgICBPYmplY3Qua2V5cyhidWlsZHMpLmZvckVhY2goa2V5ID0+IHtcbiAgICAgIGNvbnN0IGJ1aWxkID0gYnVpbGRzW2tleV07XG4gICAgICBsZXQgdGQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCd0ZCcpO1xuICAgICAgbGV0IGxhYmVsID0gYnVpbGQuYnVpbGRlcjtcbiAgICAgIGxldCBhID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnYScpO1xuICAgICAgYS5ocmVmID0gYCR7QlVJTERfQkFTRV9QQVRIfSR7YnVpbGQuYnVpbGRlcn0vYnVpbGRzLyR7YnVpbGQuaWR9YDtcbiAgICAgIGEudGFyZ2V0ID0gJ19ibGFuayc7XG4gICAgICBhLnRpdGxlID0gYnVpbGQuYnVpbGRlcjtcbiAgICAgIGNvbnN0IHRpdGxlID0gZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUoYnVpbGQuYnVpbGRlcik7XG4gICAgICBhLmFwcGVuZENoaWxkKHRpdGxlKTtcbiAgICAgIHRkLmFwcGVuZENoaWxkKGEpO1xuXG4gICAgICBpZiAoYnVpbGQuaW5wcm9ncmVzcykge1xuICAgICAgICB0ZC5jbGFzc0xpc3QuYWRkKCdpbnByb2dyZXNzJyk7XG4gICAgICAgIGluUHJvZyA9IHRydWU7XG4gICAgICB9IGVsc2UgaWYgKGJ1aWxkLnN1Y2Nlc3MpIHtcbiAgICAgICAgdGQuY2xhc3NMaXN0LmFkZCgnc3VjY2VzcycpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGQuY2xhc3NMaXN0LmFkZCgnZXJyb3InKTtcbiAgICAgIH1cbiAgICAgIHRyLmFwcGVuZENoaWxkKHRkKTtcblxuICAgICAgaWYgKCFzdGFydFRpbWUpIHtcbiAgICAgICAgc3RhcnRUaW1lID0gYnVpbGQuc3RhcnQgKiAxMDAwO1xuICAgICAgfVxuXG4gICAgICBpZiAoIWVuZFRpbWUgfHwgZW5kVGltZSA8IGJ1aWxkLmVuZCAqIDEwMDApIHtcbiAgICAgICAgZW5kVGltZSA9IGJ1aWxkLmVuZCAqIDEwMDA7XG4gICAgICB9XG5cbiAgICB9KTtcbiAgICB0YWJsZS5hcHBlbmRDaGlsZCh0cik7XG4gICAgZGV0YWlscy5hcHBlbmRDaGlsZCh0YWJsZSk7XG5cbiAgICBsZXQgZXhwYW5kID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgZXhwYW5kLmNsYXNzTGlzdC5hZGQoJ2V4cGFuZCcpO1xuICAgIGV4cGFuZC5jbGFzc0xpc3QuYWRkKCdtb3JlJyk7XG4gICAgZXhwYW5kLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKCkgPT4ge1xuICAgICAgaWYgKGV4cGFuZC5jbGFzc0xpc3QuY29udGFpbnMoJ21vcmUnKSkge1xuICAgICAgICBleHBhbmQuY2xhc3NMaXN0LnJlbW92ZSgnbW9yZScpO1xuICAgICAgICBleHBhbmQuY2xhc3NMaXN0LmFkZCgnbGVzcycpO1xuICAgICAgICBkZXRhaWxzLmNsYXNzTGlzdC5yZW1vdmUoJ2hpZGRlbicpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZXhwYW5kLmNsYXNzTGlzdC5yZW1vdmUoJ2xlc3MnKTtcbiAgICAgICAgZXhwYW5kLmNsYXNzTGlzdC5hZGQoJ21vcmUnKTtcbiAgICAgICAgZGV0YWlscy5jbGFzc0xpc3QuYWRkKCdoaWRkZW4nKTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIGJ1aWxkRWwuYXBwZW5kQ2hpbGQoZXhwYW5kKTtcbiAgICBidWlsZEVsLmFwcGVuZENoaWxkKHRpdGxlKTtcbiAgICBpZiAoc3RhcnRUaW1lKSB7XG4gICAgICBsZXQgYnVpbGRzU3RhcnRUaW1lID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgICBidWlsZHNTdGFydFRpbWUuY2xhc3NMaXN0LmFkZCgndGltZXN0YW1wJyk7XG4gICAgICBidWlsZHNTdGFydFRpbWUudGV4dENvbnRlbnQgPSBcIkZpcnN0IGJ1aWxkIHN0YXJ0ZWQgYXQ6IFwiICsgbmV3IERhdGUoc3RhcnRUaW1lKS50b1N0cmluZygpLnNsaWNlKDQsIDI0KTtcbiAgICAgIGJ1aWxkRWwuYXBwZW5kQ2hpbGQoYnVpbGRzU3RhcnRUaW1lKTtcbiAgICB9XG4gICAgbGV0IGJ1aWxkc0VuZFRpbWUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICBidWlsZHNFbmRUaW1lLmNsYXNzTGlzdC5hZGQoJ3RpbWVzdGFtcCcpO1xuICAgIGlmICghaW5Qcm9nKSB7XG4gICAgICBidWlsZHNFbmRUaW1lLnRleHRDb250ZW50ID0gXCJMYXN0IGJ1aWxkIGVuZGVkIGF0OiBcIiArIG5ldyBEYXRlKGVuZFRpbWUpLnRvU3RyaW5nKCkuc2xpY2UoNCwgMjQpO1xuICAgIH0gZWxzZSB7XG4gICAgICBidWlsZHNFbmRUaW1lLnRleHRDb250ZW50ID0gXCJCdWlsZHMgaW4tcHJvZ3Jlc3NcIjtcbiAgICB9XG4gICAgYnVpbGRFbC5hcHBlbmRDaGlsZChidWlsZHNFbmRUaW1lKTtcbiAgICBidWlsZEVsLmFwcGVuZENoaWxkKGRldGFpbHMpO1xuXG4gICAgdGhpcy5fZWxlbWVudHMuYnVpbGRzLmFwcGVuZENoaWxkKGJ1aWxkRWwpO1xuXG4gICAgaWYgKHRoaXMuX2VsZW1lbnRzLmNvbnRlbnQuY2xhc3NMaXN0LmNvbnRhaW5zKCdoaWRkZW4nKSkge1xuICAgICAgdGhpcy5fZWxlbWVudHMuY29udGVudC5jbGFzc0xpc3QucmVtb3ZlKCdoaWRkZW4nKTtcbiAgICB9XG4gIH0sXG5cbiAgb25wcm9ncmVzcyhwcm9ncmVzcykge1xuICAgIHRoaXMuX2VsZW1lbnRzLnByb2dyZXNzQnVpbGQudGV4dENvbnRlbnQgPVxuICAgICAgYCR7cHJvZ3Jlc3MuYnVpbGRlcn0vJHtwcm9ncmVzcy5udW1iZXJ9YDtcbiAgICB0aGlzLl9lbGVtZW50cy5wcm9ncmVzc1RvdGFsLnRleHRDb250ZW50ID0gYCR7cHJvZ3Jlc3MucHJvZ3Jlc3N9YDtcbiAgICBpZiAodGhpcy5fZWxlbWVudHMucHJvZ3Jlc3MuY2xhc3NMaXN0LmNvbnRhaW5zKCdoaWRkZW4nKSkge1xuICAgICAgdGhpcy5fZWxlbWVudHMucHJvZ3Jlc3MuY2xhc3NMaXN0LnJlbW92ZSgnaGlkZGVuJyk7O1xuICAgIH1cbiAgfSxcblxuICBvbmJ1aWxkKGJ1aWxkKSB7XG4gICAgY29uc3QgcmV2ID0gYnVpbGQucmV2aXNpb247XG4gICAgaWYgKCFyZXYpIHtcbiAgICAgIGNvbnNvbGUud2FybihcIkludmFsaWQgYnVpbGRcIiwgYnVpbGQpO1xuICAgIH1cblxuICAgIGlmICghdGhpcy5fYnVpbGRzW3Jldl0pIHtcbiAgICAgIHRoaXMuX2J1aWxkc1tyZXZdID0gW107XG4gICAgfVxuICAgIHRoaXMuX2J1aWxkc1tyZXZdLnB1c2goYnVpbGQpO1xuICB9LFxuXG4gIG9uZG9uZShlcnJvcikge1xuICAgIC8vIFhYWCBoYW5kbGUgZXJyb3IuXG5cbiAgICB0aGlzLl9lbGVtZW50cy5zZWNvbmRzLnRleHRDb250ZW50ID0gKERhdGUubm93KCkgLSB0aGlzLl9zdGFydFRpbWUpIC8gMTAwMDtcblxuICAgIFsnY2FuY2VsJywgJ3NwaW5uZXInLCAncHJvZ3Jlc3MnXS5mb3JFYWNoKG5hbWUgPT4ge1xuICAgICAgdGhpcy5fZWxlbWVudHNbbmFtZV0uY2xhc3NMaXN0LmFkZCgnaGlkZGVuJyk7XG4gICAgfSk7XG4gICAgWydnZXRTdGF0dXMnLCAndGltZSddLmZvckVhY2gobmFtZSA9PiB7XG4gICAgICB0aGlzLl9lbGVtZW50c1tuYW1lXS5jbGFzc0xpc3QucmVtb3ZlKCdoaWRkZW4nKTtcbiAgICB9KTtcbiAgICB0aGlzLl9lbGVtZW50cy53b3JrZXJzLmRpc2FibGVkID0gdW5kZWZpbmVkO1xuXG4gICAgaWYgKCFPYmplY3Qua2V5cyh0aGlzLl9idWlsZHMpLmxlbmd0aCkge1xuICAgICAgdGhpcy5fZWxlbWVudHMuc3Bpbm5lci5jbGFzc0xpc3QuYWRkKCdoaWRkZW4nKTtcbiAgICAgIHRoaXMuX2VsZW1lbnRzLm5vdEZvdW5kLmNsYXNzTGlzdC5yZW1vdmUoJ2hpZGRlbicpO1xuICAgIH0gZWxzZSB7XG4gICAgICBPYmplY3Qua2V5cyh0aGlzLl9idWlsZHMpLmZvckVhY2goYnVpbGQgPT4ge1xuICAgICAgICB0aGlzLl9zaG93QnVpbGQoYnVpbGQpO1xuICAgICAgfSk7XG4gICAgfVxuXG4gICAgdGhpcy5fY2xlYW51cCgpO1xuICB9LFxuXG4gIF9pbml0V29ya2Vyc1NlbGVjdChzZWxlY3QpIHtcbiAgICBjb25zdCBmaXJzdE9wdGlvbiA9IHNlbGVjdC5maXJzdEVsZW1lbnRDaGlsZDtcbiAgICBmaXJzdE9wdGlvbi52YWx1ZSA9IERFRkFVTFRfV09SS0VSUztcbiAgICBmaXJzdE9wdGlvbi50ZXh0Q29udGVudCA9XG4gICAgICBgTnVtYmVyIG9mIHdvcmtlcnMgKGRlZmF1bHRzIHRvICR7REVGQVVMVF9XT1JLRVJTfSlgO1xuICAgIEFycmF5LmZyb20oeyBsZW5ndGg6IE1BWF9XT1JLRVJTIH0pLmZvckVhY2goKF92LCBrKSA9PiB7XG4gICAgICBjb25zdCBudW1iZXIgPSBrICsgMTtcbiAgICAgIGNvbnN0IG9wdGlvbiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ29wdGlvbicpO1xuICAgICAgb3B0aW9uLnZhbHVlID0gbnVtYmVyO1xuICAgICAgb3B0aW9uLnRleHQgPSBudW1iZXI7XG4gICAgICBzZWxlY3QuYXBwZW5kQ2hpbGQob3B0aW9uKTtcbiAgICB9KVxuICB9XG59O1xuXG5leHBvcnQgeyBVSSB9O1xuIl19
