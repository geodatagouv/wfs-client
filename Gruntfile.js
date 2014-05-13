module.exports = function (grunt) {
    require('matchdep').filterDev('grunt-*').forEach(grunt.loadNpmTasks);

    grunt.initConfig({

        jshint: {
            options: {
                'eqeqeq': true,
                'immed': true,
                'latedef': true,
                'newcap': true,
                'noarg': true,
                'noempty': true,
                'unused': true,
                'undef': true,
                'trailing': true,
                'quotmark': 'single',
                'node': true
            },
            all: {
                files: {
                    src: ['*.js', 'lib/**/*.js']
                }
            }
        }

    });

    grunt.registerTask('default', ['jshint']);

};
