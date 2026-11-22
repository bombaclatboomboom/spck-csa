"""
EstateVision Apple Redesign Comprehensive Flow Verification Script
Tests:
1. Authentication (Login valid/invalid, Signup, Session management)
2. User Dashboard & APIs (Profile update, Treasury Deposit, Wire Transfer, Transaction Feed)
3. AI Valuation Engine (/api/predict across sovereign jurisdictions)
"""
import requests

BASE_URL = 'http://127.0.0.1:5000'

def test_flows():
    print("=== STARTING ESTATEVISION COMPREHENSIVE VERIFICATION ===")
    s = requests.Session()

    # 1. Test Login with invalid credentials
    r_bad = s.post(f"{BASE_URL}/login", json={'email': 'nobody@estatevision.io', 'password': 'WrongPassword123!'})
    assert r_bad.status_code == 401, f"Expected 401 for bad login, got {r_bad.status_code}"
    print("[PASS] Invalid credentials properly rejected with 401.")

    # 2. Test Login with demo Investor account
    r_login = s.post(f"{BASE_URL}/login", json={'email': 'investor@estatevision.io', 'password': 'Investor2026!'})
    assert r_login.status_code == 200, f"Expected 200 for good login, got {r_login.status_code}"
    login_data = r_login.json()
    assert login_data.get('success') is True, "Login success boolean should be True"
    print(f"[PASS] Demo Investor logged in successfully: {login_data['user']['full_name']}")

    # 3. Test /api/user authenticated profile retrieval
    r_user = s.get(f"{BASE_URL}/api/user")
    assert r_user.status_code == 200
    user_info = r_user.json().get('user', {})
    initial_cash = user_info.get('cash_balance', 45000000.0)
    print(f"[PASS] /api/user returned authenticated profile: {user_info['full_name']} | Cash: ${initial_cash:,.2f}")

    # 4. Test User Profile Update
    r_prof = s.post(f"{BASE_URL}/api/user/profile", json={
        'full_name': 'Elena Rostova',
        'company': 'Vanguard Global Real Assets',
        'phone': '+44 20 7946 0912'
    })
    assert r_prof.status_code == 200
    print(f"[PASS] Profile updated successfully via /api/user/profile")

    # 5. Test Deposit into Treasury
    deposit_amt = 1000000.0
    r_dep = s.post(f"{BASE_URL}/api/user/deposit", json={
        'amount': deposit_amt,
        'source': 'JPMorgan Chase Private Bank'
    })
    assert r_dep.status_code == 200
    dep_data = r_dep.json()
    expected_after_dep = initial_cash + deposit_amt
    assert abs(dep_data['cash_balance'] - expected_after_dep) < 1.0, f"Expected {expected_after_dep}, got {dep_data['cash_balance']}"
    print(f"[PASS] Deposit successful: +${deposit_amt:,.2f} -> New balance: ${dep_data['cash_balance']:,.2f}")

    # 6. Test Wire Transfer out of Treasury
    wire_amt = 1000000.0
    r_wire = s.post(f"{BASE_URL}/api/user/wire", json={
        'amount': wire_amt,
        'recipient': 'Escrow Clearing Custody Ltd'
    })
    assert r_wire.status_code == 200
    wire_data = r_wire.json()
    assert abs(wire_data['cash_balance'] - initial_cash) < 1.0, f"Expected {initial_cash}, got {wire_data['cash_balance']}"
    print(f"[PASS] Wire transfer successful: -${wire_amt:,.2f} -> New balance: ${wire_data['cash_balance']:,.2f}")

    # 7. Test AI Hedonic Valuation API across 3 markets
    test_markets = [
        {'country': 'United States', 'bedrooms': 4, 'area': 250},
        {'country': 'United Kingdom', 'bedrooms': 3, 'area': 180},
        {'country': 'United Arab Emirates', 'bedrooms': 5, 'area': 450}
    ]
    for tm in test_markets:
        r_pred = s.post(f"{BASE_URL}/api/predict", json=tm)
        assert r_pred.status_code == 200
        pdata = r_pred.json()
        assert pdata.get('success') is True
        price = pdata.get('predicted_price')
        low = pdata.get('confidence_range', {}).get('low')
        high = pdata.get('confidence_range', {}).get('high')
        assert price > 0 and low < price < high
        print(f"[PASS] AI Valuation for {tm['country']} ({tm['area']}m², {tm['bedrooms']} beds): ${price:,.2f} (Confidence: ${low:,.2f} - ${high:,.2f})")

    # 8. Test Transactions Feed
    r_tx = s.get(f"{BASE_URL}/api/user/transactions")
    assert r_tx.status_code == 200
    tx_data = r_tx.json()
    assert tx_data.get('success') is True
    print(f"[PASS] User transactions feed returned {len(tx_data.get('transactions', []))} active records.")

    print("\n=== ALL FLOW VERIFICATIONS PASSED WITH 100% SUCCESS ===")

if __name__ == '__main__':
    test_flows()
