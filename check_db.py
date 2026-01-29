import asyncio
import asyncpg
import os

async def check_db():
    try:
        conn = await asyncpg.connect('postgresql://waf_user:waf_secure_pass_2026@localhost:5432/aegisx_waf')
        print("Connected to DB successfully.")
        
        # Check tables
        tables = await conn.fetch("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
        """)
        print("Tables:", [dict(row) for row in tables])
        
        # Check count explicitly
        try:
            count = await conn.fetchval("SELECT COUNT(*) FROM requests")
            print(f"Direct DB Count: {count}")
        except Exception as e:
            print(f"Error checking count: {e}")
            
        await conn.close()
    except Exception as e:
        print(f"Connection failed: {e}")

asyncio.run(check_db())
