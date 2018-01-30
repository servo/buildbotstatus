var gulp        = require('gulp');
var serve       = require('gulp-serve');
var browserify  = require('browserify');
var babelify    = require('babelify');
var source      = require('vinyl-source-stream');
var clean       = require('gulp-clean');

gulp.task('clean', function(){
  return gulp.src(['dist/*'], {read:false})
  .pipe(clean());
});

gulp.task('copy', ['clean'], function() {
  return gulp.src(['app/**/*', '!app/scripts/*.js'])
    .pipe(gulp.dest('dist'));
});

gulp.task('build', ['copy'], function () {
  var entries = [
    'app/scripts/build.js',
    'app/scripts/buildbot_client.js',
    'app/scripts/config.js',
    'app/scripts/main.js',
    'app/scripts/ui.js'
  ];
  return browserify({entries: entries, debug: true})
      .transform("babelify", { presets: ["es2015"] })
      .bundle()
      .pipe(source('app.js'))
      .pipe(gulp.dest('./dist/'));
});

gulp.task('serve', ['build'], serve('dist'));

gulp.task('default', ['clean', 'copy', 'build', 'serve']);
