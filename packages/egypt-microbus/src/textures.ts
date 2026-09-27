import * as THREE from 'three';

/**
 * Small canvas textures drawn on the device (no image downloads).
 * Every function returns null where no DOM canvas exists (tests, workers).
 */

function canvas(width: number, height: number): CanvasRenderingContext2D | null {
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas');
  c.width = width;
  c.height = height;
  return c.getContext('2d');
}

function finish(ctx: CanvasRenderingContext2D, repeat = false): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(ctx.canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  if (repeat) {
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
  }
  return tex;
}

/**
 * Egyptian commercial plate: white plate, orange band on top with "مصر" and "EGYPT",
 * letters and digits in Arabic below. The text is illustrative, not a real registration.
 */
export function plateTexture(text: string): THREE.CanvasTexture | null {
  const ctx = canvas(256, 128);
  if (!ctx) return null;
  ctx.fillStyle = '#f7f7f5';
  ctx.fillRect(0, 0, 256, 128);
  ctx.fillStyle = '#e8741c';
  ctx.fillRect(0, 0, 256, 34);
  ctx.fillStyle = '#ffffff';
  ctx.font = '700 22px "Readex Pro", Tahoma, sans-serif';
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillText('EGYPT', 14, 18);
  ctx.textAlign = 'right';
  ctx.direction = 'rtl';
  ctx.fillText('مصر', 242, 18);
  ctx.fillStyle = '#111111';
  ctx.textAlign = 'center';
  let size = 46;
  ctx.font = `700 ${size}px "Readex Pro", Tahoma, sans-serif`;
  while (ctx.measureText(text).width > 228 && size > 20) {
    size -= 2;
    ctx.font = `700 ${size}px "Readex Pro", Tahoma, sans-serif`;
  }
  ctx.fillText(text, 128, 84);
  ctx.strokeStyle = '#222222';
  ctx.lineWidth = 4;
  ctx.strokeRect(2, 2, 252, 124);
  return finish(ctx);
}

/** Woven seat cover with a small diamond pattern, the typical microbus upholstery. */
export function seatFabricTexture(base: string): THREE.CanvasTexture | null {
  const ctx = canvas(64, 64);
  if (!ctx) return null;
  const c = new THREE.Color(base);
  const dark = `#${c.clone().multiplyScalar(0.72).getHexString()}`;
  const light = `#${c.clone().lerp(new THREE.Color('#ffffff'), 0.18).getHexString()}`;
  ctx.fillStyle = `#${c.getHexString()}`;
  ctx.fillRect(0, 0, 64, 64);
  ctx.strokeStyle = dark;
  ctx.lineWidth = 3;
  for (let i = -64; i < 128; i += 16) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i + 64, 64);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(i + 64, 0);
    ctx.lineTo(i, 64);
    ctx.stroke();
  }
  ctx.fillStyle = light;
  for (let y = 8; y < 64; y += 16) for (let x = 0; x < 64; x += 16) ctx.fillRect(x - 1, y - 1, 2, 2);
  const tex = finish(ctx, true);
  tex.repeat.set(3, 3);
  return tex;
}

/**
 * The hand-written destination card propped behind a microbus windshield
 * ("رمسيس", "إسكندرية"...). Drawn in the Ruq'ah hand when the font is available.
 */
export function destinationCardTexture(text: string): THREE.CanvasTexture | null {
  const ctx = canvas(512, 192);
  if (!ctx) return null;
  ctx.fillStyle = '#f4efe1';
  ctx.fillRect(0, 0, 512, 192);
  // Paper fibers from a generator seeded by the text, so the same card always looks the same.
  const random = seeded(text);
  ctx.fillStyle = '#e9e1cb';
  for (let i = 0; i < 40; i++) ctx.fillRect(random() * 512, random() * 192, 30, 1);
  ctx.fillStyle = '#b3121f';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.direction = 'rtl';
  let size = 120;
  ctx.font = `700 ${size}px "Aref Ruqaa", "Readex Pro", serif`;
  while (ctx.measureText(text).width > 470 && size > 40) {
    size -= 6;
    ctx.font = `700 ${size}px "Aref Ruqaa", "Readex Pro", serif`;
  }
  ctx.fillText(text, 256, 100);
  return finish(ctx);
}

/** Headlamp lens: fine vertical flutes over a faint center highlight. */
export function lensTexture(): THREE.CanvasTexture | null {
  const ctx = canvas(128, 64);
  if (!ctx) return null;
  const g = ctx.createRadialGradient(64, 32, 4, 64, 32, 70);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(1, '#d9e1e8');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 64);
  for (let x = 0; x < 128; x += 6) {
    ctx.fillStyle = 'rgba(120,140,160,0.35)';
    ctx.fillRect(x, 0, 1, 64);
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.fillRect(x + 2, 0, 1, 64);
  }
  ctx.fillStyle = 'rgba(90,105,120,0.35)';
  ctx.fillRect(0, 31, 128, 2);
  return finish(ctx);
}

/** Small deterministic generator (mulberry32) seeded from a string. */
function seeded(text: string): () => number {
  let h = 1779033703;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 3432918353);
  let a = h >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Soft dark ellipse for the contact shadow under the body. */
export function contactShadowTexture(): THREE.CanvasTexture | null {
  const ctx = canvas(128, 256);
  if (!ctx) return null;
  const g = ctx.createRadialGradient(64, 128, 10, 64, 128, 128);
  g.addColorStop(0, 'rgba(0,0,0,0.55)');
  g.addColorStop(0.55, 'rgba(0,0,0,0.3)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.save();
  ctx.scale(1, 1);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 256);
  ctx.restore();
  return finish(ctx);
}
