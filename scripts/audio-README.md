# 离线音频制作

网页只播放 `dist/assets/audio/*.mp3`。当前2.0.1引用1527段：570段美式英语、957段中文，共37,799,568字节。其中406段新增中文短句共6,009,696字节，用于故事提到角色时的发声同步。旧完整台词文件继续保留，全部1534个MP3共38,024,496字节。学习时不调用语音服务，也不需要下载语音模型。新词的三次朗读由播放器重复播放同一份已下载音频，不重复制作三份文件。

- 英语：本机Kokoro v1.0 FP16，af_heart美式女声，速度0.87。模型和制作依赖仅存在忽略目录 `.audio-tools/`。
- 中文：微软 zh-CN-XiaoxiaoNeural（晓晓）神经女声，rate=-8%，pitch=+0Hz，预先通过edge-tts制作。
- 中文制作时向微软发送课程台词，包括昵称月饼；不读取、上传或处理儿童麦克风录音。运行时录音完全保存在浏览器本机。
- 输出：24kHz单声道MP3。全部是合成配音，未声称是真人录音。

## 重建

先运行 `node scripts/content.mjs` 更新课程及音频请求。依赖安装到 `.audio-tools/lib`，保留原有Kokoro/Misaki/soundfile等依赖，中文需 `edge-tts==7.3.1`。英语模型下载流程见 `audio-download-models.py`。

```powershell
python scripts/audio-generate.py --lang en
python scripts/audio-chinese-generate.py
python scripts/audio-finalize.py
python scripts/audio-check-lexicon.py
node scripts/manifest.mjs
node scripts/check.mjs
```

英文制作完全在本机。中文制作需要网络；没有语音API密钥，不把密钥嵌入网页。服务器访问策略可能变化，保留已生成MP3可继续离线使用；不要因生成服务暂时不可用而删除可用音频。生成脚本在服务拒绝授权时直接报告失败，不变更身份重试。

`audio-chinese-generate.py --verify-only` 仅核对已有中文文件，不发起语音合成。默认3路并发，按相同文本、引擎、音色、语速和SHA验证后复用；`--force` 重制。新中文音频使用natural-v1哈希命名，与旧中文ID隔离，原英语ID不变。

`audio-finalize.py` 汇总中英文来源并解码全部当前音频。2.0.1保留旧完整台词作为兼容资源，不使用`--prune`；该可选参数会在所有验证通过后删除不被请求引用的生成MP3。`audio-check-lexicon.py`记录96词的CMU美式词典转写与实际模型音素。英文中的 I’m / I'm 使用作者词典保存的首字母大写条目，弯引号与直引号归一化后对应同一美式发音。

## 来源与验证

- `dist/audio-report.json`：混合来源总报告、逐条台词、引擎、SHA和解码信息。
- `dist/chinese-audio-report.json`：中文音色、语速、完整返回句子、服务来源和检查结果。
- 英语模型Apache-2.0，kokoro-onnx MIT，Misaki Apache-2.0；许可文件保留在音频目录。
- edge-tts构建客户端LGPL-3.0，不随网页分发；微软语音服务及其输出适用其服务条款，客户端许可证不授予微软声音的权利。
- 来源：[Kokoro](https://github.com/hexgrad/kokoro)、[edge-tts](https://github.com/rany2/edge-tts)、[微软声音说明](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/language-support)、[微软服务协议](https://www.microsoft.com/en-us/servicesagreement)。

自动检查包括解码、非静音、无削波、文本/文件SHA匹配。英文核对模型音素覆盖，中文核对服务返回句子涵盖完整台词。尚未完成真人逐条听审；这些检查不能认证每个发音或自然程度。
