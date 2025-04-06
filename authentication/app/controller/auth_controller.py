from app.models.user import User
from app.db import db
from flask import request, jsonify

def authenticate_user():
    data = request.get_json()

    if not data or data.get('username') is None or data.get('password') is None:
        return jsonify({"message": "Missing username or password"}), 400
    
    user = User.query.filter_by(username=data['username']).first()

    if not user or not user.check_password(data['password']):   
        return jsonify({"message": "Invalid username or password"}), 404
    




#def register_user():