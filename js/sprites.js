// =====================================================
// RED ALERT 2: REBORN — Hand-drawn Canvas 2D Sprites
// All sprites pre-rendered to offscreen canvases
// Dense RA2-style detail, Soviet aesthetic
// =====================================================

class SpriteFactory {
    constructor() {
        this.cache = {};
        this.tileW = 64;
        this.tileH = 32;
    }

    makeCanvas(w, h) {
        const c = document.createElement('canvas');
        c.width = w; c.height = h;
        return { canvas: c, ctx: c.getContext('2d') };
    }

    // Seeded pseudo-random for deterministic detail
    _srand(seed) {
        let s = seed | 0;
        return () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return (s >> 16) / 32767; };
    }

    // Iso diamond clip path helper
    _clipDiamond(ctx) {
        ctx.beginPath();
        ctx.moveTo(0, 0); ctx.lineTo(32, 16); ctx.lineTo(0, 32); ctx.lineTo(-32, 16);
        ctx.closePath();
    }

    // ==================== TERRAIN ====================

    drawGrassTile(variant = 0) {
        const key = 'grass_' + variant;
        if (this.cache[key]) return this.cache[key];
        const { canvas, ctx } = this.makeCanvas(66, 35);
        ctx.save();
        ctx.translate(33, 1);

        const rng = this._srand(variant * 137 + 42);

        // Clip to diamond
        this._clipDiamond(ctx);
        ctx.save();
        ctx.clip();

        // Base gradient - richer green
        const grad = ctx.createLinearGradient(-32, 8, 32, 24);
        grad.addColorStop(0, '#4d8040');
        grad.addColorStop(0.35, '#3e7035');
        grad.addColorStop(0.65, '#356830');
        grad.addColorStop(1, '#2a5525');
        ctx.fillStyle = grad;
        ctx.fillRect(-33, -1, 66, 35);

        // Secondary color patches for natural variation
        for (let i = 0; i < 5; i++) {
            const px = rng() * 56 - 28;
            const py = rng() * 26 + 3;
            const r = rng() * 8 + 4;
            const shade = rng();
            ctx.fillStyle = shade > 0.5
                ? `rgba(80,140,60,${0.15 + rng() * 0.15})`
                : `rgba(50,90,35,${0.12 + rng() * 0.12})`;
            ctx.beginPath();
            ctx.ellipse(px, py, r, r * 0.5, rng() * Math.PI, 0, Math.PI * 2);
            ctx.fill();
        }

        // Dirt/earth patches
        if (variant % 3 === 0) {
            for (let i = 0; i < 2; i++) {
                const dx = rng() * 40 - 20;
                const dy = rng() * 20 + 6;
                ctx.fillStyle = `rgba(120,95,65,${0.25 + rng() * 0.2})`;
                ctx.beginPath();
                ctx.ellipse(dx, dy, rng() * 6 + 3, rng() * 3 + 2, rng(), 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // Small stones
        if (variant % 2 === 1) {
            for (let i = 0; i < 3; i++) {
                const sx = rng() * 44 - 22;
                const sy = rng() * 22 + 5;
                const sr = rng() * 2 + 0.8;
                ctx.fillStyle = `rgba(140,135,120,${0.4 + rng() * 0.3})`;
                ctx.beginPath();
                ctx.ellipse(sx, sy, sr, sr * 0.7, 0, 0, Math.PI * 2);
                ctx.fill();
                // Stone highlight
                ctx.fillStyle = 'rgba(200,195,180,0.25)';
                ctx.beginPath();
                ctx.ellipse(sx - 0.5, sy - 0.5, sr * 0.5, sr * 0.35, 0, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // Grass texture: tiny dots and short strokes
        for (let i = 0; i < 20; i++) {
            const gx = rng() * 52 - 26;
            const gy = rng() * 26 + 3;
            const gLen = rng() * 3 + 1;
            ctx.strokeStyle = `rgba(${80 + rng() * 60},${140 + rng() * 60},${50 + rng() * 40},${0.3 + rng() * 0.25})`;
            ctx.lineWidth = 0.6;
            ctx.beginPath();
            ctx.moveTo(gx, gy);
            ctx.lineTo(gx + (rng() - 0.5) * 2, gy - gLen);
            ctx.stroke();
        }

        // Tiny flower dots (rare)
        if (variant === 2 || variant === 4) {
            for (let i = 0; i < 2; i++) {
                const fx = rng() * 36 - 18;
                const fy = rng() * 18 + 7;
                const colors = ['rgba(255,255,100,0.6)', 'rgba(255,180,200,0.5)', 'rgba(200,180,255,0.5)'];
                ctx.fillStyle = colors[Math.floor(rng() * 3)];
                ctx.beginPath();
                ctx.arc(fx, fy, 1, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        ctx.restore(); // unclip

        // Diamond edge highlights (light from top-left)
        ctx.strokeStyle = 'rgba(255,255,255,0.1)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-31, 16); ctx.lineTo(0, 1); ctx.lineTo(31, 16);
        ctx.stroke();

        // Edge shadow (bottom-right)
        ctx.strokeStyle = 'rgba(0,0,0,0.18)';
        ctx.beginPath();
        ctx.moveTo(31, 16); ctx.lineTo(0, 31); ctx.lineTo(-31, 16);
        ctx.stroke();

        ctx.restore();
        this.cache[key] = canvas;
        return canvas;
    }

    drawWaterTile(frame = 0) {
        const key = 'water_' + frame;
        if (this.cache[key]) return this.cache[key];
        const { canvas, ctx } = this.makeCanvas(66, 35);
        ctx.save();
        ctx.translate(33, 1);

        this._clipDiamond(ctx);
        ctx.save();
        ctx.clip();

        // Deep water gradient
        const grad = ctx.createLinearGradient(-20, 0, 20, 32);
        grad.addColorStop(0, '#0d3b5e');
        grad.addColorStop(0.3, '#154d6e');
        grad.addColorStop(0.6, '#0f3f5a');
        grad.addColorStop(1, '#092a42');
        ctx.fillStyle = grad;
        ctx.fillRect(-34, -1, 68, 36);

        // Dark depth patches
        const rng = this._srand(frame * 31 + 7);
        for (let i = 0; i < 3; i++) {
            ctx.fillStyle = 'rgba(5,20,40,0.25)';
            ctx.beginPath();
            ctx.ellipse(rng() * 40 - 20, rng() * 20 + 6, 8, 3, 0, 0, Math.PI * 2);
            ctx.fill();
        }

        // Animated waves - multiple layers
        const phase = frame * Math.PI * 0.5;
        for (let layer = 0; layer < 4; layer++) {
            const yOff = 5 + layer * 7;
            const alpha = 0.12 + (3 - layer) * 0.05;
            const waveShift = Math.sin(phase + layer * 0.8) * 6;

            ctx.strokeStyle = `rgba(120,200,255,${alpha})`;
            ctx.lineWidth = 0.8;
            ctx.beginPath();
            for (let wx = -30; wx <= 30; wx += 2) {
                const wy = yOff + Math.sin((wx + waveShift) * 0.2 + layer) * 1.5;
                wx === -30 ? ctx.moveTo(wx, wy) : ctx.lineTo(wx, wy);
            }
            ctx.stroke();
        }

        // Foam/sparkle highlights
        for (let i = 0; i < 5; i++) {
            const fx = Math.sin(phase + i * 1.3) * 18;
            const fy = 6 + i * 5.5 + Math.cos(phase + i * 0.7) * 2;
            ctx.fillStyle = `rgba(180,230,255,${0.08 + Math.sin(phase + i) * 0.06})`;
            ctx.beginPath();
            ctx.ellipse(fx, fy, 3 + Math.sin(phase + i * 2) * 1, 1, 0, 0, Math.PI * 2);
            ctx.fill();
        }

        // Subtle caustic light pattern
        ctx.fillStyle = 'rgba(60,170,220,0.06)';
        for (let i = 0; i < 4; i++) {
            const cx = Math.sin(phase * 0.7 + i * 2.1) * 20;
            const cy = 10 + Math.cos(phase * 0.5 + i * 1.7) * 8;
            ctx.beginPath();
            ctx.ellipse(cx, cy, 6, 3, phase * 0.3 + i, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore(); // unclip

        // Dark edge for depth
        ctx.strokeStyle = 'rgba(0,0,0,0.2)';
        ctx.lineWidth = 1;
        this._clipDiamond(ctx);
        ctx.stroke();

        ctx.restore();
        this.cache[key] = canvas;
        return canvas;
    }

    drawOreTile() {
        const key = 'ore';
        if (this.cache[key]) return this.cache[key];
        const { canvas, ctx } = this.makeCanvas(66, 35);
        ctx.save();
        ctx.translate(33, 1);

        this._clipDiamond(ctx);
        ctx.save();
        ctx.clip();

        // Brown earth base
        const earthGrad = ctx.createLinearGradient(-20, 0, 20, 32);
        earthGrad.addColorStop(0, '#6b5535');
        earthGrad.addColorStop(0.5, '#5a4428');
        earthGrad.addColorStop(1, '#4a3820');
        ctx.fillStyle = earthGrad;
        ctx.fillRect(-34, -1, 68, 36);

        // Earth texture
        const rng = this._srand(999);
        for (let i = 0; i < 8; i++) {
            ctx.fillStyle = `rgba(${80 + rng() * 40},${60 + rng() * 30},${30 + rng() * 20},0.25)`;
            ctx.beginPath();
            ctx.ellipse(rng() * 50 - 25, rng() * 24 + 4, rng() * 5 + 2, rng() * 3 + 1, rng(), 0, Math.PI * 2);
            ctx.fill();
        }

        // Cracks in earth
        ctx.strokeStyle = 'rgba(40,30,15,0.3)';
        ctx.lineWidth = 0.5;
        for (let i = 0; i < 3; i++) {
            ctx.beginPath();
            const sx = rng() * 30 - 15;
            const sy = rng() * 16 + 8;
            ctx.moveTo(sx, sy);
            ctx.lineTo(sx + rng() * 10 - 5, sy + rng() * 6 - 3);
            ctx.lineTo(sx + rng() * 14 - 7, sy + rng() * 8 - 4);
            ctx.stroke();
        }

        ctx.restore(); // unclip

        // 3D ore crystals on top
        const crystals = [
            [-12, 12, 5, 10], [-3, 18, 4, 8], [8, 10, 6, 12],
            [14, 16, 4, 7], [-18, 17, 3, 6], [4, 22, 3, 5],
            [-8, 8, 3, 6], [18, 12, 3, 5]
        ];

        crystals.forEach(([cx, cy, w, h], i) => {
            const hue = i % 3 === 0 ? 0 : i % 3 === 1 ? 1 : 2;
            const baseColors = [
                ['#ffcc00', '#ffa000', '#cc8000'], // gold
                ['#ffe040', '#ffb820', '#cc9010'], // bright gold
                ['#ffdd55', '#ffc030', '#aa7010'], // amber
            ];
            const [light, mid, dark] = baseColors[hue];

            // Crystal shadow on ground
            ctx.fillStyle = 'rgba(0,0,0,0.15)';
            ctx.beginPath();
            ctx.ellipse(cx + 2, cy + 2, w * 0.6, w * 0.25, 0.3, 0, Math.PI * 2);
            ctx.fill();

            // Crystal body - left face (dark)
            ctx.fillStyle = dark;
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.lineTo(cx, cy - h);
            ctx.lineTo(cx + w * 0.4, cy - h * 0.85);
            ctx.lineTo(cx + w * 0.4, cy + 1);
            ctx.closePath();
            ctx.fill();

            // Crystal body - right face (mid)
            ctx.fillStyle = mid;
            ctx.beginPath();
            ctx.moveTo(cx + w * 0.4, cy + 1);
            ctx.lineTo(cx + w * 0.4, cy - h * 0.85);
            ctx.lineTo(cx + w * 0.7, cy - h * 0.6);
            ctx.lineTo(cx + w * 0.7, cy + 2);
            ctx.closePath();
            ctx.fill();

            // Crystal top facet
            ctx.fillStyle = light;
            ctx.beginPath();
            ctx.moveTo(cx, cy - h);
            ctx.lineTo(cx + w * 0.4, cy - h * 0.85);
            ctx.lineTo(cx + w * 0.7, cy - h * 0.6);
            ctx.lineTo(cx + w * 0.3, cy - h * 0.75);
            ctx.closePath();
            ctx.fill();

            // Specular highlight on front face
            ctx.fillStyle = 'rgba(255,255,220,0.4)';
            ctx.beginPath();
            ctx.moveTo(cx + w * 0.1, cy - h * 0.7);
            ctx.lineTo(cx + w * 0.3, cy - h * 0.6);
            ctx.lineTo(cx + w * 0.25, cy - h * 0.3);
            ctx.lineTo(cx + w * 0.05, cy - h * 0.4);
            ctx.closePath();
            ctx.fill();

            // Glint dot
            ctx.fillStyle = 'rgba(255,255,240,0.9)';
            ctx.beginPath();
            ctx.arc(cx + w * 0.15, cy - h * 0.8, 1.2, 0, Math.PI * 2);
            ctx.fill();
        });

        // Overall glow
        ctx.save();
        ctx.translate(0, 0);
        this._clipDiamond(ctx);
        ctx.clip();
        const glow = ctx.createRadialGradient(0, 16, 0, 0, 16, 28);
        glow.addColorStop(0, 'rgba(255,200,50,0.08)');
        glow.addColorStop(1, 'rgba(255,200,50,0)');
        ctx.fillStyle = glow;
        ctx.fillRect(-34, -1, 68, 36);
        ctx.restore();

        // Diamond outline
        ctx.strokeStyle = 'rgba(0,0,0,0.15)';
        ctx.lineWidth = 0.5;
        ctx.save();
        ctx.translate(0, 0);
        this._clipDiamond(ctx);
        ctx.stroke();
        ctx.restore();

        ctx.restore();
        this.cache[key] = canvas;
        return canvas;
    }

    // ==================== BUILDINGS ====================

    drawRefinery(faction = 'soviet', constructionProgress = 1) {
        const key = `refinery_${faction}_${Math.floor(constructionProgress * 10)}`;
        if (this.cache[key]) return this.cache[key];
        const w = 140, h = 120;
        const { canvas, ctx } = this.makeCanvas(w, h);
        const primary = faction === 'soviet' ? '#cc2222' : '#2255cc';
        const primaryDark = faction === 'soviet' ? '#881515' : '#183d88';
        const accent = faction === 'soviet' ? '#ff4444' : '#4488ff';

        ctx.save();
        ctx.translate(w / 2, h * 0.72);

        if (constructionProgress < 1) {
            ctx.globalAlpha = 0.3 + constructionProgress * 0.7;
        }

        // ---- Ground shadow ----
        ctx.fillStyle = 'rgba(0,0,0,0.22)';
        ctx.beginPath();
        ctx.ellipse(2, 16, 52, 12, 0, 0, Math.PI * 2);
        ctx.fill();

        // ---- Concrete foundation ----
        // Top face
        const foundGrad = ctx.createLinearGradient(-50, -8, 50, -8);
        foundGrad.addColorStop(0, '#686868');
        foundGrad.addColorStop(0.5, '#7a7a7a');
        foundGrad.addColorStop(1, '#606060');
        ctx.fillStyle = foundGrad;
        ctx.beginPath();
        ctx.moveTo(0, -16); ctx.lineTo(52, -2); ctx.lineTo(0, 12); ctx.lineTo(-52, -2);
        ctx.closePath();
        ctx.fill();

        // Foundation side (front-left)
        ctx.fillStyle = '#4a4a4a';
        ctx.beginPath();
        ctx.moveTo(-52, -2); ctx.lineTo(0, 12); ctx.lineTo(0, 18); ctx.lineTo(-52, 4);
        ctx.closePath();
        ctx.fill();

        // Foundation side (front-right)
        ctx.fillStyle = '#555';
        ctx.beginPath();
        ctx.moveTo(52, -2); ctx.lineTo(0, 12); ctx.lineTo(0, 18); ctx.lineTo(52, 4);
        ctx.closePath();
        ctx.fill();

        // Foundation texture lines
        ctx.strokeStyle = 'rgba(0,0,0,0.08)';
        ctx.lineWidth = 0.5;
        for (let i = -40; i <= 40; i += 10) {
            ctx.beginPath();
            ctx.moveTo(i, -8 + Math.abs(i) * 0.14);
            ctx.lineTo(i + 6, -5 + Math.abs(i) * 0.14);
            ctx.stroke();
        }

        // ---- Main building body ----
        const bodyH = 28;

        // Left wall
        const leftGrad = ctx.createLinearGradient(-50, -bodyH, -20, 0);
        leftGrad.addColorStop(0, '#5e5e5e');
        leftGrad.addColorStop(0.4, '#6a6a6a');
        leftGrad.addColorStop(1, '#4a4a4a');
        ctx.fillStyle = leftGrad;
        ctx.beginPath();
        ctx.moveTo(-50, -2); ctx.lineTo(0, 12);
        ctx.lineTo(0, 12 - bodyH); ctx.lineTo(-50, -2 - bodyH);
        ctx.closePath();
        ctx.fill();

        // Left wall panel lines
        ctx.strokeStyle = 'rgba(0,0,0,0.1)';
        ctx.lineWidth = 0.5;
        for (let i = 1; i <= 3; i++) {
            const t = i / 4;
            const x1 = -50 + 50 * t;
            const y1 = -2 + 14 * t;
            ctx.beginPath();
            ctx.moveTo(x1, y1); ctx.lineTo(x1, y1 - bodyH);
            ctx.stroke();
        }

        // Right wall
        const rightGrad = ctx.createLinearGradient(20, -bodyH, 50, 0);
        rightGrad.addColorStop(0, '#787878');
        rightGrad.addColorStop(0.6, '#6e6e6e');
        rightGrad.addColorStop(1, '#5a5a5a');
        ctx.fillStyle = rightGrad;
        ctx.beginPath();
        ctx.moveTo(50, -2); ctx.lineTo(0, 12);
        ctx.lineTo(0, 12 - bodyH); ctx.lineTo(50, -2 - bodyH);
        ctx.closePath();
        ctx.fill();

        // Right wall panel lines
        for (let i = 1; i <= 3; i++) {
            const t = i / 4;
            const x1 = 50 - 50 * t;
            const y1 = -2 + 14 * t;
            ctx.beginPath();
            ctx.moveTo(x1, y1); ctx.lineTo(x1, y1 - bodyH);
            ctx.stroke();
        }

        // Roof / top face
        const roofGrad = ctx.createLinearGradient(-30, -40, 30, -25);
        roofGrad.addColorStop(0, '#7a7a7a');
        roofGrad.addColorStop(0.5, '#8a8a8a');
        roofGrad.addColorStop(1, '#707070');
        ctx.fillStyle = roofGrad;
        ctx.beginPath();
        ctx.moveTo(0, 12 - bodyH); ctx.lineTo(50, -2 - bodyH);
        ctx.lineTo(0, -16 - bodyH); ctx.lineTo(-50, -2 - bodyH);
        ctx.closePath();
        ctx.fill();

        // ---- Soviet red warning stripe on left wall ----
        ctx.fillStyle = primary;
        ctx.beginPath();
        const stripeY = -2 - bodyH + 5;
        ctx.moveTo(-50, stripeY + 8); ctx.lineTo(0, stripeY + 22);
        ctx.lineTo(0, stripeY + 18); ctx.lineTo(-50, stripeY + 4);
        ctx.closePath();
        ctx.fill();

        // Stripe highlight
        ctx.fillStyle = accent;
        ctx.globalAlpha = (ctx.globalAlpha || 1) * 0.3;
        ctx.beginPath();
        ctx.moveTo(-50, stripeY + 4); ctx.lineTo(0, stripeY + 18);
        ctx.lineTo(0, stripeY + 16); ctx.lineTo(-50, stripeY + 2);
        ctx.closePath();
        ctx.fill();
        ctx.globalAlpha = constructionProgress < 1 ? 0.3 + constructionProgress * 0.7 : 1;

        // ---- Storage tank 1 (large, left) ----
        this._drawDetailedTank(ctx, -20, -38, 15, 24, '#8899aa', primary);

        // ---- Storage tank 2 (smaller, right) ----
        this._drawDetailedTank(ctx, 12, -34, 12, 20, '#8899aa', primary);

        // ---- Connecting pipes ----
        ctx.strokeStyle = '#99aabb';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(-8, -42); ctx.lineTo(4, -38);
        ctx.stroke();
        ctx.strokeStyle = '#aabbcc';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(-8, -39); ctx.lineTo(4, -35);
        ctx.stroke();
        // Lower pipe
        ctx.strokeStyle = '#778899';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(-8, -30); ctx.lineTo(4, -27);
        ctx.stroke();

        // Pipe elbow / valve
        ctx.strokeStyle = accent;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(-2, -40, 3.5, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = primaryDark;
        ctx.beginPath();
        ctx.arc(-2, -40, 1.5, 0, Math.PI * 2);
        ctx.fill();

        // ---- Crane arm ----
        ctx.strokeStyle = '#667';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(28, -30);
        ctx.lineTo(28, -62);
        ctx.stroke();
        // Crane boom
        ctx.strokeStyle = '#778';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(28, -60);
        ctx.lineTo(42, -52);
        ctx.stroke();
        // Crane cable
        ctx.strokeStyle = '#556';
        ctx.lineWidth = 0.8;
        ctx.setLineDash([2, 2]);
        ctx.beginPath();
        ctx.moveTo(42, -52);
        ctx.lineTo(42, -38);
        ctx.stroke();
        ctx.setLineDash([]);
        // Crane hook
        ctx.strokeStyle = '#aab';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(42, -36, 2, 0, Math.PI);
        ctx.stroke();
        // Crane base struts
        ctx.strokeStyle = '#667';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(28, -30); ctx.lineTo(24, -28);
        ctx.moveTo(28, -30); ctx.lineTo(32, -28);
        ctx.stroke();

        // ---- Smokestack ----
        ctx.fillStyle = '#555';
        ctx.fillRect(-38, -68, 7, 30);
        ctx.fillStyle = '#666';
        ctx.fillRect(-39, -70, 9, 4);
        // Stack rings
        ctx.strokeStyle = 'rgba(0,0,0,0.15)';
        ctx.lineWidth = 1;
        for (let ri = 0; ri < 3; ri++) {
            ctx.beginPath();
            ctx.moveTo(-38, -58 + ri * 10); ctx.lineTo(-31, -58 + ri * 10);
            ctx.stroke();
        }
        // Red stripe on stack
        ctx.fillStyle = primary;
        ctx.fillRect(-38, -58, 7, 3);

        // ---- Steam/smoke from chimney ----
        if (constructionProgress >= 1) {
            const smokes = [
                { x: -34, y: -74, r: 4, a: 0.2 },
                { x: -32, y: -80, r: 5.5, a: 0.15 },
                { x: -35, y: -87, r: 7, a: 0.1 },
                { x: -31, y: -94, r: 8, a: 0.06 },
            ];
            smokes.forEach(s => {
                ctx.fillStyle = `rgba(200,200,210,${s.a})`;
                ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill();
            });
        }

        // ---- Loading bay door on right wall ----
        ctx.fillStyle = '#3a3a3a';
        ctx.beginPath();
        ctx.moveTo(30, 0); ctx.lineTo(44, -6);
        ctx.lineTo(44, -20); ctx.lineTo(30, -14);
        ctx.closePath();
        ctx.fill();
        // Bay door lines (rolltop)
        ctx.strokeStyle = 'rgba(80,80,80,0.4)';
        ctx.lineWidth = 0.5;
        for (let i = 0; i < 4; i++) {
            const byt = -14 + i * 3.5;
            ctx.beginPath();
            ctx.moveTo(30, byt); ctx.lineTo(44, byt - 6);
            ctx.stroke();
        }

        // ---- $ money sign ----
        ctx.fillStyle = '#ffd700';
        ctx.font = 'bold 11px monospace';
        ctx.textAlign = 'center';
        ctx.shadowColor = 'rgba(0,0,0,0.5)';
        ctx.shadowBlur = 3;
        ctx.fillText('$', -24, -8);
        ctx.shadowBlur = 0;

        // ---- Catwalk railing on roof ----
        ctx.strokeStyle = 'rgba(150,150,150,0.4)';
        ctx.lineWidth = 0.7;
        ctx.beginPath();
        ctx.moveTo(-30, -32); ctx.lineTo(30, -32);
        ctx.stroke();
        // Posts
        for (let px = -25; px <= 25; px += 10) {
            ctx.beginPath();
            ctx.moveTo(px, -32); ctx.lineTo(px, -28);
            ctx.stroke();
        }

        ctx.restore();
        this.cache[key] = canvas;
        return canvas;
    }

    _drawDetailedTank(ctx, x, y, rx, h, bodyColor, stripeColor) {
        // Cylinder body with metallic gradient
        const tankGrad = ctx.createLinearGradient(x - rx, y, x + rx, y);
        tankGrad.addColorStop(0, '#4a5a6a');
        tankGrad.addColorStop(0.2, '#6a7a8a');
        tankGrad.addColorStop(0.45, bodyColor);
        tankGrad.addColorStop(0.55, '#b0c0d0');
        tankGrad.addColorStop(0.75, bodyColor);
        tankGrad.addColorStop(1, '#4a5a6a');
        ctx.fillStyle = tankGrad;
        ctx.beginPath();
        ctx.ellipse(x, y + h / 2, rx, rx * 0.4, 0, 0, Math.PI);
        ctx.lineTo(x - rx, y - h / 2);
        ctx.ellipse(x, y - h / 2, rx, rx * 0.4, 0, Math.PI, 0, true);
        ctx.closePath();
        ctx.fill();

        // Horizontal band rings
        ctx.strokeStyle = 'rgba(0,0,0,0.12)';
        ctx.lineWidth = 0.8;
        for (let ri = 0; ri < 3; ri++) {
            const ry = y - h / 2 + (ri + 1) * h / 4;
            ctx.beginPath();
            ctx.ellipse(x, ry, rx, rx * 0.35, 0, 0, Math.PI);
            ctx.stroke();
        }

        // Colored stripe ring
        ctx.strokeStyle = stripeColor;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(x, y - h / 4, rx + 0.5, rx * 0.38, 0, 0, Math.PI);
        ctx.stroke();

        // Tank top ellipse
        const topGrad = ctx.createRadialGradient(x - 2, y - h / 2 - 1, 0, x, y - h / 2, rx);
        topGrad.addColorStop(0, '#8899aa');
        topGrad.addColorStop(0.6, '#667788');
        topGrad.addColorStop(1, '#4a5a6a');
        ctx.fillStyle = topGrad;
        ctx.beginPath();
        ctx.ellipse(x, y - h / 2, rx, rx * 0.4, 0, 0, Math.PI * 2);
        ctx.fill();

        // Top highlight arc
        ctx.strokeStyle = 'rgba(255,255,255,0.2)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.ellipse(x, y - h / 2, rx - 3, rx * 0.25, 0, Math.PI * 1.2, Math.PI * 1.8);
        ctx.stroke();

        // Small cap/vent on top
        ctx.fillStyle = '#556';
        ctx.beginPath();
        ctx.ellipse(x, y - h / 2 - 1, 3, 1.5, 0, 0, Math.PI * 2);
        ctx.fill();

        // Ladder rungs on side
        ctx.strokeStyle = 'rgba(120,130,140,0.5)';
        ctx.lineWidth = 0.8;
        for (let li = 0; li < 4; li++) {
            const ly = y - h / 2 + 2 + li * (h - 4) / 4;
            ctx.beginPath();
            ctx.moveTo(x + rx - 2, ly);
            ctx.lineTo(x + rx + 1, ly);
            ctx.stroke();
        }
        // Ladder rails
        ctx.beginPath();
        ctx.moveTo(x + rx - 1, y - h / 2 + 2);
        ctx.lineTo(x + rx - 1, y + h / 2 - 2);
        ctx.moveTo(x + rx + 0.5, y - h / 2 + 2);
        ctx.lineTo(x + rx + 0.5, y + h / 2 - 2);
        ctx.stroke();
    }

    drawBarracks(faction = 'soviet', constructionProgress = 1) {
        const key = `barracks_${faction}_${Math.floor(constructionProgress * 10)}`;
        if (this.cache[key]) return this.cache[key];
        const w = 128, h = 110;
        const { canvas, ctx } = this.makeCanvas(w, h);
        const primary = faction === 'soviet' ? '#cc2222' : '#2255cc';
        const primaryDark = faction === 'soviet' ? '#881515' : '#183d88';
        const accent = faction === 'soviet' ? '#ff4444' : '#4488ff';
        const camo1 = faction === 'soviet' ? '#5a6b3a' : '#3a5a6b';
        const camo2 = faction === 'soviet' ? '#4a5a2e' : '#2e4a5a';
        const camo3 = faction === 'soviet' ? '#6b7a44' : '#447a6b';

        ctx.save();
        ctx.translate(w / 2, h * 0.68);

        if (constructionProgress < 1) {
            ctx.globalAlpha = 0.3 + constructionProgress * 0.7;
        }

        // ---- Ground shadow ----
        ctx.fillStyle = 'rgba(0,0,0,0.22)';
        ctx.beginPath();
        ctx.ellipse(2, 16, 48, 12, 0, 0, Math.PI * 2);
        ctx.fill();

        // ---- Sandbag perimeter (more detailed) ----
        this._drawDetailedSandbags(ctx);

        // ---- Razor wire on top of sandbags ----
        ctx.strokeStyle = 'rgba(150,150,150,0.35)';
        ctx.lineWidth = 0.5;
        const wireY = -2;
        for (let wx = -42; wx <= 42; wx += 3) {
            ctx.beginPath();
            ctx.moveTo(wx, wireY + Math.abs(wx) * 0.12);
            ctx.lineTo(wx + 1.5, wireY - 2 + Math.abs(wx) * 0.12);
            ctx.lineTo(wx + 3, wireY + Math.abs(wx + 3) * 0.12);
            ctx.stroke();
        }

        // ---- Building walls ----
        const wallH = 30;

        // Left wall with corrugated texture
        const leftGrad = ctx.createLinearGradient(-44, -wallH, -10, 0);
        leftGrad.addColorStop(0, '#5e5e4e');
        leftGrad.addColorStop(0.5, '#6a6a5a');
        leftGrad.addColorStop(1, '#505040');
        ctx.fillStyle = leftGrad;
        ctx.beginPath();
        ctx.moveTo(-44, -4); ctx.lineTo(0, 12);
        ctx.lineTo(0, 12 - wallH); ctx.lineTo(-44, -4 - wallH);
        ctx.closePath();
        ctx.fill();

        // Corrugated ridges on left wall
        ctx.strokeStyle = 'rgba(0,0,0,0.08)';
        ctx.lineWidth = 0.5;
        for (let i = 0; i < 8; i++) {
            const t = i / 8;
            const rx = -44 + 44 * t;
            const ry = -4 + 16 * t;
            ctx.beginPath();
            ctx.moveTo(rx, ry); ctx.lineTo(rx, ry - wallH);
            ctx.stroke();
        }
        // Horizontal rivet line
        ctx.strokeStyle = 'rgba(100,100,80,0.2)';
        for (let j = 0; j < 2; j++) {
            const yoff = 8 + j * 10;
            ctx.beginPath();
            ctx.moveTo(-44, -4 - yoff); ctx.lineTo(0, 12 - yoff);
            ctx.stroke();
        }

        // Right wall
        const rightGrad = ctx.createLinearGradient(10, -wallH, 44, 0);
        rightGrad.addColorStop(0, '#6e6e5e');
        rightGrad.addColorStop(0.5, '#7a7a6a');
        rightGrad.addColorStop(1, '#5a5a4a');
        ctx.fillStyle = rightGrad;
        ctx.beginPath();
        ctx.moveTo(44, -4); ctx.lineTo(0, 12);
        ctx.lineTo(0, 12 - wallH); ctx.lineTo(44, -4 - wallH);
        ctx.closePath();
        ctx.fill();

        // Corrugated ridges on right wall
        ctx.strokeStyle = 'rgba(0,0,0,0.06)';
        for (let i = 0; i < 8; i++) {
            const t = i / 8;
            const rx = 44 - 44 * t;
            const ry = -4 + 16 * t;
            ctx.beginPath();
            ctx.moveTo(rx, ry); ctx.lineTo(rx, ry - wallH);
            ctx.stroke();
        }

        // ---- Corrugated metal roof ----
        ctx.fillStyle = camo1;
        ctx.beginPath();
        ctx.moveTo(0, 12 - wallH - 10); ctx.lineTo(46, -4 - wallH);
        ctx.lineTo(0, -20 - wallH); ctx.lineTo(-46, -4 - wallH);
        ctx.closePath();
        ctx.fill();

        // Camo patches on roof
        const rng = this._srand(77);
        for (let i = 0; i < 8; i++) {
            const colors = [camo2, camo3, camo1];
            ctx.fillStyle = colors[Math.floor(rng() * 3)];
            const cpx = rng() * 60 - 30;
            const cpy = -4 - wallH - 5 + rng() * 10 - 5;
            ctx.beginPath();
            ctx.ellipse(cpx, cpy, rng() * 8 + 3, rng() * 3 + 1.5, rng() * Math.PI, 0, Math.PI * 2);
            ctx.fill();
        }

        // Roof corrugation ridges
        ctx.strokeStyle = 'rgba(0,0,0,0.1)';
        ctx.lineWidth = 0.5;
        for (let i = -30; i <= 30; i += 6) {
            ctx.beginPath();
            const fy = -4 - wallH + Math.abs(i) * 0.1;
            ctx.moveTo(i, fy - 3);
            ctx.lineTo(i * 0.3, fy - 8);
            ctx.stroke();
        }

        // ---- Heavy door on right wall ----
        ctx.fillStyle = '#3a3a2a';
        ctx.beginPath();
        ctx.moveTo(16, 2); ctx.lineTo(32, -6);
        ctx.lineTo(32, -24); ctx.lineTo(16, -16);
        ctx.closePath();
        ctx.fill();

        // Door frame
        ctx.strokeStyle = '#2a2a1a';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(16, 2); ctx.lineTo(32, -6);
        ctx.lineTo(32, -24); ctx.lineTo(16, -16);
        ctx.closePath();
        ctx.stroke();

        // Door cross braces
        ctx.strokeStyle = '#4a4a3a';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(16, 2); ctx.lineTo(32, -24);
        ctx.moveTo(32, -6); ctx.lineTo(16, -16);
        ctx.stroke();

        // Door handle
        ctx.fillStyle = '#bbb';
        ctx.beginPath();
        ctx.arc(28, -14, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#888';
        ctx.beginPath();
        ctx.arc(28, -14, 1, 0, Math.PI * 2);
        ctx.fill();

        // ---- Windows on left wall ----
        const windows = [[-32, -22], [-18, -14]];
        windows.forEach(([wx, wy]) => {
            // Window recess
            ctx.fillStyle = '#2a2a2a';
            ctx.beginPath();
            ctx.moveTo(wx, wy); ctx.lineTo(wx + 8, wy - 4);
            ctx.lineTo(wx + 8, wy - 12); ctx.lineTo(wx, wy - 8);
            ctx.closePath();
            ctx.fill();

            // Glass with reflection
            ctx.fillStyle = 'rgba(80,160,200,0.35)';
            ctx.beginPath();
            ctx.moveTo(wx + 1, wy - 1); ctx.lineTo(wx + 7, wy - 4);
            ctx.lineTo(wx + 7, wy - 11); ctx.lineTo(wx + 1, wy - 7);
            ctx.closePath();
            ctx.fill();

            // Glass highlight
            ctx.fillStyle = 'rgba(160,220,255,0.2)';
            ctx.beginPath();
            ctx.moveTo(wx + 1, wy - 5); ctx.lineTo(wx + 4, wy - 6.5);
            ctx.lineTo(wx + 4, wy - 10); ctx.lineTo(wx + 1, wy - 7);
            ctx.closePath();
            ctx.fill();

            // Window bars
            ctx.strokeStyle = '#444';
            ctx.lineWidth = 0.8;
            ctx.beginPath();
            ctx.moveTo(wx + 4, wy - 2); ctx.lineTo(wx + 4, wy - 10);
            ctx.stroke();
        });

        // ---- Guard tower on back-left corner ----
        const twrX = -36, twrY = -34 - wallH;
        // Tower body
        ctx.fillStyle = '#5a5a4a';
        ctx.fillRect(twrX - 4, twrY, 8, 18);
        // Tower platform
        ctx.fillStyle = '#6a6a5a';
        ctx.fillRect(twrX - 6, twrY - 2, 12, 3);
        // Tower roof
        ctx.fillStyle = primaryDark;
        ctx.beginPath();
        ctx.moveTo(twrX, twrY - 8);
        ctx.lineTo(twrX + 7, twrY - 2);
        ctx.lineTo(twrX - 7, twrY - 2);
        ctx.closePath();
        ctx.fill();
        // Tower window slit
        ctx.fillStyle = 'rgba(255,200,100,0.3)';
        ctx.fillRect(twrX - 2, twrY + 3, 4, 2);
        // Spotlight
        if (constructionProgress >= 1) {
            ctx.fillStyle = 'rgba(255,255,200,0.15)';
            ctx.beginPath();
            ctx.moveTo(twrX + 4, twrY + 4);
            ctx.lineTo(twrX + 20, twrY + 18);
            ctx.lineTo(twrX + 14, twrY + 22);
            ctx.closePath();
            ctx.fill();
        }

        // ---- Flag pole ----
        ctx.strokeStyle = '#999';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(-10, -34 - wallH); ctx.lineTo(-10, -60 - wallH);
        ctx.stroke();
        // Flag pole cap
        ctx.fillStyle = '#cc0';
        ctx.beginPath();
        ctx.arc(-10, -60 - wallH, 1.5, 0, Math.PI * 2);
        ctx.fill();

        // ---- Soviet flag ----
        ctx.fillStyle = primary;
        ctx.beginPath();
        ctx.moveTo(-10, -58 - wallH);
        ctx.lineTo(4, -54 - wallH);
        ctx.lineTo(4, -48 - wallH);
        ctx.lineTo(-10, -52 - wallH);
        ctx.closePath();
        ctx.fill();
        // Flag wave effect
        ctx.fillStyle = `rgba(0,0,0,0.1)`;
        ctx.beginPath();
        ctx.moveTo(-4, -56 - wallH);
        ctx.quadraticCurveTo(0, -53 - wallH, 4, -54 - wallH);
        ctx.lineTo(4, -51 - wallH);
        ctx.quadraticCurveTo(0, -50 - wallH, -4, -53 - wallH);
        ctx.closePath();
        ctx.fill();

        // Star/emblem on flag
        if (faction === 'soviet') {
            ctx.fillStyle = '#ffd700';
            this._drawStar(ctx, -3, -53 - wallH, 3);
        } else {
            ctx.fillStyle = '#fff';
            ctx.fillRect(-8, -55 - wallH, 10, 1.5);
            ctx.fillRect(-8, -52 - wallH, 10, 1.5);
        }

        // ---- Military star emblem on right wall ----
        ctx.fillStyle = accent;
        this._drawStar(ctx, 24, -20, 5);
        // Star outline
        ctx.strokeStyle = 'rgba(0,0,0,0.3)';
        ctx.lineWidth = 0.5;
        this._drawStar(ctx, 24, -20, 5);
        ctx.stroke();

        // ---- Faction text stencil ----
        ctx.fillStyle = 'rgba(0,0,0,0.15)';
        ctx.font = 'bold 6px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(faction === 'soviet' ? 'CCCP' : 'ALLIED', -22, -10);

        ctx.restore();
        this.cache[key] = canvas;
        return canvas;
    }

    _drawDetailedSandbags(ctx) {
        const rows = [
            [[-42, 2], [-32, 6], [-22, 9], [22, 9], [32, 6], [42, 2]],
            [[-37, 4], [-27, 8], [27, 8], [37, 4]],
        ];
        rows.forEach((row, ri) => {
            row.forEach(([sx, sy]) => {
                const baseY = sy + ri * 2;
                // Bag body
                ctx.fillStyle = ri === 0 ? '#8a7d6b' : '#7a6d5b';
                ctx.beginPath();
                ctx.ellipse(sx, baseY, 6, 3.5, 0, 0, Math.PI * 2);
                ctx.fill();
                // Bag top highlight
                ctx.fillStyle = ri === 0 ? '#a09380' : '#908370';
                ctx.beginPath();
                ctx.ellipse(sx, baseY - 1, 5, 2, 0, Math.PI, 0, true);
                ctx.fill();
                // Bag crease
                ctx.strokeStyle = 'rgba(0,0,0,0.12)';
                ctx.lineWidth = 0.4;
                ctx.beginPath();
                ctx.moveTo(sx - 3, baseY);
                ctx.quadraticCurveTo(sx, baseY - 1, sx + 3, baseY);
                ctx.stroke();
                // Bag texture
                ctx.fillStyle = 'rgba(0,0,0,0.05)';
                ctx.beginPath();
                ctx.ellipse(sx + 1, baseY + 0.5, 3, 1.5, 0.2, 0, Math.PI * 2);
                ctx.fill();
            });
        });
    }

    _drawStar(ctx, x, y, r) {
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
            const angle = (i * 4 * Math.PI) / 5 - Math.PI / 2;
            const method = i === 0 ? 'moveTo' : 'lineTo';
            ctx[method](x + r * Math.cos(angle), y + r * Math.sin(angle));
        }
        ctx.closePath();
        ctx.fill();
    }

    // ==================== SOLDIER SPRITES ====================

    drawSoldierSheet(faction = 'soviet') {
        const key = `soldier_${faction}`;
        if (this.cache[key]) return this.cache[key];

        const fw = 40, fh = 48;
        const cols = 6; // walk1-4, attack, die
        const rows = 8; // 8 directions
        const { canvas, ctx } = this.makeCanvas(fw * cols, fh * rows);

        const uniform = faction === 'soviet' ? '#6b2020' : '#1e3d6b';
        const uniformLight = faction === 'soviet' ? '#8b3535' : '#2e5585';
        const uniformDark = faction === 'soviet' ? '#4a1515' : '#142a4a';
        const skin = '#d4a574';
        const skinShadow = '#b88a5a';
        const helmet = faction === 'soviet' ? '#4a3a28' : '#3a4a38';
        const helmetLight = faction === 'soviet' ? '#5e4e38' : '#4e5e48';
        const boots = '#2a2218';
        const belt = '#3a3020';
        const rifle = '#3e2e1e';
        const rifleMetal = '#5a5a5a';

        for (let dir = 0; dir < 8; dir++) {
            for (let frame = 0; frame < cols; frame++) {
                ctx.save();
                ctx.translate(fw * frame + fw / 2, fh * dir + fh - 4);
                this._drawSoldierFrame(ctx, dir, frame, {
                    uniform, uniformLight, uniformDark,
                    skin, skinShadow, helmet, helmetLight,
                    boots, belt, rifle, rifleMetal, faction
                });
                ctx.restore();
            }
        }

        this.cache[key] = canvas;
        return canvas;
    }

    _drawSoldierFrame(ctx, dir, frame, colors) {
        const {
            uniform, uniformLight, uniformDark,
            skin, skinShadow, helmet, helmetLight,
            boots, belt, rifle, rifleMetal, faction
        } = colors;
        const isAttack = frame === 4;
        const isDeath = frame === 5;
        const walkCycle = frame < 4 ? frame : 0;

        const angles = [
            { bx: 0, by: -1, label: 'N' },
            { bx: 1, by: -1, label: 'NE' },
            { bx: 1, by: 0, label: 'E' },
            { bx: 1, by: 1, label: 'SE' },
            { bx: 0, by: 1, label: 'S' },
            { bx: -1, by: 1, label: 'SW' },
            { bx: -1, by: 0, label: 'W' },
            { bx: -1, by: -1, label: 'NW' },
        ];
        const a = angles[dir];
        const facing = a.bx; // -1 left, 0 center, 1 right

        // ---- DEATH FRAME ----
        if (isDeath) {
            ctx.save();
            ctx.rotate(Math.PI / 5);
            ctx.globalAlpha = 0.65;

            // Blood pool
            ctx.fillStyle = 'rgba(120,20,20,0.3)';
            ctx.beginPath();
            ctx.ellipse(2, 3, 8, 4, 0.2, 0, Math.PI * 2);
            ctx.fill();

            // Body on ground
            ctx.fillStyle = uniform;
            ctx.beginPath();
            ctx.roundRect(-10, -5, 20, 9, 2);
            ctx.fill();
            // Legs
            ctx.fillStyle = uniformDark;
            ctx.fillRect(8, -3, 8, 5);
            ctx.fillStyle = boots;
            ctx.fillRect(14, -2, 4, 4);

            // Head
            ctx.fillStyle = skin;
            ctx.beginPath(); ctx.arc(-13, -1, 5, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = helmet;
            ctx.beginPath(); ctx.arc(-13, -2, 5.5, Math.PI, 0, true); ctx.fill();

            // Dropped rifle
            ctx.strokeStyle = rifle;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(-5, 6); ctx.lineTo(12, 8);
            ctx.stroke();

            ctx.restore();
            return;
        }

        // ---- Leg animation ----
        const legSwing = Math.sin(walkCycle * Math.PI / 2) * 5;
        const bobY = Math.abs(Math.sin(walkCycle * Math.PI / 2)) * -1.5;

        // ---- Ground shadow ----
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        ctx.beginPath();
        ctx.ellipse(0, 1, 8, 4, 0, 0, Math.PI * 2);
        ctx.fill();

        // ---- LEGS ----
        const legOffX = facing * 0.5;

        // Back leg
        ctx.fillStyle = uniformDark;
        const backLegX = -3 - legSwing * 0.4 + legOffX;
        const backLegY = -12 + Math.abs(legSwing) * 0.3 + bobY;
        ctx.beginPath();
        ctx.roundRect(backLegX, backLegY, 4, 10, 1);
        ctx.fill();
        // Back boot
        ctx.fillStyle = boots;
        ctx.beginPath();
        ctx.roundRect(backLegX - 0.5, backLegY + 8, 5, 4, [0, 0, 2, 1]);
        ctx.fill();
        // Boot sole
        ctx.fillStyle = '#1a1a10';
        ctx.fillRect(backLegX - 0.5, backLegY + 11, 5, 1);

        // Front leg
        ctx.fillStyle = uniform;
        const frontLegX = 1 + legSwing * 0.4 + legOffX;
        const frontLegY = -12 - Math.abs(legSwing) * 0.3 + bobY;
        ctx.beginPath();
        ctx.roundRect(frontLegX, frontLegY, 4, 10, 1);
        ctx.fill();
        // Front boot
        ctx.fillStyle = boots;
        ctx.beginPath();
        ctx.roundRect(frontLegX - 0.5, frontLegY + 8, 5, 4, [0, 0, 2, 1]);
        ctx.fill();
        ctx.fillStyle = '#1a1a10';
        ctx.fillRect(frontLegX - 0.5, frontLegY + 11, 5, 1);

        // ---- TORSO ----
        const torsoY = -24 + bobY;

        // Torso body
        const torsoGrad = ctx.createLinearGradient(-7, torsoY, 7, torsoY);
        torsoGrad.addColorStop(0, uniformDark);
        torsoGrad.addColorStop(0.3, uniform);
        torsoGrad.addColorStop(0.6, uniformLight);
        torsoGrad.addColorStop(1, uniform);
        ctx.fillStyle = torsoGrad;
        ctx.beginPath();
        ctx.roundRect(-7, torsoY, 14, 14, 2);
        ctx.fill();

        // Chest pocket
        ctx.fillStyle = uniformDark;
        ctx.fillRect(-5, torsoY + 2, 4, 3);
        ctx.strokeStyle = 'rgba(0,0,0,0.15)';
        ctx.lineWidth = 0.4;
        ctx.strokeRect(-5, torsoY + 2, 4, 3);

        // Shoulder straps
        ctx.fillStyle = uniformDark;
        ctx.fillRect(-7, torsoY, 3, 2);
        ctx.fillRect(4, torsoY, 3, 2);

        // Belt
        ctx.fillStyle = belt;
        ctx.fillRect(-7, torsoY + 12, 14, 3);
        // Belt buckle
        ctx.fillStyle = '#aa9944';
        ctx.fillRect(-2, torsoY + 12, 4, 3);
        ctx.fillStyle = '#ccbb55';
        ctx.fillRect(-1, torsoY + 13, 2, 1);

        // Ammo pouches on belt
        ctx.fillStyle = '#3a3525';
        ctx.fillRect(-7, torsoY + 12, 3, 3);
        ctx.fillRect(4, torsoY + 12, 3, 3);

        // ---- ARMS & WEAPON ----
        const armDir = facing || (dir < 4 ? 1 : -1);

        if (isAttack) {
            // ---- ATTACK POSE ----
            // Rear arm (supporting rifle)
            ctx.fillStyle = uniform;
            ctx.save();
            ctx.translate(-5 * armDir, torsoY + 3);
            ctx.rotate(-0.5 * armDir);
            ctx.fillRect(-2, 0, 4, 9);
            ctx.fillStyle = skin;
            ctx.fillRect(-1.5, 9, 3, 3);
            ctx.restore();

            // AK-47 rifle
            ctx.save();
            ctx.translate(0, torsoY + 4);

            // Rifle stock
            ctx.fillStyle = rifle;
            ctx.beginPath();
            ctx.moveTo(-4 * armDir, 2);
            ctx.lineTo(-8 * armDir, 6);
            ctx.lineTo(-6 * armDir, 7);
            ctx.lineTo(-2 * armDir, 3);
            ctx.closePath();
            ctx.fill();

            // Rifle body
            ctx.fillStyle = rifleMetal;
            ctx.save();
            ctx.rotate(-0.15 * armDir);
            ctx.fillRect(-2 * armDir, -1, 18 * armDir, 2.5);
            ctx.restore();

            // Banana magazine
            ctx.fillStyle = '#444';
            ctx.save();
            ctx.translate(4 * armDir, 1);
            ctx.rotate(0.15 * armDir);
            ctx.fillRect(-1, 0, 2.5, 5);
            ctx.restore();

            // Barrel
            ctx.strokeStyle = rifleMetal;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(14 * armDir, -2);
            ctx.lineTo(20 * armDir, -3);
            ctx.stroke();

            ctx.restore();

            // Front arm (on trigger)
            ctx.fillStyle = uniform;
            ctx.save();
            ctx.translate(4 * armDir, torsoY + 3);
            ctx.rotate(0.3 * armDir);
            ctx.fillRect(-2, 0, 4, 8);
            ctx.fillStyle = skin;
            ctx.fillRect(-1.5, 8, 3, 2.5);
            ctx.restore();

            // ---- MUZZLE FLASH ----
            // Outer flash
            ctx.fillStyle = 'rgba(255,200,50,0.7)';
            ctx.beginPath();
            ctx.arc(21 * armDir, torsoY + 1, 5, 0, Math.PI * 2);
            ctx.fill();
            // Core flash
            ctx.fillStyle = 'rgba(255,240,200,0.9)';
            ctx.beginPath();
            ctx.arc(21 * armDir, torsoY + 1, 2.5, 0, Math.PI * 2);
            ctx.fill();
            // Flash spikes
            ctx.strokeStyle = 'rgba(255,220,100,0.5)';
            ctx.lineWidth = 1;
            for (let si = 0; si < 4; si++) {
                const sa = si * Math.PI / 2 + Math.PI / 4;
                ctx.beginPath();
                ctx.moveTo(21 * armDir + Math.cos(sa) * 3, torsoY + 1 + Math.sin(sa) * 3);
                ctx.lineTo(21 * armDir + Math.cos(sa) * 7, torsoY + 1 + Math.sin(sa) * 7);
                ctx.stroke();
            }
        } else {
            // ---- WALK / IDLE ARMS ----
            const armSwing = legSwing * 0.08;

            // Left arm
            ctx.fillStyle = uniform;
            ctx.save();
            ctx.translate(-7, torsoY + 2);
            ctx.rotate(armSwing);
            ctx.fillRect(-2, 0, 4, 9);
            ctx.fillStyle = skin;
            ctx.beginPath();
            ctx.roundRect(-1.5, 9, 3, 3, 1);
            ctx.fill();
            ctx.restore();

            // Right arm
            ctx.fillStyle = uniform;
            ctx.save();
            ctx.translate(7, torsoY + 2);
            ctx.rotate(-armSwing);
            ctx.fillRect(-2, 0, 4, 9);
            ctx.fillStyle = skin;
            ctx.beginPath();
            ctx.roundRect(-1.5, 9, 3, 3, 1);
            ctx.fill();
            ctx.restore();

            // AK-47 slung across body or held at side
            ctx.save();
            ctx.strokeStyle = rifle;
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            if (dir === 0 || dir === 4) {
                // Facing N or S - rifle across back/front
                ctx.moveTo(5, torsoY + 2);
                ctx.lineTo(8, torsoY + 16);
            } else {
                // Side view - rifle visible
                ctx.moveTo(6 * (armDir || 1), torsoY);
                ctx.lineTo(9 * (armDir || 1), torsoY + 15);
            }
            ctx.stroke();
            // Rifle strap
            ctx.strokeStyle = '#5a4a30';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(3, torsoY + 1);
            ctx.lineTo(7 * (armDir || 1), torsoY + 6);
            ctx.stroke();
            ctx.restore();
        }

        // ---- NECK ----
        ctx.fillStyle = (dir >= 2 && dir <= 6) ? skin : skinShadow;
        ctx.fillRect(-2.5, torsoY - 3 + bobY, 5, 4);

        // ---- HEAD ----
        const headX = a.bx * 1.5;
        const headY = torsoY - 8 + bobY;

        // Head base
        ctx.fillStyle = skin;
        ctx.beginPath();
        ctx.arc(headX, headY, 6, 0, Math.PI * 2);
        ctx.fill();

        // Face shadow (away from light)
        ctx.fillStyle = skinShadow;
        ctx.beginPath();
        ctx.arc(headX + 1, headY + 1, 5, 0, Math.PI * 0.8);
        ctx.fill();

        // ---- HELMET ----
        // Helmet dome
        ctx.fillStyle = helmet;
        ctx.beginPath();
        ctx.arc(headX, headY - 1, 7, Math.PI, 0, false);
        ctx.fill();

        // Helmet highlight
        ctx.fillStyle = helmetLight;
        ctx.beginPath();
        ctx.arc(headX - 1, headY - 2, 5, Math.PI * 1.2, Math.PI * 1.8);
        ctx.lineTo(headX - 1, headY - 2);
        ctx.closePath();
        ctx.fill();

        // Helmet rim
        ctx.fillStyle = helmet;
        ctx.beginPath();
        ctx.ellipse(headX, headY + 2, 8, 2.5, 0, Math.PI, 0, true);
        ctx.fill();

        // Helmet strap (chin)
        if (dir >= 3 && dir <= 5) {
            ctx.strokeStyle = '#3a3020';
            ctx.lineWidth = 0.7;
            ctx.beginPath();
            ctx.moveTo(headX - 5, headY + 1);
            ctx.quadraticCurveTo(headX, headY + 5, headX + 5, headY + 1);
            ctx.stroke();
        }

        // ---- FACE DETAILS ----
        if (dir >= 2 && dir <= 6) {
            // Eyes
            const eyeSpread = dir === 4 ? 2.5 : 2;
            const eyeShiftX = a.bx * 1.5;

            // Eye whites
            ctx.fillStyle = '#eee';
            ctx.beginPath();
            ctx.ellipse(headX - eyeSpread + eyeShiftX, headY - 0.5, 1.5, 1, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.ellipse(headX + eyeSpread + eyeShiftX, headY - 0.5, 1.5, 1, 0, 0, Math.PI * 2);
            ctx.fill();

            // Pupils
            ctx.fillStyle = '#222';
            ctx.beginPath();
            ctx.arc(headX - eyeSpread + eyeShiftX + a.bx * 0.5, headY - 0.3, 0.8, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(headX + eyeSpread + eyeShiftX + a.bx * 0.5, headY - 0.3, 0.8, 0, Math.PI * 2);
            ctx.fill();

            // Mouth (very subtle)
            if (dir === 4 || dir === 3 || dir === 5) {
                ctx.fillStyle = 'rgba(100,60,40,0.4)';
                ctx.fillRect(headX - 1.5, headY + 2.5, 3, 0.8);
            }
        }

        // ---- Faction indicator on helmet ----
        ctx.fillStyle = faction === 'soviet' ? '#ff3333' : '#3388ff';
        ctx.beginPath();
        ctx.arc(headX + a.bx * 2.5, headY - 4, 2, 0, Math.PI * 2);
        ctx.fill();
        // Star/dot on indicator
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.beginPath();
        ctx.arc(headX + a.bx * 2.5, headY - 4, 0.8, 0, Math.PI * 2);
        ctx.fill();
    }

    // ==================== EFFECTS ====================

    drawExplosion(frame = 0) {
        const key = 'explosion_' + frame;
        if (this.cache[key]) return this.cache[key];
        const size = 64;
        const { canvas, ctx } = this.makeCanvas(size, size);
        ctx.translate(size / 2, size / 2);

        const t = frame / 5; // 0..1
        const r = 5 + t * 22;
        const rng = this._srand(frame * 73 + 11);

        // Ground scorching
        if (t > 0.3) {
            ctx.fillStyle = `rgba(40,20,0,${0.3 - t * 0.2})`;
            ctx.beginPath();
            ctx.ellipse(0, 4, r * 0.8, r * 0.3, 0, 0, Math.PI * 2);
            ctx.fill();
        }

        // Shockwave ring
        if (t > 0.2 && t < 0.8) {
            ctx.strokeStyle = `rgba(255,200,100,${0.4 - t * 0.4})`;
            ctx.lineWidth = 2 - t * 1.5;
            ctx.beginPath();
            ctx.arc(0, 0, r * 1.3, 0, Math.PI * 2);
            ctx.stroke();
        }

        // Outer fireball
        const outerGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
        outerGrad.addColorStop(0, `rgba(255,255,220,${1 - t * 0.6})`);
        outerGrad.addColorStop(0.2, `rgba(255,200,60,${0.9 - t * 0.5})`);
        outerGrad.addColorStop(0.5, `rgba(255,100,20,${0.7 - t * 0.5})`);
        outerGrad.addColorStop(0.75, `rgba(200,40,0,${0.5 - t * 0.4})`);
        outerGrad.addColorStop(1, `rgba(80,15,0,${0.2 - t * 0.2})`);
        ctx.fillStyle = outerGrad;
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fill();

        // Inner hot core (white-yellow)
        if (t < 0.6) {
            const coreR = r * 0.35 * (1 - t);
            const coreGrad = ctx.createRadialGradient(0, -2, 0, 0, -2, coreR);
            coreGrad.addColorStop(0, `rgba(255,255,255,${0.9 - t})`);
            coreGrad.addColorStop(1, `rgba(255,240,150,${0.5 - t * 0.5})`);
            ctx.fillStyle = coreGrad;
            ctx.beginPath();
            ctx.arc(0, -2, coreR, 0, Math.PI * 2);
            ctx.fill();
        }

        // Flying debris particles
        ctx.fillStyle = `rgba(60,40,20,${0.8 - t * 0.7})`;
        for (let i = 0; i < 10; i++) {
            const angle = rng() * Math.PI * 2;
            const dist = r * 0.5 + t * (rng() * 16 + 8);
            const px = Math.cos(angle) * dist;
            const py = Math.sin(angle) * dist - t * 4;
            const ps = 1.5 + rng() * 2 - t * 1.5;
            if (ps > 0.3) {
                ctx.beginPath();
                ctx.arc(px, py, ps, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // Spark particles (bright)
        for (let i = 0; i < 12; i++) {
            const angle = (i / 12) * Math.PI * 2 + t * 1.5 + rng() * 0.5;
            const dist = r * 0.7 + t * 10;
            const px = Math.cos(angle) * dist;
            const py = Math.sin(angle) * dist;
            const alpha = Math.max(0, 1 - t * 1.2 - rng() * 0.3);
            ctx.fillStyle = `rgba(255,${200 + rng() * 55},${80 + rng() * 80},${alpha})`;
            ctx.beginPath();
            ctx.arc(px, py, 1.5 - t * 0.8, 0, Math.PI * 2);
            ctx.fill();
        }

        // Smoke puffs (appear later)
        if (t > 0.3) {
            for (let i = 0; i < 4; i++) {
                const sx = rng() * r * 1.2 - r * 0.6;
                const sy = rng() * r * 0.8 - r * 0.6 - t * 6;
                const sr = 3 + rng() * 4 + t * 3;
                ctx.fillStyle = `rgba(80,80,80,${0.15 + rng() * 0.1 - t * 0.1})`;
                ctx.beginPath();
                ctx.arc(sx, sy, sr, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        this.cache[key] = canvas;
        return canvas;
    }

    drawBullet() {
        const key = 'bullet';
        if (this.cache[key]) return this.cache[key];
        const { canvas, ctx } = this.makeCanvas(12, 12);
        ctx.translate(6, 6);

        // Tracer trail
        ctx.fillStyle = 'rgba(255,200,50,0.2)';
        ctx.beginPath();
        ctx.ellipse(0, 0, 5, 2, 0, 0, Math.PI * 2);
        ctx.fill();

        // Bullet glow
        const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, 4);
        glow.addColorStop(0, 'rgba(255,240,150,0.8)');
        glow.addColorStop(0.5, 'rgba(255,180,50,0.4)');
        glow.addColorStop(1, 'rgba(255,100,0,0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(0, 0, 4, 0, Math.PI * 2);
        ctx.fill();

        // Bullet core
        ctx.fillStyle = '#ffe888';
        ctx.beginPath();
        ctx.arc(0, 0, 1.8, 0, Math.PI * 2);
        ctx.fill();

        // White hot center
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(0, 0, 0.8, 0, Math.PI * 2);
        ctx.fill();

        this.cache[key] = canvas;
        return canvas;
    }

    drawSelectionCircle(radius = 16) {
        const key = 'select_' + radius;
        if (this.cache[key]) return this.cache[key];
        const size = radius * 2 + 12;
        const { canvas, ctx } = this.makeCanvas(size, size);
        ctx.translate(size / 2, size / 2);

        // Outer glow
        ctx.strokeStyle = 'rgba(0,255,120,0.15)';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.ellipse(0, 2, radius + 2, (radius + 2) * 0.5, 0, 0, Math.PI * 2);
        ctx.stroke();

        // Main selection ring
        ctx.strokeStyle = '#00ff88';
        ctx.lineWidth = 1.8;
        ctx.setLineDash([5, 3]);
        ctx.beginPath();
        ctx.ellipse(0, 2, radius, radius * 0.5, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);

        // Inner bright ring
        ctx.strokeStyle = 'rgba(0,255,136,0.3)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.ellipse(0, 2, radius - 2, (radius - 2) * 0.5, 0, 0, Math.PI * 2);
        ctx.stroke();

        this.cache[key] = canvas;
        return canvas;
    }

    drawHealthBar(pct, w = 30) {
        const { canvas, ctx } = this.makeCanvas(w + 6, 10);

        // Background with border
        ctx.fillStyle = '#111';
        ctx.beginPath();
        ctx.roundRect(0, 0, w + 6, 10, 2);
        ctx.fill();
        ctx.fillStyle = '#222';
        ctx.beginPath();
        ctx.roundRect(2, 2, w + 2, 6, 1);
        ctx.fill();

        // Health bar with gradient
        const barW = (w + 2) * pct;
        if (barW > 0) {
            let grad;
            if (pct > 0.6) {
                grad = ctx.createLinearGradient(2, 2, 2, 8);
                grad.addColorStop(0, '#44ee66');
                grad.addColorStop(0.5, '#00cc44');
                grad.addColorStop(1, '#009933');
            } else if (pct > 0.3) {
                grad = ctx.createLinearGradient(2, 2, 2, 8);
                grad.addColorStop(0, '#eedd44');
                grad.addColorStop(0.5, '#ccaa00');
                grad.addColorStop(1, '#aa8800');
            } else {
                grad = ctx.createLinearGradient(2, 2, 2, 8);
                grad.addColorStop(0, '#ff4444');
                grad.addColorStop(0.5, '#cc2200');
                grad.addColorStop(1, '#991100');
            }
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.roundRect(2, 2, barW, 6, 1);
            ctx.fill();

            // Shine highlight on bar
            ctx.fillStyle = 'rgba(255,255,255,0.15)';
            ctx.fillRect(3, 3, barW - 2, 2);
        }

        // Outer border
        ctx.strokeStyle = 'rgba(255,255,255,0.1)';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.roundRect(0, 0, w + 6, 10, 2);
        ctx.stroke();

        return canvas;
    }

    // ==================== FOG OF WAR ====================

    drawFogTile(alpha = 1) {
        const key = 'fog_' + Math.floor(alpha * 10);
        if (this.cache[key]) return this.cache[key];
        const { canvas, ctx } = this.makeCanvas(66, 35);
        ctx.save();
        ctx.translate(33, 1);
        this._clipDiamond(ctx);
        ctx.fillStyle = `rgba(0,0,0,${alpha})`;
        ctx.fill();
        ctx.restore();
        this.cache[key] = canvas;
        return canvas;
    }

    // ==================== BUILD ITEM ICONS ====================

    drawBuildIcon(type, faction = 'soviet') {
        const key = `icon_${type}_${faction}`;
        if (this.cache[key]) return this.cache[key];
        const size = 40;
        const { canvas, ctx } = this.makeCanvas(size, size);
        const primary = faction === 'soviet' ? '#cc2222' : '#2255cc';
        const accent = faction === 'soviet' ? '#ff4444' : '#4488ff';

        // Background with gradient
        const bgGrad = ctx.createLinearGradient(0, 0, 0, size);
        bgGrad.addColorStop(0, '#1e1e30');
        bgGrad.addColorStop(1, '#0e0e1a');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, size, size);

        // Border
        ctx.strokeStyle = primary;
        ctx.lineWidth = 1.5;
        ctx.strokeRect(1, 1, size - 2, size - 2);

        // Inner border glow
        ctx.strokeStyle = `${accent}44`;
        ctx.lineWidth = 0.5;
        ctx.strokeRect(2.5, 2.5, size - 5, size - 5);

        ctx.save();
        ctx.translate(size / 2, size / 2);

        if (type === 'refinery') {
            // Mini refinery: tanks + pipes
            ctx.fillStyle = '#666';
            ctx.fillRect(-14, -2, 28, 14);
            ctx.fillStyle = '#888';
            // Tank 1
            ctx.beginPath(); ctx.ellipse(-6, -4, 7, 4, 0, Math.PI, 0, true); ctx.fill();
            ctx.fillRect(-13, -4, 14, 8);
            ctx.beginPath(); ctx.ellipse(-6, 4, 7, 4, 0, 0, Math.PI); ctx.fill();
            // Tank 2
            ctx.beginPath(); ctx.ellipse(8, -2, 5, 3, 0, Math.PI, 0, true); ctx.fill();
            ctx.fillRect(3, -2, 10, 6);
            ctx.beginPath(); ctx.ellipse(8, 4, 5, 3, 0, 0, Math.PI); ctx.fill();
            // Chimney
            ctx.fillStyle = '#555';
            ctx.fillRect(12, -12, 3, 10);
            // Stripe
            ctx.fillStyle = primary;
            ctx.fillRect(-14, 6, 28, 2);
            // $ sign
            ctx.fillStyle = '#ffd700';
            ctx.font = 'bold 9px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('$', 0, 0);
        } else if (type === 'barracks') {
            // Mini barracks: building with flag
            ctx.fillStyle = '#6a6a5a';
            ctx.fillRect(-12, 0, 24, 12);
            // Roof
            ctx.fillStyle = '#5a6b3a';
            ctx.beginPath();
            ctx.moveTo(-14, 0); ctx.lineTo(0, -10); ctx.lineTo(14, 0);
            ctx.closePath();
            ctx.fill();
            // Door
            ctx.fillStyle = '#333';
            ctx.fillRect(-3, 4, 6, 8);
            // Flag
            ctx.strokeStyle = '#aaa';
            ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(-10, -10); ctx.lineTo(-10, -18); ctx.stroke();
            ctx.fillStyle = primary;
            ctx.fillRect(-10, -18, 8, 5);
            // Star
            ctx.fillStyle = '#ffd700';
            this._drawStar(ctx, -6, -15.5, 2);
            // Guard tower
            ctx.fillStyle = '#555';
            ctx.fillRect(8, -8, 4, 8);
            ctx.fillStyle = primary;
            ctx.beginPath();
            ctx.moveTo(7, -8); ctx.lineTo(10, -12); ctx.lineTo(13, -8);
            ctx.closePath();
            ctx.fill();
        } else if (type === 'soldier') {
            // Mini soldier: bigger, more detail
            // Head
            ctx.fillStyle = '#d4a574';
            ctx.beginPath(); ctx.arc(0, -8, 5.5, 0, Math.PI * 2); ctx.fill();
            // Helmet
            ctx.fillStyle = faction === 'soviet' ? '#4a3a28' : '#3a4a38';
            ctx.beginPath(); ctx.arc(0, -9, 6, Math.PI, 0, false); ctx.fill();
            // Body
            const uniColor = faction === 'soviet' ? '#6b2020' : '#1e3d6b';
            ctx.fillStyle = uniColor;
            ctx.beginPath();
            ctx.roundRect(-6, -2, 12, 12, 2);
            ctx.fill();
            // Belt
            ctx.fillStyle = '#3a3020';
            ctx.fillRect(-6, 8, 12, 2);
            // Legs
            ctx.fillStyle = uniColor;
            ctx.fillRect(-5, 10, 4, 6);
            ctx.fillRect(1, 10, 4, 6);
            // Boots
            ctx.fillStyle = '#2a2218';
            ctx.fillRect(-5, 14, 4, 3);
            ctx.fillRect(1, 14, 4, 3);
            // Rifle
            ctx.strokeStyle = '#3e2e1e';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(6, -4); ctx.lineTo(10, 8);
            ctx.stroke();
            // Faction dot
            ctx.fillStyle = faction === 'soviet' ? '#ff3333' : '#3388ff';
            ctx.beginPath(); ctx.arc(0, -13, 2, 0, Math.PI * 2); ctx.fill();
        }

        ctx.restore();
        this.cache[key] = canvas;
        return canvas;
    }

    // Pre-generate all sprites
    generateAll() {
        // Terrain
        for (let i = 0; i < 5; i++) this.drawGrassTile(i);
        for (let i = 0; i < 4; i++) this.drawWaterTile(i);
        this.drawOreTile();

        // Buildings
        for (const f of ['soviet', 'allied']) {
            this.drawRefinery(f);
            this.drawBarracks(f);
            this.drawSoldierSheet(f);
            this.drawBuildIcon('refinery', f);
            this.drawBuildIcon('barracks', f);
            this.drawBuildIcon('soldier', f);
        }

        // Effects
        for (let i = 0; i < 6; i++) this.drawExplosion(i);
        this.drawBullet();
        this.drawSelectionCircle();

        // Fog
        this.drawFogTile(1);
        this.drawFogTile(0.5);

        console.log(`[SpriteFactory] Generated ${Object.keys(this.cache).length} sprites`);
    }
}
