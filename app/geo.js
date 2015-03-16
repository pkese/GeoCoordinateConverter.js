
var Promise = require('es6-promise').Promise;
var promisescript = require('promisescript');
var merge = require('object-assign');

var geopromise = new Promise((resolve, reject) => {
  console.log('loading geo');
  promisescript({
    url: './build/geo_build.js',
    type: 'script',
    exposed: 'Module',
  }).then(() => initialize(resolve));
});

var api = {
  loaded: false,
  onLoad: callback => geopromise.then(callback),
}
// define formats
let fmt = {
  geogra: {
    format:'gra',
    items: 'fi la h Ng'.split(' ')
  },
  geocen:{
    format:'cen',
    items: 'X Y Z'.split(' ')
  },
  geoutm:{
    format:'utm',
    items: 'x y H Ng'.split(' ')
  }
};
api.formats = {
/*
  xy:merge({name:'xy'}, fmt.geoutm),
  xyz:merge({name:'xyz'}, fmt.geocen),
  fila_ellips:merge({name:'filla_ellips'}, fmt.geogra),
*/
  gkxy:merge({name:'D48/GK', source:true}, fmt.geoutm),
  gkxy_aft:merge({name:'D48/GK aft', source:false}, fmt.geoutm),
  tmxy:merge({name:'D96/TM', source:true}, fmt.geoutm),
  tmxy_aft:merge({name:'D96/TM aft', source:false}, fmt.geoutm),
  fila_wgs:merge({name:'WGS84', source:true}, fmt.geogra),
};

module.exports = api;

var initialize = (resolve) => {
    console.log('geo loaded');
    var geo = window.Module;

    var geo_wrap = function(func_name, veclen_in, veclen_out, intargs) {
        var inbytes = Float64Array.BYTES_PER_ELEMENT*veclen_in;
        var inptr = geo._malloc(inbytes);
        //console.log('inptr', inptr);
        var inheap = new Uint8Array(geo.HEAPU8.buffer, inptr, inbytes);
        var invec = new Float64Array(geo.HEAPU8.buffer, inptr, inbytes/8);

        var outbytes = Float64Array.BYTES_PER_ELEMENT * veclen_out;
        var outptr = geo._malloc(outbytes);
        //console.log('outptr', outptr);
        var outheap = new Uint8Array(geo.HEAPU8.buffer, outptr, outbytes);
        var outvec = new Float64Array(veclen_out);
        var outvecbuf = new Uint8Array(outvec.buffer, 0, outbytes);
        
        // figure out arguments;
        var arglist = ['number', 'number'];
        if (intargs) arglist.push('number');
        var fn = geo.cwrap(func_name, null, arglist);
            
        return function(inarr, optarg) {

            var _invec = new Float64Array(inarr);
            var invecbuf = new Uint8Array(_invec.buffer);
            //console.log('_invec', _invec);
            //console.log('_invecbuf', invecbuf);
            
            inheap.set(invecbuf);
            //geo.HEAPU8.set(invecbuf,inptr);
            //console.log('invec',invec);
            //console.log('inheap',inheap[0]);
           
            //console.log('out',outvec);
            
            //console.log('------------------------------------------------------')
            if (intargs) fn(inptr, outptr, optarg);
            else fn(inptr, outptr);
            //console.log('------------------------------------------------------')
            
            //console.log(outheap);
            
            // copy result from emscripten heap to output vector buffer, so it appears in outvec
            outvecbuf.set(outheap);
            
            //console.log('out',outvec);
            
            var result = Array.prototype.slice.call(outvec);
            //console.log(outvec);
            result.length === 4;
            result.constructor === Array;
            return result
        };
    };

    // fill in the API
    var wrap = function(func_name, veclen_in, veclen_out, intargs) {
      api[func_name] = geo_wrap(func_name, veclen_in, veclen_out, intargs);
    }
    var GEOUTM = 4, GEOGRA = 4, GEOCEN = 3; // argument lengths
    wrap('xy2fila_ellips', GEOUTM, GEOGRA, 1);
    wrap('fila_ellips2xy', GEOGRA, GEOUTM, 1);
    wrap('xy2fila_ellips_loop', GEOUTM, GEOGRA, 1);
    wrap('fila_ellips2xy_loop', GEOGRA, GEOUTM, 1);
    wrap('xyz2fila_ellips', GEOCEN, GEOGRA, 1);
    wrap('fila_ellips2xyz', GEOGRA, GEOCEN, 1);
    //wrap('xyz2xyz_helmert', GEOCEN, GEOCEN, HELMERT7 h7);
    wrap('gkxy2fila_wgs', GEOUTM, GEOGRA);
    wrap('fila_wgs2gkxy', GEOGRA, GEOUTM);
    wrap('gkxy2tmxy', GEOUTM, GEOUTM);
    wrap('tmxy2gkxy', GEOUTM, GEOUTM);
    wrap('gkxy2tmxy_aft', GEOUTM, GEOUTM);
    wrap('tmxy2gkxy_aft', GEOUTM, GEOUTM);
    wrap('tmxy2fila_wgs', GEOUTM, GEOGRA);
    wrap('fila_wgs2tmxy', GEOGRA, GEOUTM);
    api.identity = function(x) {return x};

    api.convert = {
    /*
      xy:{
        fila_ellips: api.xy2fila_ellips_loop,
      },
      xyz:{
        fila_ellips: api.xyz2fila_ellips,
      },
      fila_ellips:{
        xy: api.fila_ellips2xy_loop,
        xyz: api.fila_ellips2xyz,
      },
    */
      fila_wgs:{
        gkxy: api.fila_wgs2gkxy,
        tmxy: api.fila_wgs2tmxy,
      },
      gkxy:{
        fila_wgs: api.gkxy2fila_wgs,
        tmxy: api.gkxy2tmxy,
        tmxy_aft: api.gkxy2tmxy_aft,
      },
      tmxy:{
        gkxy: api.tmxy2gkxy,
        gkxy_aft: api.tmxy2gkxy_aft,
        fila_wgs: api.tmxy2fila_wgs,
      }, 
      tmxy_aft:{
      },
      gkxy_aft:{
      }
    }
    
    var ellipsoid_init = geo.cwrap('ellipsoid_init', null, null);
    var params_init = geo.cwrap('params_init', null, null);
    params_init();
    ellipsoid_init();
    
    //var xy2fila_ellips = wrap('xy2fila_ellips', 4, 4, 1);
    //var xy2fila_ellips_loop = wrapper('xy2fila_ellips_loop', 4, 4, 1);
    //var gkxy2fila_wgs = wrapper('gkxy2fila_wgs', 4, 4, 0);
    console.log('geo initialized');
    api.loaded = true;
    resolve();
};


var d48ref = [154885.259, 523494.788, -47.474, 0.0];
//var d48ref = [1000000000,100000000,-50,0];
var d96ref = [155370.642, 523125.803, -47.474, 0.0]
//console.log('ref', d96ref);
//var d48ref = [0, -47.474, 523494.788, 154885.259];
//console.log(geo.xy2fila_ellips(d48ref, 0));
//console.log(xy2fila_ellips_loop(d48ref, 0));
//console.log(gkxy2fila_wgs(d48ref));
/*
  printf(T("---------- Conversion D48/GK --> BESSEL (loop)\n"));
  printf(T("<-- x: %.3f, y: %.3f, H: %.3f\n"), d48ref.x, d48ref.y, d48ref.H);
  xy2fila_ellips_loop(d48ref, &fl, 0);
  if (hsel == 1) fl.h = fl.h - fl.Ng;
  deg2dms(fl.fi, &lat); deg2dms(fl.la, &lon);
  printf(T("--> fi: %.10f,   la: %.10f,  h: %.3f (no geoid)\n"), fl.fi, fl.la, fl.h);
  printf(T("   lat: %2.0f %2.0f %8.5f, lon: %2.0f %2.0f %8.5f, h: %.3f (no geoid)\n"),
         lat.deg, lat.min, lat.sec, lon.deg, lon.min, lon.sec, fl.h);

  printf(T("---------- result --> D48/GK (loop, inverse)\n"));
  printf(T("<-- fi: %.10f, la: %.10f, h: %.3f (no geoid)\n"), fl.fi, fl.la, fl.h);
  fila_ellips2xy_loop(fl, &xy, 0);
  if (hsel == 1) xy.H = xy.H + xy.Ng;
  printf(T("--> x: %.3f, y: %.3f, H: %.3f (no geoid)\n"), xy.x, xy.y, xy.H);
*/

