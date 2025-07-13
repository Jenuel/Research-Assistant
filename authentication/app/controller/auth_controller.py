from ..models.user import User
from ..db import db
from ..schemas.user_schema import UserLoginSchema, UserRegistrationSchema
from flask import request, jsonify, make_response
from pydantic import ValidationError
from dotenv import load_dotenv
import os

load_dotenv()

def authenticate_user():
    try:
        data = UserLoginSchema(**request.get_json())
    except ValidationError as e:
        return jsonify({"message": "Invalid input", "errors": e.errors()}), 400
    
    user = User.query.filter_by(email=data.email).first()

    if not user or not user.check_password(data.password):   
        return jsonify({"message": "Invalid email or password"}), 401
    
    token = user.generate_token()
    max_age = int(os.getenv('TOKEN_EXPIRATION_TIME', 86400))

    response= make_response(jsonify({ "message": "Login successful" }), 200)
    response.set_cookie('token', token, httponly=True, secure=True, samesite='Strict', max_age=max_age)  

    return response

def verify_user():
    token = request.cookies.get("token")

    if not token:
        return jsonify({"message": "Token is missing"}), 401
    
    payload = User.verify_token(token)
    if not payload:
        return jsonify({"message": "Invalid or expired token"}), 401
    

    user_id = payload.get("user_id")
    email = payload.get("email")

    return jsonify({
        "message": "Token is valid",
        "user": {
            "user_id": payload.get("user_id"),
            "email": payload.get("email")
        }
    }), 200

def register_user():
    try:
        data = UserRegistrationSchema(**request.get_json())
    except ValidationError as e:
        return jsonify({"message": "Invalid input", "errors": e.errors()}), 400
    
    existing_user = User.query.filter_by(email=data.email).first()

    if existing_user:
        return jsonify({"message": "An existing user is already associated with this email"}), 409
    
    new_user = User(
        email=data.email,
        first_name=data.first_name,
        last_name=data.last_name,
    )

    new_user.set_password(data.password)
    
    db.session.add(new_user)
    db.session.commit()

    return jsonify({"message": "User registered successfully"}), 201

def logout_user():
    response = make_response(jsonify({"message": "Logout successful"}), 200)
    response.set_cookie('token', '', httponly=True, secure=True, samesite='Strict', expires=0)
    return response