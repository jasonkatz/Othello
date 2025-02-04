/*
Jason Katz
ECE-462 Project 2: Othello

File: Interface.js
Description: Game user interface
*/

"use strict";

var Interface = {
    init: function() {
        Interface.elements.heading = document.getElementById( 'turn-heading' );
        Interface.elements.availableMoves = document.getElementById( 'available-moves' );
        Interface.elements.newGame = document.getElementById( 'newgame_button' );
    }
    , listenNewGame: function( callback ) {
        Interface.elements.newGame.addEventListener( 'click', callback, false );
    }
    , newTurn: function( player, legalMoves, clickCallback, mouseOverCallback, mouseOutCallback, emptyCallback ) {
        if ( legalMoves.length == 0 ) {
            Interface.elements.heading.innerHTML = 'No Moves for Player ' + ( player ? '1 (Black)' : '2 (White)' );
            emptyCallback();
            return;
        }

        Interface.elements.heading.innerHTML = 'Player ' + ( player ? '1 (Black)' : '2 (White)' ) + ' Move';
        Interface.elements.availableMoves.innerHTML = '';

        for ( var i = 0 ; i < legalMoves.length ; ++i ) {
            var btn = document.createElement( 'div' );
            btn.innerHTML = 'Move ' + legalMoves[ i ].x + ', ' + legalMoves[ i ].y;
            btn.className = 'btn btn-default';
            btn.legalMove = legalMoves[ i ]; // Custom field so we can access the appropriate data

            btn.addEventListener( 'mouseover', function( e ) {
                mouseOverCallback( this.legalMove.x, this.legalMove.y, player );
            }, false );
            btn.addEventListener( 'mouseout', function( e ) {
                mouseOutCallback( this.legalMove.x, this.legalMove.y );
            }, false );
            btn.addEventListener( 'click', function( e ) {
                clickCallback( this.legalMove.x, this.legalMove.y, player );
                Interface.elements.availableMoves.innerHTML = '';
            }, false );

            Interface.elements.availableMoves.appendChild( btn );
        }
    }
    , disableUI: function() {
        for ( var i = 0 ; i < Interface.elements.availableMoves.children.length ; ++i ) {
            Interface.elements.availableMoves.children[ i ].className += ' disabled';
        }
    }
    , displayWinner: function( p1Count, p2Count ) {
        var winText;
        if ( p1Count == p2Count ) {
            winText = 'Player 1 ties Player 2!';
        } else {
            winText = 'Player ' + ( p1Count > p2Count ? '1 (Black)' : '2 (White)' ) + ' Wins ' + p1Count + ' to ' + p2Count + '!';
        }
        Interface.elements.heading.innerHTML = winText;
        Interface.elements.availableMoves.innerHTML = '';
    }
    , elements: {}
};
