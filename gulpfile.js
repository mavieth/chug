var browserSync = require('browser-sync').create(), 
  data = require('gulp-data'),
  frontMatter = require('gulp-front-matter'),
  gulp = require('gulp'),
  gulpSwig = require('gulp-swig'),
  marked = require('gulp-marked'),
  path = require('path'),
  rename = require('gulp-rename'),
  sass = require('gulp-sass'),
  swig = require('swig'),
  through = require('through2');

var bourbon = require('node-bourbon').includePaths,
  neat = require('node-neat').includePaths;

var site = require('./config.json');

var swigDefaults = {
  defaults: { cache: false },
  setup: function(gulpSwig) {
    gulpSwig.setFilter('sortBy', function(inputArray, key, reverse) {
      if(reverse) {
        inputArray.sort(function (a, b) {
          return b[key] - a[key];
        });
      } else {
        inputArray.sort(function (a, b) {
          return a[key] - b[key];
        });
      }
      return inputArray;
    });
  }
}

var postNamePattern = /(\d{4})-(\d{1,2})-(\d{1,2})-(.*)/;

gulp.task('index', ['posts'], function() {
  gulp.src('src/index.html')
    .pipe(data(function() {
      return site;
    }))
    .pipe(gulpSwig(swigDefaults))
    .pipe(gulp.dest('dist'));
});

gulp.task('posts', function() {
  return gulp.src('src/posts/*.md')
    .pipe(frontMatter({ property: 'page', remove: true }))
    .pipe(marked())
    .pipe(applyTemplate('src/partials/_post.html'))
    .pipe(parsePostName())
    .pipe(collectPosts())
    .pipe(rename(function (path) {
      path.extname = ".html";
      var match = postNamePattern.exec(path.basename);
      if (match)
      {
        var year = match[1];            
        var month = match[2];
        var day = match[3];
    
        path.dirname = year + '/' + month + '/' + day;
        path.basename = match[4];
      }            
    }))
    .pipe(gulp.dest('dist/posts'));
});

gulp.task('sass', function() {
  gulp.src('src/scss/**/*.scss')
    .pipe(sass({
        includePaths: bourbon,
        includePaths: neat
      }))
    .pipe(gulp.dest('dist/css/'));
});

gulp.task('serve', ['build'], function() {

  browserSync.init({
    server: "./dist"
  });

  gulp.watch('src/**/*.html', ['build', 'reload']);
  gulp.watch('src/posts/**/*.md', ['posts', 'reload']);
  gulp.watch('src/scss/**/*.scss', ['sass', 'reload']);
});

gulp.task('reload', function() {
  browserSync.reload();
})

gulp.task('build', ['posts', 'index', 'sass'], function() {
  gulp.src('assets/*')
    .pipe(gulp.dest('dist/assets/'));
});

gulp.task('clean', function() {
  return gulp.src('dist', {read: false})
    .pipe(clean());
});

gulp.task('default', ['serve']);

function applyTemplate(templateFile) {
  var tpl = swig.compileFile(path.join(__dirname, templateFile));

  return through.obj(function (file, enc, cb) {            
    var data = {
      page: file.page,
      content: file.contents.toString()
    };            
    file.contents = new Buffer(tpl(data), 'utf8');
    this.push(file);
    cb();
  });
}

function collectPosts() {
  posts = [];
  return through.obj(function (file, enc, cb) {
    posts.push(file.page);
    this.push(file);
    cb();
  }, function (cb) {
    posts.sort(function (a, b) {
      return b.date - a.date;
    });
    site.posts = posts;
    list2 = posts;
    cb();
  });
}

function parsePostName() {
  return through.obj(function (file, enc, cb) {
    var basename = path.basename(file.path, '.md');
    var match = postNamePattern.exec(basename);
    if (match)
    {
      var year     = match[1];            
      var month    = match[2];
      var day      = match[3];
      var basename = match[4];
      file.page.date = new Date(year, month, day);
      file.page.url  = '/posts/' + year + '/' + month + '/' + day + '/' + basename; // + '.html';
    }
    
    this.push(file);
    cb();
  })
}