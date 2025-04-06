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
    
def register_user():
    data = request.get_json()

    if data is None:
        return jsonify({"message": "Missing data"}), 400
    
    existing_user = User.query.filter_by(email=data['email']).first()

    if existing_user:
        return jsonify({"message": "An existing user is already associated with this email"}), 409
    
    new_user = User(
        email=data['email'],
        password=data['password'],
        first_name=data['first_name'],
        last_name=data['last_name'],
        created_at=db.func.now(),
        updated_at=db.func.now()
    )
    
    db.session.add(new_user)
    db.session.commit()

    return jsonify({"message": "User registered successfully"}), 201