


CC=emcc
#CFLAGS=-O1
CFLAGS=-O2 --closure 1 --llvm-opts "['-O2', '-disable-slp-vectorization', '-disable-loop-vectorization', '-disable-loop-unrolling']" --js-transform ./jswrap.sh


EXPORTS="['_ellipsoid_init','_params_init','_xy2fila_ellips','_fila_ellips2xy','_xy2fila_ellips_loop','_fila_ellips2xy_loop','_xyz2fila_ellips','_fila_ellips2xyz','_xyz2xyz_helmert','_gkxy2fila_wgs','_fila_wgs2gkxy','_gkxy2tmxy','_tmxy2gkxy','_gkxy2tmxy_aft','_tmxy2gkxy_aft','_tmxy2fila_wgs','_fila_wgs2tmxy']"


all:    build/geo_build.js

build/geo_build.js: ../GeoCoordinateConverter/geo.c ../GeoCoordinateConverter/util.c
	$(CC) $(CFLAGS) -o $@ $^ -s EXPORTED_FUNCTIONS=$(EXPORTS)

dist-clean: clean
	rm -f build/geo_build.js

clean:
	rm -f *~ *.bak *.log */*~ */*.bak node_modules
