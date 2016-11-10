import * as express from 'express'
import { Request, Response, NextFunction } from 'express'
import * as bodyParser from 'body-parser'
import routes from './app/routes'
import { PORT } from './app/configs'

const app = express()
app.use(bodyParser.json())
app.set('json spaces', 2)
app.use(bodyParser.urlencoded({ extended: true }))
app.set('trust proxy', true)

function logging(request: Request, response: Response, next: NextFunction) {
  const log = {
    body: request.body,
    ip: request.headers['x-forwarded-for'] || request.connection.remoteAddress,
    method: request.method,
    url: request.originalUrl,
  }
  console.log(log)
  next()
}

function accessControl(request: Request, response: Response, next: NextFunction) {
  response.header('Access-Control-Allow-Origin', '*')
  response.header('Access-Control-Allow-Headers', 'Content-Type,Authorization,Cache-Control,Accept,Accept-Encoding')
  next()
}

// Routes
app.use(logging)
app.use(accessControl)
app.use('/', routes.api)
app.use('/', routes.datasets)

// Start Listening
app.listen(PORT)
console.log(`Listening on PORT ${ PORT }`)
