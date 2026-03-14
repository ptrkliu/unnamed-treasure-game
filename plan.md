Incan Gold Multiplayer Web Game

Architecture Overview

flowchart TB
    subgraph clients [Mobile Browsers]
        P1[Player 1]
        P2[Player 2]
        P3[Player 3]
    end

    subgraph railway [Railway - Single Deployment]
        Express[Express Server]
        Static[Static HTML/CSS/JS]
        WS[WebSocket Server]
        LobbyStore[Lobby Store]
        GameStore[Game Store]
    end

    P1 --> Express
    P2 --> Express
    P3 --> Express
    Express --> Static
    P1 -->|Socket.io| WS
    P2 -->|Socket.io| WS
    P3 -->|Socket.io| WS
    WS --> LobbyStore
    WS --> GameStore

Single deployment: Express serves static files and hosts the WebSocket server. One URL, no CORS, one deploy.

1. Project Structure

incan-gold/
├── package.json
├── server/ # Railway deployment
│ ├── index.js # Express + Socket.io entry
│ ├── lobby.js # Lobby creation, join, player list
│ ├── game.js # Game state machine, deck, turns
│ └── store.js # In-memory lobby/game storage
├── public/                    # Static assets (served by Express)
│ ├── index.html # Landing: create or join lobby
│ ├── lobby.html # Lobby view (player list, start button)
│ ├── game.html # Game view (stay/leave, card reveal)
│ ├── css/
│ │ └── styles.css
│ └── js/
│ ├── app.js # Routing, socket init
│ ├── lobby.js # Lobby UI logic
│ └── game.js # Game UI logic
└── README.md

2. Deck & Game Rules (Implementation Details)

Deck (30 cards):

15 Treasures: One card each for every value from 5 to 19 inclusive (5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19).

15 Hazards: 3 each of jaguars, rocks, snakes, spiders, mummies.

Turn flow:

All active players secretly choose Stay or Leave.

Once everyone has chosen, reveal all choices.

Reveal top card of deck.

If treasure: Split value among players who stayed (integer division); remainder goes to shared pot. Add each player’s share to “treasures in front of them.”

If hazard (first occurrence): No effect; track hazard type.

If hazard (second occurrence): All players who stayed lose treasures in front of them and are marked dead (out for the game).

Players who left: Add their “treasures in front” to final score. Split shared pot among all who left this turn (if multiple). They sit out remaining turns.

Next turn: only players who stayed and didn’t die. Repeat until deck empty, everyone has left, or everyone who stayed has died.

Game end: When all players have left or died. Show final scores.

3. Lobby System

Action

Client

Server

Create lobby

createLobby

Generate 6-char code, store { code, hostId, players: [{ id, name }], status: 'waiting' }

Join lobby

joinLobby(code, name)

Validate code, add player, emit playerJoined to all

Start game

startGame (host only)

Validate host, create game from lobby, transition to game

Leave lobby

leaveLobby

Remove player, emit updates; if host leaves, assign new host or disband

Code generation: 6 alphanumeric characters (e.g., ABC123), checked for uniqueness.

4. Real-Time Events (Socket.io)

| Event           | Direction | Payload                        |
| --------------- | --------- | ------------------------------ | ----------- |
| createLobby     | C→S       | { name }                       |
| joinLobby       | C→S       | { code, name }                 |
| startGame       | C→S       | —                              |
| playerChoice    | C→S       | { choice: 'stay'               | 'leave' }   |
| lobbyUpdated    | S→C       | { players, hostId, code }      |
| gameStarted     | S→C       | { gameId, players, round }     |
| choicesRevealed | S→C       | { choices: { playerId: 'stay'  | 'leave' } } |
| cardRevealed    | S→C       | { card, effects, scores, pot } |
| gameOver        | S→C       | { finalScores, winner }        |

5. Frontend (Vanilla JS) – Mobile-First

Responsive CSS: Touch-friendly buttons, readable text, viewport meta.

Single-page feel: Use history.pushState or hash routing to switch between create/join, lobby, and game without full reloads.

Socket.io client: Connect on load; reconnect with same session if possible.

UI states:

Landing: Form to create lobby (name) or join (code + name).

Lobby: Show code, player list, “Start” (host only). Copy-code button.

Game: During choice phase, show Stay/Leave buttons; during reveal, show choices and card; show scores and pot.

6. Backend (Node.js)

Express: Serve public/ and health check.

Socket.io: Namespaces or rooms per lobby/game.

Store: In-memory Map for lobbies and games. Keys: lobby code, game ID. No DB for MVP.

Validation: Reject invalid codes, duplicate names in same lobby, non-host start, out-of-turn choices.

7. Deployment

Single Railway deployment: Deploy the full app (Express + static files + Socket.io). Set PORT from env. Expose public URL. One `railway up` or git push deploys everything. No CORS configuration needed (same origin).

8. Key Files to Implement

File

Responsibility

server/index.js

Express setup, Socket.io, static serve, route handlers

server/store.js

createLobby, joinLobby, getLobby, createGame, getGame, updateGame

server/game.js

Deck creation, shuffle, turn logic, hazard tracking, score calculation

public/js/app.js

Socket connection, page navigation, event handlers

public/js/lobby.js

Lobby UI, join/create, player list, start button

public/js/game.js

Choice buttons, reveal animation, score display

9. Edge Cases to Handle

Host disconnects in lobby: Promote next player or disband lobby.

Player disconnects mid-game: Treat as “left” (take their share) or mark AFK and auto-leave after timeout.

Duplicate hazard: Track per-game; reset when new game starts.

All players leave same turn: Split pot; game ends.

Last player dies: Game ends; final scores for those who left earlier.

10. Suggested Implementation Order

Project setup (package.json, Express, Socket.io, static files)

Store + lobby logic (create, join, player list)

Lobby frontend (create, join, display)

Game engine (deck, turn flow, stay/leave, hazards)

Game backend (Socket events, room management)

Game frontend (choice UI, reveal, scores)

Mobile styling and polish

Deployment config (Railway)
