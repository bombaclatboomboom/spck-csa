import sqlite3

def migrate():
    conn = sqlite3.connect('users.db')
    c = conn.cursor()
    cols = [row[1] for row in c.execute('PRAGMA table_info(users)').fetchall()]
    print('Existing cols in users:', cols)

    if 'username' not in cols:
        c.execute('ALTER TABLE users ADD COLUMN username TEXT')
        print('Added username column')
    if 'cash_balance' not in cols:
        c.execute('ALTER TABLE users ADD COLUMN cash_balance REAL DEFAULT 25000000.0')
        print('Added cash_balance column')
    if 'invested_balance' not in cols:
        c.execute('ALTER TABLE users ADD COLUMN invested_balance REAL DEFAULT 0.0')
        print('Added invested_balance column')
    if 'avatar_url' not in cols:
        c.execute('ALTER TABLE users ADD COLUMN avatar_url TEXT')
        print('Added avatar_url column')

    # Update demo users with usernames and cash balances
    c.execute("UPDATE users SET username = 'alexander', cash_balance = 15000000.0, invested_balance = 9700000.0 WHERE email = 'alexander@estatevision.io'")
    c.execute("UPDATE users SET username = 'elena', cash_balance = 45000000.0, invested_balance = 19400000.0 WHERE email = 'investor@estatevision.io'")
    
    # Also ensure any user without username gets one
    c.execute("UPDATE users SET username = LOWER(SUBSTR(email, 1, INSTR(email, '@') - 1)) WHERE username IS NULL OR username = ''")
    
    conn.commit()

    c.execute('SELECT id, username, email, full_name, role, cash_balance, invested_balance FROM users')
    rows = c.fetchall()
    print('Updated users:')
    for r in rows:
        print(' ', r)
    conn.close()

if __name__ == '__main__':
    migrate()
