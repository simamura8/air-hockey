# AIR HOCKEY

HTML / CSS / JavaScriptだけの、シンプルなエアホッケー。GitHub Pagesで公開し、PeerJS / WebRTCで2人のブラウザを直接つなぎます。ビルドもゲーム用サーバーの契約も不要です。

## 遊び方

1. ゲームのURLを開き、「ルームをつくる」を押します。
2. 「URLをコピー」でコピーし、対戦相手に送ります。
3. 相手がそのURLを開いて「参加 →」を押すと対戦開始です。
4. マウス・タッチ・矢印キーで青いマレットを操作。先に5点取ると勝ちです。

両プレイヤーとも、自分が下・相手が上に表示されます。矢印キーを使うときはテーブルをクリックしてください。再戦は作成者の「もう一度」から。練習モードではCPUと対戦できます。

## ローカルで試す

Node.jsを入れた環境で、以下を実行します。npm installは不要です。

```sh
npm start
```

ブラウザで http://127.0.0.1:4173 を開きます。2つのウィンドウでルームを作成・参加すると対戦を試せます。localhostの招待URLは別の端末では使えません。別の端末と遊ぶときは公開URLを使ってください。`index.html`を直接開いて練習することもできます。

```sh
npm test
```

## GitHub Pagesで無料公開

公開リポジトリにファイルを置き、GitHubの **Settings → Pages → Deploy from a branch → main / (root)** を指定します。公開URLは `https://ユーザー名.github.io/リポジトリ名/` です。

## 仕組みと無料の範囲

- GitHub Pages: HTML、CSS、JavaScriptを配信。GitHub Freeでは公開リポジトリで利用できます。
- PeerJS Cloud: 無料の接続仲介。対戦の開始時にブラウザ同士を引き合わせます。
- WebRTC DataChannel: 対戦データを直接送受信。作成者のブラウザが衝突判定と得点を計算し、毎秒30回状態を送信します。参加者は自分の入力を送信します。
- アカウント登録、クレジットカード、独自ドメイン、APIキーの設定は不要です。現行の無料サービスの範囲を使います。将来の提供継続や常時接続は保証されません。

学校・会社・携帯回線などのネットワーク構成によっては直接接続できません。この試作品はTURN中継を使っていないため、その場合は別の回線で試してください。PeerJSの無料TURN提供は終了しています。幅広い回線での接続を必要とする場合は、別途TURN中継やサーバー方式が必要です。

対戦中は両者ともゲーム画面を開いてください。別タブやバックグラウンドにすると一時停止し、長時間通信が途切れると退出扱いになります。リロード後の復帰、観戦、ランキング、自動マッチングはありません。友人とのカジュアル対戦を想定しています。ルームコードや招待URLを知っている人が参加でき、ブラウザ間の直接接続では相手にIPアドレスが伝わる場合があります。

## ファイル

| ファイル | 役割 |
| --- | --- |
| `index.html` | 画面・操作ボタン |
| `style.css` | PC・スマホの見た目 |
| `game.js` | 描画・操作・CPU・オンライン接続 |
| `physics.js` | 移動・衝突判定・得点 |
| `vendor/peerjs.min.js` | PeerJS 1.5.5（MIT、同梱ライセンス参照） |
| `server.cjs` | ローカル確認用サーバー |
| `tests/physics.test.cjs` | ゲームルールのテスト |

公式資料: [GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages)、[PeerJS FAQ](https://peerjs.com/client/faq)、[無料TURN終了のお知らせ](https://github.com/orgs/peers/discussions/1172)
