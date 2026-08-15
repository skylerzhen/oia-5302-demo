# Local 3D Avatar Assets

## VRoid candidate

Place the exported VRM 1.0 file here with this exact name:

```text
oia-vroid-interviewer.vrm
```

After refreshing the app, the interview panel automatically uses the local 3D
VRM renderer. If the file is absent, it safely uses the 2D phoneme-to-viseme
fallback.

## MakeHuman / Blender candidate

When the second asset is ready, place it here:

```text
oia-makehuman-interviewer.vrm
```

Keep both assets local; do not load them from a CDN or a model-hosting URL.
Before use, verify that the exported VRM contains a Humanoid rig and mouth
expression presets (`aa`, `ih`, `ou`, `ee`, `oh`) or document the available
equivalent shape keys.
