/*
Jason Katz
ECE-462 Project 2: Othello

File: Graphics.js
Description: WebGL display functionality and interface logic
*/

"use strict";

var gl;
var canvas;

var Graphics = {
    init: function () {
        // Initialize WebGL
        canvas = document.getElementById( 'gl-canvas' );
        gl = WebGLUtils.setupWebGL( canvas );
        if ( !gl ) {
            alert( 'WebGL isn\'t available' );
        }

        // Configure WebGL
        gl.viewport( 0, 0, canvas.width, canvas.height );
        gl.clearColor( 1.0, 1.0, 1.0, 1.0 );
        gl.enable( gl.DEPTH_TEST );
    }
};
