# 背面跑酷动作生成提示词

2026-10-05 使用内置 `image_gen` 逐帧生成，并保留输出原始透明通道。图片请求中的 512 像素是目标用途；实际输出均为 1254 × 1254，游戏加载后建立 512 × 512 绘制缓存。

首帧使用主页 `pet/lulu_idle_0001.png` 作为身份参考，以及 [SOURCE.md](SOURCE.md) 所列新浪公开背影缩略图作为轮廓参考。其余帧默认使用新生成的 `lulu_run_01.png` 保持角色一致；滑行第 3、4 帧分别改用第 2、1 帧作为姿态参考。

## lulu_run_01.png

```text
Use case: stylized-concept. Asset type: ONE transparent production sprite for LuLuRun, an Android rear-view runner. Reference image 1 is the existing LuLu FRONT character identity. Reference image 2 is a publicly accessible REAR silhouette reference. Draw a new much more appealing polished 3D toy-style LuLu from strictly behind, running away. Preserve golden butter-yellow skin, tiny rounded ears, a small orange crown tuft, orange shorts. Improve proportions: compact pear-shaped chubby body, broad gently squared capybara head blending naturally into shoulders, short soft arms close to the body, very short thick legs, tiny rounded feet. Avoid a separate huge spherical bobble-head, neck seam or exaggerated buttocks. Warm matte clay shading, subtle rim light, clean professional mobile-game icon quality. No face visible, no eyes or muzzle visible, no tail, no props. Orthographic rear chase view slightly above shoulders, NO side turn. One whole character centered in a square 512x512 transparent canvas, body occupies x=110..402 y=70..442, generous empty margin. RUN PHASE 1 left foot in contact extended slightly backward toward viewer, right knee bent forward and right heel lifted, right arm swings backward and left arm forward, restrained lively pose. Keep head level, small forward lean. Real alpha background, no floor, shadow, text, checkerboard, particles or extra characters. Output exactly one image.
```

## lulu_run_02.png

```text
Use case: precise-object-edit. Asset: one transparent LuLuRun animation frame. Use Image 1 as the EXACT character model, proportions, palette, lighting, material, framing, scale, centered head and camera reference. Retain the same rounded butter-yellow LuLu, orange tuft and shorts, very short chunky limbs, strictly rear-facing, no face. Change ONLY the articulated running phase: LEFT SUPPORT COMPRESSION: left foot underneath hips supports weight, right short leg folded with heel lifted behind; tiny bend in knees, torso lowered only slightly. Arms reversing swing. Maintain same full-body scale and centered head position; do not zoom, reshape or rotate the torso toward the camera. One character, one square transparent RGBA PNG, no text, floor, shadow, particles or other objects. Clean alpha.
```

## lulu_run_03.png

```text
Use case: precise-object-edit. Asset: one transparent LuLuRun animation frame. Use Image 1 as the EXACT character model, proportions, palette, lighting, material, framing, scale, centered head and camera reference. Retain the same rounded butter-yellow LuLu, orange tuft and shorts, very short chunky limbs, strictly rear-facing, no face. Change ONLY the articulated running phase: LEFT TOE-OFF / PASSING: left heel lifting, right knee passes under body toward next contact, feet close together, arms close to sides. Maintain same full-body scale and centered head position; do not zoom, reshape or rotate the torso toward the camera. One character, one square transparent RGBA PNG, no text, floor, shadow, particles or other objects. Clean alpha.
```

## lulu_run_04.png

```text
Use case: precise-object-edit. Asset: one transparent LuLuRun animation frame. Use Image 1 as the EXACT character model, proportions, palette, lighting, material, framing, scale, centered head and camera reference. Retain the same rounded butter-yellow LuLu, orange tuft and shorts, very short chunky limbs, strictly rear-facing, no face. Change ONLY the articulated running phase: FIRST FLIGHT: right leg reaches for next contact, left leg folds, both compact feet briefly airborne. Right arm forward, left arm backward. Keep head/body scale identical. Maintain same full-body scale and centered head position; do not zoom, reshape or rotate the torso toward the camera. One character, one square transparent RGBA PNG, no text, floor, shadow, particles or other objects. Clean alpha.
```

## lulu_run_05.png

```text
Use case: precise-object-edit. Asset: one transparent LuLuRun animation frame. Use Image 1 as the EXACT character model, proportions, palette, lighting, material, framing, scale, centered head and camera reference. Retain the same rounded butter-yellow LuLu, orange tuft and shorts, very short chunky limbs, strictly rear-facing, no face. Change ONLY the articulated running phase: RIGHT CONTACT: right foot extended backward toward viewer, left heel folded up. LEFT arm swings backward visibly, RIGHT arm forward close to body. Maintain same full-body scale and centered head position; do not zoom, reshape or rotate the torso toward the camera. One character, one square transparent RGBA PNG, no text, floor, shadow, particles or other objects. Clean alpha.
```

## lulu_run_06.png

```text
Use case: precise-object-edit. Asset: one transparent LuLuRun animation frame. Use Image 1 as the EXACT character model, proportions, palette, lighting, material, framing, scale, centered head and camera reference. Retain the same rounded butter-yellow LuLu, orange tuft and shorts, very short chunky limbs, strictly rear-facing, no face. Change ONLY the articulated running phase: RIGHT SUPPORT DOWN: right foot under hips bears weight, left knee bends to swing through. LEFT arm backward, RIGHT arm forward. Body slightly compressed naturally, no scaling. Maintain same full-body scale and centered head position; do not zoom, reshape or rotate the torso toward the camera. One character, one square transparent RGBA PNG, no text, floor, shadow, particles or other objects. Clean alpha.
```

## lulu_run_07.png

```text
Use case: precise-object-edit. Asset: one transparent LuLuRun animation frame. Use Image 1 as the EXACT character model, proportions, palette, lighting, material, framing, scale, centered head and camera reference. Retain the same rounded butter-yellow LuLu, orange tuft and shorts, very short chunky limbs, strictly rear-facing, no face. Change ONLY the articulated running phase: RIGHT TOE-OFF / PASSING: right heel lifted, left short leg passes beneath hips, both arms passing beside torso. Maintain same full-body scale and centered head position; do not zoom, reshape or rotate the torso toward the camera. One character, one square transparent RGBA PNG, no text, floor, shadow, particles or other objects. Clean alpha.
```

## lulu_run_08.png

```text
Use case: precise-object-edit. Asset: one transparent LuLuRun animation frame. Use Image 1 as the EXACT character model, proportions, palette, lighting, material, framing, scale, centered head and camera reference. Retain the same rounded butter-yellow LuLu, orange tuft and shorts, very short chunky limbs, strictly rear-facing, no face. Change ONLY the articulated running phase: SECOND FLIGHT: left foot extends toward next contact, right leg folded behind, both feet off ground. LEFT arm forward, RIGHT arm backward. Ready to loop seamlessly to reference. Maintain same full-body scale and centered head position; do not zoom, reshape or rotate the torso toward the camera. One character, one square transparent RGBA PNG, no text, floor, shadow, particles or other objects. Clean alpha.
```

## lulu_jump_01.png

```text
Use case: precise-object-edit. Asset: one transparent LuLuRun animation frame. Use Image 1 as the EXACT character model, proportions, palette, lighting, material, framing, scale, centered head and camera reference. Retain the same rounded butter-yellow LuLu, orange tuft and shorts, very short chunky limbs, strictly rear-facing, no face. Change ONLY the articulated action pose: JUMP TAKEOFF: both feet together push off, knees start extending, short arms swing outward slightly. Back always visible, keep reference head and torso width. Feet near the reference baseline. Maintain same full-body scale and centered head position; do not zoom, reshape or rotate the torso toward the camera. One character, one square transparent RGBA PNG, no text, floor, shadow, particles or other objects. Clean alpha.
```

## lulu_jump_02.png

```text
Use case: precise-object-edit. Asset: one transparent LuLuRun animation frame. Use Image 1 as the EXACT character model, proportions, palette, lighting, material, framing, scale, centered head and camera reference. Retain the same rounded butter-yellow LuLu, orange tuft and shorts, very short chunky limbs, strictly rear-facing, no face. Change ONLY the articulated action pose: JUMP ASCENT: both knees tuck under round hips, both rounded soles visible behind, arms slightly out for balance. Airborne pose; preserve scale; character's vertical screen movement will be handled by game. Maintain same full-body scale and centered head position; do not zoom, reshape or rotate the torso toward the camera. One character, one square transparent RGBA PNG, no text, floor, shadow, particles or other objects. Clean alpha.
```

## lulu_jump_03.png

```text
Use case: precise-object-edit. Asset: one transparent LuLuRun animation frame. Use Image 1 as the EXACT character model, proportions, palette, lighting, material, framing, scale, centered head and camera reference. Retain the same rounded butter-yellow LuLu, orange tuft and shorts, very short chunky limbs, strictly rear-facing, no face. Change ONLY the articulated action pose: JUMP APEX: both tiny feet tucked together beneath orange shorts, arms slightly spread sideways, joyful buoyant pose entirely from behind. Do not face camera. No actual location jump in canvas, only articulated pose. Maintain same full-body scale and centered head position; do not zoom, reshape or rotate the torso toward the camera. One character, one square transparent RGBA PNG, no text, floor, shadow, particles or other objects. Clean alpha.
```

## lulu_jump_04.png

```text
Use case: precise-object-edit. Asset: one transparent LuLuRun animation frame. Use Image 1 as the EXACT character model, proportions, palette, lighting, material, framing, scale, centered head and camera reference. Retain the same rounded butter-yellow LuLu, orange tuft and shorts, very short chunky limbs, strictly rear-facing, no face. Change ONLY the articulated action pose: JUMP LANDING: feet side by side beneath body, knees softly bent, shoulders slightly lowered, arms near sides, ready to run. Preserve physical head/body width, no image squeezing. Maintain same full-body scale and centered head position; do not zoom, reshape or rotate the torso toward the camera. One character, one square transparent RGBA PNG, no text, floor, shadow, particles or other objects. Clean alpha.
```

## lulu_slide_01.png

```text
Use case: precise-object-edit. Asset: one transparent LuLuRun animation frame. Use Image 1 as the EXACT character model, proportions, palette, lighting, material, framing, scale, centered head and camera reference. Retain the same rounded butter-yellow LuLu, orange tuft and shorts, very short chunky limbs, strictly rear-facing, no face. Change ONLY the articulated action pose: SLIDE ENTRY: bend both knees deeply and hinge hips forward, lower head and shoulders to about 75 percent of standing height, compact feet at the original ground baseline. Arms tuck by knees. This is an anatomically posed crouch, do not squeeze/stretch the image. Maintain same full-body scale and centered horizontal position; do not zoom, reshape or rotate the torso toward the camera. One character, one square transparent RGBA PNG, no text, floor, shadow, particles or other objects. Clean alpha.
```

## lulu_slide_02.png

```text
Use case: precise-object-edit. Asset: one transparent LuLuRun animation frame. Use Image 1 as the EXACT character model, proportions, palette, lighting, material, framing, scale, centered head and camera reference. Retain the same rounded butter-yellow LuLu, orange tuft and shorts, very short chunky limbs, strictly rear-facing, no face. Change ONLY the articulated action pose: LOW SLIDE: deeply crouched, nearly sitting on tucked heels, torso tilted forward almost horizontal away from camera; from elevated rear see broad back and rear of head. Head top lowered to about halfway down standing silhouette; short feet stay near original ground baseline. Arms low beside body. Compact foreshortened silhouette, not a compressed upright drawing. Maintain same full-body scale and centered horizontal position; do not zoom, reshape or rotate the torso toward the camera. One character, one square transparent RGBA PNG, no text, floor, shadow, particles or other objects. Clean alpha.
```

## lulu_slide_03.png

```text
Use case: precise-object-edit. One transparent animation frame. Preserve this exact LOW rear-facing slide pose, exact head position and scale, bent hips, tucked legs, colors, tuft, shorts, lighting, framing and transparent background. Change ONLY the hands: move both small hands outward by a tiny amount for balance, keep them low. DO NOT stand up, DO NOT straighten legs, DO NOT raise head, DO NOT turn. One single complete capybara character in same square canvas. No floor, shadow, text or other objects.
```

## lulu_slide_04.png

```text
Use case: precise-object-edit. One transparent animation frame. Preserve this rear-facing crouched LuLu, exact model, head size and location, orange shorts, skin, ears, tuft, framing, lighting, ground baseline and transparency. Change ONLY the arms to begin swinging by his sides and lift shoulders a very small amount to start recovering from crouch. Keep BOTH knees bent and BOTH feet beneath hips at baseline. NOT a running stride, NOT upright. One whole character, square transparent canvas, no floor, shadow or other objects.
```
