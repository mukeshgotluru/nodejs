const express = require("express");
const path = require("path");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const app = express();
app.use(express.json());

const dbPath = path.join(__dirname, "moviesData.db");

let db = null;

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server Running at http://localhost:3000/");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};

initializeDBAndServer();

const convertMovieToResponsiveObject = (dbObject) => {
  return {
    movieId: dbObject.movie_id,
    directorId: dbObject.director_id,
    movieName: dbObject.movie_name,
    learActor: dbObject.lead_actor,
  };
};

const convertDirectorToResponsiveObject = (dbObject) => {
  return {
    directorId: dbObject.director_id,
    directorName: dbObject.director_name,
  };
};

// API 1

app.get("/movies/", async (request, response) => {
  const getMovieQuery = `
    SELECT 
    movie_name
    FROM
    movie`;
  const moviesArray = await db.all(getMovieQuery);
  response.send(
    moviesArray.map((eachMovie) => convertMovieToResponsiveObject(eachMovie))
  );
});

// API 2

app.post("/movies/", async (request, response) => {
  const movieDetails = request.body;
  const { directorId, movieName, leadActor } = movieDetails;
  const addMoviesQuery = `
 INSERT INTO 
   movie (director_id,movie_name,lead_actor)
 VALUES 
  (
    "${directorId}",
    "${movieName}",
    "${leadActor}"
  );`;
  const dbResponse = await db.run(addMoviesQuery);
  const movieId = dbResponse.lastID;
  response.send("Movie Successfully Added");
});

// API 3

app.get("/movies/:movieId/", async (request, response) => {
  const { movieId } = request.params;
  const getMovieQuery = `
    SELECT 
      *
    FROM 
      movie
    WHERE 
      movie_id = ${movieId};`;
  const movies = await db.get(getMovieQuery);
  response.send(movies);
});

// API 4

app.put("/movies/:movieId/", async (request, response) => {
  const { movieId } = request.params;
  const movieDetails = request.body;
  const { directorId, movieName, leadActor } = movieDetails;
  const updatedMovieQuery = `
    UPDATE
      movie
    SET
      director_id=${directorId},
      movie_name= "${movieName}",
      lead_actor= "${leadActor}"
    WHERE
      movie_id = ${movieId};`;

  await db.run(updatedMovieQuery);
  response.send("Movie Details Updated");
});

// API 5
app.delete("/movies/:movieId/", async (request, response) => {
  const { movieId } = request.params;
  const deleteMovieQuery = `
DELETE FROM movie WHERE movie_id = ${movieId};`;
  await db.run(deleteMovieQuery);
  response.send("Movie Removed");
});

// API 6

app.get("/directors/", async (request, response) => {
  const getDirectorsQuery = `
    SELECT 
    *
    FROM 
    director
    `;
  const directors = await db.all(getDirectorsQuery);
  response.send(
    directors.map((eachDirector) =>
      convertDirectorToResponsiveObject(eachDirector)
    )
  );
});

// API 7

app.get("/directors/:directorId/movies/", async (request, response) => {
  const { directorId } = request.params;
  const getDirectorMovies = `
        SELECT 
          movie_name
        FROM 
          movie 
        NATURAL JOIN 
          director
        WHERE
          director_id = ${directorId};`;
  const movie = await db.all(getDirectorMovies);
  response.send(
    movie.map((eachDirector) => convertMovieToResponsiveObject(eachDirector))
  );
});

module.exports = app;
