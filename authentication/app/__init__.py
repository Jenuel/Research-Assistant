from flask import Flask, jsonify
from dotenv import load_dotenv
import os
from .db import db
from .routes.auth_routes import auth_bp
from sqlalchemy import text
from sqlalchemy.exc import OperationalError

def create_app():
    """
    Create a Flask application instance.
    """
    load_dotenv()

    app = Flask(__name__, instance_relative_config=True)

    app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL')
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

    db.init_app(app)

    @app.route('/')
    def index():
        try:
            db.session.execute(text('SELECT 1'))
            db_status = "connected"
        except OperationalError:
            db_status = "not connected"

        return jsonify({
            "message": "Welcome to the Flask App!",
            "database": db_status
        })

    # Register blueprints
    app.register_blueprint(auth_bp, url_prefix='/auth')

    return app