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

        Graphics.glObjs.tBuffer = gl.createBuffer();
        Graphics.glObjs.vTexCoord = gl.getAttribLocation( program, 'vTexCoord' );

        Graphics.lighting.ambientProductLoc = gl.getUniformLocation( program, 'ambientProduct' );
        Graphics.lighting.diffuseProductLoc = gl.getUniformLocation( program, 'diffuseProduct' );
        Graphics.lighting.specularProductLoc = gl.getUniformLocation( program, 'specularProduct' );
        Graphics.lighting.lightPositionLoc = gl.getUniformLocation( program, 'lightPosition' );
        Graphics.lighting.shininessLoc = gl.getUniformLocation( program, 'shininess' );

        Graphics.matrixLocs.modelMatrixLoc = gl.getUniformLocation( program, 'model' );
        Graphics.matrixLocs.viewMatrixLoc = gl.getUniformLocation( program, 'view' );
        Graphics.matrixLocs.projectionMatrixLoc = gl.getUniformLocation( program, 'projection' );

        Graphics.textures.textureLoc = gl.getUniformLocation( program, 'texture' );

        Graphics.lighting.ambientProduct = mult( vec4( .5, .5, .5, 1 ), vec4( 1, 1, 1, 1 ) );
        Graphics.lighting.diffuseProduct = mult( vec4( 1, 1, 1, 1 ), vec4( 1, .8, 0, 1 ) );
        Graphics.lighting.specularProduct = mult( vec4( 1, 1, 1, 1 ), vec4( 1, .8, 0, 1 ) );
        Graphics.lighting.lightPosition = vec4( 0, 0, 15, 1 );
        Graphics.lighting.shininess = 100;

        var offset = 4 * Graphics.props.squareSize + 4.5 * Graphics.props.gapSize;
        Graphics.props.cameraLoc = [ offset, -5, 5 ];
        Graphics.matrices.modelMatrix = mat4();
        Graphics.matrices.viewMatrix = lookAt( vec3( Graphics.props.cameraLoc ), vec3( offset, offset, 0 ), vec3( 0, 1, 1 ) );
        Graphics.matrices.projectionMatrix = perspective( 45, 1, 1, 20 );

        // Initialize textures
        var image = document.getElementById( Graphics.props.textureId );
        image.onload = function() {
            Graphics.glObjs.texture = gl.createTexture();
            gl.bindTexture( gl.TEXTURE_2D, Graphics.glObjs.texture );
            gl.pixelStorei( gl.UNPACK_FLIP_Y_WEBGL, true );
            gl.texImage2D( gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image );
            gl.generateMipmap( gl.TEXTURE_2D );
            gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST_MIPMAP_LINEAR );
            gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST );
        };

        Graphics.reset();

        // Initialize board data
        Graphics.initBoard();

        if ( Graphics.state.animFrameId ) {
            cancelAnimationFrame( Graphics.state.animFrameId );
            Graphics.state.animFrameId = undefined;
        }
        Graphics.state.animFrameId = requestAnimationFrame( Graphics.render );
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
            var texCoords = [
                vec2( 0, 0 )
                , vec2( 0, 1 )
                , vec2( 1, 0 )
                , vec2( 1, 1 )
            ];

            var square = Graphics.quad( 0, 1, 2, 3, vertices, Graphics.props.boardColor, texCoords );
            var xOffset = Graphics.props.gapSize + x * ( Graphics.props.gapSize + Graphics.props.squareSize );
            var yOffset = Graphics.props.gapSize + y * ( Graphics.props.gapSize + Graphics.props.squareSize );
            square.transform = translate( xOffset, yOffset, 0 );
            square.x = x;
            square.y = y;

            return square;
        };

        for ( var i = 0 ; i < 8 ; ++i ) {
            for ( var j = 0 ; j < 8 ; ++j ) {
                Graphics.board.squares.push( boardSquare( i, j ) );
            }
        }
    }
    , addPiece: function( x, y, player, isGhost ) {
        // Use board coordinates to specify the piece location
        var piece = Graphics.cylinder( isGhost );

        var xOffset = Graphics.props.gapSize + Graphics.props.squareSize / 2 + x * ( Graphics.props.gapSize + Graphics.props.squareSize );
        var yOffset = Graphics.props.gapSize + Graphics.props.squareSize / 2 + y * ( Graphics.props.gapSize + Graphics.props.squareSize );

        piece.transform = mat4();
        if ( !player ) {
            piece.transform = mult( rotateY( 180 ), piece.transform );
        }
        piece.transform = mult( translate( xOffset, yOffset, Graphics.props.pieceHeight / 2 ), piece.transform );
        piece.x = x;
        piece.y = y;

        Graphics.pieces.push( piece );
    }
    , flipPieces: function( pieces, doneMovingCallback ) {
        Graphics.state.isMoving = true;
        Graphics.state.isMovingUp = true;
        Graphics.state.movingPieces = Graphics.state.movingPieces.concat( pieces );
        Graphics.state.doneMovingCallback = doneMovingCallback;
    }
    , setLegalMoves: function( moves ) {
        Graphics.state.legalMoves = moves;
    }
    , addGhost: function( x, y, player ) {
        Graphics.state.ghostCoords = { x: x, y: y };
        Graphics.addPiece( x, y, player, true );
    }
    , removeGhost: function() {
        if ( Graphics.state.ghostCoords == undefined ) {
            return;
        }

        for ( var i = 0 ; i < Graphics.pieces.length ; ++i ) {
            if ( Graphics.pieces[ i ].x == Graphics.state.ghostCoords.x && Graphics.pieces[ i ].y == Graphics.state.ghostCoords.y ) {
                Graphics.pieces.splice( i, 1 );
            }
        }
        Graphics.state.ghostCoords = undefined;
    }
    , quad: function( a, b, c, d, vertices, color, texCoords ) {
        var indices = [ a, b, c, b, c, d ];
        var quadStructure = { points: [], colors: [], normals: [], texCoords: [] };
        var normal = vec4( normalize( cross( subtract( vertices[ b ], vertices[ a ] ), subtract( vertices[ c ], vertices[ a ] ) ) ) );

        for ( var i = 0 ; i < indices.length ; ++i ) {
            quadStructure.points.push( vertices[ indices[ i ] ] );
            quadStructure.colors.push( color );
            quadStructure.normals.push( normal );
            if ( texCoords ) {
                quadStructure.texCoords.push( texCoords[ indices[ i ] ] );
            }
        }

        return quadStructure;
    }
    , cylinder: function( isGhost ) {
        var theta = ( Math.PI / 180 ) * ( 360 / Graphics.props.pieceSegments );

        var cylinderBottom = function( isGhost ) {
            var bottomStructure = { points: [], colors: [], normals: [] };
            var normal = vec4( 0, 0, -1 );

            for ( var i = 0 ; i < Graphics.props.pieceSegments ; ++i ) {
                var x = Graphics.props.pieceRadius * Math.cos( theta * i );
                var y = Graphics.props.pieceRadius * Math.sin( theta * i );

                bottomStructure.points.push( [ x, y, -Graphics.props.pieceHeight / 2, 1.0 ] );
                bottomStructure.colors.push( isGhost ? Graphics.props.ghostWhite : Graphics.props.pieceWhite );
                bottomStructure.normals.push( normal );
            }

            return bottomStructure;
        };

        var cylinderTop = function( isGhost ) {
            var topStructure = { points: [], colors: [], normals: [] };
            var normal = vec4( 0, 0, 1 );

            for ( var i = 0 ; i < Graphics.props.pieceSegments ; ++i ) {
                var x = Graphics.props.pieceRadius * Math.cos( theta * i );
                var y = Graphics.props.pieceRadius * Math.sin( theta * i );

                topStructure.points.push( [ x, y, Graphics.props.pieceHeight / 2, 1.0 ] );
                topStructure.colors.push( isGhost ? Graphics.props.ghostBlack : Graphics.props.pieceBlack );
                topStructure.normals.push( normal );
            }

            return topStructure;
        };

        var cylinderSides = function( isGhost ) {
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
                var bottomQuad = Graphics.quad( 0, 1, 2, 3, bottomVertices, isGhost ? Graphics.props.ghostWhite : Graphics.props.pieceWhite );
                var topQuad = Graphics.quad( 0, 1, 2, 3, topVertices, isGhost ? Graphics.props.ghostBlack : Graphics.props.pieceBlack );

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
            bottom: cylinderBottom( isGhost )
            , top: cylinderTop( isGhost )
            , sides: cylinderSides( isGhost )
        };

        return cylinderStructure;
    }
    , count: 0
    , render: function() {
        gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT );
        gl.clearColor( 0, 0, 0, 0.1 );

        // Draw board
        Graphics.lighting.ambientProduct = mult( vec4( .5, .5, .5, 1 ), vec4( 1, 1, 1, 1 ) );
        for ( var i = 0 ; i < Graphics.board.squares.length ; ++i ) {
            var square = Graphics.board.squares[ i ];

            for ( var j = 0 ; j < Graphics.state.legalMoves.length ; ++j ) {
                if ( square.x == Graphics.state.legalMoves[ j ].x &&
                     square.y == Graphics.state.legalMoves[ j ].y ) {
                    Graphics.lighting.lightPosition = vec4( 0, 0, 5, 1 );
                    break;
                } else {
                    Graphics.lighting.lightPosition = vec4( 0, 0, 15, 1 );
                }
            }

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

            gl.bindBuffer( gl.ARRAY_BUFFER, Graphics.glObjs.tBuffer );
            gl.bufferData( gl.ARRAY_BUFFER, flatten( square.texCoords ), gl.STATIC_DRAW );

            gl.vertexAttribPointer( Graphics.glObjs.vTexCoord, 2, gl.FLOAT, false, 0, 0);
            gl.enableVertexAttribArray( Graphics.glObjs.vTexCoord );

            gl.uniform4fv( Graphics.lighting.ambientProductLoc, Graphics.lighting.ambientProduct );
            gl.uniform4fv( Graphics.lighting.diffuseProductLoc, Graphics.lighting.diffuseProduct );
            gl.uniform4fv( Graphics.lighting.specularProductLoc, Graphics.lighting.specularProduct );
            gl.uniform4fv( Graphics.lighting.lightPositionLoc, Graphics.lighting.lightPosition );
            gl.uniform1f( Graphics.lighting.shininessLoc, Graphics.lighting.shininess );

            gl.uniform1i( Graphics.textures.textureLoc, 0 );

            gl.uniformMatrix4fv( Graphics.matrixLocs.projectionMatrixLoc, false, flatten( Graphics.matrices.projectionMatrix ) );
            gl.uniformMatrix4fv( Graphics.matrixLocs.viewMatrixLoc, false, flatten( Graphics.matrices.viewMatrix ) );
            gl.uniformMatrix4fv( Graphics.matrixLocs.modelMatrixLoc, false, flatten( squareModelMatrix ) );

            gl.drawArrays( gl.TRIANGLES, 0, square.points.length );

            gl.disableVertexAttribArray( Graphics.glObjs.vPosition );
            gl.disableVertexAttribArray( Graphics.glObjs.vColor );
            gl.disableVertexAttribArray( Graphics.glObjs.vNormal );
            gl.disableVertexAttribArray( Graphics.glObjs.vTexCoord );
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
                Graphics.state.doneMovingCallback();
                Graphics.state.doneMovingCallback = undefined;
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
        Graphics.lighting.ambientProduct = mult( vec4( 5, 5, 5, 1 ), vec4( 1, 1, 1, 1 ) );
        Graphics.lighting.lightPosition = vec4( 0, 0, 15, 1 );
        gl.uniform4fv( Graphics.lighting.ambientProductLoc, Graphics.lighting.ambientProduct );
        gl.uniform4fv( Graphics.lighting.diffuseProductLoc, Graphics.lighting.diffuseProduct );
        gl.uniform4fv( Graphics.lighting.specularProductLoc, Graphics.lighting.specularProduct );
        gl.uniform4fv( Graphics.lighting.lightPositionLoc, Graphics.lighting.lightPosition );
        gl.uniform1f( Graphics.lighting.shininessLoc, Graphics.lighting.shininess );
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

            gl.disableVertexAttribArray( Graphics.glObjs.vPosition );
            gl.disableVertexAttribArray( Graphics.glObjs.vColor );
            gl.disableVertexAttribArray( Graphics.glObjs.vNormal );

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

            gl.disableVertexAttribArray( Graphics.glObjs.vPosition );
            gl.disableVertexAttribArray( Graphics.glObjs.vColor );
            gl.disableVertexAttribArray( Graphics.glObjs.vNormal );

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

            gl.disableVertexAttribArray( Graphics.glObjs.vPosition );
            gl.disableVertexAttribArray( Graphics.glObjs.vColor );
            gl.disableVertexAttribArray( Graphics.glObjs.vNormal );
        }

        Graphics.state.animFrameId = requestAnimationFrame( Graphics.render );
    }
    , reset: function() {
        var animFrameId = undefined;
        if ( Graphics.state && Graphics.state.animFrameId ) {
            animFrameId = Graphics.state.animFrameId;
        }
        Graphics.state = {
            isMoving: false
            , isMovingUp: false
            , isMovingDown: false
            , movingPieces: []
            , moveZ: 0
            , moveTheta: 0
            , doneMovingCallback: undefined
            , legalMoves: []
            , ghostCoords: undefined
            , animFrameId: animFrameId
        };
        Graphics.board = {
            squares: []
        };
        Graphics.pieces = [];
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
        , ghostWhite: [ 1.0, 1.0, 1.0, 0.5 ]
        , ghostBlack: [ 0.0, 0.0, 0.0, 0.5 ]
        , vertMoveSpeed: .1
        , rotMoveSpeed: 10
        , textureId: 'wood-tex-image'
    }
    , state: {}
    , glObjs: {}
    , matrices: {}
    , matrixLocs: {}
    , lighting: {}
    , textures: {}
};
