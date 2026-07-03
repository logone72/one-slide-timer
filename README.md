# 원 슬라이드 타이머

모바일에서 한 번의 제스처로 병렬 타이머를 만들고 조정하는 웹앱.

## 로컬 실행

```bash
nvm use
npm install
npm run dev
```

## 검증

```bash
npm run verify
npm run verify:browser
npm run cap:sync:ios
```

`verify`는 커밋 전 빠른 품질 게이트이고, `verify:browser`는 배포 전 모바일 브라우저 smoke 검증이다.

## 현재 상태

- Node 24와 npm 기준으로 동작한다.
- 웹 앱은 Vite/React/TypeScript로 구성했다.
- iOS 앱은 Capacitor로 연결했고, 첫 네이티브 폴더는 `ios/`만 둔다.
- `@/` 경로 별칭은 `src/`를 가리킨다.

## 문서

- [제품 스펙 및 개발 계획](docs/product-spec.md)
- [프로젝트 구조 계획](docs/project-structure.md)
- [개발 진행 기록](docs/progress.md)
- [도메인 언어](CONTEXT.md)
