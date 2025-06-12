from app.models.user import User
from app.db import db
from flask import request, jsonify

def authenticate_user():
    data = request.get_json()

    if not data or data.get('email') is None or data.get('password') is None:
        return jsonify({"message": "Missing email or password"}), 400
    
    user = User.query.filter_by(email=data['email']).first()

    if not user or not user.check_password(data['password']):   
        return jsonify({"message": "Invalid email or password"}), 404
    
    token = user.generate_token()

    return jsonify({"token": token}), 200

def register_user():
    data = request.get_json()

    if data is None:
        return jsonify({"message": "Missing data"}), 400
    
    existing_user = User.query.filter_by(email=data['email']).first()

    if existing_user:
        return jsonify({"message": "An existing user is already associated with this email"}), 409
    
    new_user = User(
        email=data['email'],
        first_name=data['first_name'],
        last_name=data['last_name'],
    )
    new_user.set_password(data['password'])
    
    db.session.add(new_user)
    db.session.commit()

    return jsonify({"message": "User registered successfully"}), 201