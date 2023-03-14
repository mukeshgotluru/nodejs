const express = require("express");

const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");

const dbPath = path.join(__dirname, "cricketMatchDetails.db");

const app = express();
app.use(express.json());

let db = null;

const initializeDbAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });

    app.listen(3001, () =>
      console.log("Server Running at http://localhost:3001/")
    );
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};

initializeDbAndServer();

const convertPlayerObjectToResponseObject = (dbObject) => {
  return {
    playerId: dbObject.player_id,
    playerName: dbObject.player_name,
  };
};

const convertMatchObjectToResponsiveObject = (dbObject) => {
  return {
    matchId: dbObject.match_id,
    match: dbObject.match,
    year: dbObject.year,
  };
};

const convertPlayerScoreObjectToResponsiveObject = (dbObject) => {
  return {
    playerMatchId: dbObject.player_match_id,
    playerId: dbObject.player_id,
    matchId: dbObject.match_id,
    score: dbObject.score,
    fours: dbObject.fours,
    sixes: dbObject.sixes,
  };
};

// API 1 Returns a list of all the players in the player table

app.get("/players/", async (request, response) => {
  const getPlayersQuery = `
    SELECT
      *
    FROM
      player_details;`;
  const playersArray = await db.all(getPlayersQuery);
  response.send(
    playersArray.map((eachPlayer) =>
      convertPlayerObjectToResponseObject(eachPlayer)
    )
  );
});

// API 2 Returns a specific player based on the player ID

app.get("/players/:playerId/", async (request, response) => {
  const { playerId } = request.params;
  const getPlayerQuery = `
    SELECT 
      *
    FROM 
      player_details
    WHERE
      player_id = ${playerId};`;
  const player = await db.get(getPlayerQuery);
  response.send(convertPlayerObjectToResponseObject(player));
});

// API 3 Updates the details of a specific player based on the player ID

app.put("/players/:playerId/", async (request, response) => {
  const { playerId } = request.params;
  const playerDetails = request.body;
  const { playerName } = playerDetails;
  const updatePlayerQuery = `
    UPDATE
      player_details
    SET
      player_name = "${playerName}"
    WHERE
      player_id = ${playerId};`;
  await db.run(updatePlayerQuery);
  response.send("Player Details Updated");
});

// API 4 Returns the match details of a specific match

app.get("/matches/:matchId/", async (request, response) => {
  const { matchId } = request.params;
  const getMatchQuery = `
    SELECT
      *
    FROM
      match_details
    WHERE
      match_id = ${matchId};`;
  const match = await db.get(getMatchQuery);
  response.send(convertMatchObjectToResponsiveObject(match));
});

// API 5 Returns a list of all the matches of a player

app.get("/players/:playerId/matches/", async (request, response) => {
  const { playerId } = request.params;
  const getMatchesQuery = `
SELECT
  *
FROM
  player_match_score
NATURAL JOIN
 match_details 
WHERE
  player_id = ${playerId};`;
  const matchArray = await db.all(getMatchesQuery);
  response.send(
    matchArray.map((eachMatch) =>
      convertMatchObjectToResponsiveObject(eachMatch)
    )
  );
});

// API 6 Returns a list of players of a specific match

app.get("/matches/:matchId/players/", async (request, response) => {
  const { matchId } = request.params;
  const getPlayersQuery = `
    SELECT 
    *
    FROM
    player_match_score
    NATURAL JOIN
    player_details
    WHERE 
    match_id = ${matchId};`;
  const playerArray = await db.all(getPlayersQuery);
  response.send(
    playerArray.map((eachPlayer) =>
      convertPlayerObjectToResponseObject(eachPlayer)
    )
  );
});

// API 7 Returns the statistics of the total score, fours, sixes of a specific player based on the player ID

app.get("/players/:playerId/playerScores/", async (request, response) => {
  const { playerId } = request.params;
  const getPlayerScoreQuery = `
SELECT
  player_id,
  player_name,
  SUM(score),
  SUM(fours),
  SUM(sixes)
FROM
  player_match_score 
NATURAL JOIN
  player_details
WHERE 
  player_id = ${playerId};`;
  const playerScore = await db.get(getPlayerScoreQuery);
  response.send({
    playerId: playerScore.player_id,
    playerName: playerScore.player_name,
    totalScore: playerScore["SUM(score)"],
    totalFours: playerScore["SUM(fours)"],
    totalSixes: playerScore["SUM(sixes)"],
  });
});

module.exports = app;
