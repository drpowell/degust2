var path = require('path');

module.exports = function(grunt) {

  grunt.config('env', grunt.option('env') || process.env.GRUNT_ENV || 'development');
  grunt.config('compress', grunt.config('env') === 'production');

  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    copy: {
      vendor: {
        files: [
          {
            expand: true, cwd: 'node_modules/bootstrap/',
            src: ['js/**', 'less/**'], dest: 'public/vendor/bootstrap/'
          },
          {
            expand: true, cwd: 'node_modules/backbone/',
            src: ['backbone.js'], dest: 'public/vendor/backbone/'
          },
          {
            expand: true, cwd: 'node_modules/font-awesome/',
            src: ['fonts/**', 'less/**'], dest: 'public/vendor/font-awesome/'
          },
          {
            expand: true, cwd: 'node_modules/html5shiv/dist/',
            src: ['html5shiv.js'], dest: 'public/vendor/html5shiv/'
          },
          {
            expand: true, cwd: 'node_modules/jquery/dist/',
            src: ['jquery.js'], dest: 'public/vendor/jquery/'
          },
          {
            expand: true, cwd: 'node_modules/jquery.cookie/',
            src: ['jquery.cookie.js'], dest: 'public/vendor/jquery.cookie/'
          },
          {
            expand: true, cwd: 'node_modules/moment/',
            src: ['moment.js'], dest: 'public/vendor/momentjs/'
          },
          {
            expand: true, cwd: 'node_modules/respond.js/src/',
            src: ['respond.js'], dest: 'public/vendor/respond/'
          },
          {
            expand: true, cwd: 'node_modules/underscore/',
            src: ['underscore.js'], dest: 'public/vendor/underscore/'
          }
        ]
      },
      degust: {
        files: [
          {
            expand: true, cwd: 'public/degust',
            src: ['css/*.css','css/images/**','images/**'], dest: 'public/degust-dist/'
          },
        ]
      },
      degust_prod: {
        files: [
          {
            expand: true, cwd: 'public/degust-dist',
            src: ['*.js'], dest: 'public/degust/'
          },
        ]
      }
    },
    concurrent: {
      dev: {
        tasks: ['nodemon', 'watch'],
        options: {
          logConcurrentOutput: true
        }
      }
    },
    nodemon: {
      dev: {
        script: 'app.js',
        options: {
          ignore: [
            'node_modules/**',
            'public/**'
          ],
          ext: 'js'
        }
      }
    },
    watch: {
      clientCoffee: {
        files: ['public/degust/**/*.coffee','public/degust/**/*.hbs'],
        tasks: ['remove','coffeeify']
      },
      clientJS: {
         files: [
          'public/layouts/**/*.js', '!public/layouts/**/*.min.js',
          'public/views/**/*.js', '!public/views/**/*.min.js'
         ],
         tasks: ['newer:uglify', 'newer:jshint:client']
      },
      serverJS: {
         files: ['views/**/*.js'],
         tasks: ['newer:jshint:server']
      },
      clientLess: {
         files: [
          'public/layouts/**/*.less',
          'public/views/**/*.less',
          'public/less/**/*.less'
         ],
         tasks: ['newer:less']
      },
      layoutLess: {
        files: [
          'public/layouts/**/*.less',
          'public/less/**/*.less'
        ],
        tasks: ['less:layouts']
      }
    },
    // Ugly hack to force all coffee regen on change.  Not sure how to do dynamic dependencies in grunt
    remove: {
      fileList: ['public/degust/*.js']
    },
    coffeeify: {
      basic: {
        options: {
          transforms: ['coffeeify','hbsfy'],
          debug: !grunt.config('compress')
        },
        files: [
          {
            src: ['public/degust/js/common-req.coffee'],
            dest: 'public/degust/common.js'
          },
          {
            src: ['public/degust/js/compare-req.coffee'],
            dest: 'public/degust/compare.js'
          },
          {
            src: ['public/degust/js/config-req.coffee'],
            dest: 'public/degust/config.js'
          },
          {
            src: ['public/degust/js/slickgrid-req.coffee'],
            dest: 'public/degust/slickgrid.js'
          },
          {
            src: ['public/degust/js/threejs-req.coffee'],
            dest: 'public/degust/three.js'
          },
        ]
      }
    },
    uglify: {
      options: {
        sourceMap: !grunt.config('compress'),
        sourceMapName: function(filePath) {
          return filePath + '.map';
        }
      },
      layouts: {
        files: {
          'public/layouts/core.min.js': [
            'public/vendor/jquery/jquery.js',
            'public/vendor/jquery.cookie/jquery.cookie.js',
            'public/vendor/underscore/underscore.js',
            'public/vendor/backbone/backbone.js',
            'public/vendor/bootstrap/js/affix.js',
            'public/vendor/bootstrap/js/alert.js',
            'public/vendor/bootstrap/js/button.js',
            'public/vendor/bootstrap/js/carousel.js',
            'public/vendor/bootstrap/js/collapse.js',
            'public/vendor/bootstrap/js/dropdown.js',
            'public/vendor/bootstrap/js/modal.js',
            'public/vendor/bootstrap/js/tooltip.js',
            'public/vendor/bootstrap/js/popover.js',
            'public/vendor/bootstrap/js/scrollspy.js',
            'public/vendor/bootstrap/js/tab.js',
            'public/vendor/bootstrap/js/transition.js',
            'public/vendor/momentjs/moment.js',
            'public/layouts/core.js'
          ],
          'public/layouts/ie-sucks.min.js': [
            'public/vendor/html5shiv/html5shiv.js',
            'public/vendor/respond/respond.js',
            'public/layouts/ie-sucks.js'
          ],
          'public/layouts/admin.min.js': ['public/layouts/admin.js'],
          'public/degust-dist/common.js': ['public/degust/common.js'],
          'public/degust-dist/config.js': ['public/degust/config.js'],
          'public/degust-dist/compare.js': ['public/degust/compare.js'],
          'public/degust-dist/slickgrid.js': ['public/degust/slickgrid.js'],
          'public/degust-dist/three.js': ['public/degust/three.js'],
        }
      },
      views: {
        files: [{
          expand: true,
          cwd: 'public/views/',
          src: ['**/*.js', '!**/*.min.js'],
          dest: 'public/views/',
          ext: '.min.js'
        }]
      }
    },
    jshint: {
      client: {
        options: {
          jshintrc: '.jshintrc-client',
          ignores: [
            'public/layouts/**/*.min.js',
            'public/views/**/*.min.js'
          ]
        },
        src: [
          'public/layouts/**/*.js',
          'public/views/**/*.js'
        ]
      },
      server: {
        options: {
          jshintrc: '.jshintrc-server'
        },
        src: [
          'schema/**/*.js',
          'views/**/*.js'
        ]
      }
    },
    cssmin: {
      options: { },
      target: {
        files: {
         'public/degust/css/lib.css': ['public/degust/css/lib/*.css']
        }
      }
    },
    less: {
      options: {
        compress: true
      },
      layouts: {
        files: {
          'public/layouts/core.min.css': [
            'public/less/bootstrap-build.less',
            'public/less/font-awesome-build.less',
            'public/layouts/core.less'
          ],
          'public/layouts/admin.min.css': ['public/layouts/admin.less']
        }
      },
      views: {
        files: [{
          expand: true,
          cwd: 'public/views/',
          src: ['**/*.less'],
          dest: 'public/views/',
          ext: '.min.css'
        }]
      }
    },
    clean: {
      js: {
        src: [
          'public/layouts/**/*.min.js',
          'public/layouts/**/*.min.js.map',
          'public/views/**/*.min.js',
          'public/views/**/*.min.js.map'
        ]
      },
      css: {
        src: [
          'public/layouts/**/*.min.css',
          'public/views/**/*.min.css'
        ]
      },
      vendor: {
        src: ['public/vendor/**']
      }
    }
  });

  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-less');
  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-concurrent');
  grunt.loadNpmTasks('grunt-nodemon');
  grunt.loadNpmTasks('grunt-newer');
  grunt.loadNpmTasks('grunt-coffeeify');
  grunt.loadNpmTasks('grunt-contrib-cssmin');
  grunt.loadNpmTasks('grunt-remove');


  grunt.registerTask('default', ['copy:vendor', 'newer:uglify', 'newer:less', 'newer:coffeeify', 'cssmin','concurrent']);
  grunt.registerTask('build', ['copy:vendor', 'uglify', 'less', 'cssmin', 'coffeeify', 'copy:degust']);
  grunt.registerTask('production', ['copy:vendor', 'uglify', 'less', 'cssmin', 'coffeeify', 'copy:degust', 'copy:degust_prod','nodemon']);
  grunt.registerTask('lint', ['jshint']);
};
