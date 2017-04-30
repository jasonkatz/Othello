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

        var offset = 4 * Graphics.props.squareSize + 4.5 * Graphics.props.gapSize;
        Graphics.matrices.modelMatrix = mat4();
        Graphics.matrices.viewMatrix = lookAt( vec3( offset, -5, 5 ), vec3( offset, offset, 0 ), vec3( 0, 1, 1 ) );
        Graphics.matrices.projectionMatrix = perspective( 45, 1, 1, 20 );

        // Initialize board data
        Graphics.initBoard();
        Graphics.initPieces();

        Graphics.render();
    }
    , initBoard: function() {
        // Use board coordinates to specify which square
        var boardSquare = function( x, y ) {
            var vertices = [
                vec4( 0, 0, 0, 1.0 )
                , vec4( Graphics.props.squareSize, 0, 0, 1.0 )
                , vec4( 0, Graphics.props.squareSize, 0, 1.0 )
                , vec4( Graphics.props.squareSize, Graphics.props.squareSize, 0, 1.0 )
            ];

            var square = Graphics.quad( 0, 1, 2, 3, vertices, Graphics.props.boardColor );
            var xOffset = Graphics.props.gapSize + x * ( Graphics.props.gapSize + Graphics.props.squareSize );
            var yOffset = Graphics.props.gapSize + y * ( Graphics.props.gapSize + Graphics.props.squareSize );
            square.transform = translate( xOffset, yOffset, 0 );

            return square;
        };

        for ( var i = 0 ; i < 8 ; ++i ) {
            for ( var j = 0 ; j < 8 ; ++j ) {
                Graphics.board.squares.push( boardSquare( i, j ) );
            }
        }
    }
    , initPieces: function() {
        // Use board coordinates to specify the piece location
        var piece = function( x, y ) {
            var piece = Graphics.cylinder();
            var xOffset = Graphics.props.gapSize + Graphics.props.squareSize / 2 + x * ( Graphics.props.gapSize + Graphics.props.squareSize );
            var yOffset = Graphics.props.gapSize + Graphics.props.squareSize / 2 + y * ( Graphics.props.gapSize + Graphics.props.squareSize );
            piece.transform = translate( xOffset, yOffset, 0 );

            return piece;
        };

        Graphics.pieces.push( piece( 3, 3 ) );
        Graphics.pieces.push( piece( 3, 4 ) );
        Graphics.pieces.push( piece( 4, 3 ) );
        Graphics.pieces.push( piece( 4, 4 ) );
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
    , cylinder: function() {
        var theta = ( Math.PI / 180 ) * ( 360 / Graphics.props.pieceSegments );

        var cylinderBottom = function() {
            var bottomStructure = { points: [], colors: [] };

            for ( var i = 0 ; i < Graphics.props.pieceSegments ; ++i ) {
                var x = Graphics.props.pieceRadius * Math.cos( theta * i );
                var y = Graphics.props.pieceRadius * Math.sin( theta * i );

                bottomStructure.points.push( [ x, y, 0, 1.0 ] );
                bottomStructure.colors.push( Graphics.props.pieceWhite );
            }

            return bottomStructure;
        };

        var cylinderTop = function() {
            var topStructure = { points: [], colors: [] };

            for ( var i = 0 ; i < Graphics.props.pieceSegments ; ++i ) {
                var x = Graphics.props.pieceRadius * Math.cos( theta * i );
                var y = Graphics.props.pieceRadius * Math.sin( theta * i );

                topStructure.points.push( [ x, y, Graphics.props.pieceHeight, 1.0 ] );
                topStructure.colors.push( Graphics.props.pieceBlack );
            }

            return topStructure;
        };

        var cylinderSides = function() {
            var sideStructure = { points: [], colors: [] };

            for ( var i = 0 ; i < Graphics.props.pieceSegments ; ++i ) {
                var x = Graphics.props.pieceRadius * Math.cos( theta * i );
                var y = Graphics.props.pieceRadius * Math.sin( theta * i );
                var xOffset = Graphics.props.pieceRadius * Math.cos( theta * ( i + 1 ) );
                var yOffset = Graphics.props.pieceRadius * Math.sin( theta * ( i + 1 ) );

                // Switch colors at the midpoint
                var bottomVertices = [
                    vec4( x, y, 0.0, 1.0 )
                    , vec4( xOffset, yOffset, 0.0, 1.0 )
                    , vec4( x, y, Graphics.props.pieceHeight / 2, 1.0 )
                    , vec4( xOffset, yOffset, Graphics.props.pieceHeight / 2, 1.0 )
                ];
                var topVertices = [
                    vec4( x, y, Graphics.props.pieceHeight / 2, 1.0 )
                    , vec4( xOffset, yOffset, Graphics.props.pieceHeight / 2, 1.0 )
                    , vec4( x, y, Graphics.props.pieceHeight, 1.0 )
                    , vec4( xOffset, yOffset, Graphics.props.pieceHeight, 1.0 )
                ];
                var bottomQuad = Graphics.quad( 0, 1, 2, 3, bottomVertices, Graphics.props.pieceWhite );
                var topQuad = Graphics.quad( 0, 1, 2, 3, topVertices, Graphics.props.pieceBlack );

                sideStructure.points = sideStructure.points.concat( bottomQuad.points );
                sideStructure.colors = sideStructure.colors.concat( bottomQuad.colors );
                sideStructure.points = sideStructure.points.concat( topQuad.points );
                sideStructure.colors = sideStructure.colors.concat( topQuad.colors );
            }

            return sideStructure;
        };

        var cylinderStructure = {
            bottom: cylinderBottom()
            , top: cylinderTop()
            , sides: cylinderSides()
        };

        return cylinderStructure;
    }
    , render: function() {
        gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT );

        // Draw board
        for ( var i = 0 ; i < Graphics.board.squares.length ; ++i ) {
            var square = Graphics.board.squares[ i ];

            // Transform the board square according to its transform matrix
            var squareModelMatrix = mult( Graphics.matrices.modelMatrix, square.transform );

            gl.bindBuffer( gl.ARRAY_BUFFER, Graphics.glObjs.cBuffer );
            gl.bufferData( gl.ARRAY_BUFFER, flatten( square.colors ), gl.STATIC_DRAW );

            gl.vertexAttribPointer( Graphics.glObjs.vColor, 4, gl.FLOAT, false, 0, 0 );
            gl.enableVertexAttribArray( Graphics.glObjs.vColor );

            gl.bindBuffer( gl.ARRAY_BUFFER, Graphics.glObjs.vBuffer );
            gl.bufferData( gl.ARRAY_BUFFER, flatten( square.points ), gl.STATIC_DRAW );

            gl.vertexAttribPointer( Graphics.glObjs.vPosition, 4, gl.FLOAT, false, 0, 0);
            gl.enableVertexAttribArray( Graphics.glObjs.vPosition );

            gl.uniformMatrix4fv( Graphics.matrixLocs.projectionMatrixLoc, false, flatten( Graphics.matrices.projectionMatrix ) );
            gl.uniformMatrix4fv( Graphics.matrixLocs.viewMatrixLoc, false, flatten( Graphics.matrices.viewMatrix ) );
            gl.uniformMatrix4fv( Graphics.matrixLocs.modelMatrixLoc, false, flatten( squareModelMatrix ) );

            gl.drawArrays( gl.TRIANGLES, 0, square.points.length );
        }

        // Draw pieces
        for ( var i = 0 ; i < Graphics.pieces.length ; ++i ) {
            var piece = Graphics.pieces[ i ];

            // Transform the piece according to its transform matrix
            var pieceModelMatrix = mult( Graphics.matrices.modelMatrix, piece.transform );

            // Draw bottom
            gl.bindBuffer( gl.ARRAY_BUFFER, Graphics.glObjs.cBuffer );
            gl.bufferData( gl.ARRAY_BUFFER, flatten( piece.bottom.colors ), gl.STATIC_DRAW );

            gl.vertexAttribPointer( Graphics.glObjs.vColor, 4, gl.FLOAT, false, 0, 0 );
            gl.enableVertexAttribArray( Graphics.glObjs.vColor );

            gl.bindBuffer( gl.ARRAY_BUFFER, Graphics.glObjs.vBuffer );
            gl.bufferData( gl.ARRAY_BUFFER, flatten( piece.bottom.points ), gl.STATIC_DRAW );

            gl.vertexAttribPointer( Graphics.glObjs.vPosition, 4, gl.FLOAT, false, 0, 0);
            gl.enableVertexAttribArray( Graphics.glObjs.vPosition );

            gl.uniformMatrix4fv( Graphics.matrixLocs.projectionMatrixLoc, false, flatten( Graphics.matrices.projectionMatrix ) );
            gl.uniformMatrix4fv( Graphics.matrixLocs.viewMatrixLoc, false, flatten( Graphics.matrices.viewMatrix ) );
            gl.uniformMatrix4fv( Graphics.matrixLocs.modelMatrixLoc, false, flatten( pieceModelMatrix ) );

            gl.drawArrays( gl.TRIANGLE_FAN, 0, piece.bottom.points.length );

            // Draw top
            gl.bindBuffer( gl.ARRAY_BUFFER, Graphics.glObjs.cBuffer );
            gl.bufferData( gl.ARRAY_BUFFER, flatten( piece.top.colors ), gl.STATIC_DRAW );

            gl.vertexAttribPointer( Graphics.glObjs.vColor, 4, gl.FLOAT, false, 0, 0 );
            gl.enableVertexAttribArray( Graphics.glObjs.vColor );

            gl.bindBuffer( gl.ARRAY_BUFFER, Graphics.glObjs.vBuffer );
            gl.bufferData( gl.ARRAY_BUFFER, flatten( piece.top.points ), gl.STATIC_DRAW );

            gl.vertexAttribPointer( Graphics.glObjs.vPosition, 4, gl.FLOAT, false, 0, 0);
            gl.enableVertexAttribArray( Graphics.glObjs.vPosition );

            gl.uniformMatrix4fv( Graphics.matrixLocs.projectionMatrixLoc, false, flatten( Graphics.matrices.projectionMatrix ) );
            gl.uniformMatrix4fv( Graphics.matrixLocs.viewMatrixLoc, false, flatten( Graphics.matrices.viewMatrix ) );
            gl.uniformMatrix4fv( Graphics.matrixLocs.modelMatrixLoc, false, flatten( pieceModelMatrix ) );

            gl.drawArrays( gl.TRIANGLE_FAN, 0, piece.top.points.length );

            // Draw sides
            gl.bindBuffer( gl.ARRAY_BUFFER, Graphics.glObjs.cBuffer );
            gl.bufferData( gl.ARRAY_BUFFER, flatten( piece.sides.colors ), gl.STATIC_DRAW );

            gl.vertexAttribPointer( Graphics.glObjs.vColor, 4, gl.FLOAT, false, 0, 0 );
            gl.enableVertexAttribArray( Graphics.glObjs.vColor );

            gl.bindBuffer( gl.ARRAY_BUFFER, Graphics.glObjs.vBuffer );
            gl.bufferData( gl.ARRAY_BUFFER, flatten( piece.sides.points ), gl.STATIC_DRAW );

            gl.vertexAttribPointer( Graphics.glObjs.vPosition, 4, gl.FLOAT, false, 0, 0);
            gl.enableVertexAttribArray( Graphics.glObjs.vPosition );

            gl.uniformMatrix4fv( Graphics.matrixLocs.projectionMatrixLoc, false, flatten( Graphics.matrices.projectionMatrix ) );
            gl.uniformMatrix4fv( Graphics.matrixLocs.viewMatrixLoc, false, flatten( Graphics.matrices.viewMatrix ) );
            gl.uniformMatrix4fv( Graphics.matrixLocs.modelMatrixLoc, false, flatten( pieceModelMatrix ) );

            gl.drawArrays( gl.TRIANGLES, 0, piece.sides.points.length );
        }

        requestAnimFrame( Graphics.render );
    }
    , glObjs: {}
    , matrices: {}
    , matrixLocs: {}
    , props: {
        squareSize: 0.6
        , gapSize: 0.05
        , boardColor: [ 0.259, 0.957, 0.306, 1.0 ]
        , pieceSegments: 32
        , pieceRadius: 0.2
        , pieceHeight: 0.2
        , pieceWhite: [ 1.0, 1.0, 1.0, 1.0 ]
        , pieceBlack: [ 0.0, 0.0, 0.0, 1.0 ]
    }
    , board: {
        squares: []
    }
    , pieces: []
};
