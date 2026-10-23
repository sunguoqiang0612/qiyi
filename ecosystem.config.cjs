// PM2 配置，给宝塔或命令行使用。不要改成容器启动方式。
module.exports = {
  apps: [
    {
      name: "qiyi",
      cwd: __dirname,
      script: "node_modules/next/dist/bin/next",
      args: "start -H 0.0.0.0 -p 3847",
      interpreter: "node",
      env: {
        NODE_ENV: "production",
        PORT: "3847",
        TZ: "Asia/Shanghai",
      },
    },
  ],
};
