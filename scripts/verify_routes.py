import urllib.request
import json

routes = [
    '/',
    '/login',
    '/signup',
    '/buy',
    '/sell',
    '/dashboard',
    '/explore',
    '/compare',
    '/global',
    '/predict',
    '/trends',
    '/property/1'
]

print("=== VERIFYING ALL ESTATEVISION ROUTES ===")
all_pass = True
for r in routes:
    url = f"http://127.0.0.1:5000{r}"
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req) as resp:
            status = resp.status
            print(f"[{status}] {r}")
            if status != 200:
                all_pass = False
    except Exception as e:
        print(f"[ERR] {r} -> {e}")
        all_pass = False

print("\nResult:", "ALL ROUTES PASS 200 OK!" if all_pass else "SOME ROUTES FAILED!")
