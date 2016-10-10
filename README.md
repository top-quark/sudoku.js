# sudoku.js

Small but well-formed Sudoku puzzle generator and solver.

## Initialisation

### design
Designs a game from scratch:

```javascript
var g = Sudoku.design();
// "63..........2...56.57..1..3.8.37.....9.8.2.3.....46.8.1..6..42.84...3..........98"
```

Generated puzzles are symmetrical and only have a single solution. Although the library 
does not grade the puzzles generated (yet), around three quarters of the puzzles are easy 
to moderate in terms of difficulty - symmetrical Diabolical puzzles are relatively rare.

### importGame
Imports an existing puzzle:

```javascript
Sudoku.importGame(".2....5938..5..46.94..6...8..2.3.....6..8.73.7..2.........4.38..7....6..........5"); // true
```

The string passed in must be 81 characters. "Holes" are indicated by any character that isn't
1-9. If the string violates the constraints of unique digits in each row, column and 3x3 box, 
it will be rejected.

## Solving Puzzles

### solve
Finds a single solution:

```javascript
var solution = Sudoku.solve();
// "126478593837592461945361278412937856569184732783256914251649387374815629698723145"
```

If the puzzle has no solution, this method will return null.

### hint
Returns part of the solution:

```javascript
var obj = Sudoku.hint();
// { row: 5, col: 8, value: 4 }
```

The <em>row</em> and <em>col</em> properties are 0-indexed. You can call `hint` repeatedly.
If the puzzle is insoluble, or has already been solved, this method will return null.

### findAll
If a puzzle has too few hints, it will have multiple solutions. Two or more solutions is
considered undesirable because the puzzle can then only be solved by guesswork. The
`findAll` method will find multiple solutions until you tell it to stop. For
example, to verify that a puzzle has a unique solution:
```javascript
// Context object can have any property you like
var ctx = { solutions : 0 };
// findAll continues until its callback function returns false
Sudoku.findAll(ctx, function(a, ctx) {
    return (++ctx.solutions < 2);
});
if (ctx.solutions === 1) {
    // Puzzle can be uniquely solved
}
```

The callback function is called whenever a solution is found. The arguments are the 
solution array and the context object passed to the `findAll` method.

## Interactive Application Support

### add
Sets a value at an index. The value will be rejected if it causes a constraint violation
but not if it makes the puzzle insoluble. A move can be "undone" by setting the value at
that index to 0.
```javascript
Sudoku.importGame(".2....5938..5..46.94..6...8..2.3.....6..8.73.7..2.........4.38..7....6..........5");
Sudoku.add(1, 0); // true  (legal and part of the solution)
Sudoku.add(2, 0); // false (violates constraints)
Sudoku.add(0, 0); // true  (undoes the move)
Sudoku.add(6, 0); // true  (legal despite making the puzzle insoluble)
```

### state
Returns the current state of the puzzle, an 81-length Array with the solutions and 
possibilities at each index in the puzzle expressed as 1 to 9 length Array.
```javascript
var st = Sudoku.state(), i, j, a;
for (I = 0; i < 81; ++i) {
    a = st[i];
    for (j = 0; j < a.length; ++j) {
        // Do something with a[j];
    }
    if (1 === a.length) {
        // Part of the solution
    }
    else {
        // Part of the puzzle
    }
}
```

### exportGame
Exports the internal state of the puzzle as an 81-character string. Unsolved cells will
be shown as '.'. The string can later be passed to `importGame`.

## Algorithms

### Shuffling
Puzzle design requires the ability to randomize arrays. Here's a simple implementation of
the Fisher-Yates algorithm that permutes its argument in place:
```javascript
var shuffle = function(a) {
    var c = a.length - 1, t, r;
    for (; c > 0; --c) {
        r = Math.floor(Math.random() * (c + 1));
        // Swap the item at c with that at r
        t = a[c];
        a[c] = a[r];
        a[r] = t;
    }
};
```

### Solving
The <code>solve</code>, <code>findAll</code> and <code>hint</code> functions are all 
interfaces to the same underlying search routine which performs a depth-first traversal
of the entire puzzle space, stopping when it reaches solutions or dead ends:
```javascript
// Internal state array
var currState = [...];

var getPossible = function(index) {
    // Return all possible values at index
    return [...];
};

var shuffle = function(a) {
    // As above
};

var depthFirst = function(index, ctx, callback) {
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
        // See whether poss[k] leads to a solution
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
```
The routine is signalled to stop by its callback returning an explicit `false`
value. The context argument allows the caller to maintain state (for example, counting
solutions). Designing a puzzle starts with a <em>random</em> solution so this routine 
allows the possibilities at each step to be randomized.

### Design

For a computer, solving a Sudoku puzzle via an exhaustive search is trivially easy. The 
above `depthFirst` function can grind over the [hardest puzzles](http://magictour.free.fr/top1465)
in no time flat. Designing a puzzle, on the other hand, is algorithmically more interesting.

The algorithm used in this library is as follows:

1. Let puzzle be a random solution to an empty grid
2. Shuffle a positions array [1..81]
3. Let idx1 be positions[0] and idx2 be 80 - idx1
4. Set puzzle[idx1] = puzzle[idx2] = 0
5. Solve puzzle, finding no more than two solutions
6. Restore puzzle[idx1] and puzzle[idx2] if the number of solutions > 1
7. Discard idx1 and idx2 from positions
8. Goto 3 if positions is not empty
9. Return puzzle

Here's the implementation:
```javascript
Sudoku.design: function() {
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
};
```

Rather than working backwards from the complete solution and adding holes, it would be
possible to start with a state of all zeroes and add work forwards, adding hints. This
approach has two disadvantages:
1. Puzzle generation takes longer because there are more possibilities to search
when the number of hints is low.
2. Puzzles are of low quality with an excessive number of hints.

The algorithm generates symmetric puzzles. It is easy to change this - simply ignore idx2
and add one hole at a time. While this approach will find the minimum number of hints,
the results are less aesthetically pleasing and the difficulty spread is hostile - 
Diabolical difficulty is a bit much for most people.

