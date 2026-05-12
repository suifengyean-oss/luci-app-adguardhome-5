# luci-app-adguardhome

[English](README.md)

AdGuardHome 的 OpenWrt LuCI 插件。免费且开源，功能强大的全网广告和跟踪程序拦截 DNS 服务器。

## 功能特性

- 全网广告和跟踪程序拦截
- 支持 GFW 列表导入
- 核心自动/手动升级
- 支持 dnsmasq 上游服务器模式
- 支持 53 端口重定向
- 计划任务支持（自动升级核心、自动清理日志等）
- 网页管理界面（默认账号密码均为 `admin`）

## 编译说明

### 方法 1：通过 feeds 配置

在 OpenWrt SDK 或源码根目录的 `feeds.conf.default` **顶部**添加如下内容：

```
src-git adguardhome https://github.com/sirpdboy/luci-app-adguardhome.git;main
```

然后执行：

```bash
./scripts/feeds update -a
./scripts/feeds install -a
make menuconfig
```

在菜单中选择：`LuCI` -> `Applications` -> `luci-app-adguardhome`，保存后编译。

### 方法 2：直接克隆到 package 目录

```bash
git clone https://github.com/sirpdboy/luci-app-adguardhome.git package/luci-app-adguardhome
make menuconfig
```

在菜单中选择：`LuCI` -> `Applications` -> `luci-app-adguardhome`，保存后编译。

## 安装说明

### 通过 ipkg 安装

将编译生成的 `.ipk` 文件上传到路由器后执行：

```bash
opkg install luci-app-adguardhome_*.ipk
```

### 手动安装

1. 将 `luci-app-adguardhome` 目录放置到 OpenWrt 源码的 `package/` 目录下
2. 执行 `make menuconfig` 选中该插件
3. 执行 `make -j1 V=s` 编译

## 使用说明

1. 安装完成后，在 LuCI 界面找到 `服务` -> `AdGuardHome` 进入配置页面
2. 点击 **保存并应用** 生成配置文件
3. 首次使用时会自动下载 AdGuardHome 核心二进制文件
4. 通过浏览器访问 `http://<路由器IP>:<管理端口>` 进入 AdGuardHome 管理界面，默认账号密码均为 `admin`

## 配置说明

### 基础设置

| 选项 | 说明 |
|------|------|
| 启用 | 开启/关闭 AdGuardHome 服务 |
| 网页管理端口 | AdGuardHome Web 管理界面端口 |
| 重定向模式 | 选择 DNS 重定向方式 |
| 作为 dnsmasq 的上游服务器 | 将 AdGuardHome 作为 dnsmasq 上游 DNS |
| 重定向 53 端口到 AdGuardHome | 使用 53 端口替换 dnsmasq |

### 内核设置

| 选项 | 说明 |
|------|------|
| 执行文件路径 | AdGuardHome 二进制文件路径，不存在时自动下载 |
| 配置文件路径 | AdGuardHome 配置文件路径 |
| 工作目录 | 包含规则、审计日志和数据库的目录 |
| 更新核心 | 检查并更新 AdGuardHome 核心版本 |
| 使用 UPX 压缩 | 下载后压缩执行文件以节省空间 |

### 其它设置

- **计划任务**：支持自动升级核心、自动清理日志、自动更新 GFW 列表等
- **GFW 列表**：支持添加/删除 GFW 列表，可配置上游 DNS 服务器
- **密码修改**：支持通过 LuCI 界面修改 AdGuardHome 管理密码

## 注意事项

- 首次使用需要点击 **保存并应用** 才能生成配置文件
- 核心文件不存在时会自动下载对应架构的二进制文件
- 系统升级时可选择保留核心文件、配置文件和日志文件
- 工作目录会在关机时自动备份，在数据为空时自动恢复

## 许可证

Apache License, Version 2.0

## 致谢

本项目是基于 [sirpdboy/luci-app-adguardhome](https://github.com/sirpdboy/luci-app-adguardhome) 的 JavaScript 修改版本，特别感谢原作者的优秀工作。

## 相关链接

- [AdGuardHome 官方仓库](https://github.com/AdguardTeam/AdGuardHome)
- [原始项目地址](https://github.com/sirpdboy/luci-app-adguardhome)
