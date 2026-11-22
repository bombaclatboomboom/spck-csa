const { spawn } = require('child_process');
const os = require('os');
const path = require('path');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const userDataDir = path.join(os.tmpdir(), 'chrome_cdp_profile_p3_' + Date.now());

async function run() {
  const chrome = spawn(chromePath, [
    '--headless=new',
    '--disable-gpu',
    '--remote-debugging-port=9225',
    `--user-data-dir=${userDataDir}`,
    'http://127.0.0.1:5000/'
  ]);

  await new Promise(r => setTimeout(r, 1500));

  try {
    const listRes = await fetch('http://127.0.0.1:9225/json/list');
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

    const pages = [
      'http://127.0.0.1:5000/buy',
      'http://127.0.0.1:5000/property/1'
    ];

    const viewports = [
      { width: 1440, height: 900 },
      { width: 768, height: 1024 },
      { width: 390, height: 844 }
    ];

    console.log('=== CHECKING HORIZONTAL OVERFLOW & CONSOLE ERRORS ===');
    for (const p of pages) {
      for (const vp of viewports) {
        await send('Emulation.setDeviceMetricsOverride', {
          width: vp.width,
          height: vp.height,
          deviceScaleFactor: 1,
          mobile: vp.width <= 768
        });

        await send('Page.navigate', { url: p });
        await new Promise(r => setTimeout(r, 800));

        const evalRes = await send('Runtime.evaluate', {
          expression: 'JSON.stringify({ scrollWidth: document.documentElement.scrollWidth, innerWidth: window.innerWidth, overflow: document.documentElement.scrollWidth > window.innerWidth })'
        });
        const data = JSON.parse(evalRes.result.value);
        console.log(`Page: ${p.replace('http://127.0.0.1:5000', '')} | ${vp.width}x${vp.height} -> scrollWidth: ${data.scrollWidth}, innerWidth: ${data.innerWidth}, overflow: ${data.overflow}`);
      }
    }

    ws.close();
  } catch (err) {
    console.error('CDP Error:', err);
  } finally {
    chrome.kill();
  }
}

run();
