const { spawn } = require('child_process');
const os = require('os');
const path = require('path');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const userDataDir = path.join(os.tmpdir(), 'chrome_check_globe_' + Date.now());

async function run() {
  const chrome = spawn(chromePath, [
    '--headless=new',
    '--disable-gpu',
    '--remote-debugging-port=9226',
    `--user-data-dir=${userDataDir}`,
    'http://127.0.0.1:5000/explore'
  ]);

  await new Promise(r => setTimeout(r, 2000));

  try {
    const listRes = await fetch('http://127.0.0.1:9226/json/list');
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

    ws.addEventListener('message', msg => {
      const parsed = JSON.parse(msg.data);
      if (parsed.method === 'Console.messageAdded' || parsed.method === 'Runtime.consoleAPICalled') {
        console.log('CONSOLE:', JSON.stringify(parsed.params));
      }
    });

    await send('Console.enable');
    await send('Runtime.enable');
    await send('Page.enable');

    await send('Page.navigate', { url: 'http://127.0.0.1:5000/explore' });
    await new Promise(r => setTimeout(r, 3000));

    const checkDom = await send('Runtime.evaluate', {
      expression: 'JSON.stringify({ typeofGlobe: typeof Globe, hasContainer: !!document.getElementById("globeExplorer"), containerHtml: document.getElementById("globeExplorer")?.innerHTML.substring(0, 300) })'
    });
    console.log('DOM CHECK:', checkDom.result.value);

    // capture screenshot
    const shot = await send('Page.captureScreenshot');
    const fs = require('fs');
    fs.writeFileSync('C:\\Users\\DELL\\.gemini\\antigravity\\brain\\58a37ee1-1f24-4ea8-a30d-d46ef3f798c5\\check_globe_now.png', Buffer.from(shot.data, 'base64'));
    console.log('Saved check_globe_now.png');

    ws.close();
  } catch (err) {
    console.error('Error:', err);
  } finally {
    chrome.kill();
  }
}

run();
