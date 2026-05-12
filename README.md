[English](README.md) | [简体中文](README_ZH.md) | [日本語](README_JA.md) | [한국어](README_KR.md)

# luci-app-adguardhome

OpenWrt LuCI plugin for AdGuardHome. A free and open-source, powerful network-wide ads and trackers blocking DNS server.

## Features

- Network-wide ads and trackers blocking
- GFW list import support
- Core auto/manual upgrade
- dnsmasq upstream server mode
- Port 53 redirection support
- Cron task support (auto core upgrade, auto log cleanup, etc.)
- Web management interface (default username and password are both `admin`)

## Build Instructions

### Method 1: Via feeds configuration

Add the following line to the **top** of `feeds.conf.default` in your OpenWrt SDK or source root directory:

```
src-git adguardhome https://github.com/sirpdboy/luci-app-adguardhome.git;main
```

Then execute:

```bash
./scripts/feeds update -a
./scripts/feeds install -a
make menuconfig
```

Navigate to `LuCI` -> `Applications` -> `luci-app-adguardhome`, save and build.

### Method 2: Clone directly to package directory

```bash
git clone https://github.com/sirpdboy/luci-app-adguardhome.git package/luci-app-adguardhome
make menuconfig
```

Navigate to `LuCI` -> `Applications` -> `luci-app-adguardhome`, save and build.

## Installation

### Install via ipkg

Upload the generated `.ipk` file to your router and run:

```bash
opkg install luci-app-adguardhome_*.ipk
```

### Manual Installation

1. Place the `luci-app-adguardhome` directory into the `package/` directory of your OpenWrt source
2. Run `make menuconfig` and select the plugin
3. Run `make -j1 V=s` to build

## Usage

1. After installation, find `Services` -> `AdGuardHome` in the LuCI interface
2. Click **Save & Apply** to generate the configuration file
3. On first use, the AdGuardHome core binary will be downloaded automatically
4. Access the AdGuardHome management interface at `http://<router-ip>:<management-port>`, default username and password are both `admin`

## Configuration

### Base Settings

| Option | Description |
|--------|-------------|
| Enable | Turn AdGuardHome service on/off |
| Web Management Port | AdGuardHome Web management interface port |
| Redirect Mode | Select DNS redirect method |
| Run as dnsmasq upstream server | Use AdGuardHome as dnsmasq upstream DNS |
| Redirect port 53 to AdGuardHome | Replace dnsmasq with port 53 |

### Core Settings

| Option | Description |
|--------|-------------|
| Binary Path | AdGuardHome binary path, auto-download if not exists |
| Config File Path | AdGuardHome configuration file path |
| Working Directory | Directory containing rules, audit logs and database |
| Upgrade Core | Check and update AdGuardHome core version |
| Compress with UPX | Compress binary after download to save space |

### Other Settings

- **Cron Tasks**: Support auto core upgrade, auto log cleanup, auto GFW list update, etc.
- **GFW List**: Support add/delete GFW list, configurable upstream DNS server
- **Password Change**: Support changing AdGuardHome management password via LuCI interface

## Notes

- Click **Save & Apply** on first use to generate the configuration file
- Core binary will be automatically downloaded for the corresponding architecture if not found
- Option to keep core files, config files and logs during system upgrade
- Working directory is automatically backed up on shutdown and restored when data is empty

## License

Apache License, Version 2.0

## Acknowledgments

This project is a JavaScript-based modification of [sirpdboy/luci-app-adguardhome](https://github.com/sirpdboy/luci-app-adguardhome). Special thanks to the original author for their excellent work.

## Links

- [AdGuardHome Official Repository](https://github.com/AdguardTeam/AdGuardHome)
- [Original Project](https://github.com/sirpdboy/luci-app-adguardhome)
