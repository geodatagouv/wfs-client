module.exports = function (grunt) {
    grunt.loadNpmTasks('grunt-contrib-jshint');

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
                // newcap: true, // Disabled because of Q usage
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
