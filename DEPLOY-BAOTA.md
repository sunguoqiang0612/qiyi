# 宝塔面板部署栖衣

面向宝塔（BT Panel）的单机部署：Nginx 反代 + MySQL + Node/PM2。全程不使用 Docker。

假设站点目录是 `/www/wwwroot/qiyi`，程序端口是 `3847`。目录和端口可以改，但 Nginx、PM2 和 `.env` 里要一致。

## 1. 安装 Node.js 和 MySQL

在宝塔「软件商店」安装：

- **MySQL 5.7 / 8.0**，或者已经在用的 MariaDB。应用通过 `mysql://` 连接，两者都可以。
- **Node.js 版本管理器**，安装 **20 或 22 LTS**。命令行里确认：

```bash
node -v
npm -v
```

如果 `node` 不在 PATH 里，用宝塔 Node 项目里显示的绝对路径，或先执行 `source /etc/profile`。

安装 PM2（若软件商店没有 PM2 管理器）：

```bash
npm install -g pm2
```

## 2. 创建数据库

宝塔 → 数据库 → 添加数据库：

- 数据库名：`qiyi`
- 用户名：`qiyi`
- 密码：自己设一组
- 访问权限：本地服务器
- 编码：`utf8mb4`

记下主机（一般是 `127.0.0.1`）、端口（默认 `3306`）、库名、用户和密码。

密码里如果有 `@ # % / ?` 等字符，写进连接串时要做 URL 编码。例如 `@` 写成 `%40`。

## 3. 放入代码

在 `/www/wwwroot/qiyi`：

```bash
cd /www/wwwroot
git clone <你的仓库地址> qiyi
cd qiyi
```

没有 git 时，把代码打成 zip，在宝塔文件管理里上传并解压到这个目录。不要把 `node_modules` 和 `.next` 打进压缩包。

## 4. 配置环境变量

```bash
cd /www/wwwroot/qiyi
cp .env.example .env
```

用宝塔文件管理或 `nano .env` 修改。至少改这几项：

```bash
DATABASE_URL="mysql://qiyi:你的密码@127.0.0.1:3306/qiyi"
AUTH_SECRET="用下面的命令生成"
APP_URL="https://你的域名"
PORT=3847
```

生成 `AUTH_SECRET`：

```bash
openssl rand -base64 48
```

可选：

| 变量 | 作用 |
| --- | --- |
| `AI_BASE_URL` | OpenAI 兼容接口，例如 `https://api.openai.com/v1`，不要末尾多加路径以外的斜杠问题，程序会自己去掉末尾 `/` |
| `AI_API_KEY` | 对应密钥。也可以留空，改在网页「设置」里按账号保存 |
| `AI_VISION_MODEL` | 识图模型名 |
| `AI_TEXT_MODEL` | 给搭配起名的文本模型。留空时沿用视觉模型 |
| `CRON_SECRET` | 给宝塔计划任务调用提醒接口 |
| `COOKIE_SECURE` | 整站是 HTTPS 时设为 `1`。只用 HTTP 时保持 `0`，否则浏览器不保存登录 Cookie |
| `SMTP_HOST` `SMTP_PORT` `SMTP_USER` `SMTP_PASS` `SMTP_FROM` | 要发邮件提醒才填。用户还要在设置里打开「同时发到我的邮箱」 |
| `NTFY_URL` | 全站备用的 ntfy 地址。用户自己的地址优先 |
| `TZ` | 建议 `Asia/Shanghai`。PM2 示例里已经写了 |

没有 AI 密钥时，添加衣服、清洗、穿着、规则搭配都正常，只是不会自动看图打标签。

## 5. 安装依赖、迁移、构建

在站点目录执行：

```bash
cd /www/wwwroot/qiyi
npm ci
npx prisma migrate deploy
npm run build
```

`prisma migrate deploy` 会按 `prisma/migrations` 建表，不会清空已有数据。

可选演示数据（会重置邮箱为 `demo@qiyi.local` 的那个用户）：

```bash
npm run db:seed
```

正式使用建议不要灌演示数据，打开网站自己注册即可。

确认 `uploads` 可写：

```bash
mkdir -p /www/wwwroot/qiyi/uploads
chown -R www:www /www/wwwroot/qiyi/uploads
```

如果你的 PM2 不用 `www` 用户跑，把属主改成实际运行用户。照片存在 `uploads/<用户id>/`，不要放到会被 `npm run build` 清掉的 `.next` 里。升级代码时保留这个目录和数据库。

## 6. 用 PM2 启动

项目里有 `ecosystem.config.cjs`，监听 `0.0.0.0:3847`：

```bash
cd /www/wwwroot/qiyi
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```

常用命令：

```bash
pm2 status
pm2 logs qiyi
pm2 restart qiyi
```

也可以在宝塔「Node 项目」里添加：

- 项目目录：`/www/wwwroot/qiyi`
- 启动选项：自定义启动命令
- 启动命令：`npm start`
- 端口：`3847`
- 运行用户对 `uploads/` 有写权限

`npm start` 会执行 `next start`，并读取 `.env` 里的 `PORT`。

进程起来后，本机检查：

```bash
curl -s http://127.0.0.1:3847/api/health
```

返回 `{"ok":true}` 说明 Node 和数据库都通了。

每天 07:30（`Asia/Shanghai`）进程内会为每个有衣服的账号生成一条站内提醒。生产环境默认开启，不需要 Redis。要关掉进程内调度时，在 PM2 的环境变量里加 `ENABLE_CRON=0`，然后重启。

如果更想用宝塔计划任务来触发（例如进程会休眠），添加一条：

- 类型：Shell 脚本
- 周期：每天 7:30
- 脚本：

```bash
curl -fsS -X POST http://127.0.0.1:3847/api/cron/daily \
  -H "x-cron-secret: 与.env里CRON_SECRET相同"
```

同一天重复调用不会给同一用户刷多条「今日搭配」（除非用户在网页上点「生成今日提醒」）。

## 7. Nginx 反向代理

宝塔 → 网站 → 添加站点（纯静态站点即可）→ 设置 → 反向代理 → 添加：

- 代理名称：`qiyi`
- 目标 URL：`http://127.0.0.1:3847`
- 发送域名：`$host`

在该网站的配置文件里确认类似下面的内容。宝塔界面生成的反代通常已经包含 `Host` 和 `X-Forwarded-*`，重点是**上传体积**和**协议头**：

```nginx
location / {
    proxy_pass http://127.0.0.1:3847;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    client_max_body_size 12m;
    proxy_read_timeout 60s;
}
```

`client_max_body_size` 要大于 8MB，否则上传衣服照片会被 Nginx 直接 413。改完后重载 Nginx。

照片不需要单独做静态目录。程序用登录后的 `/api/media/...` 读取 `uploads/`。这样未登录的人拿不到别人的图片。不要把 `uploads` 配成公开的网站根目录。

如果开启了 HTTPS，在 `.env` 设置 `COOKIE_SECURE=1`，然后 `pm2 restart qiyi`。只走 HTTP 时保持 `0`。

`APP_URL` 写成浏览器里真实打开的地址，提醒正文里会带上这个链接。

## 8. 升级

```bash
cd /www/wwwroot/qiyi
pm2 stop qiyi
git pull
npm ci
npx prisma migrate deploy
npm run build
pm2 start qiyi
```

升级前备份：

```bash
mysqldump -u qiyi -p qiyi > /root/qiyi-$(date +%F).sql
tar -C /www/wwwroot/qiyi -czf /root/qiyi-uploads-$(date +%F).tar.gz uploads
```

## 9. 常见问题

**页面能开，注册或登录报数据库错误。**  
看 `pm2 logs qiyi`。多半是 `DATABASE_URL` 的密码、库名或端口不对，或数据库用户没有该库权限。在宝塔数据库里用同一账号测试连接。

**登录成功马上又回到登录页。**  
HTTPS 站点却把 `COOKIE_SECURE` 留空一般仍能用；反过来，HTTP 站点设了 `COOKIE_SECURE=1` 会丢 Cookie。Nginx 要带上 `X-Forwarded-Proto`。改完重启 PM2。

**上传图片失败，Nginx 日志里是 413。**  
把 `client_max_body_size` 调到 `12m` 并重载 Nginx。应用本身限制单张 8MB，格式为 JPG、PNG、WEBP、GIF。

**构建时提示找不到 Prisma Client 或数据库。**  
先写好 `.env`，再执行 `npx prisma migrate deploy` 和 `npm run build`。`build` 里会再跑一次 `prisma generate`，不需要数据库处于可迁移状态以外的额外服务，但 `DATABASE_URL` 必须存在。

**识图没有反应。**  
设置页或 `.env` 里 `AI_BASE_URL`、`AI_API_KEY`、`AI_VISION_MODEL` 要同时有值。接口需要兼容 `POST {base}/chat/completions`，图片用 `image_url` 的 data URL。失败时衣服仍会按手填内容保存。

**天气是北京，或一直提示取不到天气。**  
到设置里点一个城市，或自己填经纬度。天气来自 Open-Meteo，服务器需要能访问 `api.open-meteo.com`。取不到时搭配仍按月份季节生成。

**中文变成问号。**  
库和表应是 `utf8mb4`。用本仓库的迁移创建的表已经是这个编码。不要把已有的 latin1 库硬套上来。
