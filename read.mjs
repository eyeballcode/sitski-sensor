import { SerialPort } from 'serialport'
import express from 'express'
import expressWs from 'express-ws'
import fs from 'fs/promises'

const port = await getPortUnix() || '/dev/cu.usbmodem143401'
let sockets = []

const setupApp = () => {
  const { app } = expressWs(express())
  app.get('/', async (req, res) => res.end(await fs.readFile('app-content/cells.html')))
  app.get('/cells', async (req, res) => res.end(await fs.readFile('app-content/cells.html')))
  app.get('/render.mjs', async (req, res) => res.setHeader('Content-Type', 'application/javascript').end(await fs.readFile('app-content/render.mjs')))
  app.get('/vec.mjs', async (req, res) => res.setHeader('Content-Type', 'application/javascript').end(await fs.readFile('app-content/vec.mjs')))
  app.get('/style.css', async (req, res) => res.end(await fs.readFile('app-content/style.css')))
  app.ws('/data', async (ws, req) => {
    sockets.push(ws)
    ws.on('close', () => sockets.splice(sockets.indexOf(ws), 1))
    const data = Array(8).fill(Array(8).fill(40)).map(z => z.slice(0))
    data[5][1] = 20
    data[4][6] = 20
    ws.send(data.flatMap(m => m).join(','))
  })

  return app
}

const setupSerial = () => {
  try {
    const serial = new SerialPort({ path: port, baudRate: 57600 })
    const processLine = line => sockets.forEach(ws => ws.send(line.trim()))

    let dataCount = 0
    let currentLine = ''
    serial.on('data', data => {
      const part = data.toString()
      if (part.includes('\n')) {
        const [prev, next] = part.split('\n')

        if (dataCount++ > 3) processLine(currentLine + prev)
        currentLine = next || ''
      } else {
        currentLine += part
      }
    })
  } catch (e) {
    console.error('Failed to open serial port', e)
  }
}

async function getPortUnix() {
  try {
    const devFiles = await fs.readdir('/dev')
    const usb = devFiles.filter(file => file.startsWith('cu.usbmodem') || file.startsWith('ttyUSB'))
    if (usb.length === 1) return `/dev/${usb[0]}`
  } catch (e) {}
  return null
}

const app = setupApp()
app.listen(8999)
setupSerial()

process.on('uncaughtException', console.error)