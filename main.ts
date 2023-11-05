import readline from "readline";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

type Empty = null;
type Draw = undefined;

type Player = | "X" | "O";
type Claimed = | "X" | "O";
type Winner = | "X" | "O";
type NoWinner = null;


type Square  = | Empty | Claimed;

type Board = 
  [[Square, Square, Square],
   [Square, Square, Square],
   [Square, Square, Square]];

type DisplayBoard = (Space | Claimed) [];

type Space =
  | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
  
type Game = {
  stateMachine: FiniteStateMachine;
};

type TicTacToeState =
  | { initializing: null }                            // Game just started, no information to encapsulate
  | { placing:    { player: Player, on: Board }}      // Player is choosing their next spot
  | { evaluating: { board: Board, after:  Player }}   // Determining if there is a winner, after this player's move
  | { winner:     { won: Player | Draw, on: Board }}; // Game over, somebody got 3 in a row or we're out of spaces


class FiniteStateMachine {

  private state: TicTacToeState = { initializing: null };
  
  public FiniteStateMachine() {}

  public getState(): TicTacToeState {
    return this.state;
  }

  /**
   * Given the current state, transition into the next state
   */
  public async transition(): Promise<void> {

    if ( "initializing" in this.state ) {
      // Game startup, X always gets the first turn 
      this.state = { placing: { player: "X", on: newBoard() }};
    }

    if ( "placing" in this.state ) {
      // Show the player the board
      printBoard(this.state.placing.on);

      const selectionValid = false; // Never gets updated, this variable is purely for context

      // Poll player for space selection until they enter something valid (an integer 1-9 & space on board is empty)
      while(!selectionValid) {
        const at: Space = await getSelection(this.state.placing.player);
        const update = updateBoard( this.state.placing.player, at, this.state.placing.on );

        if ("error" in update) {
          console.error(update.error);
          continue;
        }

        // If we've reached this point then the selection was valid and the update should be taken
        this.state = { evaluating: { board: update, after: this.state.placing.player } };
        return;
      }
    }

    if ( "evaluating" in this.state ) {
      // Determine if there is a winner or draw
      this.state = evaluate( this.state.evaluating.board, this.state.evaluating.after );
      return;
    }

    // Terminal state
    if ( "winner" in this.state ) terminate(this.state.winner.won, this.state.winner.on);
  }
}

/**
 * Called when reaching a terminal state. Prints the result and exit the program.
 * 
 * @param winner the symbol of the winner, or undefined for a draw.
 */
function terminate( winner: Claimed | Draw, on: Board ): never {

  printBoard(on);

  if (winner) {

    if (winner == "X") {
      console.log("\nPlayer 1 wins!\n");
      process.exit(0);
    } else {
      console.log("\nPlayer 2 wins!\n");
      process.exit(0);
    }
  }

  // No winner means we drew
  console.log("Draw! Nobody wins");
  process.exit(0);
}

/**
 * Prompt the player for the space they want.
 *
 * @returns the space that the player selected
 */
async function getSelection(player: Player): Promise<Space> {
  return new Promise(resolve => {
    rl.question(`Player ${player} select your space, enter the number: `, input => {
      if ( input ) {
        try {
          const parsed = parseInt(input);
          
          if (parsed < 1 || parsed > 9) throw new Error();

          resolve(parsed as Space);

        } catch (err: any) {
          console.error("Selection must be an integer in range 1 - 9");
        }
      }
    });
  });
}

/**
 * @returns an empty Board
 */
function newBoard(): Board {
  return [
    [ null as Empty, null as Empty, null as Empty ],
    [ null as Empty, null as Empty, null as Empty ],
    [ null as Empty, null as Empty, null as Empty ],
  ];
}

/**
 * @returns a new Game, with its FiniteStateMachine in the initial state 
 */
function initializeGame(): Game {
  return {
    stateMachine: new FiniteStateMachine(),
  };
}

/**
 * Predicate to determine if either of the horizontal rows have 3 in a row.
 * Returns basically a Rusty Option instead of a boolean.
 * 
 * @param board to check
 * @returns a Winner if there was 3 in a row, and NoWinner (null) if not
 */
function hasWinnerHorizontal(board: Board): Winner | NoWinner {
  for (let i = 0; i < board.length; i++) {
    const col1 = board[i][0];
    const col2 = board[i][1];
    const col3 = board[i][2];

    if (col1 == col2 && col2 == col3 && col1 != null as Empty) return col1 as Winner;
  }

  return null as NoWinner;
}

/**
 * Predicate to determine if any of the vertical columns have 3 in a row.
 * Returns basically a Rusty Option instead of a boolean.
 * 
 * @param board to check
 * @returns a Winner if there was 3 in a row, and NoWinner (null) if not
 */
function hasWinnerVertical(board: Board): Winner | NoWinner {
  for (let i = 0; i < board.length; i++) {
    const col1 = board[0][i];
    const col2 = board[1][i];
    const col3 = board[2][i];

    if (col1 == col2 && col2 == col3 && col1 != null as Empty) return col1 as Winner;
  }

  return null as NoWinner;
}

/**
 * Predicate to determine if either of the diagonal lanes have 3 in a row.
 * Returns basically a Rusty Option instead of a boolean.
 * 
 * @param board to check
 * @returns a Winner if there was 3 in a row, and NoWinner (null) if not
 */
function hasWinnerDiagonal(board: Board): Winner | NoWinner {
  const topL   = board[0][0];
  const topR   = board[0][2];
  const origin = board[1][1];
  const botR   = board[2][2];
  const botL   = board[2][0];

  if (topL == origin && origin == botR && topL != null as Empty) return topL as Winner;
  if (topR == origin && origin == botL && topL != null as Empty) return topR as Winner;

  return null as NoWinner;
}


/**
 * @param from space numbered 1 - 9
 * @returns coordinates for the 2D matrix. Y comes first, since Board matrix is arranged as rows instead of cols.
 */
function getPosition(from: Space): { y: 0 | 1 | 2, x: 0 | 1 | 2 } {
  switch (from) {
    case 1: return { y: 0, x: 0 };
    case 2: return { y: 0, x: 1 };
    case 3: return { y: 0, x: 2 };
    case 4: return { y: 1, x: 0 };
    case 5: return { y: 1, x: 1 };
    case 6: return { y: 1, x: 2 };
    case 7: return { y: 2, x: 0 };
    case 8: return { y: 2, x: 1 };
    case 9: return { y: 2, x: 2 };
  }
}

/**
 * Predicate indicating if the given space is empty on the given board
 * 
 * @param board on which to check
 * @param at this space
 * @returns whether or not the space was empty
 */
function isEmpty(board: Board, at: Space): boolean {
  const point = getPosition(at);
  return board[point.y][point.x] == null;
}

/**
 * Predicate indicating if the given board has no empty spaces remaining
 * 
 * @param board on which to check
 * @returns whether or not the board has had all its spaces claimed
 */
function isBoardFull(board: Board): boolean {
  let full = true;

  board.forEach(row => {
    row.forEach(col => {
      if (col == null as Empty) {
        full = false;
      }
    });
  });

  return full;
}

/**
 * @param symbol the symbol of the player who is updating the board
 * @param at the space at which the symbol should be added
 * @param on the board in whose space the symbol will go 
 * @returns the updated board
 */
function updateBoard(symbol: "X" | "O", at: Space, on: Board): Board | { error: string } {
  if (!isEmpty(on, at)) {
    return { error: `Can't update non-empty space, ${at} is already occupied.` };
  }

  const point = getPosition(at);

  // Don't love this but I don't wanna deal with spread operator slice shit rn
  const updated = on;
  updated[point.y][point.x] = symbol;

  return updated;
}

/**
 * Pretty prints the game board, with empty spaces shown with their space number
 * 
 * @param board the game board
 */
function printBoard(board: Board): void {
  // Map all our board spaces into one array of length 9
  const flattened: Square[] = board.flat();

  // Replace empties with their space number, to indicate to the user that those spaces can be selected
  const spacesNumbered: DisplayBoard = flattened.map((space, index ) => space == null as Empty ? index + 1 as Space : space as Claimed);

  const displayBoard = 
      `${ spacesNumbered[0] } | ${ spacesNumbered[1]} | ${spacesNumbered[2]} \n`
    + `---------\n`
    + `${ spacesNumbered[3] } | ${ spacesNumbered[4]} | ${spacesNumbered[5]} \n`
    + `---------\n`
    + `${ spacesNumbered[6] } | ${ spacesNumbered[7]} | ${spacesNumbered[8]} \n`;

  console.info(displayBoard);
}

/**
 * Given the board, check win conditions and determine the next state.
 * @param board after it has been updated with the latest move
 * @param after the player whose symbol was just placed
 * @returns the next state
 */
function evaluate(board: Board, after: Player): TicTacToeState {
  const vert: "X" | "O" | null = hasWinnerVertical(board);
  const hori: "X" | "O" | null = hasWinnerHorizontal(board);
  const diag: "X" | "O" | null = hasWinnerDiagonal(board);

  // Check all our win conditions and transition to terminal state if one is met
  if (vert) return { winner: { won: vert, on: board }};
  if (hori) return { winner: { won: hori, on: board }};
  if (diag) return { winner: { won: diag, on: board }};
  if (isBoardFull(board)) return { winner: { won: undefined as Draw, on: board }};

  // No win condition has been met, transition to next player's turn
  return { placing: { player: after == "X" ? "O" : "X", on: board }};
}


// And now, without further ado... 
const game: Game = initializeGame();

const playing = true;

while (playing) {
 await game.stateMachine.transition();
}
