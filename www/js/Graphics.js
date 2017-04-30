/*
Jason Katz
ECE-462 Project 2: Othello

File: Graphics.js
Description: WebGL display functionality and interface logic
*/

"use strict";

var gl;
var canvas;

var isMoving = false;

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

        // Load shaders and initialize attribute buffers
        var program = initShaders( gl, 'vertex-shader', 'fragment-shader' );
        gl.useProgram( program );

        Graphics.glObjs.cBuffer = gl.createBuffer();
        Graphics.glObjs.vColor = gl.getAttribLocation( program, 'vColor' );

        Graphics.glObjs.vBuffer = gl.createBuffer();
        Graphics.glObjs.vPosition = gl.getAttribLocation( program, 'vPosition' );

        Graphics.matrixLocs.modelMatrixLoc = gl.getUniformLocation( program, 'model' );
        Graphics.matrixLocs.viewMatrixLoc = gl.getUniformLocation( program, 'view' );
        Graphics.matrixLocs.projectionMatrixLoc = gl.getUniformLocation( program, 'projection' );

        var offset = .3 * 4 + .35 * 3;
        Graphics.matrices.modelMatrix = mat4();
        Graphics.matrices.viewMatrix = lookAt( vec3( offset, -5, 5 ), vec3( offset, offset, 0 ), vec3( 0, 1, 1 ) );
        Graphics.matrices.projectionMatrix = perspective( 45, 1, 1, 20 );

        // Initialize board data
        Graphics.initBoard();
    }
    , initBoard: function() {
        var board = {
            points: []
            , colors: []
        };

        // Use board coordinates to specify which square
        // x is left to right, y is top to bottom
        var boardSquare = function( x, y ) {
            var points = [], colors = [];
            var boardColor = [ .259, .957, .306, 1.0 ];
            var squareSize = 0.3;
            var gapSize = 0.05;
            var xOffset = x * ( 2 * squareSize + gapSize );
            var yOffset = y * ( 2 * squareSize + gapSize );
            var vertices = [
                vec4( -squareSize + xOffset, -squareSize + yOffset, 0, 1.0 )
                , vec4( -squareSize + xOffset, squareSize + yOffset, 0, 1.0 )
                , vec4( squareSize + xOffset, -squareSize + yOffset, 0, 1.0 )
                , vec4( squareSize + xOffset, squareSize + yOffset, 0, 1.0 )
            ];

            return Graphics.quad( 0, 1, 2, 3, vertices, boardColor );
        }

        for ( var i = 0 ; i < 8 ; ++i ) {
            for ( var j = 0 ; j < 8 ; ++j ) {
                var square = boardSquare( i, j );
                board.points = board.points.concat( square.points );
                board.colors = board.colors.concat( square.colors );
            }
        }

        Graphics.board = board;

        Graphics.render();
    }
    , quad: function( a, b, c, d, vertices, color ) {
        var indices = [ a, b, c, b, c, d ];
        var quadStructure = { points: [], colors: [] };

        for ( var i = 0 ; i < indices.length ; ++i ) {
            quadStructure.points.push( vertices[ indices[ i ] ] );
            quadStructure.colors.push( color );
        }

        return quadStructure;
    }
    , render: function() {
        gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT );

        // Draw board
        gl.bindBuffer( gl.ARRAY_BUFFER, Graphics.glObjs.cBuffer );
        gl.bufferData( gl.ARRAY_BUFFER, flatten( Graphics.board.colors ), gl.STATIC_DRAW );

        gl.vertexAttribPointer( Graphics.glObjs.vColor, 4, gl.FLOAT, false, 0, 0 );
        gl.enableVertexAttribArray( Graphics.glObjs.vColor );

        gl.bindBuffer( gl.ARRAY_BUFFER, Graphics.glObjs.vBuffer );
        gl.bufferData( gl.ARRAY_BUFFER, flatten( Graphics.board.points ), gl.STATIC_DRAW );

        gl.vertexAttribPointer( Graphics.glObjs.vPosition, 4, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray( Graphics.glObjs.vPosition );

        gl.uniformMatrix4fv( Graphics.matrixLocs.projectionMatrixLoc, false, flatten( Graphics.matrices.projectionMatrix ) );
        gl.uniformMatrix4fv( Graphics.matrixLocs.viewMatrixLoc, false, flatten( Graphics.matrices.viewMatrix ) );
        gl.uniformMatrix4fv( Graphics.matrixLocs.modelMatrixLoc, false, flatten( Graphics.matrices.modelMatrix ) );

        gl.drawArrays( gl.TRIANGLES, 0, Graphics.board.points.length );

        requestAnimFrame( Graphics.render );
    }
    , glObjs: {}
    , matrices: {}
    , matrixLocs: {}
    , board: {}
    , pieces: {}
};
