from flask import Blueprint
from app.controller.auth_controller import authenticate_user, register_user

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/login', methods=['POST'])
def login():
    return authenticate_user()

@auth_bp.route('/register', methods=['POST'])
def register():
    return register_user()