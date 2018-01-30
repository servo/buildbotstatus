var gulp        = require('gulp');
var browserSync = require('browser-sync').create();
var reload      = browserSync.reload;
var serve       = require('gulp-serve');

// Static server.
gulp.task('serve', serve('app'));

gulp.task('watch', function() {
  browserSync.init({
    server: {
      baseDir: './app'
    }
  });

  gulp.watch('./app/**').on('change', reload);
});

gulp.task('default', ['serve']);
