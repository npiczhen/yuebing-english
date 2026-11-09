# GitHub Pages 发布与迁移

本目录是2026-11-09从已验证课程2.0.1导出的独立GitHub版本，不向原ChatGPT Sites发布。

- 仓库：https://github.com/npiczhen/yuebing-english
- 预计发布网址：https://npiczhen.github.io/yuebing-english/
- 更新入口：https://npiczhen.github.io/yuebing-english/update.html?yb-update=repair

在仓库Settings → Pages → Build and deployment中，将Source设为GitHub Actions。向main提交后，`.github/workflows/pages.yml`校验课程、音频和资源，再上传dist并发布。仅dist作为网页内容发布，源码、音频制作工具与测试不在网页根目录。

代码中的音频、插画、离线Worker和安装入口使用相对地址，保留仓库子路径。发布时重新生成资源SHA，避免Git文本换行转换导致下载校验错误。

新网址第一次使用，需要重新下载完整12周课程；旧网址的缓存不能直接复制到新域名。家长可先在旧网址导出进度JSON，再到新网址导入，贴纸随进度恢复。本机录音不包含在进度备份里，仍保存在旧网址所属浏览器数据中，不能自动跨域迁移。保留原桌面入口和浏览器数据。

录音和学习进度不会上传GitHub。仓库只包含课程代码及预制资源，不含账号密钥、语音模型、测试浏览器数据和孩子录音。旧版备份继续保存在原工作区backups目录；原Sites线上版本维持不变。

GitHub官方说明：

- https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site
- https://docs.github.com/en/get-started/start-your-journey/deploying-your-website-automatically

