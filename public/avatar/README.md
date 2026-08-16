# Local 3D Avatar Assets

## VRoid interviewer (bundled for demo)

The demo ships with **VRoid Studio sample `AvatarSample_B`** saved as:

```text
oia-vroid-interviewer.vrm
```

After refresh, C4 automatically uses the **3D VRoid renderer** with **TTS viseme lip-sync**
(`aa` / `ee` / `oh` / `ih` mouth shapes driven from speech timing).

### Re-download (if missing)

```bash
npm run avatar:fetch
```

Source: [madjin/vrm-samples](https://github.com/madjin/vrm-samples) → `vroid/stable/AvatarSample_B.vrm`  
License: [VRoid Studio sample model terms](https://vroid.pixiv.help/hc/en-us/articles/4402394424089) (free for alteration/distribution with attribution).

Replace this file with your own OIA-branded VRoid export when ready — keep the same filename or update `AvatarPanel.tsx`.

## MakeHuman / Blender candidate

When a second asset is ready:

```text
oia-makehuman-interviewer.vrm
```

Before use, verify Humanoid rig and mouth presets (`aa`, `ih`, `ou`, `ee`, `oh`).
