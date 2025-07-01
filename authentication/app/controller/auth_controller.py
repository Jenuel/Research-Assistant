from ..models.user import User
from ..db import db
from ..schemas.user_schema import UserLoginSchema, UserRegistrationSchema
from flask import request, jsonify
from pydantic import ValidationError

def authenticate_user():
    try:
        data = UserLoginSchema(**request.get_json())
    except ValidationError as e:
        return jsonify({"message": "Invalid input", "errors": e.errors()}), 400
    
    user = User.query.filter_by(email=data.email).first()

    if not user or not user.check_password(data.password):   
        return jsonify({"message": "Invalid email or password"}), 401
    
    token = user.generate_token()

    response = jsonify({"message": "Login successful"})

    response.set_cookie('auth_token', token, httponly=True, secure=True, samesite='Strict')

    return response, 200


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
