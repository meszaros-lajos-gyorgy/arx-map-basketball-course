import { Entity, Vector3 } from 'arx-level-generator'
import { createBox } from 'arx-level-generator/prefabs/mesh'
import { ControlZone } from 'arx-level-generator/scripting/properties'
import { createZone } from 'arx-level-generator/tools'
import { toArxCoordinateSystem } from 'arx-level-generator/tools/mesh'
import { applyTransformations } from 'arx-level-generator/utils'
import { MathUtils, Mesh, MeshBasicMaterial, TorusGeometry } from 'three'
import { backPlateTexture, beamTexture, hoopTexture } from '@/textures.js'

type createHoopProps = {
  position: Vector3
  dunkDetector: Entity
}

const createRing = (position: Vector3) => {
  let geometry = new TorusGeometry(100, 10, 5, 4)
  geometry = toArxCoordinateSystem(geometry)

  const material = new MeshBasicMaterial({ map: hoopTexture })
  const mesh = new Mesh(geometry, material)

  mesh.rotateZ(MathUtils.degToRad(45))
  applyTransformations(mesh)
  mesh.rotateX(MathUtils.degToRad(-90))
  applyTransformations(mesh)
  mesh.translateX(position.x)
  mesh.translateY(position.y)
  mesh.translateZ(position.z)
  applyTransformations(mesh)

  return mesh
}

export const createHoop = ({ position, dunkDetector }: createHoopProps) => {
  const ring = createRing(position.clone())

  const backPlate = createBox({
    position: position.clone().add(new Vector3(0, -50, 80)),
    size: new Vector3(200, 150, 10),
    materials: backPlateTexture,
  })

  const beam = createBox({
    position: position.clone().add(new Vector3(0, 75, 95)),
    size: new Vector3(20, 250, 20),
    materials: beamTexture,
  })

  const aboveRingZone = createZone({
    name: 'above_ring',
    position: position
      .clone()
      .add(new Vector3(0, -10, 0))
      // Y axis is flipped for the zone
      .multiply(new Vector3(1, -1, 1)),
    size: new Vector3(130, 20, 130),
  })

  const belowRingZone = createZone({
    name: 'below_ring',
    position: position
      .clone()
      .add(new Vector3(0, 30, 0))
      // Y axis is flipped for the zone
      .multiply(new Vector3(1, -1, 1)),
    size: new Vector3(130, 20, 130),
  })

  const aboveRingDetect = Entity.marker.withScript()
  aboveRingDetect.script?.properties.push(new ControlZone(aboveRingZone))
  aboveRingDetect.script?.on('controlledzone_enter', () => {
    return `sendevent above_ring ${dunkDetector.ref} nop`
  })

  const belowRingDetect = Entity.marker.withScript()
  belowRingDetect.script?.properties.push(new ControlZone(belowRingZone))
  belowRingDetect.script?.on('controlledzone_enter', () => {
    return `sendevent below_ring ${dunkDetector.ref} nop`
  })

  return {
    meshes: [ring, backPlate, beam],
    zones: [aboveRingZone, belowRingZone],
    entities: [aboveRingDetect, belowRingDetect],
  }
}
