# todo崩し

TODOリスト × ブロック崩しゲームのiOSアプリ

## ファイル構成

```
todo-kuzushi/
├── www/
│   ├── index.html      ← メインHTML
│   ├── style.css       ← スタイル
│   └── app.js          ← TODO + ゲームロジック
├── package.json
├── capacitor.config.json
├── codemagic.yaml
└── README.md
```

## 機能

### TODOモード（トグル OFF）
- 10件のタスク入力
- チェックでグレーアウト＋取り消し線
- テキスト入力（最大20文字/件）

### ゲームモード（トグル ON）
- TODOの文字が1文字ずつブロックに変換
- ブロック崩しゲーム開始
- 画面タッチ/ドラッグでパドル操作
- CLEAR / GAME OVER 判定
- TODOモードに戻すとリストは元通り

## iOSビルド手順

```bash
# 1. 依存関係インストール
cd todo-kuzushi
npm install

# 2. iOSプロジェクト生成（初回のみ）
npx cap add ios

# 3. 同期
npx cap sync ios

# 4. Xcodeで開く
npx cap open ios
```

## Codemagicでのリリース

前回の「左右落下」と同じ手順で：
1. GitHubにpush
2. Codemagicでリポジトリ連携
3. 証明書・Provisioning Profileをアップロード
4. 環境変数（APP_STORE_CONNECT_*）を設定
5. ビルド実行 → TestFlight自動配信
