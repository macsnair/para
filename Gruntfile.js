/* jshint browser: false, node: true */

module.exports = function (grunt) {
    "use strict";

    grunt.initConfig({
        jshint : {
            options : {
                jshintrc : true
            },
            all : [
                "bower.json",
                "package.json",
                "*.js",
                // "js/**/*.js",
                "test/**/*.js",
                "server/**/*.js"
            ]
        },
        jscs: {
            src: "<%= jshint.all %>",
            options: {
                config: ".jscsrc"
            }
        },

        clean: ["./build"],
        copy: {
            html: { src: "para-build.html", dest: "build/para.html" },
            workshop: { src: "workshop.html", dest: "build/workshop.html" },
            landing: { src: "index.html", dest: "build/index.html" },
            images: { expand: true, cwd: "images", src: "**", dest: "build/images/" },
            fonts: { expand: true, cwd: "fonts", src: "**", dest: "build/fonts/" },
            ui:{
                files: [{ 
                    expand: true, 
                    cwd: "bower_components/jqueryui/themes/base/images", 
                    src: "**", 
                    dest: "build/style/jqueryui/images/"
                }]
            }
        },
        cssmin: {
            all: {
                files: [{
                    expand: true,
                    cwd: "style/",
                    src: ["*.css"],
                    dest: "build/style/"
                },
                {
                    expand: true,
                    cwd: "bower_components/jqueryui/themes/base/",
                    src: ["*.css"],
                    dest: "build/style/jqueryui"
                },
                {
                    expand: true,
                    cwd: "bower_components/fancytree/dist/skin-bootstrap/",
                    src: ["*.css"],
                    dest: "build/style/fancytree"
                }]
            }
        },
        requirejs: {
            compile: {
                options: {
                    paths: { "requirejs" : "../../bower_components/requirejs/require" },
                    include : ["requirejs", "app"],
                    insertRequire : ["uiloader"],
                    mainConfigFile: "js/src/config.js",
                    baseUrl: "js/src/",
                    name: "uiloader",
                    out: "build/js/para.js",
                    optimize: "none",
                    wrapShim: true,
                    useStrict: true
                }
            }
        }

    });

    grunt.loadNpmTasks("grunt-contrib-jshint");
    grunt.loadNpmTasks("grunt-jscs");

    grunt.loadNpmTasks("grunt-contrib-clean");
    grunt.loadNpmTasks("grunt-contrib-copy");
    grunt.loadNpmTasks("grunt-contrib-cssmin");
    grunt.loadNpmTasks("grunt-contrib-requirejs");

    grunt.registerTask("test", ["jshint", "jscs"]);

    grunt.registerTask("build", [
        "test", "clean", "copy", "cssmin", "requirejs"
    ]);

    grunt.registerTask("default", ["test"]);

};
