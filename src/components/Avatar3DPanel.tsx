import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { VRMLoaderPlugin, VRM, VRMUtils } from '@pixiv/three-vrm'
import { useEffect, useRef } from 'react'
import type { Viseme } from '../types'

interface Avatar3DPanelProps {
  src: string
  speaking: boolean
  viseme: Viseme
  expression: 'neutral' | 'supportive' | 'curious' | 'gesture'
}

function VrmModel({ src, speaking, viseme, expression }: Avatar3DPanelProps) {
  const { scene } = useThree()
  const vrmRef = useRef<VRM | null>(null)

  useEffect(() => {
    let disposed = false
    const loader = new GLTFLoader()
    loader.register((parser) => new VRMLoaderPlugin(parser))
    loader.load(src, (gltf) => {
      const vrm = gltf.userData.vrm as VRM | undefined
      if (!vrm || disposed) return
      VRMUtils.rotateVRM0(vrm)
      vrm.scene.position.set(0, -1.1, 0)
      scene.add(vrm.scene)
      vrmRef.current = vrm
    })

    return () => {
      disposed = true
      const vrm = vrmRef.current
      if (vrm) {
        scene.remove(vrm.scene)
        vrmRef.current = null
      }
    }
  }, [scene, src])

  useFrame(({ clock }, delta) => {
    const vrm = vrmRef.current
    if (!vrm) return

    const manager = vrm.expressionManager
    manager?.resetValues()
    const mouth = viseme === 'A' ? 'aa'
      : viseme === 'E' ? 'ee'
        : viseme === 'O' ? 'ou'
          : viseme === 'M' ? 'neutral'
            : viseme === 'F' ? 'ih'
              : 'neutral'
    if (speaking && mouth !== 'neutral') manager?.setValue(mouth, 0.9)

    if (expression === 'supportive') manager?.setValue('relaxed', 0.45)
    if (expression === 'curious') manager?.setValue('surprised', 0.25)
    if (Math.sin(clock.elapsedTime * 1.7) > 0.985) manager?.setValue('blink', 1)

    const rightUpperArm = vrm.humanoid?.getNormalizedBoneNode('rightUpperArm')
    if (rightUpperArm) {
      const gesture = expression === 'gesture' ? Math.sin(clock.elapsedTime * 5) * 0.28 : 0
      rightUpperArm.rotation.z = gesture
    }
    vrm.update(delta)
  })

  return null
}

export function Avatar3DPanel(props: Avatar3DPanelProps) {
  return (
    <div className="avatar-3d-canvas" aria-label="Local VRM 3D interviewer">
      <Canvas camera={{ position: [0, 1.35, 3.1], fov: 28 }} dpr={[1, 1.5]}>
        <color attach="background" args={['#0f172a']} />
        <ambientLight intensity={1.3} />
        <directionalLight position={[1.5, 3, 3]} intensity={1.8} />
        <directionalLight position={[-2, 1.5, 1]} intensity={0.55} color="#b9f5ed" />
        <VrmModel {...props} />
      </Canvas>
    </div>
  )
}
