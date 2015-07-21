var browserify = require("gulp-browserify")
var concat = require('gulp-concat')
var gulp = require('gulp')
var uglify = require('gulp-uglifyjs')

gulp.task("browserify", function(  ){
  gulp.src(["src/index.js"])
    .pipe(browserify({}))
    .pipe(concat("dist/woosh.js"))
    .pipe(gulp.dest(process.cwd()))
    .pipe(uglify("dist/woosh.min.js", {
      comments: true
    }))
    .pipe(gulp.dest(process.cwd()))
})

gulp.task("default", ["browserify"])

gulp.watch("src/**/*.js", ["browserify"])
