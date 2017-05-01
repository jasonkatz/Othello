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

        // Load shaders and initialize attribute buffers
        var program = initShaders( gl, 'vertex-shader', 'fragment-shader' );
        gl.useProgram( program );

        Graphics.glObjs.cBuffer = gl.createBuffer();
        Graphics.glObjs.vColor = gl.getAttribLocation( program, 'vColor' );

        Graphics.glObjs.vBuffer = gl.createBuffer();
        Graphics.glObjs.vPosition = gl.getAttribLocation( program, 'vPosition' );

        Graphics.glObjs.nBuffer = gl.createBuffer();
        Graphics.glObjs.vNormal = gl.getAttribLocation( program, 'vNormal' );

        Graphics.lighting.ambientProductLoc = gl.getUniformLocation( program, 'ambientProduct' );
        Graphics.lighting.diffuseProductLoc = gl.getUniformLocation( program, 'diffuseProduct' );
        Graphics.lighting.specularProductLoc = gl.getUniformLocation( program, 'specularProduct' );
        Graphics.lighting.lightPosition1Loc = gl.getUniformLocation( program, 'lightPosition1' );
        Graphics.lighting.lightPosition2Loc = gl.getUniformLocation( program, 'lightPosition2' );
        Graphics.lighting.shininessLoc = gl.getUniformLocation( program, 'shininess' );

        Graphics.matrixLocs.modelMatrixLoc = gl.getUniformLocation( program, 'model' );
        Graphics.matrixLocs.viewMatrixLoc = gl.getUniformLocation( program, 'view' );
        Graphics.matrixLocs.projectionMatrixLoc = gl.getUniformLocation( program, 'projection' );

        Graphics.lighting.ambientProduct = mult( vec4( .3, .3, .3, 1 ), vec4( 1, 1, 1, 1 ) );
        Graphics.lighting.diffuseProduct = mult( vec4( 1, 1, 1, 1 ), vec4( 1, .8, 0, 1 ) );
        Graphics.lighting.specularProduct = mult( vec4( 1, 1, 1, 1 ), vec4( 1, .8, 0, 1 ) );
        Graphics.lighting.lightPosition1 = vec4( -4, 0, 8, 1 );
        Graphics.lighting.lightPosition2 = vec4( 4, 0, 8, 1 );
        Graphics.lighting.shininess = 100;

        var offset = 4 * Graphics.props.squareSize + 4.5 * Graphics.props.gapSize;
        Graphics.props.cameraLoc = [ offset, -5, 5 ];
        Graphics.matrices.modelMatrix = mat4();
        Graphics.matrices.viewMatrix = lookAt( vec3( Graphics.props.cameraLoc ), vec3( offset, offset, 0 ), vec3( 0, 1, 1 ) );
        Graphics.matrices.projectionMatrix = perspective( 45, 1, 1, 20 );

        // Initialize board data
        Graphics.initBoard();

        // Set up click listener
        canvas.addEventListener( 'click', function( e ) {
            var unproject = function( winX, winY, winZ ) {
                // winZ is either 0 (near plane), 1 (far plane) or somewhere in between.
                // if it's not given a value we'll produce coords for both.
                if ( typeof( winZ ) == 'number' ) {
                    winX = parseFloat( winX );
                    winY = parseFloat( winY );
                    winZ = parseFloat( winZ );

                    var inf = [];
                    var mm = Graphics.matrices.viewMatrix, pm = Graphics.matrices.projectionMatrix;
                    var viewport = [ 0, 0, canvas.width, canvas.height ];

                    //Calculation for inverting a matrix, compute projection x modelview; then compute the inverse
                    var m = inverse4( mult( pm, inverse( mm ) ) );

                    // Transformation of normalized coordinates between -1 and 1
                    inf[0] = ( winX - viewport[0] ) / viewport[2] * 2.0 - 1.0;
                    inf[1] = ( winY - viewport[1] ) / viewport[3] * 2.0 - 1.0;
                    inf[2] = 2.0 * winZ - 1.0;
                    inf[3] = 1.0;

                    //Objects coordinates
                    var out = vec3();
                    out = mult( m, inf );
                    if( out[3] == 0.0 ) {
                        return null;
                    }

                    out[3] = 1.0 / out[3];
                    return [ out[0]*out[3], out[1]*out[3], out[2]*out[3] ];
                } else {
                    return [ unproject( winX, winY, 0 ), unproject( winX, winY, 1 ) ];
                }
            };

            var x;
            var y;
            if (e.pageX || e.pageY) {
                x = e.pageX;
                y = e.pageY;
            } else {
                x = e.clientX + document.body.scrollLeft + document.documentElement.scrollLeft;
                y = e.clientY + document.body.scrollTop + document.documentElement.scrollTop;
            }
            x -= canvas.offsetLeft;
            y -= canvas.offsetTop;
            var v = unproject( x, y );
            console.log( v );
        }, false );

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
    , addPiece: function( x, y, isFlipped ) {
        // Use board coordinates to specify the piece location
        var piece = Graphics.cylinder();

        var xOffset = Graphics.props.gapSize + Graphics.props.squareSize / 2 + x * ( Graphics.props.gapSize + Graphics.props.squareSize );
        var yOffset = Graphics.props.gapSize + Graphics.props.squareSize / 2 + y * ( Graphics.props.gapSize + Graphics.props.squareSize );

        piece.transform = mat4();
        if ( isFlipped ) {
            piece.transform = mult( rotateY( 180 ), piece.transform );
        }
        piece.transform = mult( translate( xOffset, yOffset, Graphics.props.pieceHeight / 2 ), piece.transform );
        piece.x = x;
        piece.y = y;

        Graphics.pieces.push( piece );
    }
    , flipPiece: function( x, y ) {
        Graphics.state.isMoving = true;
        Graphics.state.isMovingUp = true;
        Graphics.state.movingPieces.push( { x: x, y: y } );
    }
    , quad: function( a, b, c, d, vertices, color ) {
        var indices = [ a, b, c, b, c, d ];
        var quadStructure = { points: [], colors: [], normals: [] };
        var normal = vec4( normalize( cross( subtract( vertices[ b ], vertices[ a ] ), subtract( vertices[ c ], vertices[ a ] ) ) ) );

        for ( var i = 0 ; i < indices.length ; ++i ) {
            quadStructure.points.push( vertices[ indices[ i ] ] );
            quadStructure.colors.push( color );
            quadStructure.normals.push( normal );
        }

        return quadStructure;
    }
    , cylinder: function() {
        var theta = ( Math.PI / 180 ) * ( 360 / Graphics.props.pieceSegments );

        var cylinderBottom = function() {
            var bottomStructure = { points: [], colors: [], normals: [] };
            var normal = vec4( 0, 0, -1 );

            for ( var i = 0 ; i < Graphics.props.pieceSegments ; ++i ) {
                var x = Graphics.props.pieceRadius * Math.cos( theta * i );
                var y = Graphics.props.pieceRadius * Math.sin( theta * i );

                bottomStructure.points.push( [ x, y, -Graphics.props.pieceHeight / 2, 1.0 ] );
                bottomStructure.colors.push( Graphics.props.pieceWhite );
                bottomStructure.normals.push( normal );
            }

            return bottomStructure;
        };

        var cylinderTop = function() {
            var topStructure = { points: [], colors: [], normals: [] };
            var normal = vec4( 0, 0, 1 );

            for ( var i = 0 ; i < Graphics.props.pieceSegments ; ++i ) {
                var x = Graphics.props.pieceRadius * Math.cos( theta * i );
                var y = Graphics.props.pieceRadius * Math.sin( theta * i );

                topStructure.points.push( [ x, y, Graphics.props.pieceHeight / 2, 1.0 ] );
                topStructure.colors.push( Graphics.props.pieceBlack );
                topStructure.normals.push( normal );
            }

            return topStructure;
        };

        var cylinderSides = function() {
            var sideStructure = { points: [], colors: [], normals: [] };

            for ( var i = 0 ; i < Graphics.props.pieceSegments ; ++i ) {
                var x = Graphics.props.pieceRadius * Math.cos( theta * i );
                var y = Graphics.props.pieceRadius * Math.sin( theta * i );
                var xOffset = Graphics.props.pieceRadius * Math.cos( theta * ( i + 1 ) );
                var yOffset = Graphics.props.pieceRadius * Math.sin( theta * ( i + 1 ) );

                // Switch colors at the midpoint
                var bottomVertices = [
                    vec4( x, y, -Graphics.props.pieceHeight / 2, 1.0 )
                    , vec4( xOffset, yOffset, -Graphics.props.pieceHeight / 2, 1.0 )
                    , vec4( x, y, 0.0, 1.0 )
                    , vec4( xOffset, yOffset, 0.0, 1.0 )
                ];
                var topVertices = [
                    vec4( x, y, 0.0, 1.0 )
                    , vec4( xOffset, yOffset, 0.0, 1.0 )
                    , vec4( x, y, Graphics.props.pieceHeight / 2, 1.0 )
                    , vec4( xOffset, yOffset, Graphics.props.pieceHeight / 2, 1.0 )
                ];
                var bottomQuad = Graphics.quad( 0, 1, 2, 3, bottomVertices, Graphics.props.pieceWhite );
                var topQuad = Graphics.quad( 0, 1, 2, 3, topVertices, Graphics.props.pieceBlack );

                sideStructure.points = sideStructure.points.concat( bottomQuad.points );
                sideStructure.colors = sideStructure.colors.concat( bottomQuad.colors );
                sideStructure.normals = sideStructure.colors.concat( bottomQuad.normals );
                sideStructure.points = sideStructure.points.concat( topQuad.points );
                sideStructure.colors = sideStructure.colors.concat( topQuad.colors );
                sideStructure.normals = sideStructure.colors.concat( topQuad.normals );
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
    , count: 0
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

            gl.bindBuffer( gl.ARRAY_BUFFER, Graphics.glObjs.nBuffer );
            gl.bufferData( gl.ARRAY_BUFFER, flatten( square.normals ), gl.STATIC_DRAW );

            gl.vertexAttribPointer( Graphics.glObjs.vNormal, 4, gl.FLOAT, false, 0, 0);
            gl.enableVertexAttribArray( Graphics.glObjs.vNormal );

            gl.uniform4fv( Graphics.lighting.ambientProductLoc, Graphics.lighting.ambientProduct );
            gl.uniform4fv( Graphics.lighting.diffuseProductLoc, Graphics.lighting.diffuseProduct );
            gl.uniform4fv( Graphics.lighting.specularProductLoc, Graphics.lighting.specularProduct );
            gl.uniform4fv( Graphics.lighting.lightPosition1Loc, Graphics.lighting.lightPosition1 );
            gl.uniform4fv( Graphics.lighting.lightPosition2Loc, Graphics.lighting.lightPosition2 );
            gl.uniform1f( Graphics.lighting.shininessLoc, Graphics.lighting.shininess );

            gl.uniformMatrix4fv( Graphics.matrixLocs.projectionMatrixLoc, false, flatten( Graphics.matrices.projectionMatrix ) );
            gl.uniformMatrix4fv( Graphics.matrixLocs.viewMatrixLoc, false, flatten( Graphics.matrices.viewMatrix ) );
            gl.uniformMatrix4fv( Graphics.matrixLocs.modelMatrixLoc, false, flatten( squareModelMatrix ) );

            gl.drawArrays( gl.TRIANGLES, 0, square.points.length );
        }

        // Transform moving pieces
        if ( Graphics.state.isMoving ) {
            if ( Graphics.state.isMovingUp && !Graphics.state.isRotating &&
                Graphics.state.moveZ >= 2 * Graphics.props.pieceRadius ) {
                Graphics.state.isRotating = true;
            } else if ( Graphics.state.isMovingUp && Graphics.state.isRotating &&
                        Graphics.state.moveTheta >= 90 ) {
                Graphics.state.isMovingUp = false;
                Graphics.state.isMovingDown = true;
            } else if ( Graphics.state.isMovingDown && Graphics.state.isRotating &&
                        Graphics.state.moveTheta >= 180 ) {
                Graphics.state.isRotating = false;
            } else if ( Graphics.state.isMovingDown && !Graphics.state.isRotating &&
                        Graphics.state.moveZ - Graphics.props.vertMoveSpeed <= 0 ) {
                Graphics.state.isMovingDown = false;
                Graphics.state.isMoving = false;
                Graphics.state.movingPieces = [];
                Graphics.state.moveZ = 0;
                Graphics.state.moveTheta = 0;
            }

            var xfm = mat4();
            var dZ = Graphics.props.vertMoveSpeed;
            if ( Graphics.state.isMovingUp ) {
                ++Graphics.count;
                Graphics.state.moveZ += dZ;
                xfm = mult( translate( 0, 0, dZ ), xfm );
            } else if ( Graphics.state.isMovingDown ) {
                --Graphics.count;
                Graphics.state.moveZ -= dZ;
                xfm = mult( translate( 0, 0, -dZ ), xfm );
            }

            var dTheta = Graphics.props.rotMoveSpeed;
            if ( Graphics.state.isRotating ) {
                Graphics.state.moveTheta += dTheta;
                xfm = mult( rotateY( dTheta ), xfm );
            }

            for ( var i = 0 ; i < Graphics.state.movingPieces.length ; ++i ) {
                for ( var j = 0 ; j < Graphics.pieces.length ; ++j ) {
                    if ( Graphics.pieces[ j ].x == Graphics.state.movingPieces[ i ].x &&
                         Graphics.pieces[ j ].y == Graphics.state.movingPieces[ i ].y ) {
                        var piece = Graphics.pieces[ j ];
                        var xOffset = piece.transform[ 0 ][ 3 ];
                        var yOffset = piece.transform[ 1 ][ 3 ];
                        var zOffset = piece.transform[ 2 ][ 3 ];

                        piece.transform = mult( translate( -xOffset, -yOffset, -zOffset ), piece.transform );
                        piece.transform = mult( xfm, piece.transform );
                        piece.transform = mult( translate( xOffset, yOffset, zOffset ), piece.transform );
                    }
                }
            }
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

            gl.bindBuffer( gl.ARRAY_BUFFER, Graphics.glObjs.nBuffer );
            gl.bufferData( gl.ARRAY_BUFFER, flatten( piece.bottom.normals ), gl.STATIC_DRAW );

            gl.vertexAttribPointer( Graphics.glObjs.vNormal, 4, gl.FLOAT, false, 0, 0);
            gl.enableVertexAttribArray( Graphics.glObjs.vNormal );

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

            gl.bindBuffer( gl.ARRAY_BUFFER, Graphics.glObjs.nBuffer );
            gl.bufferData( gl.ARRAY_BUFFER, flatten( piece.top.normals ), gl.STATIC_DRAW );

            gl.vertexAttribPointer( Graphics.glObjs.vNormal, 4, gl.FLOAT, false, 0, 0);
            gl.enableVertexAttribArray( Graphics.glObjs.vNormal );

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

            gl.bindBuffer( gl.ARRAY_BUFFER, Graphics.glObjs.nBuffer );
            gl.bufferData( gl.ARRAY_BUFFER, flatten( piece.sides.normals ), gl.STATIC_DRAW );

            gl.vertexAttribPointer( Graphics.glObjs.vNormal, 4, gl.FLOAT, false, 0, 0);
            gl.enableVertexAttribArray( Graphics.glObjs.vNormal );

            gl.uniformMatrix4fv( Graphics.matrixLocs.projectionMatrixLoc, false, flatten( Graphics.matrices.projectionMatrix ) );
            gl.uniformMatrix4fv( Graphics.matrixLocs.viewMatrixLoc, false, flatten( Graphics.matrices.viewMatrix ) );
            gl.uniformMatrix4fv( Graphics.matrixLocs.modelMatrixLoc, false, flatten( pieceModelMatrix ) );

            gl.drawArrays( gl.TRIANGLES, 0, piece.sides.points.length );
        }

        requestAnimFrame( Graphics.render );
    }
    , props: {
        squareSize: 0.6
        , gapSize: 0.05
        , cameraLoc: []
        , boardColor: [ 0.259, 0.957, 0.306, 1.0 ]
        , pieceSegments: 32
        , pieceRadius: 0.2
        , pieceHeight: 0.1
        , pieceWhite: [ 1.0, 1.0, 1.0, 1.0 ]
        , pieceBlack: [ 0.0, 0.0, 0.0, 1.0 ]
        , vertMoveSpeed: .1
        , rotMoveSpeed: 10
    }
    , state: {
        isMoving: false
        , isMovingUp: false
        , isMovingDown: false
        , movingPieces: []
        , moveZ: 0
        , moveTheta: 0
    }
    , glObjs: {}
    , matrices: {}
    , matrixLocs: {}
    , board: {
        squares: []
    }
    , pieces: []
    , lighting: {}
};
