import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { VRMLoaderPlugin, VRM, VRMUtils } from '@pixiv/three-vrm'
import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import type { Viseme } from '../types'
import { avatarLipSyncBus } from '../lib/avatarLipSyncBus'
import { listVrmExpressionNames, VrmLipSyncController } from '../lib/vrmLipSync'

interface Avatar3DPanelProps {
  src: string
  speaking: boolean
  viseme: Viseme
  expression: 'neutral' | 'supportive' | 'curious' | 'gesture'
  onReady?: () => void
  onError?: (message: string) => void
}

function VrmModel({ src, speaking, expression, onReady, onError }: Omit<Avatar3DPanelProps, 'viseme'>) {
  const { scene, camera, gl } = useThree()
  const vrmRef = useRef<VRM | null>(null)
  const lipSyncRef = useRef(new VrmLipSyncController())
  const lookTargetRef = useRef(new THREE.Object3D())
  const pointerRef = useRef({ x: 0, y: 0.15 })

  useEffect(() => {
    scene.add(lookTargetRef.current)
    lookTargetRef.current.position.set(0, 1.45, 1.2)
    return () => {
      scene.remove(lookTargetRef.current)
    }
  }, [scene])

  useEffect(() => {
    const canvas = gl.domElement
    const onMove = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect()
      const nx = ((event.clientX - rect.left) / rect.width) * 2 - 1
      const ny = -(((event.clientY - rect.top) / rect.height) * 2 - 1)
      pointerRef.current = { x: nx * 0.35, y: 0.15 + ny * 0.18 }
    }
    canvas.addEventListener('pointermove', onMove)
    return () => canvas.removeEventListener('pointermove', onMove)
  }, [gl.domElement])

  useEffect(() => {
    let disposed = false
    const loader = new GLTFLoader()
    loader.register((parser) => new VRMLoaderPlugin(parser))
    loader.load(
      src,
      (gltf) => {
        if (disposed) return
        const vrm = gltf.userData.vrm as VRM | undefined
        if (!vrm) {
          onError?.('VRM data missing from model file')
          return
        }

        VRMUtils.rotateVRM0(vrm)
        vrm.scene.position.set(0, -1.05, 0)
        vrm.scene.rotation.y = Math.PI
        scene.add(vrm.scene)
        vrmRef.current = vrm

        if (vrm.lookAt) {
          vrm.lookAt.target = lookTargetRef.current
          vrm.lookAt.autoUpdate = true
        }

        console.info('[Avatar3D] VRM loaded; expression presets:', listVrmExpressionNames(vrm).join(', '))
        onReady?.()
      },
      undefined,
      (error) => {
        if (!disposed) onError?.(error instanceof Error ? error.message : 'Failed to load VRM')
      },
    )

    return () => {
      disposed = true
      const vrm = vrmRef.current
      if (vrm) {
        scene.remove(vrm.scene)
        VRMUtils.deepDispose(vrm.scene)
        vrmRef.current = null
      }
    }
  }, [onError, onReady, scene, src])

  useEffect(() => {
    lipSyncRef.current.setSpeaking(speaking)
  }, [speaking])

  useEffect(() => {
    return avatarLipSyncBus.subscribe((snapshot) => {
      lipSyncRef.current.setViseme(snapshot.viseme, snapshot.jawOpen)
    })
  }, [])

  useFrame(({ clock }, delta) => {
    const vrm = vrmRef.current
    if (!vrm) return

    const manager = vrm.expressionManager
    manager?.resetValues()

    const idleBreath = Math.sin(clock.elapsedTime * 1.35) * 0.012
    vrm.scene.position.y = -1.05 + idleBreath

    lookTargetRef.current.position.set(pointerRef.current.x, 1.42 + pointerRef.current.y, 1.25)

    lipSyncRef.current.apply(vrm, delta)

    if (expression === 'supportive' && manager?.getExpression('relaxed')) {
      manager.setValue('relaxed', 0.4)
    }
    if (expression === 'curious' && manager?.getExpression('surprised')) {
      manager.setValue('surprised', 0.22)
    }
    if (Math.sin(clock.elapsedTime * 1.7) > 0.985 && manager?.getExpression('blink')) {
      manager.setValue('blink', 1)
    }

    const rightUpperArm = vrm.humanoid?.getNormalizedBoneNode('rightUpperArm')
    if (rightUpperArm) {
      const gesture = expression === 'gesture' ? Math.sin(clock.elapsedTime * 5) * 0.28 : 0
      rightUpperArm.rotation.z = gesture
    }

    vrm.update(delta)
    camera.lookAt(0, 1.35 + idleBreath, 0)
  })

  return null
}

export function Avatar3DPanel(props: Avatar3DPanelProps) {
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error'>('loading')
  const [loadError, setLoadError] = useState('')

  return (
    <div className="avatar-3d-canvas" aria-label="VRoid 3D interviewer with lip-sync">
      {loadState !== 'ready' && (
        <div className={`avatar-3d-loading ${loadState === 'error' ? 'error' : ''}`}>
          {loadState === 'error' ? loadError || '3D avatar failed to load' : 'Loading VRoid avatar…'}
        </div>
      )}
      <Canvas camera={{ position: [0, 1.38, 2.35], fov: 24 }} dpr={[1, 1.75]}>
        <color attach="background" args={['#0f172a']} />
        <ambientLight intensity={1.15} />
        <directionalLight position={[1.2, 2.8, 2.5]} intensity={1.65} />
        <directionalLight position={[-1.8, 1.4, 1.2]} intensity={0.5} color="#b9f5ed" />
        <pointLight position={[0, 1.6, 1.5]} intensity={0.35} color="#fef3c7" />
        <VrmModel
          src={props.src}
          speaking={props.speaking}
          expression={props.expression}
          onReady={() => setLoadState('ready')}
          onError={(message) => {
            setLoadError(message)
            setLoadState('error')
          }}
        />
      </Canvas>
    </div>
  )
}
