# 背面跑酷动作生成提示词

工具：内置 `image_gen`。参考图只用于保持角色身份；每个动作阶段单独生成透明 PNG，再逐张微调四肢比例。

## 单帧生成模板

```text
Use case: stylized-concept. Asset type: one production animation frame for an Android endless-runner. Use the attached LuLu image only as the character identity reference. Create this same golden-yellow, round hippo-like mascot in orange shorts strictly FROM BEHIND, running away from the camera. Preserve the large bulbous head, two small round ears, single orange-yellow crown tuft, chubby torso, polished soft 3D toy rendering and warm colors. No face, eyes, mouth, front chest, tail, shoes, extra clothing or props. Fixed rear chase camera, slightly elevated, consistent character scale and centered composition. [ACTION PHASE]. Square transparent PNG, one complete full-body character, generous transparent margins, no background, ground, shadow, text, grid, residue or speckles.
```

`[ACTION PHASE]` 分别指定 8 个左右腿交替的奔跑阶段、4 个跳跃阶段和 4 个低姿滑行阶段；所有阶段都明确要求背对镜头。

## 四肢比例微调

```text
Use case: precise-object-edit. Asset type: one production animation frame for an Android endless-runner. Image 1 is the edit target. Image 2 is the approved compact-limb proportion reference. Preserve Image 1's exact rear-facing animation phase, camera, head, ears, tuft, torso, orange shorts, colors, lighting, position and transparent framing. Change only all four limbs to match Image 2: modestly shorter and noticeably thicker, short plump rounded arms, short sturdy rounded legs and compact feet. Reduce visible limb length about 18 percent and increase thickness about 20 percent while preserving the exact motion pose. Keep strictly rear-facing. Do not change head size, body width, shorts, identity, camera or action phase. Output clean transparent square PNG. No background, shadow, floor, text, props, residue, speckles, splashes, dust, halo, black fill or checkerboard.
```

跳跃和滑行帧沿用同一微调要求，并额外强调保留各自的腾空、落地、下蹲和低姿阶段。
