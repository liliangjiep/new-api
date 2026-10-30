const fs = require('fs');
const path = require('path');

const KEY = process.env.TOAPIS_API_KEY || '';
const BASE = process.env.TOAPIS_BASE_URL || 'https://toapis.cn';
if (!KEY) { console.error('NO KEY'); process.exit(1); }

const jobs = [
  {
    file: 'hero-showroom-16x9.png',
    size: '16:9', resolution: '2k',
    prompt: 'Ultra-photorealistic luxury stone showroom interior, double-height space, Calacatta white marble full-height feature wall with continuous bookmatched veins wrapping around corners, brushed brass inlay strips, mirror-polished floor with soft reflections, warm 3000K cove lighting plus soft daylight from entrance glazing, travertine display pedestals with stone samples, linen upholstered bench with natural wrinkles, people-free, shot on full-frame camera 24mm tilt-shift f/8, straight verticals, Architectural Digest editorial quality, subtle film grain, true-to-life color. No CGI look, no repeating veins, no plastic texture, no flat lighting, no watermark, no text.',
  },
  {
    file: 'hero-lobby-16x9.png',
    size: '16:9', resolution: '2k',
    prompt: 'Ultra-photorealistic five-star hotel lobby atrium, morning daylight from tall glazing on the right plus warm 3000K cove lighting, beige travertine floor with mirror polish and soft reflections, white marble reception counter with waterfall edge in foreground, oak slat backdrop, boucle armchairs with natural fabric creases, brushed brass pendant cluster, people-free, shot on full-frame camera 35mm f/5.6 eye-level wide, balanced exposure, natural white balance, subtle film grain. No CGI look, no fake marble, no overexposed highlights, no watermark, no text.',
  },
  {
    file: 'craftsman-1x1.png',
    size: '1:1', resolution: '1k',
    prompt: 'Photorealistic documentary photograph of a stonemason hand-polishing dark marble countertop edge in a workshop, visible stone dust in air, micro surface variation and polish inconsistency on stone, worn work gloves, warm side window light plus cool fill, shallow depth of field, shot on Sony A7IV 50mm f/2.8, subtle motion blur on hand, film grain, true-to-life color. No staged studio polish, no plastic look, no watermark, no text.',
  },
];

(async () => {
  const outDir = path.join(__dirname, '..', 'apps', 'web', 'public', 'images', 'toapi');
  for (const j of jobs) {
    const out = path.join(outDir, j.file);
    if (fs.existsSync(out)) { console.log('skip exists', j.file); continue; }
    console.log('submit', j.file);
    const res = await fetch(`${BASE}/v1/images/generations`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'gpt-image-2', prompt: j.prompt, size: j.size, resolution: j.resolution, n: 1 }),
    });
    const txt = await res.text();
    let data; try { data = JSON.parse(txt); } catch { console.error('bad json', txt.slice(0, 500)); continue; }
    if (!res.ok) { console.error('submit failed', j.file, txt.slice(0, 500)); continue; }
    const taskId = data.id || data.task_id || data.data?.id;
    console.log('task', j.file, taskId);
    if (!taskId) { console.error('no task id', txt.slice(0, 500)); continue; }
    // poll up to 40 * 3s
    for (let i = 0; i < 40; i++) {
      await new Promise(r => setTimeout(r, 3000));
      const q = await fetch(`${BASE}/v1/images/generations/${encodeURIComponent(taskId)}`, {
        headers: { Authorization: `Bearer ${KEY}` },
      });
      const qt = await q.text();
      let qj; try { qj = JSON.parse(qt); } catch { console.log('poll bad json, retry'); continue; }
      const st = qj.status || qj.data?.status || qj.task?.status;
      console.log(`poll ${j.file} #${i} status=${st}`);
      const url = qj.result?.data?.[0]?.url || qj.data?.result?.data?.[0]?.url || qj.data?.url || qj.url;
      if (st === 'completed' || url) {
        const imgUrl = url || qj.result?.data?.[0]?.b64_json && null;
        let buf = null;
        if (url) {
          const ir = await fetch(url);
          buf = Buffer.from(await ir.arrayBuffer());
        } else if (qj.result?.data?.[0]?.b64_json) {
          buf = Buffer.from(qj.result.data[0].b64_json, 'base64');
        } else if (qj.data?.b64_json) {
          buf = Buffer.from(qj.data.b64_json, 'base64');
        }
        if (buf) { fs.writeFileSync(out, buf); console.log('saved', j.file, buf.length); break; }
        else { console.error('completed but no url/b64', qt.slice(0, 800)); break; }
      }
      if (st === 'failed') { console.error('failed', qt.slice(0, 500)); break; }
    }
  }
})();
