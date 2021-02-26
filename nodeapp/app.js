const express = require('express')
const app = express()
const port = 3000

app.get('/', (req, res, next) => {
  res.json('thomas genius')
})

app.listen(port, () => console.log(`server is running on ${port}`))