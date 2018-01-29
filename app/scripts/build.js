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
class Build {
  /**
   * Creates a Build.
   *
   * @param {BuildData}
   */
  constructor(data) {
    this._id = data.id;
    this._builder = data.builder;
    this._revision = data.revision;
    this._success = data.success;
    this._inprogress = data.inprogress;
    this._start = data.start;
    this._end = data.end;
  }

  get id() {
    return this._id;
  }

  get builder() {
    return this._builder;
  }

  get revision() {
    return this._revision;
  }

  get success() {
    return this._success;
  }

  get inprogress() {
    return this._inprogress;
  }

  get start() {
    return this._start;
  }

  get end() {
    return this._end;
  }
}

export default Build;
