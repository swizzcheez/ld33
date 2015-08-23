from flask_restful import Api, Resource, fields, marshal_with, reqparse
import rethinkdb as r
import flask
import time

def configure(app, cfg):
    api = Api(app)

    api.add_resource(GameListResource, '/')

    return api

##############################################################################

game_fields = dict(
    id = fields.String(attribute='container_id'),
    updated = fields.DateTime(dt_format='iso8601'),
    name = fields.String(),
    players = fields.List(fields.String()),
    join_url = fields.URL('join_game', absoute=True),
)

gamelist_fields = dict(
    games = fields.List(fields.Nested(game_fields)),
)

##############################################################################

class GameListResource(Resource):

    create_parser = reqparse.RequestParser()
    create_parser.add_argument('name')
    create_parser.add_argument('players',
                               type=int,
                               choices=[2, 3, 4],
                               help='Players must be an int betweeen 2 and 4')

    @marshal_with(gamelist_fields)
    def get(self, app=flask.current_app):
        conn = app.rdb.conn
        return dict(games=list(
            app.games_tbl.filter(r.row['updated'] > r.now().sub(300)
                                 ).order_by(r.desc('updated')).run(conn)
        ))

    @marshal_with(game_fields)
    def post(self, app=flask.current_app):
        conn = app.rdb.conn
        args = self.create_parser.parse_args()
        game = dict(
            name = args.name,
            updated = r.epoch_time(time.time()),
            players = [None]*args.players
        )
        result = app.games_tbl.insert(game).run(conn)
        game['container_id'] = result['generated_keys'][0]
        return app.games_tbl.get(result['generated_keys'][0]).run(conn)

##############################################################################

class GameRegistrarResource(Resource):
    pass

