const express = require('express')
const path = require('path')
const app = express()
var cors = require('cors')
require('dotenv').config()
var cookieParser = require('cookie-parser');


var index = require('./routes/index')


app.use(cors())
app.use(cookieParser());

app.use('/', index)

app.use(express.static(path.join(__dirname, 'public')))

app.listen(process.env.PORT || 8080)