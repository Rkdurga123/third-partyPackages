const express = require('express')
const app = express()
app.use(express.json())
const {open} = require('sqlite')
const sqlite3 = require('sqlite3')
const path = require('path')
const dbPath = path.join(__dirname, 'covid19IndiaPortal.com')
let db = null

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    })
    app.listen(3000, () => {
      console.log('Server running at http://localhost:3000')
    })
  } catch (e) {
    console.log('DB Error at ${error}')
    process.exit(1)
  }
}
initializeDBAndServer()

const convertDBOStateObjAPI = objectItem => {
  return {
    stateId: objectItem.state_id,
    stateName: objectItem.state_name,
    population: objectItem.population,
  }
}
app.post('/login/', async (request, response) => {
  const {username, password} = request.body
  const userDetailsQuery = `SELECT * FROM user where username='${username}';`
  const userDetails = await db.get(userDetailsQuery)
  if (userDetails !== undefined) {
    const isPasswordValid = await db.bcrpt.compare(
      password,
      userDetails.password,
    )
    if (isPasswordValid) {
      const payload = {username: username}
      const jwtToken = jwt.sign(payload, 'durga_secret_key')
      response.send({jwtToken})
    } else {
      response.status(400)
      response.send('Invalid password')
    }
  } else {
    response.status(400)
    response.send('Invalid user')
  }
})

function authenticationToken(request, response, next) {
  let jwtToken
  const authHeader = request.headers.authorization
  if (authHeader !== undefined) {
    jwtToken = authHeader.split(' ')[1]
  }
  if (jwtToken !== undefined) {
    jwt.verify(jwtToken, 'durga_secret_key', async (error, payload) => {
      if (error) {
        response.status(401)
        response.send(`Invalid JWT Token`)
      } else {
        next()
      }
    })
  } else {
    response.status(401)
    response.send('Invalid JWT Token')
  }
}

app.get('/states/', authenticationToken, async (request, response) => {
  const getStatesQuery = `SELECT * FROM state;`
  const getStateRes = await db.all(getStatesQuery)
  response.send(getStateRes.map(eachState => convertDBOStateObjAPI(eachState)))
})

app.get('/states/:stateId/', authenticationToken, async (request, response) => {
  const {stateId} = request.params
  const getStateQuery = `SELECT * FROM state WHERE state_id=${stateId};`
  const getStateResponse = await db.get(getStateQuery)
  response.send(convertDBOStateObjAPI(getStateResponse))
})

app.post('/districts/', authenticationToken, async (request, response) => {
  const {districtName, stateId, cases, cured, active, deaths} = request.body
  const createDistrictQuery = `INSERT INTO district(district_name,state_id,cases,cured,active,deaths)
    VALUES('${districtName}', ${stateId}, ${cases}, ${cured}, ${active}, ${deaths});
    `
  await db.run(createDistrictQuery)
  response.send('District Successfully Added')
})

const convertDistrictObjAPI = objectItem => {
  return {
    districtId: objectItem.district_id,
    districtName: objectItem.district_name,
    stateId: objectItem.state_id,
    cases: objectItem.cases,
    cured: objectItem.cured,
    active: objectItem.active,
    deaths: objectItem.deaths,
  }
}

app.get(
  '/districts/:districtId/',
  authenticationToken,
  async (request, response) => {
    const {districtId} = request.params
    const getdistrictQuery = `SELECT * FROM district WHERE district_id=${districtId};`
    const getdistrictRes = await db.get(getdistrictQuery)
    response.send(convertDistrictObjAPI(getdistrictRes))
  },
)

app.delete(
  '/districts/:districtId/',
  authenticationToken,
  async (request, response) => {
    const {districtId} = request.params
    const deleteDistrictQuery = `DELETE * FROM district WHERE district_id=${districtId};`
    const deleteDistrictRes = await db.run(deleteDistrictQuery)
    response.send('District Removed')
  },
)

app.put(
  '/districts/:districtId/',
  authenticationToken,
  async (request, response) => {
    const {districtId} = request.params
    const {districtName, stateId, cases, cured, active, deaths} = request.body
    const updatedQuery = `UPDATE district SET district_name='${districtName}',
    state_id=${stateId}, cases=${cases}, cured=${cured}, active=${active}, deaths=${deaths};`
    const updatedRes = await db.run(updatedQuery)
    response.send('District Details Updated')
  },
)

app.get(
  '/states/:stateId/stats/',
  authenticationToken,
  async (request, response) => {
    const {stateId} = request.params
    const getTotalQuery = `SELECT sum(cases) as totalCases, sum(cured) as totalCured, sum(active) as totalActive, sum(deaths) as totalDeaths FROM district WHERE state_id=${stateId};`
    const getTotalRes = await db.get(getTotalQuery)
    response.send(getTotalRes)
  },
)

module.experts = app
