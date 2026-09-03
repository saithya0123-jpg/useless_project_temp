/* Tea Bubble Counter: deliberately lightweight, client-side image approximation. */
const $ = (id) => document.getElementById(id);
const video = $('video');
const canvas = $('overlay');
const context = canvas.getContext('2d');
let stream = null;
let drink = 'tea';
let history = loadHistory();

// A malformed localStorage value should never prevent the scanner from opening.
function loadHistory() {
  try {
    const saved = JSON.parse(localStorage.getItem('tea-bubble-history') || '[]');
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

document.querySelectorAll('[data-drink]').forEach((button) => {
  button.addEventListener('click', () => {
    drink = button.dataset.drink;
    document.querySelectorAll('[data-drink]').forEach((item) => {
      const isSelected = item === button;
      item.classList.toggle('selected', isSelected);
      item.setAttribute('aria-pressed', String(isSelected));
    });
  });
});

function error(message = '') { $('error').textContent = message; }
function setState(message, active = false) {
  $('cameraState').textContent = message;
  $('cameraState').style.color = active ? '#4d946d' : '';
}

$('startCamera').addEventListener('click', async () => {
  if (!navigator.mediaDevices?.getUserMedia) return error('This browser does not support camera access. Try a recent Chrome, Edge, Firefox, or Safari.');
  error('');
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
    video.srcObject = stream;
    await video.play();
    $('viewerEmpty').hidden = true;
    $('startCamera').disabled = true;
    $('stopCamera').disabled = false;
    $('scanButton').disabled = false;
    setState('CAMERA ONLINE', true);
  } catch (err) {
    const denied = err.name === 'NotAllowedError' || err.name === 'SecurityError';
    error(denied ? 'Camera permission was denied. Allow camera access in your browser settings, then try again.' : 'We could not reach a camera. Check that it is available and not being used by another app.');
    setState('CAMERA UNAVAILABLE');
  }
});

$('stopCamera').addEventListener('click', stopCamera);
function stopCamera() {
  stream?.getTracks().forEach((track) => track.stop());
  stream = null;
  video.srcObject = null;
  context.clearRect(0, 0, canvas.width, canvas.height);
  $('viewerEmpty').hidden = false;
  $('startCamera').disabled = false;
  $('stopCamera').disabled = true;
  $('scanButton').disabled = true;
  setState('CAMERA IDLE');
}
window.addEventListener('beforeunload', stopCamera);

// Finds local brightness peaks, then uses non-maximum suppression to approximate circular light bubbles.
function detectBubbles() {
  const width = video.videoWidth;
  const height = video.videoHeight;
  if (!width || !height) throw new Error('The camera frame is not ready yet. Give it one more second.');
  const small = document.createElement('canvas');
  const maxWidth = 360;
  small.width = Math.min(maxWidth, width);
  small.height = Math.round(height * small.width / width);
  const smallCtx = small.getContext('2d', { willReadFrequently: true });
  smallCtx.drawImage(video, 0, 0, small.width, small.height);
  const pixels = smallCtx.getImageData(0, 0, small.width, small.height).data;
  const luminance = new Uint8Array(small.width * small.height);
  let total = 0;
  for (let i = 0; i < luminance.length; i++) { const p = i * 4; luminance[i] = Math.round(pixels[p] * .299 + pixels[p + 1] * .587 + pixels[p + 2] * .114); total += luminance[i]; }
  const mean = total / luminance.length;
  let spread = 0; for (const value of luminance) spread += (value - mean) ** 2;
  const threshold = Math.min(238, Math.max(145, mean + Math.sqrt(spread / luminance.length) * .68));
  const candidates = [];
  const at = (x, y) => y * small.width + x;
  // Sampling reduces visual noise and keeps this intentionally silly operation fast on phones.
  for (let y = 7; y < small.height - 7; y += 3) for (let x = 7; x < small.width - 7; x += 3) {
    const value = luminance[at(x, y)];
    if (value < threshold) continue;
    let localMax = true;
    for (let oy = -4; oy <= 4 && localMax; oy += 2) for (let ox = -4; ox <= 4; ox += 2) if (luminance[at(x + ox, y + oy)] > value) { localMax = false; break; }
    if (localMax) candidates.push({ x, y, brightness: value });
  }
  candidates.sort((a, b) => b.brightness - a.brightness);
  const bubbles = [];
  for (const point of candidates) {
    const near = bubbles.some((bubble) => Math.hypot(point.x - bubble.x, point.y - bubble.y) < 17);
    if (!near) bubbles.push({ ...point, radius: 8 + Math.min(10, (point.brightness - threshold) / 7) });
    if (bubbles.length === 55) break;
  }
  return { bubbles, width: small.width, height: small.height };
}

function paint(result) {
  // Match the video element's `object-fit: cover` crop so markers stay on bubbles
  // instead of drifting when the camera frame and preview have different ratios.
  const bounds = canvas.getBoundingClientRect();
  const scaleForPixels = window.devicePixelRatio || 1;
  canvas.width = Math.round(bounds.width * scaleForPixels);
  canvas.height = Math.round(bounds.height * scaleForPixels);
  context.clearRect(0, 0, canvas.width, canvas.height);
  const sourceScale = Math.max(canvas.width / video.videoWidth, canvas.height / video.videoHeight);
  const offsetX = (canvas.width - video.videoWidth * sourceScale) / 2;
  const offsetY = (canvas.height - video.videoHeight * sourceScale) / 2;
  result.bubbles.forEach((bubble, index) => {
    const sourceX = bubble.x * video.videoWidth / result.width;
    const sourceY = bubble.y * video.videoHeight / result.height;
    const x = sourceX * sourceScale + offsetX, y = sourceY * sourceScale + offsetY;
    const r = bubble.radius * video.videoWidth / result.width * sourceScale;
    context.strokeStyle = '#6de7a2'; context.fillStyle = '#183a2ccc'; context.lineWidth = Math.max(3, canvas.width / 350);
    context.beginPath(); context.arc(x, y, r, 0, Math.PI * 2); context.stroke();
    context.beginPath(); context.arc(x + r * .72, y - r * .72, 13, 0, Math.PI * 2); context.fill();
    context.fillStyle = '#fff'; context.font = '600 12px DM Sans'; context.textAlign = 'center'; context.textBaseline = 'middle'; context.fillText(index + 1, x + r * .72, y - r * .72);
  });
}

function analysisDetails(count) {
  if (count < 5) return { activity: 'LOW', message: 'Your tea is suspiciously calm.' };
  if (count <= 15) return { activity: 'MEDIUM', message: 'A respectable amount of bubbling.' };
  if (count <= 30) return { activity: 'HIGH', message: 'Your tea is having a productive day.' };
  return { activity: 'CHAOTIC', message: 'EMERGENCY: Your tea has achieved bubble supremacy.' };
}
function animateCount(end) { const start = performance.now(); const duration = 950; function frame(now) { $('bubbleCount').textContent = Math.min(end, Math.round(end * (now - start) / duration)); if (now - start < duration) requestAnimationFrame(frame); } requestAnimationFrame(frame); }

$('scanButton').addEventListener('click', async () => {
  error(''); $('viewer').classList.add('scanning'); $('scanButton').disabled = true;
  // A short pause makes the camera interaction understandable without pretending this is a real AI model.
  await new Promise((resolve) => setTimeout(resolve, 850));
  try {
    const result = detectBubbles(); paint(result);
    const count = result.bubbles.length, details = analysisDetails(count), score = Math.min(10, +(1.5 + count * .31).toFixed(1));
    animateCount(count); $('activity').textContent = details.activity; $('score').textContent = `${score}/10`; $('verdict').textContent = details.message;
    history.unshift({ count, score, activity: details.activity, drink, time: new Date().toISOString() });
    history = history.slice(0, 30); localStorage.setItem('tea-bubble-history', JSON.stringify(history)); renderHistory();
  } catch (err) { error(err.message || 'The bubbles refused to cooperate. Try again.'); }
  finally {
    $('viewer').classList.remove('scanning');
    $('scanButton').disabled = !stream;
  }
});

function renderHistory() {
  const counts = history.map((scan) => scan.count); $('totalScans').textContent = history.length; $('averageBubbles').textContent = counts.length ? Math.round(counts.reduce((a, b) => a + b, 0) / counts.length) : 0; $('highestBubbles').textContent = counts.length ? Math.max(...counts) : 0;
  $('historyList').innerHTML = history.length ? history.map((scan) => `<div class="scan-row"><span>${new Date(scan.time).toLocaleDateString(undefined,{month:'short',day:'numeric'})} · ${scan.drink === 'tea' ? '🍵' : '☕'}</span><b>${scan.count} <small>bubbles</small></b><span class="activity">${scan.activity}</span><span class="score">${scan.score}/10</span></div>`).join('') : '<p>No scans yet. Your bubble legacy starts here.</p>';
}
$('clearHistory').addEventListener('click', () => { history = []; localStorage.removeItem('tea-bubble-history'); renderHistory(); });
renderHistory();
