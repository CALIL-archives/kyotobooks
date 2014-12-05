log = (obj)->
  try
    console.log obj

#waitTime = (time) ->
#  dfd = $.Deferred()
#  setTimeout (->
#    console.log "resolve#wait_time(" + time + ") "
#    dfd.resolve()
#    return
#  ), time
#  dfd.promise()
#
#sleep = (func, time)->
#  setTimeout ->
#    func()
#  , time

# 文字列を配列に
str2array = (str) ->
  array = []
  i = undefined
  il = str.length
  i = 0
  while i < il
    array.push str.charCodeAt(i)
    i++
  array

parseSV = (str, delimiter) ->
  delimiter = "\t"  unless delimiter
  str.split("\n").reduce ((table, row) ->
    return  unless table
    table.push row.split(delimiter).map((d) -> #余白削除
      d.trim()
    )
    table
  ), []

toObject = (array) ->
  head = array.shift()
  objArray = []
  b = 0

  while b < array.length
    tmp = {}
    i = 0

    while i < head.length
      tmp[head[i]] = array[b][i]
      i++
    objArray.push tmp
    b++
  objArray



calil =
  books     : null
  results   : []
  libraries : {}
  systemIds : []
  isbns     : []
  queue     : {}
  checkedCount: 0
  getLibrary: ->
    url = 'http://api.calil.jp/library'
    param =
      'appkey' : 'your_api_key'
      'format' : 'json'
      'pref'   : '京都府'
    defer = $.Deferred()
    $.ajax
      url: url
      data: param
      dataType: 'jsonp'
      success: defer.resolve
      error: defer.reject

  parseTSV: ->
    url = 'kyotobook_list.txt'
#    url = 'kyotobook_list_mini.txt'
    defer = $.Deferred()
    $.ajax
      url: url
      dataType: 'text'
      success: defer.resolve
      error: defer.reject
  QueueLimit : null
  # キューの初期化
  initQueue: ->
    i = 0
    for isbn in @isbns
      @queue[isbn] = 0
  getISBNFromQueue : ->
    # 値が0のキューを探す
    q = null
    for isbn in @isbns
      if @queue[isbn]==0
        q = isbn
        @queue[isbn] = 1
        break
    if q
      return q
    else
      return null
  # 次のキューを取得
  getNextQueue: (isbn)->
    @queue[isbn] = true
    # 値が0のキューを探す
    q = null
    for isbn in @isbns
      if @queue[isbn]==0
        q = isbn
        break
    if q
      @checkedCount+=1
      # プログレスバーに反映
      percent = ((@checkedCount/@books.length) * 100).toFixed(2)
      $('.progress-bar').css('width', percent+'%')
      $('.percent').html(percent+'% 完了')
      return q
    else
      log 'queue complete'
      $('.progress-bar').css('width', '100%').removeClass('active')
      $('.percent').html('100% 完了')
      @completeQueue()
      return null
  # キュー終了時に実行する関数をセット
  completeQueue: ->

  checkAPI : ()->
    log 'start'
    isbn = @getISBNFromQueue()
    log isbn
    $('#results #'+isbn+' .status').html('検索中...')
    url = 'http://api.calil.jp/check'
    param =
      'appkey'  : 'your_api_key'
      'systemid': @systemIds.join(',')
      'isbn'    : isbn
    defer = $.Deferred()
    return $.ajax
      url: url
      data: param
      dataType: 'jsonp'
      success: defer.resolve
      error: defer.reject
    .done (data)=>
      log data
      if data.continue==0 and data.books?
        @analyzeData(data.books)
      # 継続の場合、セッションを使って再帰処理をかける
      if data.continue==1
        @recheckAPI(isbn, data.session)
    .fail =>
      # 通信エラー 3回まで再実行する
      if @queue[isbn] <= 3
        setTimeout(=>
          @checkAPI(isbn).done (data)=>
            log data
            if data.continue==0 and data.books?
              @analyzeData(data.books)
            # 継続の場合、セッションを使って再帰処理をかける
            if data.continue==1
              @recheckAPI(isbn, data.session)
        , 11000)
        setTimeout (=>
          @queue[isbn]++
        ), 1000
      $('#results #'+isbn+' .status').html('検索失敗')

  recheckAPI : (isbn, session)->
#    d = jQuery.Deferred();d.then ->
    param =
      'appkey'  : 'your_api_key'
      'session' : session
    url = 'http://api.calil.jp/check'
    defer = $.Deferred()
    $.ajax
      url: url
      data: param
      dataType: 'jsonp'
      success : defer.resolve
      error   : defer.reject

    .done (data)=>
      log data
      if data.continue==1
        # 1秒待つ
        setTimeout =>
          log 'recheck'
          @recheckAPI(isbn, data.session)
        , 1000
#        return d.reject
      if data.continue==0
        log 'done'
        if data and data.books?
          calil.analyzeData(data.books)
#          return d.resolve
#    );return d.promise()

  # 本データの取得
  getBookData: (isbn)->
    for book in calil.books
      if book.ISBN.replace(/-/g, '')==isbn
        return book
    return false
  # 図書館データの取得
  getLibraryData: (systemid)->
    for lib in calil.libraries
      if lib.systemid==systemid
        return lib
    return false
  getColor: (status) ->
    status_color =
      "貸出可": "#1ab0f3"
      "蔵書あり": "#20a402"
      "館内のみ": "#f67ba6"
      "貸出中": "#f7ae00"
      "予約中": "#f7ae00"
      "準備中": "#f7ae00"
      "休館中": "#f7ae00"

    if status_color[status]
      return status_color[status]
    return ""
  # APIの結果の分析表示
  analyzeData: (results)->
    for isbn, libs of results
      if $('#results #'+isbn+' .status').attr('analyzed')=='true'
        return
      $('#results #'+isbn+' .status').empty()
      $('#results #'+isbn+' .status').attr('analyzed', 'true')
      count = 0
      publicCount  = 0
      univCount    = 0
      specialCount = 0
      statuses = {}
      for systemid, result of libs
#        log systemid
        library = @getLibraryData(systemid)
        log result
        if result.status=='Error'
          log 'Error'
          continue
        if result.libkey
          for libname, status of result.libkey
            log libname
            log status
            # 国立国会図書館東京本館は除外する
            if libname=='東京本館' and status=='蔵書あり'
              continue
            if library.category=='UNIV' or library.category=='SPECIAL'
              libraryName = library.formal
            else
              libraryName = library.city
            # 図書館の種類別に集計
            if library.category=='SMALL' or library.category=='MEDIUM' or library.category=='LARGE' or library.category=='BM'
              publicCount += 1
            if library.category=='UNIV'
              univCount   += 1
            if library.category=='SPECIAL'
              specialCount+= 1
            if status==''
              status = '蔵書なし'
            statuses[library.systemid] = status
            $('#results #'+isbn+' .status').append("""
<table>
  <td>#{libraryName}</td>
  <td style="color:#FFFFFF;background:#{@getColor(status)}">#{libname}:#{status}</td>
</table>
""")
            count += 1
      result = [@getBookData(isbn).property.replace('http://libmaro.kyoto.jp/kyotobook_list/', ''), @getBookData(isbn).title, @getBookData(isbn).ISBN, count, publicCount, univCount, specialCount]
      for lib in calil.libraries
        if statuses[lib.systemid]
          status = statuses[lib.systemid]
        else
          status = ''
        result.push(status)
      @results.push(result)
      $('#results #'+isbn+' .status').prev().append(' '+count+'冊発見!')
      if count==0
        $('#results #'+isbn+' .status').html('見つかりませんでした')
    # 次のキューをセットする
    q = @getNextQueue(isbn)
    if q
      @checkAPI()
    else
      log '終了'

$ ->
  # 京都府の図書館一覧を取得する
  calil.getLibrary().done (libraries)->
    calil.libraries = libraries
    addSystems  = {}
    for lib in calil.libraries
      if not addSystems[lib.systemid]
        calil.systemIds.push lib.systemid
        addSystems[lib.systemid] = true
    log calil.systemIds

  .done ->
    # 京都が出てくる本のデータをパース
    calil.parseTSV().done (tsv)->
      log toObject(parseSV(tsv))
      calil.books = toObject(parseSV(tsv))
      for book in calil.books
#        log book.ISBN
        if book.ISBN
          # ISBNが2つある場合、1つ目にする
          if book.ISBN.match('  ')
            isbn = book.ISBN.split('  ')[0]
          else
            isbn = book.ISBN.replace(/-/g, '')
          calil.isbns.push isbn
          $('#results').append("""<tr id="#{isbn}"><th>#{book.title}</th><td class="status"></td></tr>""")

    # 順番にカーリルAPIに問い合わせる
    .done ->
      calil.initQueue()
      # 終了時の処理
      calil.completeQueue = ->
        $('#csv').show()
      # 同時に実行する
      calil.checkAPI()
      calil.checkAPI()
      calil.checkAPI()
      calil.checkAPI()
      calil.checkAPI()
      calil.checkAPI()
      calil.checkAPI()
      calil.checkAPI()
      calil.checkAPI()
      calil.checkAPI()
#      dfds = []
#      i = 0
      # タスクをつくる
#      time = 0
#        sleep ->
#          log 'start:'+isbn
#          calil.checkAPI(isbn)
#        , time
#        time+=10000
#        dfd = calil.checkAPI(isbn)
#        dfds.push dfd
#        dfds.push waitTime(10000)
#        i++
#        if i > 10
#          break
      # 逐次実行
#      $.when.apply($, dfds).done ->
#        log 'complete'
#        $('#csv').show()


# CSVダウンロードボタン
$('#csv').click ->
  r = []
  header = ['', '書名', 'ISBN', '館数('+calil.libraries.length+'館中)', '公共図書館', '大学図書館', '専門図書館']
  # 各図書館をヘッダーに追加
  for lib in calil.libraries
    header.push(lib.formal)
  header = header
  r.push(header)
  for isbn in calil.isbns
    $(calil.results).each (i, result)->
      if result[2].replace(/-/g, '')==isbn
        r.push(result)
  a = document.createElement('a')
  a.download = '京都本.csv'
  a.type = 'text/csv'
  csvbuf = r.map((e)-> return e.join(',')).join('\r\n')
  array = str2array(csvbuf)
  sjis_array = Encoding.convert(array, "SJIS", "UNICODE")
  uint8_array = new Uint8Array(sjis_array)
  blob = new Blob([uint8_array], {"type": "text/csv"})
  a.href = (window.URL || webkitURL).createObjectURL(blob)
  a.click()
