module.exports = function ( grunt ){

  var core = [
    "node_modules/bezier-easing/index.js",
    "src/Animation.js"
  ]
  grunt.initConfig({
    concat: {
      "core": {
        files: {
          "dist/woosh.js": core
        }
      }
    },
    uglify: {
      options: {
        drop_console: true
      },
      "core.min": {
        options: {
          mangle: true
        },
        files: {
          "dist/woosh.min.js": core
        }
      }
    }
  })

  grunt.loadNpmTasks("grunt-contrib-uglify")
  grunt.loadNpmTasks("grunt-contrib-concat")

  grunt.registerTask("default", ["uglify", "concat"])
}