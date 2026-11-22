import subprocess, os, tempfile

artifact_dir = r"C:\Users\DELL\.gemini\antigravity\brain\58a37ee1-1f24-4ea8-a30d-d46ef3f798c5"
chrome_path = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
tmpdir = os.path.join(tempfile.gettempdir(), 'chrome_headless_profile_phase3')

viewports = [
    ("desktop_1440", "1440,900"),
    ("tablet_768", "768,1024"),
    ("mobile_390", "390,844")
]

pages = [
    ("marketplace", "http://127.0.0.1:5000/buy"),
    ("property_detail", "http://127.0.0.1:5000/property/1")
]

for p_name, url in pages:
    for v_name, size in viewports:
        outpath = os.path.join(artifact_dir, f"phase3_{p_name}_{v_name}.png")
        cmd = [
            chrome_path,
            '--headless=new',
            '--disable-gpu',
            '--virtual-time-budget=2500',
            f'--user-data-dir={tmpdir}',
            f'--window-size={size}',
            f'--screenshot={outpath}',
            url
        ]
        res = subprocess.run(cmd, capture_output=True, text=True)
        print(f"Captured {p_name} @ {size} -> {outpath}")
