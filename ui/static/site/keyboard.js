
angular.module('Keyboard', [])

//////////////////////////////////////////////////////////////////////////////
// Keyboard Management
//////////////////////////////////////////////////////////////////////////////

.directive('keyhandler',
[function()
{
    return {
        restrict: 'A',
        controller: 'KeyHandlerCtrl',
        bindToController: true,
        link: function($scope, $element, $attrs, ctrl)
        {
            $($element).keydown(
            function(e)
            {
                ctrl.handle(e)
            })
        }
    }
}])

.directive('onKey',
['$compile', 
function($compile)
{
    var keyCodes = 
    {
        Left: 37,
        Up: 38,
        Right: 39,
        Down: 40
    }

    return {
        restrict: 'EA',
        require: '^^keyhandler',
        link: function($scope, $element, $attrs, ctrl)
        {
            var checks = []
            angular.forEach($attrs,
            function(attr, key)
            {
                if (key.substring(0, 3) == 'key')
                {
                    key = key.substr(3)
                    var code = keyCodes[key]
                    if (code != null)
                    {
                        var src = 'e.keyCode == ' + code
                        var check = eval('(function(e) { return ' + src + ' })')
                        checks.push([check, attr])
                    }
                }
            })

            ctrl.keypromise.then(null, null,
            function(e)
            {
                angular.forEach(checks,
                function(check)
                {
                    if (check[0](e))
                    {
                        $scope.$eval(check[1], { e: e })
                    }
                })
            })
        }
    }
}])

.controller('KeyHandlerCtrl',
['$q', function($q)
{
    var q = $q.defer()
    this.keypromise = q.promise
    this.handle = function(e)
    {
        q.notify(e)
    }
}])

//////////////////////////////////////////////////////////////////////////////

; // END OF MODULE
