# 栖衣

自托管的衣橱应用。用来收纳衣服、记录穿着和清洗，并按天气与场合给出搭配。界面默认中文，也可以切到英文。

这是按 Wardrowbe 的使用方式重新实现的版本，代码是新写的，采用 MIT 协议。不依赖 Docker。

## 本地运行

需要 Node.js 20+ 和 MySQL（或 MariaDB）。

```bash
cp .env.example .env
# 编辑 DATABASE_URL 和 AUTH_SECRET

npm ci
npx prisma migrate deploy
npm run db:seed   # 可选，写入演示数据
npm run dev
```

浏览器打开 http://127.0.0.1:3847

演示账号（仅在执行过 `npm run db:seed` 之后存在）：

- 邮箱 `demo@qiyi.local`
- 密码 `qiyi-demo-123`

空库可以直接注册，不需要种子数据。

生产构建：

```bash
npm run build
npm start
```

`PORT` 写在 `.env` 里，默认 `3847`。

## 宝塔部署

见 [DEPLOY-BAOTA.md](DEPLOY-BAOTA.md)。

## 这次做了什么

- 邮箱密码注册、登录，Cookie 会话
- 衣橱：照片、分类、颜色、季节、标签、备注、搜索
- 清洗状态和穿着次数，待洗会从建议里降权
- 套装、穿着日历
- 按场合和 Open-Meteo 天气生成搭配，可以喜欢或不喜欢
- 统计：颜色、品类、常穿、没穿过、采纳率
- 一个账号下多个家庭成员
- 设置：城市、语言、外观、可选的 OpenAI 兼容识图/文案、ntfy
- 图片存在项目下的 `uploads/`
- 每天 07:30（上海时区）生成站内提醒；配置了 ntfy 或 SMTP 时一并发出

识图和文案在没有 `AI_BASE_URL`、`AI_API_KEY`、模型名时自动跳过，手填仍然可用。

## 还没做

- OIDC、Redis、独立队列
- 对象存储
- 批量导入历史照片的后台任务
