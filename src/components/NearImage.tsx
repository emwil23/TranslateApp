import { useEffect, useRef, useState, type ComponentProps } from 'react'

/**
 * An image that starts downloading only when it comes near the screen. Native lazy loading still fetches
 * images a few screens down, which Lighthouse counts against the first paint on phones.
 */
export function NearImage({
  src,
  alt,
  ...props
}: ComponentProps<'img'> & { src: string; alt: string }) {
  const ref = useRef<HTMLImageElement>(null)
  const [near, setNear] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el || near) return
    const io = new IntersectionObserver(([e]) => e?.isIntersecting && setNear(true), {
      rootMargin: '400px 0px',
    })
    io.observe(el)
    return () => io.disconnect()
  }, [near])
  return <img ref={ref} alt={alt} {...props} {...(near && { src })} />
}
