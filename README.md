# Unnamed Treasure Game

A multiplayer web game. Create a lobby, share the code with friends, and play on mobile or desktop.

## Setup

```bash
npm install
npm start
```

Open http://localhost:3000

## Deploy to Railway

1. Create a project at [railway.app](https://railway.app)
2. Connect your repo or run `railway init`
3. Set the start command: `npm start`
4. Railway will use `PORT` from the environment

## How to Play

1. **Create** a lobby (enter your name) or **Join** with a code and name
2. Share the 6-character code with friends
3. Host clicks **Start Game** when everyone has joined
4. Each turn, choose **Stay** or **Leave** (hidden until all choose)
5. A card is revealed:
   - **Treasure**: Split among players who stayed; remainder goes to shared pot
   - **Hazard (first)**: No effect
   - **Hazard (second)**: All who stayed lose their treasures and die
6. Players who **Leave** add their treasures to their score and take a share of the pot
7. Game ends when all have left or died
