import subprocess, os, tempfile

artifact_dir = r"C:\Users\DELL\.gemini\antigravity\brain\58a37ee1-1f24-4ea8-a30d-d46ef3f798c5"
chrome_path = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
tmpdir = os.path.join(tempfile.gettempdir(), 'chrome_tall_p3')

outpath = os.path.join(artifact_dir, "phase3_property_detail_tall_1440.png")
cmd = [
    chrome_path,
    '--headless=new',
    '--disable-gpu',
    '--virtual-time-budget=3000',
    f'--user-data-dir={tmpdir}',
    '--window-size=1440,3200',
    f'--screenshot={outpath}',
    'http://127.0.0.1:5000/property/1'
]
subprocess.run(cmd, capture_output=True, text=True)
print(f"Captured tall property detail -> {outpath}")
