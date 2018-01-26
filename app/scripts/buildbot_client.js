import { BUILDBOT_API_URL, DEFAULT_WORKERS, MAX_WORKERS } from './config.js';
import Build from './build.js';

const AUTOMERGE = 'Auto merge of #';
const CACHED = 'cachedBuilds';
const CURRENT = 'currentBuilds';
const SUCCESS = 'successful';

/**
 * Servo's Buildbot JSON API client.
 * Reference: http://build.servo.org/json/help
 */
export class BuildbotClient {
  /**
   * Initializes the client with the API endpoint URL and the number of workers
   * the user wants to use.
   *
   * @param {number} workers Number of desired worker threads.
   */
  constructor(workers) {
    this._api = BUILDBOT_API_URL;
    this._onprogress = this.onprogress.bind(this);
    this._maxWorkers = workers && workers <= MAX_WORKERS ? workers
                                                         : DEFAULT_WORKERS;
  }

  /**
   * Get the list of builds associated with a specific pull request.
   *
   * @param {string} pullRequestId Unique identifier of a Servo pull request.
   * @return {Promise<>} A promise resolving with the list of builds associated with the given pull request ID.
   * @throws {Promise<>} The promise could reject with an error if something goes wrong fetching the builds.
   */
  fetchBuilds(pullRequestId) {
    this._pullRequestId = pullRequestId;
    // Create a pool of worker threads. Each build request will be passed to the
    // pool which it will queue and pass to the next idle worker thread.
    this._pool = new thread.Pool(this._maxWorkers);
    // For each build we check if it belongs to the pull request corresponding
    // to the given ID. And, in that case, we store the build for later return
    // and display.
    this._builds = [];
    return this._fetchBuilders()
    .then(builders => {
      // FIXME (ferjm): check that we really want to fetch from all the builders.
      this._pool.run(this._fetchBuildRunnable);
      return this._fetchBuilds(builders, CURRENT);
    })
    .then(({builders, buildsData}) => {
      // For each builder we get the list of current and cached builds.
      // We start with the current builds, so we can display their progress
      // as soon as possible.
      console.log("Current builds", buildsData);
      return this._fetchBuilds(builders, CACHED);
    })
    .then(({builders, buildsData}) => {
      this._pool.killAll();
      console.log("Done", this._builds);
      return this._builds;
    })
    .catch(error => {
      this._pool.killAll();
      console.error(error);
    });
  }

  cancel() {
    if (!this._pool) {
      return;
    }
    this._pool.killAll();
  }

  onprogress(build) {
    // For each build fetched from the server we get a progress
    // event with the details of that build.
    const changes = build.sourceStamps[0].changes;
    if (!changes || !Array.isArray(changes) || !changes.length) {
      return;
    }
    const pattern = `${AUTOMERGE}${this._pullRequestId}`;
    if (changes[0].comments.indexOf(pattern) === -1) {
      return;
    }
    const _build = new Build({
      id: build.number,
      builder: build.builderName,
      success: build.text[1] == SUCCESS,
      inprogress: build.inprogress,
      start: build.times[0],
      end: build.times[1]
    });
    this._builds.push(_build);
  }

  _fetchBuilders() {
    return fetch(this._api + 'builders')
    .then(res => {
      return res.json();
    }).then(json => {
      return json;
    });
  }

  _fetchBuilds(builders, type) {
    return Promise.all(Object.keys(builders).map(name => {
      const builder = builders[name];
      const basePath = `${this._api}builders/${builder.basedir}/builds/`;
      return Promise.all(builder[type].map(id => {
        const path = `${basePath}${id}`;
        const inprogress = type == CURRENT;
        return this._pool.send({path, inprogress})
                         .on('progress', this._onprogress)
                         .promise();
      }));
    })).then(buildsData => {
      return { builders, buildsData };
    });
  }

  _fetchBuildRunnable(data, done, progress) {
    return fetch(data.path)
    .then(res => {
      return res.json();
    }).then(json => {
      json.inprogress = data.inprogress;
      progress(json);
    });
  }
}
