cp ~/github/filament/out/cmake-webgl-debug/web/filament-js/filament.js filament/
cp ~/github/filament/out/cmake-webgl-debug/web/filament-js/filament.d.ts filament/
cp ~/github/filament/out/cmake-webgl-debug/web/filament-js/filament.wasm docs

~/github/filament/out/cmake-release/tools/matc/matc -o docs/materials/pbr.filamat src/pbr.mat
