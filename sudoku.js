/**
 * Sudoku generator and solver
 * Copyright (C) 2016 Christopher Williams.
 * This is distributed under the terms of the Apache License,
 *   http://www.apache.org/licenses/LICENSE-2.0
 * in the hope that you may find it useful.
 */
 
this.Sudoku = (function(window) {
    "use strict";
    /**
     * For an index in the puzzle state, returns the indices of the enclosing square
     */
    var getEnclosingSquare = function(idx) {
        var x = idx % 9,
            y = Math.floor(idx / 9),
            ret = [], i, j;
        // Take x and y down to the nearest multiple of three
        x -= x % 3;
        y -= y % 3;
        for (i = 0; i < 3; i++) {
            for (j = 0; j < 3; j++) {
                ret.push(x + j + (y + i) * 9);
            }
        }
        return ret;
    };

    /**
     * For an index in the puzzle state, returns a reference to
     * the enlosing 3x3 square (a number between 0 and 8)
     */
    var getEnclosingSquareRef = function(idx) {
        var x = Math.floor(idx % 9),
            y = Math.floor(idx / 9);
        // Further reduce x
        x = Math.floor(x / 3);
        y = Math.floor(y / 3);
        return x * 3 + y;
    };

    var currState = [],
        i, j,
        // Centre points of each 3x3 square
        midpoints = [10, 37, 64, 13, 40, 67, 16, 43, 70],
        squares = [],
        rows = [],
        columns = [];
        
    // Calculate the indices (0..80) of all the rows, columns and 3x3 squares
    for (i = 0; i < 9; i++) {
        squares.push(getEnclosingSquare(midpoints[i]));
        rows.push([]);
        columns.push([]);
        for (j = 0; j < 9; j++) {
            rows[i].push(9 * i + j);
            columns[i].push(9 * j + i);
        }
    }
    
    /**
     * Set the puzzle to an initial state of all 0s
     */
    var initState = function() {
        currState = [];
        for (i = 0; i < 81; ++i) {
            currState[i] = 0;
        }
    },
    
    /**
     * Returns an array of possible values in a given index;
     * the values returned depend on the values in the current row,
     * current column and enclosing square)
     */
    getPossible = function(index) {
        if (index < 0 || index >= 81) {
            return [];
        }
        if (0 != currState[index]) {
            return [currState[index]];
        }

        // Check that the test value is not already present
        // in the enclosing square, current row or current
        // column
        var squareRef = getEnclosingSquareRef(index),
            square = squares[squareRef],
            rowNo = Math.floor(index / 9),
            colNo = index % 9,
            ret = [], i, j;
        for (i = 1; i <= 9; i++) {
            var poss = true;
            for (j = 0; j < 9; j++) {
                if (currState[square[j]] === i) {
                    poss = false;
                    break;
                }
                var idx = j + rowNo * 9;
                if (currState[idx] === i) {
                    poss = false;
                    break;
                }
                idx = j * 9 + colNo;
                if (currState[idx] === i) {
                    poss = false;
                    break;
                }
            }
            if (poss) {
                ret.push(i);
            }
        }
        return ret;
    },
    
    /**
     * Determines whether placing testValue at index violates constraints
     */
    isPossible = function(testValue, index) {
        var row = rows[Math.floor(index / 9)],
            col = columns[index % 9],
            square = squares[getEnclosingSquareRef(index)],
            i;

        for (i = 0; i < 9; i++) {
            if (row[i] !== index && currState[row[i]] === testValue) {
                return false;
            }
            if (col[i] !== index && currState[col[i]] === testValue) {
                return false;
            }
            if (square[i] !== index && currState[square[i]] === testValue) {
                return false;
            }
        }

        return true;
    },
    
    /**
     * Loads the game state from a string of 81 digits
     */
    initFromString = function(s) {
        s = "" + s;
        if (!(s && 81 === s.length)) {
            return false;
        }
        // Replace any non-digit characters with '0'
        s = s.replace(/\D/g, '0');
        var oldState = currState, i, j, idx = 0, ret = true, zero = "0".charCodeAt(0);
        currState = [];
        for (i = 0; i < 9; i++) {
            for (j = 0; j < 9; j++, ++idx) {
                currState.push(s.charCodeAt(idx) - zero);
            }
        }
        // Do a sanity check on the solution array
        for (i = 0; i < 81; i++) {
            if (currState[i] && !isPossible(currState[i], i)) {
                currState = oldState;
                return false;
            }
        }
        
        return true;
    },

    /**
     * Shuffles an array
     */
    shuffle = function(a) {
        var c = a.length - 1, t, r;
        for (; c > 0; --c) {
            r = Math.floor(Math.random() * (c + 1));
            // Swap the item at c with that at r
            t = a[c];
            a[c] = a[r];
            a[r] = t;
        }
    },

    /**
     * Depth-first search algorithm
     * Recursively tries valid moves until it finds an impasse
     * or a solution; if a solution is found, it is passed
     * to a callback function which may return true to
     * continue the search or false to stop it.
     */
    depthFirst = function(index, ctx, callback) {
        // Advance past solved cells
        for (; index < 81 && currState[index]; ++index) {
        }
        if (index === 81) {
            // Got a solution
            return callback(currState.slice(0), ctx);
        }
        var poss = getPossible(index), k, ret;
        if (ctx.random) {
            // Design mode; we want a random solution
            shuffle(poss);          
        }
        for (k = 0; k < poss.length; ++k) {
            currState[index] = poss[k];
            ret = depthFirst(index + 1, ctx, callback);
            currState[index] = 0;
            if (false === ret) {
                // Found as many solutions as are required
                break;
            }
        }
        return ret;
    };

    return {
        /**
         * Finds all solutions until told to stop
         */
        findAll: function(ctx, callback) {
            depthFirst(0, ctx, callback);
        },
        
        /**
         * Solves the puzzle (or reports that it can't)
         */
        solve: function() {
            var solution, ret = null; 
            depthFirst(0, {}, function(a, ctx) {
                solution = a;
                return false;
            });
            if (solution) {
                currState = solution;
                ret = Sudoku.exportGame();
            }
            return ret;
        },

        /**
         * Gets the next part of the puzzle (or reports that it can't)
         */
        hint: function() {
            var ret = null, solution, i, j, v, p, r = [];
            depthFirst(0, {}, function(a, ctx) {
                solution = a;
                return false;
            });
            if (solution) {
                // Return a random possibility
                for (i = 0; i < solution.length; ++i) {
                    if (currState[i] !== solution[i]) {
                        r.push(i);
                    }
                }
                shuffle(r);
                if (r.length) {
                    p = r[0];
                    v = solution[p];
                    currState[p] = v;
                    ret = {
                        row: Math.floor(p / 9), col: p % 9, value: v
                    };
                }
            }
            return ret;
        },
        
        /**
         * Exports the state as an 81-character string
         */
        exportGame: function() {
            return currState.join("").replace(/0/g, '.');
        },
        
        /**
         * Imports a game from an 81-character string
         */
        importGame: function(s) {
            initState();
            return initFromString(s);
        },
        
        /**
         * Designs a game
         */
        design: function() {
            initState();
            // Generate a random "solution" to an empty grid 
            var solution;
            depthFirst(0, { random : true }, function(a, ctx) {
                solution = a;
                return false;
            });
            // Fill an array with positions and shuffle it
            var positions = [];
            for (i = 0; i < 81; ++i) {
                positions[i] = i;
            }
            shuffle(positions);
            currState = solution;
            while (positions.length) {
                var idx1 = positions.pop(), idx2 = 80 - idx1,               
                // Take a backup of currState
                    saveState = currState.slice(0),
                    ctx = { solutions : 0 };
                // Put holes in the current state
                currState[idx1] = currState[idx2] = 0;
                depthFirst(0, ctx, function(a, ctx) {
                    // Looking for uniquely solvable
                    return (++ctx.solutions < 2);
                });
                if (ctx.solutions === 1) {
                    // This is good
                    saveState[idx1] = saveState[idx2] = 0;
                }
                // Don't try idx2 as a possibility again
                for (i = 0; i < positions.length; ++i) {
                    if (positions[i] === idx2) {
                        positions.splice(i, 1);
                        break;
                    }
                }
                currState = saveState;
            }
            return Sudoku.exportGame();
        },
        
        /**
         * Gets the current state of the game
         */
        state: function() {
            var ret = [], i;
            for (i = 0; i < 81; ++i) {
                ret[i] = getPossible(i);
            }
            return ret;
        },
        
        /**
         * Sets a value at an index if the result will not be a violation of constraints
         */
        add: function(v, idx) {
            if (0 === v || isPossible(v, idx)) {
                currState[idx] = v;
                return true;
            }
            return false;
        }
    };
})(this);
