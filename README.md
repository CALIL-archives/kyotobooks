# 京都本のある図書館はどこ？

京都が出てくる本がどこの図書館にあるか調べるためのサンプルプログラムです。

# 元にしたデータ

京都が出てくる本のデータ｜オープンデータ共有＆ダウンロード｜LinkData
http://linkdata.org/work/rdf1s1294i

2014/12/02時点のデータを使用

# 使用API

図書館 API | カーリル
https://calil.jp/doc/api.html

# 利用ライブラリ

encoding.js
https://github.com/polygonplanet/encoding.js


# 動作環境

Google Chrome最新版でのみ動作確認

動作にはhttpサーバーが必須です。

ローカルでPythonを使って、１行でhttpサーバーを立ち上げる

python -m SimpleHTTPServer 8080

http://127.0.0.1:8080

にアクセスで表示


# 参考にしたページ

JavaScript - CSVをパースする - Qiita
http://qiita.com/_shimizu/items/e45f94e7ee8a75a04e50