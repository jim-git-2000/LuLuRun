# LuLu 跑跑

一个 Android 竖屏、离线的三跑道跑酷游戏，搭配阳光小镇、透视街道和原创障碍物。使用 Canvas 2.5D 渲染与 Android 系统 WebView 宿主，不是完整 3D 引擎游戏。

角色跑酷动画已经按 LuLuPet 造型重新生成：奔跑、跳跃和低姿滑行均背对玩家，使用 16 张独立透明序列帧。四肢经过二次微调，更短、更圆润；主页仍保留原有正面待机动画。生成规范保存在 [runner/PROMPT.md](app/src/main/assets/game/runner/PROMPT.md)。

## 已实现

- 左右滑动换道，上滑跳跃，下滑翻滚；可选屏幕辅助按键。
- 木箱需要换道；橙白路栏可以跳过；绿色横杆需要翻滚或换道。
- 随机生成障碍和金币，每排保留至少一条安全跑道；随距离逐渐加速。
- 护盾抵挡一次碰撞，磁铁吸取三条跑道上的金币，道具持续 9 秒。
- 本局小目标、距离、金币、最高分与累计金币本地保存。
- 开始、暂停、恢复倒数、碰撞结算和再来一局；切后台或失去焦点自动暂停。
- 本地合成音效和轻音乐，可一键静音。无需账户、广告、联网权限或服务器。

金币目前用于计分与累计展示，没有商店或内购。角色使用本地序列帧，不是可自由旋转的 3D 模型。

## 获取 Android APK

本项目按工作区约定由 GitHub Actions 正式构建；没有在本机安装 SDK 或打包环境。

1. 将工程放入你自己的 GitHub 仓库并推送（需你明确要求后才由代理执行）。
2. 在仓库 **Actions → Android APK → Run workflow** 启动构建；向 `main` / `master` 推送也会触发。
3. 构建成功后，在该次运行的 **Artifacts** 下载 `LuLuRun-Android-debug`，解压得到 `app-debug.apk`。
4. 在 Android 8.0 或以上手机上手动安装，并完成[真机验收](docs/ANDROID_ACCEPTANCE.md)。

该产物是用于手动验收的 debug 签名 APK；不自动部署、不发布商店。不同 CI 运行的默认 debug 签名可能变化，若覆盖安装提示签名冲突，先卸载旧测试版；卸载会清除本地记录。正式发布需要固定签名和后续真机验收。本项目没有创建或保存私钥。

构建固定使用 JDK 17、Gradle 8.11.1、Android Gradle Plugin 8.9.2、compile/target SDK 35。版本兼容性依据 [Android 官方 AGP 8.9 说明](https://developer.android.com/build/releases/agp-8-9-0-release-notes)。CI 通过 `gradle/actions/setup-gradle` 提供固定 Gradle，本项目不附带 wrapper 二进制；已有 Android Studio 环境可按这些版本打开工程。

## 本地轻量检查与预览

使用已经安装的 Node 20+ 与 Python 3，不需要 `npm install`：

```bash
npm run check
npm test
```

第一项检查 JavaScript 语法、XML、页面引用、12 张主页待机帧与 16 张背面跑酷帧的尺寸和 SHA-256；第二项验证跑道生成、碰撞、道具、暂停和不同帧率下的行为。正式 Android lint / build 在 CI 执行。

如已安装浏览器，可启动本地预览：

```bash
python3 -m http.server 8080 --bind 127.0.0.1 --directory app/src/main/assets/game
```

打开 `http://127.0.0.1:8080`；桌面用方向键 / WASD，空格跳跃，Esc 暂停。该页面只是开发预览，交付目标为 Android APK。

## 工程入口

- [Android 宿主](app/src/main/java/com/lulu/run/MainActivity.java)：拦截本地虚拟 HTTPS 地址、屏幕安全区、全屏与生命周期。
- [游戏逻辑](app/src/main/assets/game/core.js)：固定时间步推进、障碍、碰撞、道具与计分。
- [绘制与交互](app/src/main/assets/game/game.js)：Canvas 场景、角色帧、手势、界面和音频。
- [资源来源](app/src/main/assets/game/pet/SOURCE.md)：原始 LuLuPet 资源路径与用途。
- [背面跑酷动作](app/src/main/assets/game/runner/SOURCE.md)：16 张独立透明序列帧、帧顺序、脚底锚点与生成提示词。
- [构建流程](.github/workflows/android.yml)：检查并产出可下载 APK 与 Android lint 报告。

当前仓库内容和本地检查不能代替 APK 构建成功或真机验收；后两项以实际 CI 和手机运行结果为准。
