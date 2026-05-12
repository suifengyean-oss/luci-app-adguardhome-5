[English](README.md) | [简体中文](README_ZH.md) | [日本語](README_JA.md) | [한국어](README_KR.md)

# luci-app-adguardhome

AdGuardHome 용 OpenWrt LuCI 플러그인. 무료이며 오픈소스인, 네트워크 전체 광고 및 트래커 차단 DNS 서버입니다.

## 기능

- 네트워크 전체 광고 및 트래커 차단
- GFW 리스트 가져오기 지원
- 코어 자동/수동 업데이트
- dnsmasq 업스트림 서버 모드
- 포트 53 리디렉션 지원
- Cron 작업 지원 (코어 자동 업데이트, 로그 자동 정리 등)
- 웹 관리 인터페이스 (기본 사용자 이름과 비밀번호는 모두 `admin`)

## 빌드 방법

### 방법 1: feeds 설정을 통한 빌드

OpenWrt SDK 또는 소스 루트 디렉토리의 `feeds.conf.default` **맨 위**에 다음을 추가:

```
src-git adguardhome https://github.com/MomoFlora/luci-app-adguardhome.git;main
```

그 후 다음을 실행:

```bash
./scripts/feeds update -a
./scripts/feeds install -a
make menuconfig
```

메뉴에서 `LuCI` -> `Applications` -> `luci-app-adguardhome`를 선택하고 저장 후 빌드.

### 방법 2: package 디렉토리에 직접 클론

```bash
git clone https://github.com/MomoFlora/luci-app-adguardhome.git package/luci-app-adguardhome
make menuconfig
```

메뉴에서 `LuCI` -> `Applications` -> `luci-app-adguardhome`를 선택하고 저장 후 빌드.

## 설치

### ipkg 를 통한 설치

생성된 `.ipk` 파일을 라우터에 업로드하고 실행:

```bash
opkg install luci-app-adguardhome_*.ipk
```

### 수동 설치

1. `luci-app-adguardhome` 디렉토리를 OpenWrt 소스의 `package/` 디렉토리에 배치
2. `make menuconfig`를 실행하여 플러그인 선택
3. `make -j1 V=s`를 실행하여 빌드

## 사용 방법

1. 설치 완료 후 LuCI 인터페이스에서 `서비스` -> `AdGuardHome`으로 이동
2. **저장 및 적용**을 클릭하여 설정 파일 생성
3. 첫 사용 시 AdGuardHome 코어 바이너리가 자동으로 다운로드됨
4. 브라우저에서 `http://<라우터IP>:<관리포트>`로 접속하여 관리 인터페이스 접근. 기본 사용자 이름과 비밀번호는 모두 `admin`

## 설정 항목

### 기본 설정

| 옵션 | 설명 |
|------|------|
| 사용 | AdGuardHome 서비스 켜기/끄기 |
| 웹 관리 포트 | AdGuardHome 웹 관리 인터페이스 포트 |
| 리디렉션 모드 | DNS 리디렉션 방식 선택 |
| dnsmasq 업스트림 서버로 실행 | AdGuardHome을 dnsmasq의 업스트림 DNS로 사용 |
| 포트 53을 AdGuardHome으로 리디렉션 | dnsmasq를 포트 53으로 대체 |

### 코어 설정

| 옵션 | 설명 |
|------|------|
| 바이너리 경로 | AdGuardHome 바이너리 파일 경로, 없으면 자동 다운로드 |
| 설정 파일 경로 | AdGuardHome 설정 파일 경로 |
| 작업 디렉토리 | 규칙, 감사 로그, 데이터베이스가 포함된 디렉토리 |
| 코어 업데이트 | AdGuardHome 코어 버전 확인 및 업데이트 |
| UPX로 압축 | 다운로드 후 바이너리 압축하여 공간 절약 |

### 기타 설정

- **Cron 작업**: 코어 자동 업데이트, 로그 자동 정리, GFW 리스트 자동 업데이트 등
- **GFW 리스트**: GFW 리스트 추가/삭제, 업스트림 DNS 서버 설정
- **비밀번호 변경**: LuCI 인터페이스에서 AdGuardHome 관리 비밀번호 변경

## 주의 사항

- 첫 사용 시 **저장 및 적용**을 클릭하여 설정 파일을 생성해야 함
- 코어 파일이 없을 경우 해당 아키텍처에 맞는 바이너리가 자동으로 다운로드됨
- 시스템 업그레이드 시 코어 파일, 설정 파일, 로그 유지 여부 선택 가능
- 작업 디렉토리는 종료 시 자동 백업되며 데이터가 비어있을 때 자동 복원됨

## 라이선스

Apache License, Version 2.0

## 감사의 말

본 프로젝트는 [sirpdboy/luci-app-adguardhome](https://github.com/MomoFlora/luci-app-adguardhome)의 JavaScript 기반 수정 버전입니다. 원저자의 훌륭한 작업에 감사드립니다.

## 링크

- [AdGuardHome 공식 저장소](https://github.com/AdguardTeam/AdGuardHome)
- [원본 프로젝트](https://github.com/MomoFlora/luci-app-adguardhome)
