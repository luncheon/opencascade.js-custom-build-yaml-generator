# opencascade.js-custom-build-yaml-generator

- opencascade.js / Workflow when building Apps  
  https://github.com/donalffons/opencascade.js/blob/master/doc/README.md

```bash
$ npx luncheon/opencascade.js-custom-build-yaml-generator -n custom-opencascade.js -o custom-opencascade.yaml IFSelect_ReturnStatus STEPControl_Reader StepVisual_ColourRgb

$ docker pull donalffons/opencascade.js

$ docker run --rm -v $(pwd):/src donalffons/opencascade.js custom-opencascade.yaml
```
