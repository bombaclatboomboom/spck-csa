const { spawn } = require('child_process');
const os = require('os');
const path = require('path');
const fs = require('fs');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const userDataDir = path.join(os.tmpdir(), 'chrome_cdp_profile_scroll_' + Date.now());
const artifactDir = 'C:\\Users\\DELL\\.gemini\\antigravity\\brain\\58a37ee1-1f24-4ea8-a30d-d46ef3f798c5';

async function run() {
  const chrome = spawn(chromePath, [
    '--headless=new',
    '--disable-gpu',
    '--remote-debugging-port=9223',
    `--user-data-dir=${userDataDir}`,
    'http://127.0.0.1:5000/'
  ]);

  await new Promise(r => setTimeout(r, 1500));

  try {
    const listRes = await fetch('http://127.0.0.1:9223/json/list');
    const tabs = await listRes.json();
    const pageTab = tabs.find(t => t.type === 'page') || tabs[0];
    const ws = new WebSocket(pageTab.webSocketDebuggerUrl);

    await new Promise((resolve, reject) => {
      ws.onopen = resolve;
      ws.onerror = reject;
    });

    let id = 1;
    function send(method, params = {}) {
      return new Promise(resolve => {
        const curId = id++;
        const handler = (msg) => {
          const res = JSON.parse(msg.data);
          if (res.id === curId) {
            ws.removeEventListener('message', handler);
            resolve(res.result);
          }
        };
        ws.addEventListener('message', handler);
        ws.send(JSON.stringify({ id: curId, method, params }));
      });
    }

    await send('Emulation.setDeviceMetricsOverride', {
      width: 1440,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false
    });

    // Scroll to carousel (section 2)
    await send('Runtime.evaluate', { expression: 'window.scrollTo(0, 950)' });
    await new Promise(r => setTimeout(r, 600));
    const ss1 = await send('Page.captureScreenshot');
    fs.writeFileSync(path.join(artifactDir, 'phase2_home_section2_carousel.png'), Buffer.from(ss1.data, 'base64'));
    console.log('Saved section 2 carousel screenshot');

    // Scroll to feature strips (sections 3 & 4)
    await send('Runtime.evaluate', { expression: 'window.scrollTo(0, 1850)' });
    await new Promise(r => setTimeout(r, 600));
    const ss2 = await send('Page.captureScreenshot');
    fs.writeFileSync(path.join(artifactDir, 'phase2_home_section3_4_strips.png'), Buffer.from(ss2.data, 'base64'));
    console.log('Saved section 3 & 4 strips screenshot');

    // Scroll to data chart & CTA (sections 5 & 6)
    await send('Runtime.evaluate', { expression: 'window.scrollTo(0, 2800)' });
    await new Promise(r => setTimeout(r, 600));
    const ss3 = await send('Page.captureScreenshot');
    fs.writeFileSync(path.join(artifactDir, 'phase2_home_section5_6_data.png'), Buffer.from(ss3.data, 'base64'));
    console.log('Saved section 5 & 6 data screenshot');

    ws.close();
  } catch (err) {
    console.error('Error:', err);
  } finally {
    chrome.kill();
  }
}

run();
