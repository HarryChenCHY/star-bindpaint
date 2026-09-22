# 腾讯云部署

前端页面和 `/api` 后端由同一 Next.js 容器提供，运行于 CVM。研究 SQLite、作品、问卷与导出保存在 `/srv/startrace/studies`，与应用镜像独立。旧版统计及可选云作品保存通过 `STARTRACE_OBJECT_DATA_DIR=/app/data/studies/objects` 使用同一腾讯云磁盘，不需要 OSS 账号；作品以带签名的有效期链接访问，统计后台仍需口令。研究材料和真人数据不随 Git 发布。

## 自动更新

本地 `git push origin main` 后，服务器每分钟检查公开仓库的 main。下载新增提交、执行研究测试、ESLint 和生产构建，在隔离目录验证接口，再暂停旧服务备份数据并切换版本。构建失败不停止旧服务，切换失败恢复上一镜像。每次发布有短暂服务中断，研究进行中应避免推送。数据库不自动恢复旧备份，涉及不兼容数据迁移时必须先另行制定迁移方案。

使用 Podman 和 systemd；服务器从腾讯云内网镜像拉取 `node:22-alpine` 并标记为 `docker.io/library/node:22-alpine`。基础镜像需由维护者定期更新和验证。运行口令只在 `/etc/startrace.env`（600），不在 Git 或镜像中。自动部署脚本安装到 `/usr/local/sbin/startrace-deploy`；修改 deploy 内的脚本或服务文件需由维护者重新安装，应用代码会自动更新。

```bash
systemctl status startrace.service startrace-update.timer
journalctl -u startrace-update.service -n 80 --no-pager
cat /srv/startrace/deployed-commit
curl --fail http://127.0.0.1:3000/api/studies
```

检查每次失败后会记录 `failed-commit`，避免不断重建同一失败版本。推送新提交会再次尝试；重试原提交时将 `/srv/startrace/failed-commit` 改名留档，再启动更新服务。

## 数据和回滚

Git 下载超时后，部署脚本改用 GitHub 官方 API 查询 main 的完整提交号，并从官方 codeload 下载该提交的源码。两条网络路径都失败时保留正在运行的版本，下一轮再次检查。公开 API 有调用限额，限流期间同样等待后续重试，不绕过版本校验。

更新前自动停写并备份到 `/srv/startrace/backups`，仅限 root 访问。这是同盘备份，不能抵御整盘丢失；后续可启用腾讯云快照或 COS 异地备份（需单独配置资源）。备份与构建缓存暂不自动删除，应监控磁盘并按研究保留期管理。

紧急停止自动更新：`systemctl stop startrace-update.timer`。`previous-image` 保存上一镜像 ID，人工核对后可将该镜像重新标记为 `localhost/startrace:current` 并重启 `startrace.service`。旧镜像不自动删除。

## 备案与正式入口

应用默认只监听服务器 `127.0.0.1:3000`。备案审核期间可使用 SSH 隧道在本机预览：

```bash
ssh -N -L 3010:127.0.0.1:3000 root@1.13.169.247
```

打开 `http://localhost:3010`。正式研究的登录凭证要求 HTTPS；隧道用于检查界面与服务，不作为真人招募地址。

备案通过后：配置域名 A 记录到 CVM、腾讯云安全组放行 80/443、安装证书和 Nginx HTTPS 反向代理到 127.0.0.1:3000、页面展示实际备案号，再验证登录 Cookie、两轮测试、上传与导出。证书私钥不进入仓库。现有 CloudBase 默认域名不会自动转向 CVM，需停用旧入口或单独配置跳转；未确认前不删除旧服务。

### 2026-09-22 正式域名已启用

用户已确认备案通过，正式域名为 `startracepaint.com`，`www.startracepaint.com` 跳转至主域名。DNSPod 需要两条 A 记录：`@` 和 `www` 均指向 `1.13.169.247`。

两条解析已生效。正式入口为 `https://startracepaint.com`，用户测试入口为 `https://startracepaint.com/study`。HTTP 与 HTTPS 的 www 入口均以 308 跳转至主域名并保留路径。

本轮已安装 Nginx、Certbot，验证公网 80/443 端口、证书链及首页、选图、测试页面和研究 API。浏览器检查未发现页面脚本异常；同源请求正常进入接口鉴权，跨站请求被拒绝。应用仍仅监听内部 3000 端口，前端和 API 经同一域名转发。未创建真实研究参与者，登录后的完整实验流程未在生产数据上重复执行。

`nginx-http-challenge.conf.example` 是签发证书前的临时配置；`nginx-https.conf.example` 是已安装的正式配置。`enable-domain.sh` 与 HTTPS 配置已放在服务器 `/srv/startrace/domain`，后续维护时可使用 root 执行：

```bash
bash /srv/startrace/domain/enable-domain.sh
```

脚本先核对两个域名的 IPv4、IPv6 与 HTTP 验证路径，再签发免费证书、检查 Nginx 配置并切换 HTTPS，最后启用自动续期。证书账户暂不绑定邮箱；定时续期日志可通过 `journalctl -u certbot-renew.service` 查看。切换失败会恢复之前的 Nginx 配置。

证书覆盖主域名与 www，当前有效期截至 2026-12-21，`certbot-renew.timer` 已启用，解析传播后的续期演练已通过。首页备案编号按用户提供的内容显示为“渝ICP备2026023024号”，链接至工信部查询首页，未自行补写网站序号。独立研究回归应使用隔离测试数据，不把自动验证记录混入真实实验。

本轮还修复了归档下载重试问题：GitHub 下载先写入独立文件，完整性验证后再解包，避免中断后的重试内容被拼接进 tar 输入流。单次下载时限调整为 600 秒；失败时现有应用继续运行。
