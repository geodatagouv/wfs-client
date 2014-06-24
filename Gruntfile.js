module.exports = function (grunt) {
    require('matchdep').filterDev('grunt-*').forEach(grunt.loadNpmTasks);

    grunt.initConfig({

        jshint: {
            options: {
                node: true,
                bitwise: true,
                eqeqeq: true,
                freeze: true,
                immed: true,
                indent: 4,
                latedef: true,
                newcap: true,
                nonew: true,
                quotmark: 'single',
                undef: true,
                unused: true,
                trailing: true,
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
