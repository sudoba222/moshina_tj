import os
import sys
import bcrypt
from sqlalchemy.orm import Session

# Make app importable
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal
from app.models import User

def reset_password(identifier, new_password):
    db = SessionLocal()
    try:
        user = db.query(User).filter(
            (User.phone == identifier) | (User.email == identifier),
            User.is_deleted == False
        ).first()
        
        if not user:
            print(f"User not found: {identifier}")
            return
        
        hashed = bcrypt.hashpw(new_password.encode(), bcrypt.gensalt(rounds=13)).decode()
        user.password_hash = hashed
        user.email_verified = True # Ensure they can login if they used email
        user.is_banned = False
        user.token_version = (user.token_version or 0) + 1
        
        db.commit()
        print(f"Successfully reset password for {user.name} ({identifier})")
        print(f"New hash: {hashed}")
        
    except Exception as e:
        print(f"Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python reset_user_password.py <phone_or_email> <new_password>")
    else:
        reset_password(sys.argv[1], sys.argv[2])
