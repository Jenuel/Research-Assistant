from flask import Blueprint
from ..controller.auth_controller import authenticate_user, verify_user, register_user

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/login', methods=['POST'])
def login():
    return authenticate_user()

@auth_bp.route('/verify', methods=['POST'])
def verfiy():
    return verify_user()

@auth_bp.route('/register', methods=['POST'])
def register():
    return register_user()