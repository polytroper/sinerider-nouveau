const d3 = require('d3')
const _ = require('lodash')
const math = require('mathjs')

const PhysicsContext = require('./physics')
const Axes = require('./axes')
const Graph = require('./graph')
const Sledder = require('./sledder')
const Goal = require('./goal')
const Text = require('./text')
const Image = require('./image')
const Renderer = require('./renderer')

const morph = require('nanomorph')

const WorldComponent = require('./templates/world_template')
const worldComponent = new WorldComponent()

const Tone = require('tone')

const synth = new Tone.PolySynth(8, Tone.Synth).toMaster()
const synthNotes = [
  'C',
  'C#',
  'D',
  'D#',
  'E',
  'F',
  'F#',
  'G',
  'G#',
  'A',
  'A#',
  'B',
]

const numberToNote = i => {
  i = Math.max(1, Math.min(i, 100))
  const octave = Math.ceil(i / 12)
  const note = synthNotes[(i - 1) % 12]
  return note + octave
}

const {
  translate,
  rotate,
  transform,
  lerp,
  normalize,
  isComplex,
} = require('./helpers')

module.exports = spec => {
  var {
    pubsub,
    container,
    loader,

    getSceneObjects,

    getWidth,
    getHeight,
    getAspect,

    getRunning,
    getEditing,
    getBuilding,
    getClockTime,
    getFrameInterval,
    getGravity,

    getRecord,
    getRecording,
    getRecordTime,

    getGif,
    recordFrame,

    sampleGraph,
    sampleGraphSlope,
    sampleGraphVelocity,
  } = spec

  var sceneComponentStates = []

  var yScale = d3.scaleLinear().range([getHeight(), 0])
  var xScale = d3.scaleLinear().range([0, getWidth()])

  const samples = []
  const sampleCount = 256
  samples.length = sampleCount
  for (let i = 0; i < sampleCount; i++) samples[i] = [0, 0]

  const graphInstance = {
    sample: sampleGraph,
    sampleSlope: sampleGraphSlope,
    sampleVelocity: sampleGraphVelocity,
    _physicsHits: [],
    _physicsHitCount: 0,
    _physicsShape: 'graph',
    _physicsLayer: 'world',
    _physicsKinetic: false,
    _physicsKinematic: true,
    _physicsParent: null,
  }
  graphInstance._physicsParent = graphInstance

  var camera = {
    position: [0, 0],
    size: [10 * getAspect(), 10],
    scale: getHeight() / 10,
  }

  var cameraTarget = {
    position: [0, 0],
    size: [10 * getAspect(), 10],
    scale: getHeight() / 10,
  }

  var cameraSmoothing = 0.02

  var cameraPoints = [[0, 0]]
  var sceneIdCounter = 0

  const physics = PhysicsContext()
  let physicsInstances = []

  const renderer = Renderer({
    getWidth,
    getHeight,
    getAspect,
    xScale,
    yScale,
    camera,
    samples,
    sampleCount,
  })
  let renderInstances = []

  var canvas = container
    .append('canvas')
    .attr('class', 'world')
    .style('position', 'absolute')
    .attr('width', getWidth())
    .attr('height', getHeight())
    .style('overflow', 'hidden')

  var refreshCameraPoints = () => {
    let sledders = getSceneObjects('sled')

    // +1 for the origin
    while (cameraPoints.length < sledders.length + 1) cameraPoints.push([0, 0])
    while (cameraPoints.length > sledders.length + 1) cameraPoints.pop()

    for (let i = 0; i < sledders.length; i++) {
      const sledder = sledders[i]

      // +1 for the origin
      cameraPoints[i + 1][0] = math.re(sledder.p)
      cameraPoints[i + 1][1] = math.im(sledder.p)
    }
  }

  var refreshScales = () => {
    let p = camera.position
    let s = camera.size

    let xMin = p[0] - s[0]
    let xMax = p[0] + s[0]
    let yMin = p[1] - s[1]
    let yMax = p[1] + s[1]

    xScale.domain([xMin, xMax])
    yScale.domain([yMin, yMax])
  }

  var setCameraPosition = (x, y) => {
    camera.position[0] = x
    camera.position[1] = y
    refreshScales()
  }

  var smoothCamera = () => {
    camera.position[0] = lerp(
      camera.position[0],
      cameraTarget.position[0],
      cameraSmoothing
    )
    camera.position[1] = lerp(
      camera.position[1],
      cameraTarget.position[1],
      cameraSmoothing
    )

    camera.size[0] = lerp(camera.size[0], cameraTarget.size[0], cameraSmoothing)
    camera.size[1] = lerp(camera.size[1], cameraTarget.size[1], cameraSmoothing)

    camera.scale = getHeight() / (camera.size[1] * 2)

    refreshScales()
  }

  var jumpCamera = () => {
    camera.position[0] = cameraTarget.position[0]
    camera.position[1] = cameraTarget.position[1]

    camera.size[0] = cameraTarget.size[0]
    camera.size[1] = cameraTarget.size[1]

    camera.scale = getHeight() / (camera.size[1] * 2)

    refreshScales()
  }

  const reduceCameraMin = (a, v) => [math.min(a[0], v[0]), math.min(a[1], v[1])]

  const reduceCameraMax = (a, v) => [math.max(a[0], v[0]), math.max(a[1], v[1])]

  var followCameraPoints = () => {
    var min = _.reduce(cameraPoints, reduceCameraMin)
    var max = _.reduce(cameraPoints, reduceCameraMax)

    var x = (min[0] + max[0]) / 2
    var y = (min[1] + max[1]) / 2

    cameraTarget.position[0] = x
    cameraTarget.position[1] = y

    var spanX = max[0] - min[0]
    var spanY = max[1] - min[1]
    var spanMax = math.max(spanX, spanY)

    var size = math.max(10, spanMax)

    cameraTarget.size[0] = size * getAspect()
    cameraTarget.size[1] = size

    cameraTarget.scale = getHeight() / (size * 2)
  }

  var onSetMacroState = () => {
    jumpCamera()
  }

  const updateGoals = () => {
    let instances = getSceneObjects('goal')

    for (let i = 0; i < instances.length; i++) {
      const instance = instances[i]
      let { complete, _physicsHits, note = null, duration = 1 } = instance

      const playerHit = _.find(
        _physicsHits,
        v =>
          v.partner._physicsLayer == 'player' ||
          v.partner._physicsLayer == 'player_trigger'
      )

      if (playerHit) complete = true

      if (!instance.complete && complete) {
        if (note != null) {
          if (_.isNumber(note)) note = numberToNote(note)

          console.log('Triggering synth note ' + note)
          synth.triggerAttackRelease(note, duration)
        }

        instance.complete = complete
        pubsub.publish('onCompleteGoal')
      }
    }
  }

  var resampleGraph = () => {
    const xMin = camera.position[0] - camera.size[0]
    const xMax = camera.position[0] + camera.size[0]

    for (let i = 0; i < sampleCount; i++) {
      const c = i / (sampleCount - 1)
      let x = lerp(xMin, xMax, c)
      let y = sampleGraph(x)
      samples[i][0] = x
      samples[i][1] = y
    }
  }

  var update = () => {
    refreshCameraPoints()
    followCameraPoints()
    updateGoals()

    if (getRunning()) smoothCamera()
    else jumpCamera()

    resampleGraph()

    if (getRunning()) {
      physics.tick(physicsInstances, getFrameInterval(), getGravity())
    }
  }

  var render = () => {
    renderer(canvas.node().getContext('2d'), renderInstances)
  }

  var onEditExpressions = () => {}

  var refreshScene = () => {
    _.each(getSceneObjects('sled'), instance => {
      let x = math.re(instance.p)
      let y
      let a
      let s = sampleGraphSlope(x)

      if (isComplex(instance.p)) {
        y = instance.p.im
        a = Math.atan(s)
      } else {
        y = sampleGraph(x)
        instance.p = math.complex(x, y)
        a = Math.atan(s)
      }

      instance._physicsUpright.re = -math.sin(a)
      instance._physicsUpright.im = math.cos(a)

      instance.a = a

      instance.v.re = 0
      instance.v.im = 0
    })

    renderInstances = _.flatten(_.values(getSceneObjects()))
    renderInstances.unshift({ o: 'graph', sample: sampleGraph })

    physicsInstances = _.flatten(_.values(getSceneObjects()))
    physicsInstances = _.filter(physicsInstances, v =>
      _.has(v, '_physicsLayer')
    )

    physicsInstances.push(graphInstance)
    physics.start(physicsInstances)
  }

  var onResize = () => {
    yScale.range([getHeight(), 0])
    xScale.range([0, getWidth()])

    canvas.attr('width', getWidth())
    canvas.attr('height', getHeight())
  }

  refreshScales()

  pubsub.subscribe('onSetMacroState', onSetMacroState)

  pubsub.subscribe('onEditExpressions', onEditExpressions)
  // pubsub.subscribe("onRefreshScene", onRefreshScene);

  pubsub.subscribe('onResize', onResize)

  return {
    render,
    update,
    refreshScene,
  }
}
