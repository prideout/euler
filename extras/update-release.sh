# cp ~/github/filament/out/cmake-webgl-release/web/filament-js/filament.js filament/
# cp ~/github/filament/out/cmake-webgl-release/web/filament-js/filament.d.ts filament/
# cp ~/github/filament/out/cmake-webgl-release/web/filament-js/filament.wasm docs

~/github/filament/out/cmake-release/tools/matc/matc \
    -o docs/materials/step1.filamat \
    materials/step1.mat

~/github/filament/out/cmake-release/tools/matc/matc \
    -o docs/materials/step2.filamat \
    materials/step2.mat

~/github/filament/out/cmake-release/tools/matc/matc \
    -o docs/materials/step1_cylinder_back.filamat \
    materials/step1_cylinder_back.mat

~/github/filament/out/cmake-release/tools/matc/matc \
    -o docs/materials/step1_cylinder_front.filamat \
    materials/step1_cylinder_front.mat
