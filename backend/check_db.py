"""
Script to check database connection and create database if it doesn't exist.
"""
import sys
from sqlalchemy import create_engine, text
from sqlalchemy.exc import OperationalError
from app.core.config import settings

def check_and_create_db():
    """Check database connection and create database if needed."""
    # Parse DATABASE_URL
    db_url = settings.DATABASE_URL
    print(f"Checking connection to: {db_url.split('@')[1] if '@' in db_url else db_url}")
    
    # Extract database name
    if '/promptvault-db' in db_url:
        db_name = 'promptvault-db'
        # Get base URL without database name
        base_url = db_url.rsplit('/', 1)[0] + '/postgres'  # Connect to default 'postgres' db
    else:
        print("❌ Database name should be 'promptvault-db'")
        return False
    
    try:
        # Try to connect to the target database
        print(f"\n1. Testing connection to database '{db_name}'...")
        engine = create_engine(db_url, pool_pre_ping=True)
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        print(f"✅ Database '{db_name}' exists and is accessible!")
        return True
        
    except OperationalError as e:
        error_msg = str(e)
        if "does not exist" in error_msg or "database" in error_msg.lower():
            print(f"⚠️  Database '{db_name}' does not exist.")
            print(f"\n2. Attempting to create database '{db_name}'...")
            
            try:
                # Connect to default 'postgres' database to create the new one
                base_engine = create_engine(base_url, pool_pre_ping=True)
                with base_engine.connect() as conn:
                    # Terminate existing connections to the database (if any)
                    conn.execute(text(f"SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '{db_name}' AND pid <> pg_backend_pid()"))
                    # Create database
                    conn.execute(text("COMMIT"))  # End transaction
                    conn.execute(text(f'CREATE DATABASE "{db_name}"'))
                    conn.execute(text("COMMIT"))
                
                print(f"✅ Database '{db_name}' created successfully!")
                
                # Test connection to new database
                print(f"\n3. Testing connection to newly created database...")
                with engine.connect() as conn:
                    conn.execute(text("SELECT 1"))
                print(f"✅ Connection successful!")
                return True
                
            except Exception as create_error:
                print(f"❌ Failed to create database: {create_error}")
                print("\n💡 You may need to create it manually:")
                print(f"   docker exec -it <postgres_container> psql -U postgres -c 'CREATE DATABASE \"{db_name}\";'")
                return False
        else:
            print(f"❌ Connection error: {error_msg}")
            print("\n💡 Please check:")
            print("   1. PostgreSQL is running")
            print("   2. DATABASE_URL credentials are correct")
            print("   3. Database name matches your Docker container")
            return False

if __name__ == "__main__":
    print("=" * 60)
    print("Database Connection Check")
    print("=" * 60)
    
    success = check_and_create_db()
    
    print("\n" + "=" * 60)
    if success:
        print("✅ Database is ready!")
        print("You can now run: python init_db.py")
    else:
        print("❌ Database setup incomplete")
        sys.exit(1)
    print("=" * 60)
