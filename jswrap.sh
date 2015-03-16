#!/bin/sh
awk 'BEGIN{print "window.geo = (function(){"} {print} END {print "return Module;})();"}' $1 > t.t
mv t.t $1