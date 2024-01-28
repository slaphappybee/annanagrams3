import express from 'express'

import { createServer } from 'node:http'
import { Server } from 'socket.io'

const app = express()
const server = createServer(app)
const io = new Server(server)

app.use(express.static('../client'))

io.on('connection', (socket) => {
    console.log("New user connected")
    socket.on('tileMoved', ([eid, col, line]) => {
        console.log([eid, col, line])
        socket.broadcast.emit('tileMoved', [eid, col, line])
    })
})

server.listen(8000, () => {
    console.log("Listening on :8000")
})
