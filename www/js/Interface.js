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
    }
    , newTurn: function( player, legalMoves, clickCallback, mouseOverCallback, mouseOutCallback ) {
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
            }, false );

            Interface.elements.availableMoves.appendChild( btn );
        }
    }
    , elements: {}
};
