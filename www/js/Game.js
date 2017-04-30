/*
Jason Katz
ECE-462 Project 2: Othello

File: Game.js
Description: Othello game logic
*/

"use strict";

var Game = {
    init: function() {
        Graphics.init();
        Graphics.addPiece( 3, 3, true );
        Graphics.addPiece( 3, 4, false );
        Graphics.addPiece( 4, 3, false );
        Graphics.addPiece( 4, 4, true );
        Graphics.flipPiece( 3, 3 );
        Graphics.flipPiece( 3, 4 );
        Graphics.flipPiece( 4, 3 );
        Graphics.flipPiece( 4, 4 );
    }
};
