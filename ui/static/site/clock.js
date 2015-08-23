
angular.module('GameClock', [])

//////////////////////////////////////////////////////////////////////////////
// Master Clock
//////////////////////////////////////////////////////////////////////////////

.factory('GameClock',
['$q', '$interval',
function($q, $interval)
{
    return function(default_tps)
    {
        var q = $q.defer()
        var cleanup_q = $q.defer()
        var now = 0
        var base = 0
        var until = null
        var nextwatch = null
        var watchstack = []
        var runner = null
        var running_tps = null
        var skew = 1

        var clock = $q.defer()
        var promise = clock.promise = q.promise
        clock.skew = skew
        clock.cleanup = cleanup_q.promise

        default_tps = default_tps || 100

        clock.reset =
        function()
        {
            clock.stop()
            until = (until == null ? null : until - now)
            angular.forEach(watchstack,
            function(watcher)
            {
                watcher[0] -= now
            })
            now = clock.now = base = 0
            return this
        }

        clock.start =
        function(tps)
        {
            if (tps == null)
            {
                tps = running_tps || default_tps
            }

            if (runner == null || running_tps != tps)
            {
                clock.stop()

                started = clock.started = Date.now()

                runner = $interval(
                function()
                {
                    now = clock.now = (Date.now() - started) * skew + base
                    q.notify(now)
                    while (until != null && now >= until)
                    {
                        var next = watchstack.pop() || [null, null]
                        nextwatch.resolve(now)
                        until = next[0]
                        nextwatch = next[1]
                    }
                    cleanup_q.notify(now)
                }, 1000 / tps)
            }

            return clock
        }

        clock.watch =
        function(fn, obj)
        {
            if (obj == null)
            {
                return promise.then(null, null, fn)
            }
            else if (typeof(fn) === 'function')
            {
                return promise.then(null, null, function() { fn.apply(obj) })
            }
            else if (typeof(fn) === 'string')
            {
                return promise.then(null, null, 
                                    function() { obj[fn].apply(obj) })
            }
            else
            {
                throw "Cannot watch with " + fn + " and " + obj
            }
        }

        clock.stop =
        function()
        {
            if (runner != null)
            {
                $interval.cancel(runner)
                started = clock.started = null
                base = now
            }
            return clock
        }

        clock.at =
        function(at, fn)
        {
            var q = $q.defer()

            if (until === null || at < until)
            {
                if (until !== null)
                {
                    watchstack.push([until, nextwatch])
                }
                until = at
                nextwatch = q
            }
            else if (watchstack.length == 0)
            {
                watchstack.push([at, q])
            }
            else
            {
                if (at > watchstack[0][0])
                {
                    watchstack.unshift([at, q])
                }
                else if (at < watchstack[watchstack.length - 1][0])
                {
                    watchstack.push([at, q])
                }
                else
                {
                    watchstack.push([at, q])
                    watchstack.sort(function(a, b) { return b[0] - a[0] })
                }
            }

            if (typeof fn === 'array')
            {
                angular.forEach(fn,
                function(fn)
                {
                    q.promise.then(fn)
                })
            }
            else if (typeof fn === 'function')
            {
                q.promise.then(fn)
            }

            return q.promise
        }

        clock.in =
        function(ms, fn)
        {
            return clock.at(now + ms, fn)
        }

        clock.stop_at =
        function(until, fn)
        {
            return clock.at(until).then(function () { clock.stop() }, fn)
        }

        clock.stop_in =
        function(dt, fn)
        {
            return clock.in(dt).then(function () { clock.stop() }, fn)
        }

        clock.run_until = 
        function(until, fn)
        {
            var promise = clock.stop_at(until, fn)
            clock.start()
            return promise
        }

        clock.run_for = 
        function(dt, fn)
        {
            var promise = clock.stop_in(dt, fn)
            clock.start()
            return promise
        }

        clock.get_skew = 
        function()
        {
            return skew
        }

        clock.set_skew = 
        function(ratio)
        {
            if (started != null)
            {
                base = now
                started = clock.started = Date.now()
            }
            skew = clock.skew = ratio
        }

        clock.accelerate =
        function(ratio)
        {
            clock.set_skew(skew * ratio)
        }

        clock.on_cleanup =
        function(fn)
        {
            return cleanup_q.promise.then(null, null, fn)
        }

        return clock
    }
}])

//////////////////////////////////////////////////////////////////////////////

.service('GameClockSvc',
['GameClock',
function(GameClock)
{
    return new GameClock().start()
}])

//////////////////////////////////////////////////////////////////////////////

; // END OF MODULE
