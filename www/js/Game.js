/*
Jason Katz
ECE-462 Project 2: Othello

File: Game.js
Description: Othello game logic
*/

"use strict";

var Game = {
    init: function() {
        for ( var i = 0 ; i < 8 ; ++i ) {
            Game.state.board[ i ] = [];
            for ( var j = 0 ; j < 8 ; ++j ) {
                Game.state.board[ i ][ j ] = undefined;
            }
        }

        Graphics.init();
        Interface.init();

        Game.addPiece( 3, 3, true );
        Game.addPiece( 3, 4, false );
        Game.addPiece( 4, 3, false );
        Game.addPiece( 4, 4, true );

        Game.waitForMove();
    }
    , addPiece: function( x, y, player ) {
        Game.state.board[ x ][ y ] = player;
        Graphics.addPiece( x, y, player );
    }
    , waitForMove: function() {
        Game.updateLegalMoves();
        Graphics.setLegalMoves( Game.state.legalMoves );
        Interface.newTurn( Game.state.currentPlayer, Game.state.legalMoves, Game.move, Game.addGhost, Game.removeGhost );
    }
    , updateLegalMoves: function() {
        var legalMoves = [];
        var playerLocs = [], enemyLocs = [];
        var b = Game.state.board;
        for ( var i = 0 ; i < 8 ; ++i ) {
            for ( var j = 0 ; j < 8 ; ++j ) {
                if ( b[ i ][ j ] == Game.state.currentPlayer ) {
                    playerLocs.push( { x: i, y: j } );
                } else if ( b[ i ][ j ] == !Game.state.currentPlayer ) {
                    enemyLocs.push( { x: i, y: j } );
                }
            }
        }


        //  For each enemy location
        //      Find adjacent open squares
        //      For each adjacent open square
        //          Check if that square is flanked by another friendly piece incident upon the current enemy piece
        for ( var i = 0 ; i < enemyLocs.length ; ++i ) {
            var emptyAdj = Game.getAdjacentLocations( enemyLocs[ i ], undefined );

            for ( var j = 0 ; j < emptyAdj.length ; ++j ) {
                // Don't check location if previously verified legal
                if ( legalMoves.find( function( obj ) {
                    return emptyAdj[ j ].x == obj.x && emptyAdj[ j ].y == obj.y;
                } ) ) {
                    continue;
                }

                // Check direction of adjacent square
                if ( emptyAdj[ j ].dir == 'RIGHT' ) {
                    // Empty on right, check squares to the left
                    var tmp = enemyLocs[ i ].x - 1;
                    while ( tmp >= 0 ) {
                        if ( b[ tmp ][ emptyAdj[ j ].y ] == undefined ) {
                            break;
                        }
                        if ( b[ tmp ][ emptyAdj[ j ].y ] == Game.state.currentPlayer ) {
                            legalMoves.push( emptyAdj[ j ] );
                            break;
                        }
                        --tmp;
                    }
                } else if ( emptyAdj[ j ].dir == 'DOWNRIGHT' ) {
                    // Empty on down right, check squares to the up left
                    var tmp1 = enemyLocs[ i ].x - 1, tmp2 = enemyLocs[ i ].y + 1;
                    while ( tmp1 >= 0 && tmp2 <= 7 ) {
                        if ( b[ tmp1 ][ tmp2 ] == undefined ) {
                            break;
                        }
                        if ( b[ tmp1 ][ tmp2 ] == Game.state.currentPlayer ) {
                            legalMoves.push( emptyAdj[ j ] );
                            break;
                        }
                        --tmp1;
                        ++tmp2;
                    }
                } else if ( emptyAdj[ j ].dir == 'DOWN' ) {
                    // Empty on down, check squares to the up
                    var tmp = enemyLocs[ i ].y + 1;
                    while ( tmp <= 7 ) {
                        if ( b[ emptyAdj[ j ].x ][ tmp ] == undefined ) {
                            break;
                        }
                        if ( b[ emptyAdj[ j ].x ][ tmp ] == Game.state.currentPlayer ) {
                            legalMoves.push( emptyAdj[ j ] );
                            break;
                        }
                        ++tmp;
                    }
                } else if ( emptyAdj[ j ].dir == 'DOWNLEFT' ) {
                    // Empty on down left, check squares to the up right
                    var tmp1 = enemyLocs[ i ].x + 1, tmp2 = enemyLocs[ i ].y + 1;
                    while ( tmp1 <= 7 && tmp2 <= 7 ) {
                        if ( b[ tmp1 ][ tmp2 ] == undefined ) {
                            break;
                        }
                        if ( b[ tmp1 ][ tmp2 ] == Game.state.currentPlayer ) {
                            legalMoves.push( emptyAdj[ j ] );
                            break;
                        }
                        ++tmp1;
                        ++tmp2;
                    }
                } else if ( emptyAdj[ j ].dir == 'LEFT' ) {
                    // Empty on left, check squares to the right
                    var tmp = enemyLocs[ i ].x + 1;
                    while ( tmp <= 7 ) {
                        if ( b[ tmp ][ emptyAdj[ j ].y ] == undefined ) {
                            break;
                        }
                        if ( b[ tmp ][ emptyAdj[ j ].y ] == Game.state.currentPlayer ) {
                            legalMoves.push( emptyAdj[ j ] );
                            break;
                        }
                        ++tmp;
                    }
                } else if ( emptyAdj[ j ].dir == 'UPLEFT' ) {
                    // Empty on up left, check squares to the down right
                    var tmp1 = enemyLocs[ i ].x + 1, tmp2 = enemyLocs[ i ].y - 1;
                    while( tmp1 <= 7 && tmp2 >= 0 ) {
                        if ( b[ tmp1 ][ tmp2 ] == undefined ) {
                            break;
                        }
                        if ( b[ tmp1 ][ tmp2 ] == Game.state.currentPlayer ) {
                            legalMoves.push( emptyAdj[ j ] );
                            break;
                        }
                        ++tmp1;
                        --tmp2;
                    }
                } else if ( emptyAdj[ j ].dir == 'UP' ) {
                    // Empty on up, check squares to the down
                    var tmp = enemyLocs[ i ].y - 1;
                    while ( tmp >= 0 ) {
                        if ( b[ emptyAdj[ j ].x ][ tmp ] == undefined ) {
                            break;
                        }
                        if ( b[ emptyAdj[ j ].x ][ tmp ] == Game.state.currentPlayer ) {
                            legalMoves.push( emptyAdj[ j ] );
                            break;
                        }
                        --tmp;
                    }
                } else if ( emptyAdj[ j ].dir == 'UPRIGHT' ) {
                    // Empty on up right, check squares to the down left
                    var tmp1 = enemyLocs[ i ].x - 1, tmp2 = enemyLocs[ i ].y - 1;
                    while ( tmp1 >= 0 && tmp2 >= 0 ) {
                        if ( b[ tmp1 ][ tmp2 ] == undefined ) {
                            break;
                        }
                        if ( b[ tmp1 ][ tmp2 ] == Game.state.currentPlayer ) {
                            legalMoves.push( emptyAdj[ j ] );
                            break;
                        }
                        --tmp1;
                        --tmp2;
                    }
                }
            }
        }

        Game.state.legalMoves = legalMoves;
    }
    , getUpdatedPieces( x, y ) {
        var changedPieces = [];
        var b = Game.state.board;
        var currentId = Game.state.currentPlayer;
        var enemyId = !Game.state.currentPlayer;
        
        // Check each direction for flanked enemies and add each one to changedPieces
        var adjEnemies = Game.getAdjacentLocations( { x: x, y: y }, enemyId );
        for ( var i = 0 ; i < adjEnemies.length ; ++i ) {
            // We can include duplicates here since checking for them is simply less efficient than process them twice (without repercussions)
            
            // Check direction of adjacent square
            if ( adjEnemies[ i ].dir == 'RIGHT' ) {
                // Create temporary array to keep track of valid pieces
                var tmpLocs = [];
                tmpLocs.push( adjEnemies[ i ] );

                // Enemy on the right, keep checking right
                var tmp = adjEnemies[ i ].x + 1;
                while ( tmp <= 7 ) {
                    if ( b[ tmp ][ y ] == undefined ) {
                        break;
                    } else if ( b[ tmp ][ y ] == enemyId ) {
                        tmpLocs.push( { x: tmp, y: y } );
                    } else if ( b[ tmp ][ y ] == currentId) {
                        for ( var j = 0 ; j < tmpLocs.length ; ++j ) {
                            changedPieces.push( tmpLocs[ j ] );
                        }
                        break;
                    }
                    ++tmp;
                }
            } else if ( adjEnemies[ i ].dir == 'DOWNRIGHT' ) {
                // Create temporary array to keep track of valid pieces
                tmpLocs = [];
                tmpLocs.push( adjEnemies[ i ] );

                // Enemy on down right, keep checking down right
                var tmp1 = adjEnemies[ i ].x + 1, tmp2 = adjEnemies[ i ].y - 1;
                while ( tmp1 <= 7 && tmp2 >= 0 ) {
                    if ( b[ tmp1 ][ tmp2 ] == undefined ) {
                        break;
                    } else if ( b[ tmp1 ][ tmp2 ] == enemyId ) {
                        tmpLocs.push( { x: tmp1, y: tmp2 } );
                    } else if ( b[ tmp1 ][ tmp2 ] == currentId ) {
                        for ( var j = 0 ; j < tmpLocs.length ; ++j ) {
                            changedPieces.push( tmpLocs[ j ] );
                        }
                        break;
                    }
                    ++tmp1;
                    --tmp2;
                }
            } else if ( adjEnemies[ i ].dir == 'DOWN' ) {
                // Create temporary array to keep track of valid pieces
                tmpLocs = [];
                tmpLocs.push( adjEnemies[ i ] );

                // Enemy on the down, keep checking down
                var tmp = adjEnemies[ i ].y - 1;
                while ( tmp >= 0 ) {
                    if ( b[ x ][ tmp ] == undefined ) {
                        break;
                    } else if ( b[ x ][ tmp ] == enemyId ) {
                        tmpLocs.push( { x: x, y: tmp } );
                    } else if ( b[ x ][ tmp ] == currentId ) {
                        for ( var j = 0 ; j < tmpLocs.length ; ++j ) {
                            changedPieces.push( tmpLocs[ j ] );
                        }
                        break;
                    }
                    --tmp;
                }
            } else if ( adjEnemies[ i ].dir == 'DOWNLEFT' ) {
                // Create temporary array to keep track of valid pieces
                tmpLocs = [];
                tmpLocs.push( adjEnemies[ i ] );

                // Enemy on down left, keep checking down left
                var tmp1 = adjEnemies[ i ].x - 1, tmp2 = adjEnemies[ i ].y - 1;
                while ( tmp1 >= 0 && tmp2 >= 0 ) {
                    if ( b[ tmp1 ][ tmp2 ] == undefined ) {
                        break;
                    } else if ( b[ tmp1 ][ tmp2 ] == enemyId ) {
                        tmpLocs.push( { x: tmp1, y: tmp2 } );
                    } else if ( b[ tmp1 ][ tmp2 ] == currentId ) {
                        for ( var j = 0 ; j < tmpLocs.length ; ++j ) {
                            changedPieces.push( tmpLocs[ j ] );
                        }
                        break;
                    }
                    --tmp1;
                    --tmp2;
                }
            } else if ( adjEnemies[ i ].dir == 'LEFT' ) {
                // Create temporary array to keep track of valid pieces
                tmpLocs = [];
                tmpLocs.push( adjEnemies[ i ] );

                // Enemy on the left, keep checking left
                var tmp = adjEnemies[ i ].x - 1;
                while ( tmp >= 0 ) {
                    if ( b[ tmp ][ y ] == undefined ) {
                        break;
                    } else if ( b[ tmp ][ y ] == enemyId ) {
                        tmpLocs.push( { x: tmp, y: y } );
                    } else if ( b[ tmp ][ y ] == currentId ) {
                        for ( var j = 0 ; j < tmpLocs.length ; ++j ) {
                            changedPieces.push( tmpLocs[ j ] );
                        }
                        break;
                    }
                    --tmp;
                }
            } else if ( adjEnemies[ i ].dir == 'UPLEFT' ) {
                // Create temporary array to keep track of valid pieces
                tmpLocs = [];
                tmpLocs.push( adjEnemies[ i ] );

                // Enemy on up left, keep checking up left
                var tmp1 = adjEnemies[ i ].x - 1, tmp2 = adjEnemies[ i ].y + 1;
                while ( tmp1 >= 0 && tmp2 <= 7 ) {
                    if ( b[ tmp1 ][ tmp2 ] == undefined ) {
                        break;
                    } else if ( b[ tmp1 ][ tmp2 ] == enemyId ) {
                        tmpLocs.push( { x: tmp1, y: tmp2 } );
                    } else if ( b[ tmp1 ][ tmp2 ] == currentId ) {
                        for ( var j = 0 ; j < tmpLocs.length ; ++j ) {
                            changedPieces.push( tmpLocs[ j ] );
                        }
                        break;
                    }
                    --tmp1;
                    ++tmp2;
                }
            } else if ( adjEnemies[ i ].dir == 'UP' ) {
                // Create temporary array to keep track of valid pieces
                tmpLocs = [];
                tmpLocs.push( adjEnemies[ i ] );

                // Enemy on the up, keep checking up
                var tmp = adjEnemies[ i ].y + 1;
                while ( tmp <= 7 ) {
                    if ( b[ x ][ tmp ] == undefined ) {
                        break;
                    } else if ( b[ x ][ tmp ] == enemyId ) {
                        tmpLocs.push( { x: x, y: tmp } );
                    } else if ( b[ x ][ tmp ] == currentId ) {
                        for ( var j = 0 ; j < tmpLocs.length ; ++j ) {
                            changedPieces.push( tmpLocs[ j ] );
                        }
                        break;
                    }
                    ++tmp;
                }
            } else if ( adjEnemies[ i ].dir == 'UPRIGHT' ) {
                // Create temporary array to keep track of valid pieces
                tmpLocs = [];
                tmpLocs.push( adjEnemies[ i ] );

                // Enemy on up right, keep checking up right
                var tmp1 = adjEnemies[ i ].x + 1, tmp2 = adjEnemies[ i ].y + 1;
                while ( tmp1 <= 7 && tmp2 <= 7 ) {
                    if ( b[ tmp1 ][ tmp2 ] == undefined ) {
                        break;
                    } else if ( b[ tmp1 ][ tmp2 ] == enemyId ) {
                        tmpLocs.push( { x: tmp1, y: tmp2 } );
                    } else if ( b[ tmp1 ][ tmp2 ] == currentId ) {
                        for ( var j = 0 ; j < tmpLocs.length ; ++j ) {
                            changedPieces.push( tmpLocs[ j ] );
                        }
                        break;
                    }
                    ++tmp1;
                    ++tmp2;
                }
            }
        }

        return changedPieces;
    }
    , getAdjacentLocations: function( l, val ) {
        var adj = [];
        var b = Game.state.board;

        if ( l.y > 0 ) {
            if ( b[ l.x ][ l.y - 1 ] == val ) {
                adj.push( { x: l.x, y: l.y - 1, dir: 'DOWN' } );
            }

            if ( l.x > 0 ) {
                if ( b[ l.x - 1 ][ l.y - 1 ] == val ) {
                    adj.push( { x: l.x - 1, y: l.y - 1, dir: 'DOWNLEFT' } );
                }
            }
            if ( l.x < 7 ) {
                if ( b[ l.x + 1 ][ l.y - 1 ] == val ) {
                    adj.push( { x: l.x + 1, y: l.y - 1, dir: 'DOWNRIGHT' } );
                }
            }
        }

        if ( l.y < 7 ) {
            if ( b[ l.x ][ l.y + 1 ] == val ) {
                adj.push( { x: l.x, y: l.y + 1, dir: 'UP' } );
            }

            if ( l.x > 0 ) {
                if ( b[ l.x - 1 ][ l.y + 1 ] == val ) {
                    adj.push( { x: l.x - 1, y: l.y + 1, dir: 'UPLEFT' } );
                }
            }
            if ( l.x < 7 ) {
                if ( b[ l.x + 1 ][ l.y + 1 ] == val ) {
                    adj.push( { x: l.x + 1, y: l.y + 1, dir: 'UPRIGHT' } );
                }
            }
        }

        if ( l.x > 0 ) {
            if ( b[ l.x - 1 ][ l.y ] == val ) {
                adj.push( { x: l.x - 1, y: l.y, dir: 'LEFT' } );
            }
        }
        if ( l.x < 7 ) {
            if ( b[ l.x + 1 ][ l.y ] == val ) {
                adj.push( { x: l.x + 1, y: l.y, dir: 'RIGHT' } );
            }
        }

        return adj;
    }
    , move: function( x, y, player ) {
        Graphics.removeGhost( x, y );
        Game.addPiece( x, y, player );
        var updatedPieces = Game.getUpdatedPieces( x, y );
        for ( var i = 0 ; i < updatedPieces.length ; ++i ) {
            var piece = updatedPieces[ i ];
            Game.state.board[ piece.x ][ piece.y ] = Game.state.currentPlayer;
            Graphics.flipPiece( piece.x, piece.y );
        }

        Game.state.currentPlayer = !Game.state.currentPlayer;
        Game.waitForMove();
    }
    , addGhost: function( x, y, player ) {
        Graphics.addGhost( x, y, player );
    }
    , removeGhost: function( x, y ) {
        Graphics.removeGhost( x, y );
    }
    , state: {
        currentPlayer: true
        , board: []
        , legalMoves: []
    }
};
