import Vec2 from './vec.mjs'

const maxReadingValue = 200
const pressureThreshold = 80
const clusterIterations = 7
const clusterMinDistance = 3

// Possible improvement would be to retain the cluster from the previous reading to avoid big jumps?
// And the reset to this if unable to cluster
const initialCluster = [{x: 1, y: 4, i: 0}, {x: 7, y: 4, i: 1}]

const allowableOffset = 0.3
const allowableAngle = 3

const maxReadings = 10
const sensorCount = gridSize * gridSize
const emptyReadings = Array(maxReadings).fill(0)

// No nice way to make this const without using something like Rxjs scan unfortunately
let readings = Array(sensorCount).fill(emptyReadings)

const generateGraph = () => {
  return new Chart(document.getElementById('chart'), {
    type: 'line',
    data: {
      labels: Array(maxReadings).fill(0).map((_, i) => i),
      datasets: Array(sensorCount).fill(0).map((_, i) => ({
        label: `Pressure S${i}`,
        data: []
      }))
    },
    options: {
      scales: {
        y: {
          axis: 'y',
          min: 0,
          max: 200
        }
      }
    }
  })
}

/**
 * Performs k-means clustering on the sensor readings, with k = 2 using `clusterIterations` (default=7) iterations
 * It is modified to weight the distances based on the amount of pressure being applied to the cell,
 * so that the centroid naturally gravitates towards point with the most pressure
 */
const performClustering = rawCells => {
  // Place the x and y values in the centre of the cell instead of its top left corner
  const cells = rawCells.map(({x, y, val}) => ({ x: x + 0.5, y: y + 0.5, val }))
  const distance = 
    ({x, y}) =>
    ({x: x1, y: y1, val: v}) => 
      Math.sqrt(Math.pow((x- x1), 2) + Math.pow((y - y1), 2))

  // Initial centroids located roughly near where we expect them to be
  // Runs 7 iterations of clustering
  return Array(clusterIterations).fill(0).reduce(centroids => {
    const newCentroidGroupings = cells.reduce((partialGroup, cell) => {
      const nearestCentroid = centroids.map(centroid => ({
        ...centroid,
        dist: distance(centroid)(cell)
      })).sort((a, b) => a.dist - b.dist)[0]

      return {
        ...partialGroup,
        [nearestCentroid.i]: partialGroup[nearestCentroid.i].concat(cell)
      }
    }, { 0: [], 1: [] })

    return Object.values(newCentroidGroupings).map((centroid, i) => {
      if (centroid.length === 0) return { x: NaN, y: NaN, i, valid: false }

      const cellVals = centroid.map(cell => cell.val)
      const centroidMin = Math.min(...cellVals)
      const centroidMax = Math.max(...cellVals)
      const weightedCells = centroid.map(cell => ({
        x: cell.x,
        y: cell.y,
        weight: Math.exp((centroidMax - cell.val) / 3) / 2
      }))

      const weightSum = weightedCells.reduce((acc, {weight}) => acc + weight, 0)
      return {
        x: weightedCells.reduce((acc, {x, weight}) => acc + (x * weight), 0) / weightSum,
        y: weightedCells.reduce((acc, {y, weight}) => acc + (y * weight), 0) / weightSum,
        i, valid: true
      }
    })
  }, initialCluster) //.filter(centroid => centroid.valid)
}

const getMeasurements = rawCentroids => {
  const centroids = rawCentroids.sort((a, b) => a.x - b.x) // Ensure they are always sorted left to right
  const vec = Vec2.fromPoints(centroids[0], centroids[1])

  const v1 = new Vec2(centroids[0].x, centroids[0].y)

  const midpoint = v1.add(vec.scale(0.5))
  const ortho = vec.ortho()

  const rawAngle = ortho.angleX()
  const angle = rawAngle > 0 ? rawAngle - 180 : rawAngle

  return {
    vectorData: { v1, vec, midpoint, lineAngle: angle },
    measurement: {
      angle: ortho.angleY(),
      midpoint,
      length: vec.len()
    }
  }
}

const getFeedback = ({ angle, length, midpoint }) => {
  if (length < clusterMinDistance) return 'Unable to detect position'

  if (angle > allowableAngle) return 'Rotate to the left'
  else if (angle < -allowableAngle) return 'Rotate to the right'

  if (midpoint.x < (gridSize / 2) - allowableOffset) return 'Shift to the right'
  else if (midpoint.x > (gridSize / 2) + allowableOffset) return 'Shift to the left'

  return 'OK'
}

const generateGrid = () => {
  const grid = document.getElementsByClassName('grid')[0]
  for (let i = 0; i < 64; i++) {
    const cell = document.createElement('div')
    // cell.textContent = `${i}`
    grid.appendChild(cell)
  }

  const gridSizeDefn = Array(gridSize).fill('var(--grid-size)').join(' ')
  document.getElementById('grid-style').innerHTML = `.grid {
    grid-template-columns: ${gridSizeDefn};
    grid-template-rows: ${gridSizeDefn};
  }
  body {
    --grid-count: ${gridSize};
  }`
}

const renderCentroids = centroids => {
  centroids.forEach(({x, y, i}) => {
    const e = document.getElementById(`c-${i}`)
    e.style.display = isNaN(x) ? 'none' : 'block'
    e.style.top = `calc(${y} * var(--grid-size))`
    e.style.left = `calc(${x} * var(--grid-size))`
  })
}

const showLinesAndCentroid = () => [
  document.getElementById('l-cen'),
  document.getElementById('l-dir'),
  document.getElementById('c-0'),
  document.getElementById('c-1')
].forEach(e => e.style.display = '')

const hideLinesAndCentroid = () => [
  document.getElementById('l-cen'),
  document.getElementById('l-dir'),
  document.getElementById('c-0'),
  document.getElementById('c-1')
].forEach(e => e.style.display = 'none')

const renderLines = ({ v1, vec, midpoint, lineAngle }) => {
  const l1 = document.getElementById('l-cen') // Connects the centroids
  const l2 = document.getElementById('l-dir') // Orthogonal to the centroids, showing the user's direction

  l1.style.width = `calc(${vec.len()} * var(--grid-size))`
  l1.style.top = `calc(${v1.y} * var(--grid-size))`
  l1.style.left = `calc(${v1.x} * var(--grid-size))`
  l1.style.transform = `rotateZ(${vec.angleX()}deg)`

  l2.style.width = `calc(${vec.len()} * var(--grid-size))`
  l2.style.top = `calc(${midpoint.y} * var(--grid-size))`
  l2.style.left = `calc(${midpoint.x} * var(--grid-size))`
  l2.style.transform = `rotateZ(${lineAngle}deg)`
}

const renderTextFeedback = ({ angle, midpoint, length }) => {
  // document.getElementById('angle').textContent = angle
  // document.getElementById('centre').textContent = `${midpoint.x}, ${midpoint.y}`
  // document.getElementById('dist').textContent = length
  document.getElementById('feedback').textContent = getFeedback({ angle, midpoint, length })
}

const paintCells = cellReadings => cellReadings.forEach(({val, x, y}, i) => {
  const gridCells = document.getElementsByClassName('grid')[0].children

  gridCells[i].style.backgroundColor = `hsl(${val}, 100%, 50%)`
  gridCells[i].textContent = `${val}`
  // gridCells[i].textContent = `(${x}, ${y}): ${val}`
})

const updateGraph = graph => {
  graph.data.datasets.forEach((dataset, i) => dataset.data = readings[i])
  graph.update()
}

const render = (cellReadings, vectors, measurement, centroids, graph) => {
  paintCells(cellReadings)
  // updateGraph(graph)

  renderTextFeedback(measurement)
  if (centroids.filter(c => c.valid).length === 2) {
    showLinesAndCentroid()
    renderLines(vectors)
    renderCentroids(centroids)
  } else {
    hideLinesAndCentroid()
  }
}

const handleMessage = graph => msg => {
  const newReading = msg.data.split(',').map(d => Math.min(maxReadingValue, parseInt(d)))
  readings = readings.map((sensor, i) => sensor.concat(newReading[i]).slice(-maxReadings))

  const cellReadings = newReading.map((val, i) => ({
    val,
    y: Math.floor(i / gridSize),
    x: i % gridSize
  }))

  const filteredCells = cellReadings.filter(({val}) => val < pressureThreshold)
  const centroids = performClustering(filteredCells.filter(({ y }) => y > 0))

  const { vectorData, measurement } = getMeasurements(centroids)
  render(cellReadings, vectorData, measurement, centroids, graph)
}

const createWS = graph => {
  const ws = new WebSocket('/data')
  ws.addEventListener('message', handleMessage(graph))
  ws.addEventListener('close', () => setTimeout(() => createWS(graph), 1000))

  return ws
}

const setup = () => {
  // createWS(generateGraph())
  createWS(null)
  generateGrid()
}

setup()