import { GITHUB_API_URL } from './config.js';
import PullRequest from './pullrequest.js';

/**
 * Partial Github REST API client.
 * Reference: https://developer.github.com/v3
 */
export class GithubClient {
  /**
   * Initializes the client with the API endpoint URL.
   */
  constructor() {
    this._apiUrl = GITHUB_API_URL;
  }

  /**
   * Get information about a pull request matching a given id.
   *
   * @param {string} id Pull request identifier.
   * @return {Promise} A promise resolving with the pull request details.
   */
  fetchPullRequestInfo(id) {
    return fetch(`${this._apiUrl}pulls/${id}`, { mode: 'cors' })
    .then(response => {
      if (response.status == 200) {
        return response.json();
      }
    }).then(json => {
      if (!json) {
        return;
      }
      return new PullRequest({
        id: json.id,
        author: json.user.login,
        authorUrl: json.user.html_url,
        title: json.title,
        url: json._links.html.href,
        state: json.merged ? 'merged' : json.state
      });
    });;
  }
}
