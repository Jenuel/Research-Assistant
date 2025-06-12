from app.db import db
import datetime
from werkzeug.security import generate_password_hash, check_password_hash
from dotenv import load_dotenv
import os
import jwt 

load_dotenv()

class User(db.Model):
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password = db.Column(db.String(128), nullable=False)
    first_name = db.Column(db.String(50), nullable=False)
    last_name = db.Column(db.String(50), nullable=False)
    created_at = db.Column(db.DateTime, server_default=db.func.now())
    updated_at = db.Column(db.DateTime, server_default=db.func.now(), onupdate=db.func.now())

    def set_password(self, password):
        self.password = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password, password)

    def generate_token(self):
        EXPIRATION_TIME = os.getenv('TOKEN_EXPIRATION_TIME', 86400)  
        paylod = {
            'user_id': self.id,
            'exp': datetime.utcnow() + datetime.timedelta(seconds=EXPIRATION_TIME)  # Token valid for 1 day
        }
        token = jwt.encode(paylod, os.getenv('SECRET_KEY'), algorithm='HS256')
        return token
    
    def __repr__(self):
        return f"<User {self.email}"