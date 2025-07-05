from app.db import db
from datetime import datetime, timedelta
from werkzeug.security import generate_password_hash, check_password_hash
from dotenv import load_dotenv
import os
import jwt 
import base64

load_dotenv()

class User(db.Model):
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password = db.Column(db.String(225), nullable=False)
    first_name = db.Column(db.String(50), nullable=False)
    last_name = db.Column(db.String(50), nullable=False)
    created_at = db.Column(db.DateTime, server_default=db.func.now())
    updated_at = db.Column(db.DateTime, server_default=db.func.now(), onupdate=db.func.now())

    def set_password(self, password):
        self.password = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password, password)

    def generate_token(self):
        EXPIRATION_TIME = int(os.getenv('TOKEN_EXPIRATION_TIME', 86400))  

        paylod = {
            'user_id': self.id,
            'email': self.email,
            'exp': datetime.utcnow() + timedelta(seconds=EXPIRATION_TIME) 
        }

        b64_key = os.getenv('PRIVATE_KEY')
        private_key = base64.b64decode(b64_key).decode("utf-8")

        token = jwt.encode(paylod, private_key, algorithm='RS256')
        return token
    
    @staticmethod
    def verify_token(self, token):
        try:
            b64_key = os.getenv('PUBLIC_KEY')
            public_key = base64.b64decode(b64_key).decode("utf-8")
            payload = jwt.decode(token, public_key, algorithms=['RS256'])
            return payload
        except jwt.ExpiredSignatureError:
            return None
        except jwt.InvalidTokenError:
            return None
        
    def __repr__(self):
        return f"<User {self.email}"