var gulp        = require('gulp');
var serve       = require('gulp-serve');
var browserify  = require('browserify');
var babelify    = require('babelify');
var source      = require('vinyl-source-stream');
var clean       = require('gulp-clean');
var browserSync = require('browser-sync').create();

gulp.task('clean', function(){
  return gulp.src(['dist/*'], {read:false})
  .pipe(clean());
});

gulp.task('copy', ['clean'], function() {
  return gulp.src(['app/**/*', '!app/scripts/*.js'])
    .pipe(gulp.dest('dist'));
});

var scriptsEntries = [
  'app/scripts/build.js',
  'app/scripts/buildbot_client.js',
  'app/scripts/config.js',
  'app/scripts/main.js',
  'app/scripts/ui.js'
];

var htmlEntries = ['app/index.html'];

var stylesEntries = [
  'app/styles/main.css'
];

gulp.task('build', ['copy'], function () {
  return browserify({
    entries: scriptsEntries,
    debug: true
  }).transform("babelify", { presets: ["es2015"] })
    .bundle()
    .pipe(source('app.js'))
    .pipe(gulp.dest('./dist/'));
});

gulp.task('watch', ['build'], function (done) {
  browserSync.reload();
  done();
})

gulp.task('dev', ['build'], function () {
  browserSync.init({
    server: {
      baseDir: './dist'
    }
  });

  const entries = scriptsEntries.concat(htmlEntries).concat(stylesEntries);

  gulp.watch(entries, ['watch']);
});

gulp.task('serve', ['build'], serve('dist'));

gulp.task('default', ['clean', 'copy', 'build', 'serve']);
