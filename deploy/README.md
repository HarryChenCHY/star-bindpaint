# 腾讯云部署

前端页面和 `/api` 后端由同一 Next.js 容器提供，运行于 CVM。研究 SQLite、作品、问卷与导出保存在 `/srv/startrace/studies`，与应用镜像独立。现有可选 OSS 接口未配置，不作为这次研究存储使用；研究材料和真人数据不随 Git 发布。

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

更新前自动停写并备份到 `/srv/startrace/backups`，仅限 root 访问。这是同盘备份，不能抵御整盘丢失；后续可启用腾讯云快照或 COS 异地备份（需单独配置资源）。备份与构建缓存暂不自动删除，应监控磁盘并按研究保留期管理。

紧急停止自动更新：`systemctl stop startrace-update.timer`。`previous-image` 保存上一镜像 ID，人工核对后可将该镜像重新标记为 `localhost/startrace:current` 并重启 `startrace.service`。旧镜像不自动删除。

## 备案与正式入口

应用默认只监听服务器 `127.0.0.1:3000`。备案审核期间可使用 SSH 隧道在本机预览：

```bash
ssh -N -L 3010:127.0.0.1:3000 root@1.13.169.247
```

打开 `http://localhost:3010`。正式研究的登录凭证要求 HTTPS；隧道用于检查界面与服务，不作为真人招募地址。

备案通过后：配置域名 A 记录到 CVM、腾讯云安全组放行 80/443、安装证书和 Nginx HTTPS 反向代理到 127.0.0.1:3000、页面展示实际备案号，再验证登录 Cookie、两轮测试、上传与导出。证书私钥不进入仓库。现有 CloudBase 默认域名不会自动转向 CVM，需停用旧入口或单独配置跳转；未确认前不删除旧服务。
