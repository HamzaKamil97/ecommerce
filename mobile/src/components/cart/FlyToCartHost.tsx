import { useRef, useState, useEffect } from "react"
import { Animated, Image, Easing, Dimensions, View } from "react-native"

interface FlyJob {
  imageUri: string
  sourceX: number
  sourceY: number
  sourceSize: number
  onComplete: () => void
}

let triggerRef: ((job: FlyJob) => void) | null = null

export function flyToCart(job: FlyJob) {
  if (triggerRef) triggerRef(job)
  else {
    // No host mounted — just call onComplete immediately
    job.onComplete()
  }
}

export function FlyToCartHost() {
  const x = useRef(new Animated.Value(0)).current
  const y = useRef(new Animated.Value(0)).current
  const scale = useRef(new Animated.Value(0)).current
  const opacity = useRef(new Animated.Value(0)).current
  const [imgUri, setImgUri] = useState<string | null>(null)
  const [size, setSize] = useState(60)

  useEffect(() => {
    triggerRef = (job: FlyJob) => {
      setImgUri(job.imageUri)
      setSize(job.sourceSize)
      x.setValue(job.sourceX)
      y.setValue(job.sourceY)
      scale.setValue(1)
      opacity.setValue(1)
      const screen = Dimensions.get("window")
      // FAB is at bottom: 24, right: 24, width: 56 (per CartFab.tsx)
      const targetX = screen.width - 56 - 24 + 28 - job.sourceSize / 2
      const targetY = screen.height - 56 - 24 + 28 - job.sourceSize / 2
      Animated.parallel([
        Animated.timing(x, { toValue: targetX, duration: 400, easing: Easing.bezier(0.34, 1.56, 0.64, 1), useNativeDriver: true }),
        Animated.timing(y, { toValue: targetY, duration: 400, easing: Easing.bezier(0.34, 1.56, 0.64, 1), useNativeDriver: true }),
        Animated.timing(scale, { toValue: 0.2, duration: 400, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0, duration: 400, useNativeDriver: true }),
      ]).start(() => {
        setImgUri(null)
        job.onComplete()
      })
    }
    return () => { triggerRef = null }
  }, [])

  if (!imgUri) return null
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: "absolute",
        width: size,
        height: size,
        opacity,
        transform: [{ translateX: x }, { translateY: y }, { scale }],
        zIndex: 9999,
      }}
    >
      <Image source={{ uri: imgUri }} style={{ width: "100%", height: "100%", borderRadius: 10 }} />
    </Animated.View>
  )
}
