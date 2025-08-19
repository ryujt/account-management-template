# React.js Project Rules

이 문서는 React.js 기반 프런트엔드 프로젝트에서 일관된 품질과 생산성을 확보하기 위한 팀 공용 가이드다. 폴더 구조, 상태 관리, API 통신, 네이밍, 라우팅 레이지 로딩, 접근성 체크리스트, 빌드 버전 관리 표준안을 포함한다.

---

## 폴더 구조

```
react-app
├── public
├── src
│   ├── api
│   ├── components
│   ├── config
│   ├── pages
│   ├── services
│   ├── stores
│   ├── styles
│   ├── utils
│   ├── hooks
│   ├── layouts
│   └── index.js
├── assets
│   ├── fonts
│   └── images
├── constants
├── update-build-version.js
├── package.json
├── .env.example
└── jsconfig.json
```

핵심 원칙

* constants에는 전역 상수만 둔다. UI 상수와 도메인 상수를 하위 폴더로 분리한다.
* hooks는 UI 훅과 비즈니스 훅을 분리한다.
* jsconfig.json을 사용해 절대 경로 별칭을 적용한다.
* 환경 변수는 .env.example로 정의하고 브랜치별 .env에서 값을 관리한다.

---

## 상태 관리 원칙

* 권장 패턴: store → api call
* 페이지 간 공유가 필요 없으면 컴포넌트 내부에서 직접 API를 호출해도 된다.
* store 액션은 화면 일관성을 위해 내부적으로 상태를 갱신하고, 호출 측 체이닝을 위해 결과를 반환한다.
* 에러 포맷을 `{ status, code, message, data }`로 통일한다.

---

## 네이밍 규칙

* 컴포넌트와 해당 파일은 PascalCase
* hooks, utils, stores, api 함수와 파일은 camelCase
* 상수는 SNAKE_CASE
* 이벤트 핸들러는 handle 접두사, 커스텀 훅은 use 접두사

---

## API 코드 가이드라인

* 공통 axios 인스턴스를 사용하고 응답은 `response.data`만 반환한다.
* 에러는 표준 포맷으로 변환해 상위로 전달한다.
* 로딩 상태는 요청 개수 기반의 전역 스토어로 관리한다.
* 인증 토큰과 로딩 사용 여부를 런타임에서 설정할 수 있도록 공개 함수로 제공한다.
* 기본 baseURL은 `REACT_APP_API_BASE_URL`을 우선 사용한다.

---

## 코드 표준 세트

아래는 즉시 적용 가능한 기준 구현이다. 모든 코드는 파일 전체이며 주석을 포함하지 않는다.

### src/stores/loadingStore.js

```javascript
import { create } from 'zustand';

export const useLoadingStore = create((set, get) => ({
  activeCount: 0,
  isLoading: false,
  start: () => {
    const n = get().activeCount + 1;
    set({ activeCount: n, isLoading: n > 0 });
  },
  end: () => {
    const n = Math.max(0, get().activeCount - 1);
    set({ activeCount: n, isLoading: n > 0 });
  },
  reset: () => set({ activeCount: 0, isLoading: false })
}));
```

### src/api/index.js

```javascript
import axios from 'axios';
import { useLoadingStore } from '../stores/loadingStore';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_BASE_URL || '/api',
  withCredentials: false,
  headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
  timeout: 15000
});

let loadingEnabled = true;

export const setGlobalLoadingEnabled = v => {
  loadingEnabled = Boolean(v);
};

export const setAuthToken = token => {
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common.Authorization;
  }
};

api.interceptors.request.use(config => {
  if (loadingEnabled) useLoadingStore.getState().start();
  if (!config.headers) config.headers = {};
  return config;
});

api.interceptors.response.use(
  res => {
    if (loadingEnabled) useLoadingStore.getState().end();
    return res.data;
  },
  err => {
    if (loadingEnabled) useLoadingStore.getState().end();
    const status = err.response ? err.response.status : 0;
    const data = err.response ? err.response.data : null;
    const code = data && data.code ? data.code : undefined;
    const message = data && data.message ? data.message : err.message;
    return Promise.reject({ status, code, message, data });
  }
);

export default api;
```

### src/api/featureApi.js

```javascript
import api from './index';

export const getFeature = featureId => api.get(`/features/${featureId}`);
export const listFeatures = params => api.get('/features', { params });
export const createFeature = payload => api.post('/features', payload);
export const updateFeature = (featureId, payload) => api.put(`/features/${featureId}`, payload);
export const deleteFeature = featureId => api.delete(`/features/${featureId}`);
```

### src/stores/featureStore.js

```javascript
import { create } from 'zustand';
import { getFeature, listFeatures, createFeature, updateFeature, deleteFeature } from '../api/featureApi';

export const useFeatureStore = create((set, get) => ({
  featureData: null,
  featureList: [],
  status: 'idle',
  error: null,
  fetchFeature: async featureId => {
    set({ status: 'loading', error: null });
    try {
      const data = await getFeature(featureId);
      set({ featureData: data, status: 'success' });
      return data;
    } catch (e) {
      set({ error: e.message, status: 'error' });
      throw e;
    }
  },
  fetchFeatureList: async params => {
    set({ status: 'loading', error: null });
    try {
      const data = await listFeatures(params);
      set({ featureList: data, status: 'success' });
      return data;
    } catch (e) {
      set({ error: e.message, status: 'error' });
      throw e;
    }
  },
  createFeature: async payload => {
    set({ error: null });
    const data = await createFeature(payload);
    set({ featureList: [data, ...get().featureList] });
    return data;
  },
  updateFeature: async (featureId, payload) => {
    set({ error: null });
    const data = await updateFeature(featureId, payload);
    set({
      featureData: get().featureData && get().featureData.id === featureId ? data : get().featureData,
      featureList: get().featureList.map(i => (i.id === featureId ? data : i))
    });
    return data;
  },
  deleteFeature: async featureId => {
    set({ error: null });
    await deleteFeature(featureId);
    set({
      featureData: get().featureData && get().featureData.id === featureId ? null : get().featureData,
      featureList: get().featureList.filter(i => i.id !== featureId)
    });
  },
  clearError: () => set({ error: null }),
  reset: () => set({ featureData: null, featureList: [], status: 'idle', error: null })
}));
```

### src/components/LoadingSpinner.js

```javascript
import React from 'react';
import { useLoadingStore } from '../stores/loadingStore';

export default function LoadingSpinner() {
  const isLoading = useLoadingStore(s => s.isLoading);
  if (!isLoading) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
      <div style={{ width: 40, height: 40, border: '4px solid rgba(0,0,0,0.1)', borderTopColor: 'rgba(0,0,0,0.6)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      <style>{'@keyframes spin { to { transform: rotate(360deg) } }'}</style>
    </div>
  );
}
```

### src/pages/Home.js

```javascript
import React from 'react';

export default function Home() {
  return (
    <div style={{ padding: 24 }}>
      <h1>Home</h1>
      <p>Welcome</p>
    </div>
  );
}
```

### src/pages/Feature.js

```javascript
import React from 'react';

export default function Feature() {
  return (
    <div style={{ padding: 24 }}>
      <h1>Feature</h1>
      <p>Feature page</p>
    </div>
  );
}
```

### src/routes/AppRouter.jsx

```javascript
import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoadingSpinner from '../components/LoadingSpinner';

const Home = lazy(() => import('../pages/Home'));
const Feature = lazy(() => import('../pages/Feature'));

export default function AppRouter() {
  return (
    <BrowserRouter>
      <LoadingSpinner />
      <Suspense fallback={<div style={{ padding: 24 }}>Loading</div>}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/feature" element={<Feature />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
```

### src/index.js

```javascript
import React from 'react';
import { createRoot } from 'react-dom/client';
import AppRouter from './routes/AppRouter';

const container = document.getElementById('root');
const root = createRoot(container);
root.render(<AppRouter />);
```

### jsconfig.json

```json
{
  "compilerOptions": {
    "baseUrl": "src",
    "paths": {
      "@api/*": ["api/*"],
      "@components/*": ["components/*"],
      "@stores/*": ["stores/*"],
      "@utils/*": ["utils/*"],
      "@pages/*": ["pages/*"],
      "@routes/*": ["routes/*"]
    }
  }
}
```

### .env.example

```ini
REACT_APP_API_BASE_URL=/api
REACT_APP_APP_NAME=ReactApp
```

### update-build-version.js

```javascript
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function gitSha() {
  try {
    return execSync('git rev-parse --short HEAD').toString().trim();
  } catch {
    return 'unknown';
  }
}

function isoNow() {
  return new Date().toISOString();
}

function ensureDir(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

function main() {
  const version = {
    appName: process.env.REACT_APP_APP_NAME || 'ReactApp',
    buildTime: isoNow(),
    git: gitSha()
  };
  const outDir = path.join(process.cwd(), 'public');
  ensureDir(outDir);
  const outFile = path.join(outDir, 'build-version.json');
  fs.writeFileSync(outFile, JSON.stringify(version, null, 2), 'utf8');
  process.stdout.write(outFile + '\n');
}

main();
```

---

## 라우팅 레이지 로딩 표준

* 페이지 컴포넌트는 기본적으로 `React.lazy`로 지연 로딩한다.
* 전역 로딩 인디케이터는 스켈레톤이나 심플 텍스트로 가볍게 유지한다.
* 라우트 변경 시 스크롤 복원, 인증 보호 등이 필요하면 전용 래퍼 컴포넌트를 추가한다.
* 코드 스플리팅 단위는 페이지 기준을 기본으로 하고, 대형 위젯은 필요 시 추가 분할한다.

---

## 접근성 체크리스트

* 의미 있는 구조를 유지한다. 시맨틱 태그를 우선 사용하고 역할과 이름, 상태가 명확해야 한다.
* 인터랙티브 요소는 키보드만으로 완전한 조작이 가능해야 한다. 포커스 이동 순서가 시각 흐름과 일치해야 한다.
* 포커스 링을 제거하지 않는다. 커스텀 스타일을 적용하면 대체 포커스 표시를 제공한다.
* 텍스트 대비는 WCAG 기준을 만족한다. 일반 텍스트는 최소 4.5:1, 대 텍스트는 3:1 이상을 권장한다.
* 이미지에는 대체 텍스트를 제공한다. 장식용 이미지는 빈 alt를 사용한다.
* 폼 요소에는 레이블을 연결한다. 오류 메시지는 텍스트로 제공하고 포커스를 적절히 이동시킨다.
* 라이브 영역에는 ARIA 속성을 과도하게 사용하지 않는다. 필요한 영역만 role과 aria- 속성을 최소로 지정한다.
* 모달을 열면 배경 스크롤을 잠그고 포커스를 트랩한다. 닫을 때 포커스를 트리거로 되돌린다.
* 동적 업데이트가 잦은 영역은 스크린리더에 과도한 알림을 발생시키지 않도록 스로틀링하거나 중요 상태만 알린다.
* 테스트 시 키보드 전용 탐색, 스크린리더 한 번, 저시력 시뮬레이션을 기본 루틴으로 포함한다.

---

## 운영 팁

* 전역 로딩은 요청 개수 기반으로 깜빡임을 줄이고, 페이지 전환 로딩은 Suspense fallback으로 처리한다.
* API 에러는 표준 포맷으로만 올리고, 사용자 메시지와 개발 로그를 분리한다.
* 코드 스플리팅은 성능과 UX 균형을 유지한다. 초기 경로는 필수 자산만 포함하도록 유지한다.

