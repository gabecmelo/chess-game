const gameState = {
  board: [],
  currentPlayer: "white",
  selectedPiece: null,
  validMoves: [],
  capturedPieces: {
    white: [],
    black: [],
  },
  moveHistory: [],
  kings: {
    white: { row: 7, col: 4 },
    black: { row: 0, col: 4 },
  },
  inCheck: false,
  gameOver: false,
  castlingRights: {
    white: { kingSide: true, queenSide: true },
    black: { kingSide: true, queenSide: true },
  },
  enPassantTarget: null,
  pendingPromotion: null,
}

const pieces = {
  white: {
    king: "♔",
    queen: "♕",
    rook: "♖",
    bishop: "♗",
    knight: "♘",
    pawn: "♙",
  },
  black: {
    king: "♚",
    queen: "♛",
    rook: "♜",
    bishop: "♝",
    knight: "♞",
    pawn: "♟",
  },
}

const pieceIcons = {
  white: {
    king: '<i class="fas fa-chess-king text-light"></i>',
    queen: '<i class="fas fa-chess-queen text-light"></i>',
    rook: '<i class="fas fa-chess-rook text-light"></i>',
    bishop: '<i class="fas fa-chess-bishop text-light"></i>',
    knight: '<i class="fas fa-chess-knight text-light"></i>',
    pawn: '<i class="fas fa-chess-pawn text-light"></i>',
  },
  black: {
    king: '<i class="fas fa-chess-king"></i>',
    queen: '<i class="fas fa-chess-queen"></i>',
    rook: '<i class="fas fa-chess-rook"></i>',
    bishop: '<i class="fas fa-chess-bishop"></i>',
    knight: '<i class="fas fa-chess-knight"></i>',
    pawn: '<i class="fas fa-chess-pawn"></i>',
  },
}

function initializeBoard() {
  const board = Array(8)
    .fill()
    .map(() => Array(8).fill(null))


  for (let col = 0; col < 8; col++) {
    board[1][col] = { type: "pawn", color: "black", hasMoved: false }
    board[6][col] = { type: "pawn", color: "white", hasMoved: false }
  }


  const setupOrder = ["rook", "knight", "bishop", "queen", "king", "bishop", "knight", "rook"]
  for (let col = 0; col < 8; col++) {
    board[0][col] = { type: setupOrder[col], color: "black", hasMoved: false }
    board[7][col] = { type: setupOrder[col], color: "white", hasMoved: false }
  }

  return board
}

function createChessboard() {
  const chessboard = document.getElementById("chessboard")
  chessboard.innerHTML = ""

  const files = ["a", "b", "c", "d", "e", "f", "g", "h"]

  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const square = document.createElement("div")
      const isLight = (row + col) % 2 === 0
      square.className = `square ${isLight ? "light" : "dark"}`
      square.dataset.row = row
      square.dataset.col = col
      square.dataset.file = files[col]
      square.dataset.rank = 8 - row

      square.addEventListener("click", handleSquareClick)

      const piece = gameState.board[row][col]
      if (piece) {
        square.innerHTML = pieceIcons[piece.color][piece.type]
      }

      chessboard.appendChild(square)
    }
  }
}

function handleSquareClick(event) {
  if (gameState.gameOver) return

  const row = Number.parseInt(event.currentTarget.dataset.row)
  const col = Number.parseInt(event.currentTarget.dataset.col)


  if (gameState.selectedPiece) {
    const selectedRow = gameState.selectedPiece.row
    const selectedCol = gameState.selectedPiece.col

  
    const validMove = gameState.validMoves.find((move) => move.row === row && move.col === col)

    if (validMove) {
    
      makeMove(selectedRow, selectedCol, row, col, validMove.special)
      clearSelection()
    } else {
    
      const piece = gameState.board[row][col]
      if (piece && piece.color === gameState.currentPlayer) {
        selectPiece(row, col)
      } else {
        clearSelection()
      }
    }
  } else {
  
    const piece = gameState.board[row][col]
    if (piece && piece.color === gameState.currentPlayer) {
      selectPiece(row, col)
    }
  }
}

function selectPiece(row, col) {
  clearSelection()

  const piece = gameState.board[row][col]
  if (!piece || piece.color !== gameState.currentPlayer) return

  gameState.selectedPiece = { row, col }


  const selectedSquare = document.querySelector(`.square[data-row="${row}"][data-col="${col}"]`)
  selectedSquare.classList.add("selected")


  gameState.validMoves = getValidMoves(row, col)

  gameState.validMoves.forEach((move) => {
    const square = document.querySelector(`.square[data-row="${move.row}"][data-col="${move.col}"]`)
    if (gameState.board[move.row][move.col]) {
      square.classList.add("valid-capture")
    } else {
      square.classList.add("valid-move")
    }
  })
}

function clearSelection() {
  gameState.selectedPiece = null
  gameState.validMoves = []

  document.querySelectorAll(".square.selected, .square.valid-move, .square.valid-capture").forEach((square) => {
    square.classList.remove("selected", "valid-move", "valid-capture")
  })
}

function makeMove(fromRow, fromCol, toRow, toCol, special = null) {
  const piece = gameState.board[fromRow][fromCol]
  const targetPiece = gameState.board[toRow][toCol]


  if (piece.type === "pawn" && (toRow === 0 || toRow === 7)) {
  
    gameState.pendingPromotion = {
      fromRow,
      fromCol,
      toRow,
      toCol,
      special,
      targetPiece,
    }

    showPromotionModal(piece.color)
    return
  }

  completeMove(fromRow, fromCol, toRow, toCol, special, targetPiece)
}

function completeMove(fromRow, fromCol, toRow, toCol, special = null, targetPiece = null) {
  const piece = gameState.board[fromRow][fromCol]

  if (targetPiece === null) {
    targetPiece = gameState.board[toRow][toCol]
  }

  if (targetPiece) {
    gameState.capturedPieces[targetPiece.color].push(targetPiece)
    updateCapturedPieces()
  }

  gameState.board[toRow][toCol] = piece
  gameState.board[fromRow][fromCol] = null

  piece.hasMoved = true

  handleSpecialMoves(piece, fromRow, fromCol, toRow, toCol, special)

  if (piece.type === "king") {
    gameState.kings[piece.color] = { row: toRow, col: toCol }
  }

  recordMove(piece, fromRow, fromCol, toRow, toCol, targetPiece, special)

  gameState.currentPlayer = gameState.currentPlayer === "white" ? "black" : "white"
  updateTurnIndicator()

  checkGameStatus()

  createChessboard()
}

function showPromotionModal(pieceColor) {
  const modal = document.getElementById("promotion-modal")
  const promotionPieces = document.querySelectorAll(".promotion-piece")

  promotionPieces.forEach((pieceElement) => {
    const icon = pieceElement.querySelector("i")
    if (pieceColor === "white") {
      icon.classList.add("text-light")
      pieceElement.style.color = "#000"
    } else {
      icon.classList.remove("text-light")
      pieceElement.style.color = "#000"
    }

    pieceElement.onclick = () => handlePromotionSelection(pieceElement.dataset.piece)
  })

  modal.style.display = "flex"
}

function handlePromotionSelection(pieceType) {
  const modal = document.getElementById("promotion-modal")
  const { fromRow, fromCol, toRow, toCol, special, targetPiece } = gameState.pendingPromotion

  const piece = gameState.board[fromRow][fromCol]

  piece.type = pieceType

  modal.style.display = "none"

  completeMove(fromRow, fromCol, toRow, toCol, special, targetPiece)

  gameState.pendingPromotion = null
}

function handleSpecialMoves(piece, fromRow, fromCol, toRow, toCol, special) {

  if (piece.type === "king" && Math.abs(fromCol - toCol) === 2) {
    const isKingSide = toCol > fromCol
    const rookCol = isKingSide ? 7 : 0
    const newRookCol = isKingSide ? toCol - 1 : toCol + 1

  
    const rook = gameState.board[fromRow][rookCol]
    gameState.board[fromRow][newRookCol] = rook
    gameState.board[fromRow][rookCol] = null
  }

  if (piece.type === "pawn" && special === "enPassant") {
    const captureRow = fromRow
    const captureCol = toCol
  
    const capturedPawn = gameState.board[captureRow][captureCol]
    gameState.capturedPieces[capturedPawn.color].push(capturedPawn)
    gameState.board[captureRow][captureCol] = null
  }

  gameState.enPassantTarget = null
  if (piece.type === "pawn" && Math.abs(fromRow - toRow) === 2) {
    gameState.enPassantTarget = {
      row: (fromRow + toRow) / 2,
      col: fromCol,
    }
  }

  if (piece.type === "king") {
    gameState.castlingRights[piece.color].kingSide = false
    gameState.castlingRights[piece.color].queenSide = false
  } else if (piece.type === "rook") {
    if (fromCol === 0) {
    
      gameState.castlingRights[piece.color].queenSide = false
    } else if (fromCol === 7) {
    
      gameState.castlingRights[piece.color].kingSide = false
    }
  }
}

function getValidMoves(row, col) {
  const piece = gameState.board[row][col]
  if (!piece) return []

  let moves = []

  switch (piece.type) {
    case "pawn":
      moves = getPawnMoves(row, col, piece)
      break
    case "knight":
      moves = getKnightMoves(row, col, piece)
      break
    case "bishop":
      moves = getBishopMoves(row, col, piece)
      break
    case "rook":
      moves = getRookMoves(row, col, piece)
      break
    case "queen":
      moves = getQueenMoves(row, col, piece)
      break
    case "king":
      moves = getKingMoves(row, col, piece)
      break
  }

  return moves.filter((move) => !wouldBeInCheck(row, col, move.row, move.col, piece.color))
}

function wouldBeInCheck(fromRow, fromCol, toRow, toCol, color) {

  const tempBoard = JSON.parse(JSON.stringify(gameState.board))

  const piece = tempBoard[fromRow][fromCol]
  tempBoard[toRow][toCol] = piece
  tempBoard[fromRow][fromCol] = null

  let kingPos = { ...gameState.kings[color] }
  if (piece.type === "king") {
    kingPos = { row: toRow, col: toCol }
  }

  const opponentColor = color === "white" ? "black" : "white"

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const attackingPiece = tempBoard[r][c]
      if (attackingPiece && attackingPiece.color === opponentColor) {
        const attacks = getPieceAttacks(r, c, attackingPiece, tempBoard)
        if (attacks.some((attack) => attack.row === kingPos.row && attack.col === kingPos.col)) {
          return true
        }
      }
    }
  }

  return false
}

function getPieceAttacks(row, col, piece, board) {
  switch (piece.type) {
    case "pawn":
      return getPawnAttacks(row, col, piece, board)
    case "knight":
      return getKnightMoves(row, col, piece, board)
    case "bishop":
      return getBishopMoves(row, col, piece, board)
    case "rook":
      return getRookMoves(row, col, piece, board)
    case "queen":
      return getQueenMoves(row, col, piece, board)
    case "king":
      return getKingAttacks(row, col, piece, board)
  }
  return []
}

function getPawnMoves(row, col, piece) {
  const moves = []
  const direction = piece.color === "white" ? -1 : 1


  if (isInBounds(row + direction, col) && !gameState.board[row + direction][col]) {
    moves.push({ row: row + direction, col: col })

    if ((piece.color === "white" && row === 6) || (piece.color === "black" && row === 1)) {
      if (!gameState.board[row + 2 * direction][col]) {
        moves.push({ row: row + 2 * direction, col: col })
      }
    }
  }

  for (const colOffset of [-1, 1]) {
    const newCol = col + colOffset
    const newRow = row + direction

    if (isInBounds(newRow, newCol)) {
      const targetPiece = gameState.board[newRow][newCol]

    
      if (targetPiece && targetPiece.color !== piece.color) {
        moves.push({ row: newRow, col: newCol })
      }

      if (
        gameState.enPassantTarget &&
        newRow === gameState.enPassantTarget.row &&
        newCol === gameState.enPassantTarget.col
      ) {
        moves.push({
          row: newRow,
          col: newCol,
          special: "enPassant",
        })
      }
    }
  }

  return moves
}

function getPawnAttacks(row, col, piece, board) {
  const attacks = []
  const direction = piece.color === "white" ? -1 : 1

  for (const colOffset of [-1, 1]) {
    const newCol = col + colOffset
    const newRow = row + direction

    if (isInBounds(newRow, newCol)) {
      attacks.push({ row: newRow, col: newCol })
    }
  }

  return attacks
}

function getKnightMoves(row, col, piece, board = gameState.board) {
  const moves = []
  const offsets = [
    [-2, -1],
    [-2, 1],
    [-1, -2],
    [-1, 2],
    [1, -2],
    [1, 2],
    [2, -1],
    [2, 1],
  ]

  for (const [rowOffset, colOffset] of offsets) {
    const newRow = row + rowOffset
    const newCol = col + colOffset

    if (isInBounds(newRow, newCol)) {
      const targetPiece = board[newRow][newCol]
      if (!targetPiece || targetPiece.color !== piece.color) {
        moves.push({ row: newRow, col: newCol })
      }
    }
  }

  return moves
}

function getBishopMoves(row, col, piece, board = gameState.board) {
  return getSlidingMoves(
    row,
    col,
    piece,
    [
      [-1, -1],
      [-1, 1],
      [1, -1],
      [1, 1],
    ],
    board,
  )
}

function getRookMoves(row, col, piece, board = gameState.board) {
  return getSlidingMoves(
    row,
    col,
    piece,
    [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1],
    ],
    board,
  )
}

function getQueenMoves(row, col, piece, board = gameState.board) {
  return [...getBishopMoves(row, col, piece, board), ...getRookMoves(row, col, piece, board)]
}

function getKingMoves(row, col, piece) {
  const moves = []
  const offsets = [
    [-1, -1],
    [-1, 0],
    [-1, 1],
    [0, -1],
    [0, 1],
    [1, -1],
    [1, 0],
    [1, 1],
  ]

  for (const [rowOffset, colOffset] of offsets) {
    const newRow = row + rowOffset
    const newCol = col + colOffset

    if (isInBounds(newRow, newCol)) {
      const targetPiece = gameState.board[newRow][newCol]
      if (!targetPiece || targetPiece.color !== piece.color) {
        moves.push({ row: newRow, col: newCol })
      }
    }
  }

  if (!piece.hasMoved && !gameState.inCheck) {
    const castlingRights = gameState.castlingRights[piece.color]

    if (
      castlingRights.kingSide &&
      !gameState.board[row][col + 1] &&
      !gameState.board[row][col + 2] &&
      !isSquareAttacked(row, col + 1, piece.color) &&
      !isSquareAttacked(row, col + 2, piece.color)
    ) {
      const rookCol = 7
      const rook = gameState.board[row][rookCol]
      if (rook && rook.type === "rook" && !rook.hasMoved) {
        moves.push({ row, col: col + 2, special: "castleKing" })
      }
    }

    if (
      castlingRights.queenSide &&
      !gameState.board[row][col - 1] &&
      !gameState.board[row][col - 2] &&
      !gameState.board[row][col - 3] &&
      !isSquareAttacked(row, col - 1, piece.color) &&
      !isSquareAttacked(row, col - 2, piece.color)
    ) {
      const rookCol = 0
      const rook = gameState.board[row][rookCol]
      if (rook && rook.type === "rook" && !rook.hasMoved) {
        moves.push({ row, col: col - 2, special: "castleQueen" })
      }
    }
  }

  return moves
}

function getKingAttacks(row, col) {
  const attacks = []
  const offsets = [
    [-1, -1],
    [-1, 0],
    [-1, 1],
    [0, -1],
    [0, 1],
    [1, -1],
    [1, 0],
    [1, 1],
  ]

  for (const [rowOffset, colOffset] of offsets) {
    const newRow = row + rowOffset
    const newCol = col + colOffset

    if (isInBounds(newRow, newCol)) {
      attacks.push({ row: newRow, col: newCol })
    }
  }

  return attacks
}

function getSlidingMoves(row, col, piece, directions, board) {
  const moves = []

  for (const [rowDir, colDir] of directions) {
    let newRow = row + rowDir
    let newCol = col + colDir

    while (isInBounds(newRow, newCol)) {
      const targetPiece = board[newRow][newCol]

      if (!targetPiece) {
        moves.push({ row: newRow, col: newCol })
      } else {
        if (targetPiece.color !== piece.color) {
          moves.push({ row: newRow, col: newCol })
        }
        break
      }

      newRow += rowDir
      newCol += colDir
    }
  }

  return moves
}

function isInBounds(row, col) {
  return row >= 0 && row < 8 && col >= 0 && col < 8
}

function isSquareAttacked(row, col, color) {
  const opponentColor = color === "white" ? "black" : "white"

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = gameState.board[r][c]
      if (piece && piece.color === opponentColor) {
        const attacks = getPieceAttacks(r, c, piece, gameState.board)
        if (attacks.some((attack) => attack.row === row && attack.col === col)) {
          return true
        }
      }
    }
  }

  return false
}

function checkGameStatus() {
  const kingPos = gameState.kings[gameState.currentPlayer]
  gameState.inCheck = isSquareAttacked(kingPos.row, kingPos.col, gameState.currentPlayer)


  let hasLegalMoves = false

  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = gameState.board[row][col]
      if (piece && piece.color === gameState.currentPlayer) {
        const moves = getValidMoves(row, col)
        if (moves.length > 0) {
          hasLegalMoves = true
          break
        }
      }
    }
    if (hasLegalMoves) break
  }

  const statusElement = document.getElementById("game-status")

  if (!hasLegalMoves) {
    gameState.gameOver = true
    if (gameState.inCheck) {
    
      statusElement.className = "alert alert-danger"
      statusElement.textContent = `Xeque-mate! ${gameState.currentPlayer === "white" ? "Pretas" : "Brancas"} vencem!`
    } else {
    
      statusElement.className = "alert alert-warning"
      statusElement.textContent = "Empate por afogamento!"
    }
  } else if (gameState.inCheck) {
  
    statusElement.className = "alert alert-warning"
    statusElement.textContent = `${gameState.currentPlayer === "white" ? "Brancas" : "Pretas"} estão em xeque!`
  
    const kingSquare = document.querySelector(`.square[data-row="${kingPos.row}"][data-col="${kingPos.col}"]`)
    kingSquare.classList.add("check")
  } else {
    statusElement.className = "alert alert-info"
    statusElement.textContent = "Jogo em andamento"
  }
}

function updateTurnIndicator() {
  const turnIndicator = document.getElementById("turn-indicator")
  const currentTurn = document.getElementById("current-turn")
  const turnColor = document.getElementById("turn-color")

  currentTurn.textContent = `Vez das ${gameState.currentPlayer === "white" ? "brancas" : "pretas"}`
  turnColor.className = gameState.currentPlayer === "white" ? "turn-indicator-white" : "turn-indicator-black"
}

function updateCapturedPieces() {
  const whiteCaptured = document.getElementById("white-captured")
  const blackCaptured = document.getElementById("black-captured")

  whiteCaptured.innerHTML = gameState.capturedPieces.white.map((piece) => pieceIcons.black[piece.type]).join(" ")

  blackCaptured.innerHTML = gameState.capturedPieces.black.map((piece) => pieceIcons.white[piece.type]).join(" ")
}

function recordMove(piece, fromRow, fromCol, toRow, toCol, capturedPiece, special) {
  const files = ["a", "b", "c", "d", "e", "f", "g", "h"]
  const ranks = ["8", "7", "6", "5", "4", "3", "2", "1"]

  let notation = ""


  if (piece.type !== "pawn") {
    notation += piece.type.charAt(0).toUpperCase()
  }

  if (capturedPiece) {
    if (piece.type === "pawn") {
      notation += files[fromCol]
    }
    notation += "x"
  }

  notation += files[toCol] + ranks[toRow]


  if (special === "castleKing") {
    notation = "O-O"
  } else if (special === "castleQueen") {
    notation = "O-O-O"
  }

  const opponentColor = piece.color === "white" ? "black" : "white"
  const opponentKingPos = gameState.kings[opponentColor]

  const tempBoard = JSON.parse(JSON.stringify(gameState.board))
  tempBoard[toRow][toCol] = piece
  tempBoard[fromRow][fromCol] = null

  let isCheck = false
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const attackingPiece = tempBoard[r][c]
      if (attackingPiece && attackingPiece.color === piece.color) {
        const attacks = getPieceAttacks(r, c, attackingPiece, tempBoard)
        if (attacks.some((attack) => attack.row === opponentKingPos.row && attack.col === opponentKingPos.col)) {
          isCheck = true
          break
        }
      }
    }
    if (isCheck) break
  }

  if (isCheck) {
    notation += "+"
  }

  const moveNumber = Math.floor(gameState.moveHistory.length / 2) + 1
  const moveHistoryTable = document.getElementById("move-history")

  if (piece.color === "white") {
    const row = document.createElement("tr")
    row.innerHTML = `
            <td>${moveNumber}</td>
            <td>${notation}</td>
            <td></td>
        `
    moveHistoryTable.appendChild(row)
  } else {
    const lastRow = moveHistoryTable.lastElementChild
    if (lastRow) {
      lastRow.lastElementChild.textContent = notation
    }
  }

  gameState.moveHistory.push({
    piece,
    from: { row: fromRow, col: fromCol },
    to: { row: toRow, col: toCol },
    captured: capturedPiece,
    notation,
  })
}

function resetGame() {
  gameState.board = initializeBoard()
  gameState.currentPlayer = "white"
  gameState.selectedPiece = null
  gameState.validMoves = []
  gameState.capturedPieces = { white: [], black: [] }
  gameState.moveHistory = []
  gameState.kings = {
    white: { row: 7, col: 4 },
    black: { row: 0, col: 4 },
  }
  gameState.inCheck = false
  gameState.gameOver = false
  gameState.castlingRights = {
    white: { kingSide: true, queenSide: true },
    black: { kingSide: true, queenSide: true },
  }
  gameState.enPassantTarget = null
  gameState.pendingPromotion = null

  createChessboard()
  updateTurnIndicator()
  updateCapturedPieces()

  document.getElementById("move-history").innerHTML = ""

  const statusElement = document.getElementById("game-status")
  statusElement.className = "alert alert-info"
  statusElement.textContent = "Jogo em andamento"
}

document.addEventListener("DOMContentLoaded", () => {
  gameState.board = initializeBoard()
  createChessboard()
  updateTurnIndicator()

  document.getElementById("reset-game").addEventListener("click", resetGame)
})
