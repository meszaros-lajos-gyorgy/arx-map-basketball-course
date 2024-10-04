import { ArxMap, Audio, DONT_QUADIFY, Entity, Settings, SHADING_SMOOTH, Vector3 } from 'arx-level-generator'
import { loadRooms } from 'arx-level-generator/prefabs/rooms'
import { ScriptSubroutine } from 'arx-level-generator/scripting'
import { Sound, SoundFlags } from 'arx-level-generator/scripting/classes'
import { useDelay } from 'arx-level-generator/scripting/hooks'
import { ControlZone, PlayerControls, Variable } from 'arx-level-generator/scripting/properties'
import { createZone } from 'arx-level-generator/tools'
import { applyTransformations } from 'arx-level-generator/utils'
import { createHoop } from './prefabs/hoop.js'

const settings = new Settings()
const map = new ArxMap()

map.config.offset = new Vector3(6000, 0, 6000)
map.player.withScript()

const rooms = await loadRooms('./basketball-course.rooms', settings)
rooms.forEach((room) => {
  map.add(room, true)
})

const chest = new Entity({
  src: 'items/movable/little_chest',
  position: new Vector3(15, -20, 300),
})
map.entities.push(chest)

const tutorialSound = new Sound(Audio.system.filename, SoundFlags.EmitFromPlayer)

const fakeEnemyOk = new Audio({ filename: 'demon_ouch.wav', isNative: true })
const fakeEnemyOkScript = new Sound(fakeEnemyOk.filename, SoundFlags.VaryPitch)

const fakeEnemyOuch = new Audio({ filename: 'demon_scream.wav', isNative: true })
const fakeEnemyOuchScript = new Sound(fakeEnemyOuch.filename, SoundFlags.VaryPitch)

const fakeEnemyDead = new Audio({ filename: 'demon_die.wav', isNative: true })
const fakeEnemyDeadScript = new Sound(fakeEnemyDead.filename, SoundFlags.VaryPitch)

const fakeEnemy = Entity.marker.withScript().at({
  position: new Vector3(0, 0, 800),
})
const fakeEnemyHealth = new Variable('int', 'fake_enemy_health', 10)
fakeEnemy.script?.properties.push(fakeEnemyHealth)
fakeEnemy.script?.on('damage', () => {
  const delay = useDelay()

  return `
    dec ${fakeEnemyHealth.name} 1

    if (${fakeEnemyHealth.name} > 3) {
      ${fakeEnemyOkScript.play()}
      accept
    }

    if (${fakeEnemyHealth.name} >= 1) {
      ${fakeEnemyOuchScript.play()}
      accept
    }

    ${PlayerControls.off}
    ${fakeEnemyDeadScript.play()}
    ${delay.delay(4000)} endgame
  `
})

const dunkDetector = Entity.marker.withScript()
const tutorialWelcome = new ScriptSubroutine('tutorial_welcome', () => {
  return `
    ${tutorialSound.play()}
    herosay "Welcome to the basketball course where you dunk with a metal chest! Defeat the enemy by scoring points, 10 dunks should kill it!"
  `
})
dunkDetector.script?.subroutines.push(tutorialWelcome)
dunkDetector.script?.on('init', () => {
  const delay = useDelay()
  return `
    ${delay.delay(1000)} ${tutorialWelcome.invoke()}
  `
})
const wasAboveRing = new Variable('bool', 'was_above_ring', false)
const scoredAPoint = new ScriptSubroutine('scored_a_point', () => {
  return `
    sendevent damage ${fakeEnemy.ref} nop
  `
})
dunkDetector.script?.properties.push(wasAboveRing)
dunkDetector.script?.subroutines.push(scoredAPoint)
dunkDetector.script
  ?.on('above_ring', () => {
    return `set ${wasAboveRing.name} 1`
  })
  .on('below_ring', () => {
    return `if (${wasAboveRing.name} == 1) {
      ${scoredAPoint.invoke()}
    }`
  })
  .on('touched_the_floor', () => {
    return `set ${wasAboveRing.name} 0`
  })

const floorZone = createZone({
  name: 'on_the_floor',
  size: new Vector3(700, 50, 1200),
})

const floorDetect = Entity.marker.withScript()
floorDetect.script?.properties.push(new ControlZone(floorZone))
floorDetect.script?.on('controlledzone_enter', () => {
  return `sendevent touched_the_floor ${dunkDetector.ref} nop`
})

const hoop = createHoop({ position: new Vector3(0, -200, 500), dunkDetector })

const entities = [fakeEnemy, dunkDetector, floorDetect, ...hoop.entities]
map.entities.push(...entities)

const zones = [floorZone, ...hoop.zones]
map.zones.push(...zones)

const meshes = [...hoop.meshes]

meshes.forEach((mesh) => {
  applyTransformations(mesh)
  mesh.translateX(map.config.offset.x)
  mesh.translateY(map.config.offset.y)
  mesh.translateZ(map.config.offset.z)
  applyTransformations(mesh)
  map.polygons.addThreeJsMesh(mesh, { tryToQuadify: DONT_QUADIFY, shading: SHADING_SMOOTH })
})

map.finalize(settings)
map.saveToDisk(settings)
