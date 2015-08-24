
angular.module('LD33', ['ui.router', 'ngResource', 'GameClock', 'Keyboard'])

//////////////////////////////////////////////////////////////////////////////
// Global app configuration
//////////////////////////////////////////////////////////////////////////////

.config(
[ '$stateProvider', '$urlRouterProvider', 'TPL_BASE',
function($stateProvider, $urlRouterProvider, TPL_BASE)
{

    // Starting state
    $urlRouterProvider.otherwise('/game/')

    // States
    $stateProvider

    .state('site',
        {
            templateUrl: TPL_BASE + 'site.html'
        })

    .state('home',
        {
            url: '/',
            parent: 'site',
            templateUrl: TPL_BASE + 'home.html'
        })

    .state('game',
        {
            url: '/game/',
            parent: 'site',
            templateUrl: TPL_BASE + 'game.html'
        })

    ; // END OF STATES

}])

//////////////////////////////////////////////////////////////////////////////

.config(
['$resourceProvider',
function($resourceProvider)
{
    $resourceProvider.defaults.stripTrailingSlashes = false;
}])

//////////////////////////////////////////////////////////////////////////////
// Stage setup
//////////////////////////////////////////////////////////////////////////////

.directive('ld33Game',
[function()
{
    return {
        restrict: 'AE',
        scope: true,
        template: function($element) { return $element.html() },
        bindToController: true,
        controller: 'LD33GameCtrl as game'
    }
}])

.service('GameSvc',
['GameClockSvc', 'ActionClockSvc',
function(GameClockSvc, ActionClockSvc)
{
    this.gameclock = GameClockSvc
    this.actionclock = ActionClockSvc
    this.prestart = true
    this.score = 0

    this.reset = function()
    {
        this.prestart = true
    }

    this.start = function()
    {
        if (this.prestart)
        {
            this.prestart = false
            GameClockSvc.reset().start()
            ActionClockSvc.reset().start()
            this.score = 0
            this.cause_of_death = null
        }
        return this
    }

    this.end = function(reason)
    {
        GameClockSvc.stop()
        ActionClockSvc.stop()
        this.cause_of_death = reason 
        return this
    }
}])

.controller('LD33GameCtrl',
['Serpent', 'Ocean', 'GameSvc', 'BoatLaunchSvc',
function(Serpent, Ocean, GameSvc, BoatLaunchSvc)
{
    // Holds the models used in the game
    this.gameclock = GameSvc.gameclock
    this.actionclock = GameSvc.actionclock
    this.ocean = new Ocean(41, 31)
    this.player = new Serpent(this.ocean)
    var boat_svc = BoatLaunchSvc(this.player, this.ocean)
    this.boats = boat_svc.boats
    this.powerups = 
    this.svc = GameSvc

    this.reset = function()
    {
        GameSvc.reset()
        this.player.reset()
        boat_svc.reset()
    }

    this.reset()
}])

.service('BoatLaunchSvc',
['ActionClockSvc', 'Boat',
function(ActionClockSvc, Boat)
{
    return function(player, ocean)
    {
        var last_boat = 0
        var boats = {}
        var boat_id = 0

        ActionClockSvc.on_cleanup(
        function(now)
        {
            var count = Object.keys(boats).length
            if (Math.random() * (now - last_boat) / 1000 > count)
            {
                var id = boat_id++
                boats[id] = new Boat(id, boats, player, ocean)
                last_boat = now
            }
        })

        return {
            boats: boats,
            reset: function() 
            { 
                last_boat = 0
                angular.forEach(boats,
                function(boat, id)
                {
                    boat.destroy()
                })
            }
        }
    }
}])

.service('ActionClockSvc',
['GameClock',
function(GameClock)
{
    return new GameClock(13)     // actions / second
}])

//////////////////////////////////////////////////////////////////////////////
// Sprite Management
//////////////////////////////////////////////////////////////////////////////

.directive('sprite',
[function()
{
    return {
        restrict: 'A',
        template: 
        function($element)
        {
            return ''
            + '<g ng-if="sprite" class="sprite" ng-attr-transform="'
                + 'translate({{ sprite.view.x }}, {{ sprite.view.y }})'
                + ' rotate({{ sprite.view.r }})'
                + ' scale(0.5, 0.5)"'
            + '>' + $element.html() + '</g>'
        },
        scope:
        {
            sprite: '='
        }
    }
}])

.factory('Sprite',
['ActionClockSvc',
function(ActionClockSvc)
{
    function Sprite(defaults)
    {
        var sprite = this
        angular.extend(sprite, defaults)
        sprite.view = {}
        if (this.watcher == null)
        {
            this.watcehr = ActionClockSvc.watch('tick', this)
        }
    }

    Sprite.prototype =
    {
        tick: function(now)
        {
            if (this.before)
            {
                this.before.call(this, this.view)
            }

            if (this.dx)
            {
                this.x += this.dx
            }

            if (this.sdx)
            {
                this.x += this.sdx
                this.sdx = 0
            }

            if (this.dy)
            {
                this.y += this.dy
            }

            if (this.sdy)
            {
                this.y += this.sdy
                this.sdy = 0
            }

            if (this.dr)
            {
                this.r += this.dr
            }

            if (this.sdr)
            {
                this.r += this.sdr
                this.sdr = 0
            }

            if (this.speed)
            {
                var rad = (this.r - 90) * Math.PI / 180
                this.x += Math.round(Math.cos(rad) * this.speed)
                this.y += Math.round(Math.sin(rad) * this.speed)
            }

            this.view.x = this.x
            this.view.y = this.y
            this.view.r = this.r

            if (this.after)
            {
                this.after.call(this, this.view)
            }
        }
    }

    return Sprite
}])

//////////////////////////////////////////////////////////////////////////////
// Models
//////////////////////////////////////////////////////////////////////////////

.factory('Ocean',
[function()
{
    function Ocean(width, height)
    {
        this.width = width
        this.height = height
        this.nodes = {}
    }

    Ocean.prototype = 
    {
        get: function(x, y, z)
        {
            return this.nodes[x + ':' + y + ':' + z]
        },

        indexOf: function(x, y, z)
        {
        }
    }

    return Ocean
}])

//////////////////////////////////////////////////////////////////////////////

.factory('Serpent',
['GameSvc', 'Sprite', 
function(GameSvc, Sprite)
{
    function Serpent(ocean)
    {
        var serpent = this

        serpent.ocean = ocean

        GameSvc.actionclock.on_cleanup(
        function(now)
        {
            // Make sure we're not out of bounds.
            if (serpent.head.x < 0 || serpent.head.y < 0 
                || serpent.head.x >= serpent.ocean.width
                || serpent.head.y >= serpent.ocean.height)
            {
                GameSvc.end("Stay inside the loch!")
            }

            // Did we eat our own tail?
            var collided = false
            angular.forEach(serpent.segments,
            function(segment)
            {
                if (segment.view.x == serpent.head.x
                    && segment.view.y == serpent.head.y
                    && segment.view.depth == serpent.head.depth)
                {
                    GameSvc.end('Boats taste better than your tail!')
                }
            })

            if (serpent.hunger < 100)
            {
                serpent.hunger += serpent.tail_length / 50
                if (serpent.health < serpent.max_health)
                {
                    serpent.health += 0.1
                }
            }
            else
            {
                serpent.health -= 0.1
                if (serpent.health <= 0)
                {
                    GameSvc.end('Died from hunger')
                }
            }

            if (serpent.head.depth > 0)
            {
                serpent.air = 
                    Math.max(0, serpent.air - serpent.head.depth / 3.0)
                if (serpent.air < 25)
                {
                    serpent.health -= 0.5
                }
                if (serpent.health < 0)
                {
                    GameSvc.end('Died of asphyxiation!')
                }
            }
            else
            {
                serpent.air = Math.min(100, serpent.air + 1)
            }

            GameSvc.score += parseInt(Math.log10(serpent.tail_length)) + 1
        })

        this.head = new Sprite(
        {
            x: parseInt(this.ocean.width / 2),
            y: parseInt(this.ocean.height / 2),
            r: 0,
            speed: 1,
            include: 'serpent-head',
            depth: 0,
            before: function(view)
            {
                view.depth = this.depth
                if (serpent.segments.length >= serpent.tail_length)
                {
                    serpent.segments.splice(0, 1)
                }

                serpent.segments.push({
                    view:
                    {
                        x: serpent.head.x,
                        y: serpent.head.y,
                        r: 0,
                        depth: serpent.head.depth
                    }
                })
            }
        })

        serpent.reset()
    }

    Serpent.prototype = 
    {
        reset: function()
        {
            var serpent = this
            this.segments = []
            this.tail_length = 5
            this.head.x = parseInt(this.ocean.width / 2)
            this.head.y = parseInt(this.ocean.width / 2)
            this.head.depth = 0
            this.health = 20
            this.max_health = 20
            this.hunger = 0
            this.air = 100
        },

        turnLeft: function()
        {
            this.head.sdr = -90
        },

        turnRight: function()
        {
            this.head.sdr = 90
        },

        turnNorth: function()
        {
            if (this.head.r != 180)
            {
                this.head.r = 0
            }
        },

        turnEast: function()
        {
            if (this.head.r != 270)
            {
                this.head.r = 90
            }
        },

        turnSouth: function()
        {
            if (this.head.r != 0)
            {
                this.head.r = 180
            }
        },

        turnWest: function()
        {
            if (this.head.r != 90)
            {
                this.head.r = 270
            }
        },

        dive: function()
        {
            if (this.head.depth < 2)
            {
                this.head.depth++
            }
        },

        surface: function()
        {
            if (this.head.depth > 0)
            {
                this.head.depth--
            }
        },

        healthPercent: function()
        {
            return 100 * this.health / this.max_health
        },

        hungerPercent: function()
        {
            return 100 * this.hunger / this.tail_length
        }
    }

    return Serpent
}])

//////////////////////////////////////////////////////////////////////////////

.factory('Boat',
['Sprite', 'GameSvc',
function(Sprite, GameSvc)
{
    var timers = window.timers = {}

    function Boat(id, boats, player, ocean)
    {
        var boat = this

        // Pick moving horizontal or vertical
        if (Math.random() > 0.5)
        {
            var x = parseInt(Math.random() * ocean.width)
            var y = Math.random() < 0.5 ? 0 : ocean.height - 1
            var dx = 0
            var dy = y ? -1 : 1
            var r = dy > 0 ? 180 : 0
        }
        else
        {
            var x = Math.random() < 0.5 ? 0 : ocean.width - 1
            var y = parseInt(Math.random() * ocean.height)
            var dx = x ? -1 : 1
            var dy = 0
            var r = dx > 0 ? 90 : 270
        }

        var drand = Math.random()
        var depth = drand < .1 ? 2 : drand < .4 ? 1 : 0

        this.sprite = new Sprite({
            x: x,
            y: y,
            depth: depth,
            dx: dx,
            dy: dy,
            r: r,
            before: function(view)
            {
                view.depth = this.depth
            }
        })

        GameSvc.actionclock.on_cleanup(
        function(view)
        {
            if (boat.destroyed)
            {
                return;
            }

            timers[id] = 1 + (timers[id] || 0)
            var head = player.head
            var bs = boat.sprite
            if (player.head.depth == boat.sprite.depth
                && ((bs.x - bs.dx == head.x && bs.y - bs.dy == head.y)
                    || (bs.x == head.x && bs.y == head.y)))
            {
                boat.destroy()
                player.hunger = 0
                player.tail_length = parseInt(player.tail_length * 1.25)
                player.max_health += 3
                GameSvc.score += 1000 * Math.pow(boat.sprite.depth + 1, 2)
            }

            if (! boat.destroyed)
            {
                angular.forEach(player.segments,
                function(segment)
                {
                    if (segment.view.depth == boat.sprite.depth 
                        && segment.view.x == bs.x
                        && segment.view.y == bs.y)
                    {
                        // Destroyed, but damages the player
                        player.health -= 5 * boat.sprite.depth
                        boat.destroy()
                    }
                })
            }

            if (bs.x < 0 || bs.x >= ocean.width
                || bs.y < 0 || bs.y >= ocean.height)
            {
                boat.destroy()
            }
        })

        this.boats = boats
        this.id = id
    }

    Boat.prototype =
    {
        destroy: function()
        {
            this.destroyed = true
            this.sprite.destroyed = true
            if (this.boats != null)
            {
                delete this.boats[this.id]
                this.boats = null
            }
        }
    }

    return Boat
}])


//////////////////////////////////////////////////////////////////////////////

; // END OF MODULE

