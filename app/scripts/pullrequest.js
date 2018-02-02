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
class PullRequest {
  /**
   * Creates a PullRequest. Its representation, not the real thing.
   *
   * @param {PullRequestData}
   */
  constructor(data) {
    this._id = data.id;
    this._author = data.author;
    this._authorUrl = data.authorUrl;
    this._title = data.title;
    this._url = data.url;
    this._state = data.state;
  }

  get id() {
    return this._id;
  }

  get author() {
    return this._author;
  }

  get authorUrl() {
    return this._authorUrl;
  }

  get title() {
    return this._title;
  }

  get url() {
    return this._url;
  }

  get state() {
    return this._state;
  }
}

export default PullRequest;
