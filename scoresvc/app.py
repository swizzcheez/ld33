import flask, click
import rethinkdb as r
from flask_rethinkdb import RethinkDB
from flask.cli import FlaskGroup
import os, sys, re
import api

portRE = re.compile(':(\d+)->8675/tcp')

def configure(cfg):
    app = flask.Flask(__name__)
    app.debug = bool(os.environ.get('DEBUG'))
    app.config.setdefault('RETHINKDB_HOST',
                          os.environ.get('RETHINKDB_HOST', 'gamedb'))
    rdb = app.rdb = RethinkDB(app)
    app.db = r.db('ld33')
    app.games_tbl = app.db.table('games')

    app.gamelistapi = api.configure(app, cfg)

    @app.cli.command()
    def init_db():
        'Set up the database'
        if 'ld33' not in r.db_list().run(rdb.conn):
            r.db_create('ld33').run(rdb.conn)
        if 'games' not in app.db.table_list().run(rdb.conn):
            app.db.table_create('games',
                                primary_key='container_id').run(rdb.conn)

    @app.cli.command()
    @click.argument('hostname')
    def update_containers(hostname):
        conn = rdb.conn
        for line in sys.stdin:
            parts = line.split()
            current = app.games_tbl.get(parts[0]).run(conn)
            if current is not None:
                for part in parts:
                    m = portRE.search(part)
                    if m is not None:
                        app.games_tbl.update({
                            'container_id': parts[0],
                            'port': m.group(1),
                        }).run(conn)

    return app

@click.group(cls=FlaskGroup, create_app=configure)
def cli(**params):
    'This is the management app for LD33'

if __name__ == '__main__':
    cli()

