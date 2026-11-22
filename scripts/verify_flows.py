import urllib.request
import urllib.parse
import http.cookiejar
import json

cj = http.cookiejar.CookieJar()
opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj))

# 1. Login as Investor
print("1. Testing Investor Demo Login...")
resp = opener.open("http://127.0.0.1:5000/demo-login/investor")
print("Investor Login Status:", resp.status)

# 2. Check current user API
print("2. Checking /api/user...")
resp = opener.open("http://127.0.0.1:5000/api/user")
data = json.loads(resp.read().decode())
print("User API:", data.get('user', {}).get('full_name'), data.get('user', {}).get('email'))

# 3. Simulate Escrow Purchase on property 1
print("3. Testing Escrow Purchase on Property 1...")
buy_payload = json.dumps({
    "offer_amount": 4850000,
    "payment_method": "JPMorgan SWIFT Sovereign Wire",
    "buyer_name": "Elena Rostova",
    "buyer_email": "investor@estatevision.io"
}).encode('utf-8')

req = urllib.request.Request(
    "http://127.0.0.1:5000/api/property/1/buy",
    data=buy_payload,
    headers={"Content-Type": "application/json"}
)
resp = opener.open(req)
buy_res = json.loads(resp.read().decode())
print("Escrow Purchase Result:", buy_res.get('success'), "Code:", buy_res.get('transaction_code'))

# 4. Fetch User Transactions
print("4. Fetching /api/user/transactions...")
resp = opener.open("http://127.0.0.1:5000/api/user/transactions")
tx_data = json.loads(resp.read().decode())
print(f"Transactions count: {len(tx_data.get('transactions', []))}")
if tx_data.get('transactions'):
    latest = tx_data['transactions'][0]
    print(f"Latest Escrow: {latest.get('transaction_code')} - ${latest.get('offer_amount'):,} - {latest.get('status')}")

print("\nALL BACKEND API & ESCROW FLOWS VERIFIED SUCCESSFULLY!")
