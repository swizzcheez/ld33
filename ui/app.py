import flask, click
from flask.cli import FlaskGroup
import os, uuid

def configure(cfg):
    app = flask.Flask(__name__)
    app.debug = bool(os.environ.get('DEBUG'))
    app.secret_key = os.environ.get('SECRET_KEY')

    @app.before_request
    def set_session():
        if 'id' not in flask.session:
            flask.session['id'] = uuid.uuid4()

    @app.route('/')
    def ui_root():
        return flask.render_template('ui/index.html')

    @app.route('/api/score/')
    def scoresvc(subpath=''):
        return "scoresvc API is elsewhere..."

    return app

@click.group(cls=FlaskGroup, create_app=configure)
def cli(**params):
    'This is the management app for LD33'

if __name__ == '__main__':
    cli()

