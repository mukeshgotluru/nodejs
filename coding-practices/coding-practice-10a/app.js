const express = require("express");
const path = require("path");

const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const app = express();
app.use(express.json());

const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const dbPath = path.join(__dirname, "covid19IndiaPortal.db");

let db = null;

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3001, () => {
      console.log("Server Running at http://localhost:3001/");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};

initializeDBAndServer();

const convertStateObjectToResponsive = (dbObject) => {
  return {
    stateId: dbObject.state_id,
    stateName: dbObject.state_name,
    population: dbObject.population,
  };
};

const convertDistrictObjectiveToResponsive = (dbObject) => {
  return {
    districtId: dbObject.district_id,
    districtName: dbObject.district_name,
    stateId: dbObject.state_id,
    cases: dbObject.cases,
    cured: dbObject.cured,
    active: dbObject.active,
    deaths: dbObject.deaths,
  };
};

const authenticateToken = (request, response, next) => {
  let jwtToken;
  const authHeader = request.headers["authorization"];
  if (authHeader !== undefined) {
    jwtToken = authHeader.split(" ")[1];
  }
  if (jwtToken === undefined) {
    response.status(401);
    response.send("Invalid JWT Token");
  } else {
    jwt.verify(jwtToken, "abcdefg", async (error, payload) => {
      if (error) {
        response.status(401);
        response.send("Invalid JWT Token");
      } else {
        next();
      }
    });
  }
};

app.post("/login/", async (request, response) => {
  const { username, password } = request.body;
  const selectUserQuery = `
SELECT 
  *
FROM 
  user
WHERE 
  username LIKE "${username}";`;
  const dbUser = await db.get(selectUserQuery);
  if (dbUser === undefined) {
    response.status(400);
    response.send("Invalid user");
  } else {
    const isPasswordMatch = await bcrypt.compare(password, dbUser.password);
    if (isPasswordMatch === true) {
      const payload = { username };
      const jwtToken = jwt.sign(payload, "abcdefg");
      response.send({ jwtToken });
    } else {
      response.status(400);
      response.send("Invalid password");
    }
  }
});

// API 2

app.get("/states/", authenticateToken, async (request, response) => {
  const getStatesQuery = `
SELECT 
  * 
FROM 
  state;`;
  const state = await db.all(getStatesQuery);
  response.send(
    state.map((eachState) => convertStateObjectToResponsive(eachState))
  );
});

// API 3

app.get("/states/:stateId/", authenticateToken, async (request, response) => {
  const { stateId } = request.params;
  const getStateQuery = `
    SELECT *
    FROM 
      state
    WHERE
     state_id = ${stateId}`;
  const state = await db.get(getStateQuery);
  response.send(convertStateObjectToResponsive(state));
});

/// API 4
app.post("/districts/", authenticateToken, async (request, response) => {
  const { districtName, stateId, cases, cured, active, deaths } = request.body;
  const addDistrictQuery = `
    INSERT INTO 
    district (district_name,state_id,cases,cured,active,deaths)
    VALUES 
      (
          "${districtName}",
          ${stateId},
          "${cases}",
          "${cured}",
          "${active}",
          "${deaths}"
       );`;
  const dbResponse = await db.run(addDistrictQuery);
  const district = dbResponse.lastID;
  response.send("District Successfully Added");
});

/// API 5
app.get(
  "/districts/:districtId/",
  authenticateToken,
  async (request, response) => {
    const { districtId } = request.params;
    const getDistrictQuery = `
    SELECT *
    FROM
      district
    WHERE
    district_id = ${districtId};`;
    const district = await db.get(getDistrictQuery);
    response.send(convertDistrictObjectiveToResponsive(district));
  }
);

// API 6
app.delete(
  "/districts/:districtId/",
  authenticateToken,
  async (request, response) => {
    const { districtId } = request.params;
    const deleteDistrictQuery = `
DELETE FROM district WHERE district_id = ${districtId};`;
    await db.run(deleteDistrictQuery);
    response.send("District Removed");
  }
);

// API 7
app.put(
  "/districts/:districtId/",
  authenticateToken,
  async (request, response) => {
    const { districtId } = request.params;
    const {
      districtName,
      stateId,
      cases,
      cured,
      active,
      deaths,
    } = request.body;
    const updateQuery = `
    UPDATE 
      district
    SET
      district_name = "${districtName}",
      state_id = ${stateId},
      cases = "${cases}",
      cured = "${cured}",
      active = "${active}",
      deaths = "${deaths}"
    WHERE
      district_id = ${districtId};`;
    await db.run(updateQuery);
    response.send("District Details Updated");
  }
);

// API 8

app.get(
  "/states/:stateId/stats/",
  authenticateToken,
  async (request, response) => {
    const { stateId } = request.params;
    const getStateQuery = `
SELECT 
  SUM(cases),
  SUM(cured),
  SUM(active),
  SUM(deaths)
FROM
  state_id = ${stateId};`;
    const stats = await db.get(getStateQuery);
    response.send({
      totalCases: stats["SUM(cases)"],
      totalCured: stats["SUM(cured)"],
      totalActive: stats["SUM(active)"],
      totalDeaths: stats["SUM(deaths)"],
    });
  }
);

module.exports = app;
