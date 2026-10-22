# IT Company Game

ブラウザで動作するIT会社経営シミュレーションゲームのプロトタイプです。

## 起動方法

JSONデータをES Modulesから読み込むため、`index.html`を直接ダブルクリックするのではなく、ローカルサーバー経由で起動してください。

```powershell
python -m http.server 8000
```

ブラウザで <http://localhost:8000/> を開きます。

## 遊び方

1. 「案件」から条件を満たす案件を受注します。
2. 「次の月へ」で時間を進め、案件を完成させます。
3. 「社員」から採用費を支払ってチームを強化します。
4. ランダムイベントの選択肢を選びながら、5年間で会社を成長させます。

初期状態とゲーム中の状態はブラウザのLocalStorageに保存されます。データを初期化する場合は、ブラウザの開発者ツールからLocalStorageの`it-company-game-save`を削除してください。

## データの追加・調整

- 案件: `data/projects/small.json`, `data/projects/medium.json`, `data/projects/large.json`
- 社員: `data/employees/programmers.json`, `data/employees/designers.json`, `data/employees/managers.json`
- イベント: `data/events/employees.json`, `data/events/projects.json`, `data/events/company.json`, `data/events/random.json`

上記JSONの値を変更すると、ゲームバランスや登場データを調整できます。
