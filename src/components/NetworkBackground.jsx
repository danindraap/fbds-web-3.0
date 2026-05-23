import { useEffect, useRef } from 'react'

export default function NetworkBackground() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    let animationFrameId
    let particles = []
    let mouse = { x: null, y: null }

    const resize = () => {
      const parent = canvas.parentElement
      canvas.width = parent ? parent.clientWidth : window.innerWidth
      canvas.height = parent ? parent.clientHeight : window.innerHeight
      initParticles()
    }

    // Membuat titik-titik (Node)
    const initParticles = () => {
      particles = []
      const numParticles = Math.floor((canvas.width * canvas.height) / 8500) // Kerapatan partikel ditingkatkan agar lebih ramai
      for (let i = 0; i < numParticles; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * 1.2, // Kecepatan gerak X
          vy: (Math.random() - 0.5) * 1.2, // Kecepatan gerak Y
          radius: Math.random() * 2 + 1
        })
      }
    }

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      // Warna partikel Cyber Blue (Biru Muda cerah)
      const isDark = document.documentElement.getAttribute('data-theme') === 'dark'
      const rgb = isDark ? '56, 189, 248' : '14, 165, 233' 

      for (let i = 0; i < particles.length; i++) {
        let p = particles[i]
        p.x += p.vx
        p.y += p.vy

        // Memantul jika kena dinding layar
        if (p.x < 0 || p.x > canvas.width) p.vx *= -1
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1

        // Gambar titik (Atom) partikelnya
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(${rgb}, 0.7)` /* Dibuat lebih terang */
        ctx.fill()

        // Gambar garis antar titik (seri/paralel)
        for (let j = i + 1; j < particles.length; j++) {
          let p2 = particles[j]
          let dist = Math.hypot(p.x - p2.x, p.y - p2.y)
          if (dist < 130) {
            ctx.beginPath()
            ctx.moveTo(p.x, p.y)
            ctx.lineTo(p2.x, p2.y)
            ctx.strokeStyle = `rgba(${rgb}, ${0.6 - dist / 260})`
            ctx.stroke()
          }
        }

        // Garis yang terhubung otomatis ke kursor mouse Anda!
        if (mouse.x && mouse.y) {
          let distMouse = Math.hypot(p.x - mouse.x, p.y - mouse.y)
          if (distMouse < 220) {
            ctx.beginPath()
            ctx.moveTo(p.x, p.y)
            ctx.lineTo(mouse.x, mouse.y)
            ctx.strokeStyle = `rgba(${rgb}, ${0.8 - distMouse / 310})`
            ctx.stroke()
          }
        }
      }
      animationFrameId = requestAnimationFrame(draw)
    }

    window.addEventListener('resize', resize)
    window.addEventListener('mousemove', (e) => { 
      const rect = canvas.getBoundingClientRect()
      mouse.x = e.clientX - rect.left
      mouse.y = e.clientY - rect.top
    })
    window.addEventListener('mouseout', () => { mouse.x = null; mouse.y = null })
    
    resize()
    draw()

    return () => {
      window.removeEventListener('resize', resize)
      cancelAnimationFrame(animationFrameId)
    }
  }, [])

  return <canvas ref={canvasRef} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 0, pointerEvents: 'none' }} />
}