# LuLu 背面跑酷动作

本目录包含以 LuLuPet 造型为参考生成的 16 张背面跑酷序列帧。生成工具为内置 `image_gen`，最终图片逐张保存为带透明通道的 PNG，没有裁切、拼图或压扁处理。

- 造型参考：`/workspace/other-projects/LuLuPet/assets/pet/walk/lulu_walk_0001.png`
- 奔跑：`lulu_run_01.png` 至 `lulu_run_08.png`，按顺序循环播放
- 跳跃：`lulu_jump_01.png` 至 `lulu_jump_04.png`，依次为蓄力、起跳、腾空、落地
- 滑行：`lulu_slide_01.png` 至 `lulu_slide_04.png`，依次为下蹲、低姿、保持、起身
- `manifest.json`：记录尺寸、脚底锚点与 SHA-256
- [PROMPT.md](PROMPT.md)：记录生成和四肢比例微调提示词

全部动作保持背对镜头。四肢在初版基础上缩短约 18%，加粗约 20%，使手臂、腿和脚更短、更圆润；头部、躯干、橙色短裤、机位和动作阶段保持不变。

游戏按动作剩余时间选择跳跃和滑行帧，奔跑帧按移动时间循环。世界坐标负责跳跃高度，素材只提供身体姿势；滑行直接使用低姿动作。主页继续使用 LuLuPet 的正面待机动画。
