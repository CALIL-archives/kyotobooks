// Generated by CoffeeScript 1.7.1
var calil, log, parseSV, str2array, toObject;

log = function(obj) {
  try {
    return console.log(obj);
  } catch (_error) {}
};

str2array = function(str) {
  var array, i, il;
  array = [];
  i = void 0;
  il = str.length;
  i = 0;
  while (i < il) {
    array.push(str.charCodeAt(i));
    i++;
  }
  return array;
};

parseSV = function(str, delimiter) {
  if (!delimiter) {
    delimiter = "\t";
  }
  return str.split("\n").reduce((function(table, row) {
    if (!table) {
      return;
    }
    table.push(row.split(delimiter).map(function(d) {
      return d.trim();
    }));
    return table;
  }), []);
};

toObject = function(array) {
  var b, head, i, objArray, tmp;
  head = array.shift();
  objArray = [];
  b = 0;
  while (b < array.length) {
    tmp = {};
    i = 0;
    while (i < head.length) {
      tmp[head[i]] = array[b][i];
      i++;
    }
    objArray.push(tmp);
    b++;
  }
  return objArray;
};

calil = {
  books: null,
  results: [],
  libraries: {},
  systemIds: [],
  isbns: [],
  queue: {},
  checkedCount: 0,
  getLibrary: function() {
    var defer, param, url;
    url = 'http://api.calil.jp/library';
    param = {
      'appkey': 'your_api_key',
      'format': 'json',
      'pref': '京都府'
    };
    defer = $.Deferred();
    return $.ajax({
      url: url,
      data: param,
      dataType: 'jsonp',
      success: defer.resolve,
      error: defer.reject
    });
  },
  parseTSV: function() {
    var defer, url;
    url = 'kyotobook_list.txt';
    defer = $.Deferred();
    return $.ajax({
      url: url,
      dataType: 'text',
      success: defer.resolve,
      error: defer.reject
    });
  },
  QueueLimit: null,
  initQueue: function() {
    var i, isbn, _i, _len, _ref, _results;
    i = 0;
    _ref = this.isbns;
    _results = [];
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      isbn = _ref[_i];
      _results.push(this.queue[isbn] = 0);
    }
    return _results;
  },
  getISBNFromQueue: function() {
    var isbn, q, _i, _len, _ref;
    q = null;
    _ref = this.isbns;
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      isbn = _ref[_i];
      if (this.queue[isbn] === 0) {
        q = isbn;
        this.queue[isbn] = 1;
        break;
      }
    }
    if (q) {
      return q;
    } else {
      return null;
    }
  },
  getNextQueue: function(isbn) {
    var percent, q, _i, _len, _ref;
    this.queue[isbn] = true;
    q = null;
    _ref = this.isbns;
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      isbn = _ref[_i];
      if (this.queue[isbn] === 0) {
        q = isbn;
        break;
      }
    }
    if (q) {
      this.checkedCount += 1;
      percent = ((this.checkedCount / this.books.length) * 100).toFixed(2);
      $('.progress-bar').css('width', percent + '%');
      $('.percent').html(percent + '% 完了');
      return q;
    } else {
      log('queue complete');
      return null;
    }
  },
  checkAPI: function() {
    var defer, isbn, param, url;
    log('start');
    isbn = this.getISBNFromQueue();
    log(isbn);
    $('#results #' + isbn + ' .status').html('検索中...');
    url = 'http://api.calil.jp/check';
    param = {
      'appkey': 'your_api_key',
      'systemid': this.systemIds.join(','),
      'isbn': isbn
    };
    defer = $.Deferred();
    return $.ajax({
      url: url,
      data: param,
      dataType: 'jsonp',
      success: defer.resolve,
      error: defer.reject
    }).done((function(_this) {
      return function(data) {
        log(data);
        if (data["continue"] === 0 && (data.books != null)) {
          _this.analyzeData(data.books);
        }
        if (data["continue"] === 1) {
          return _this.recheckAPI(isbn, data.session);
        }
      };
    })(this)).fail((function(_this) {
      return function() {
        if (_this.queue[isbn] <= 3) {
          setTimeout(function() {
            return _this.checkAPI(isbn).done(function(data) {
              log(data);
              if (data["continue"] === 0 && (data.books != null)) {
                _this.analyzeData(data.books);
              }
              if (data["continue"] === 1) {
                return _this.recheckAPI(isbn, data.session);
              }
            });
          }, 11000);
          setTimeout((function() {
            return _this.queue[isbn]++;
          }), 1000);
        }
        return $('#results #' + isbn + ' .status').html('検索失敗');
      };
    })(this));
  },
  recheckAPI: function(isbn, session) {
    var defer, param, url;
    param = {
      'appkey': 'your_api_key',
      'session': session
    };
    url = 'http://api.calil.jp/check';
    defer = $.Deferred();
    return $.ajax({
      url: url,
      data: param,
      dataType: 'jsonp',
      success: defer.resolve,
      error: defer.reject
    }).done((function(_this) {
      return function(data) {
        log(data);
        if (data["continue"] === 1) {
          setTimeout(function() {
            log('recheck');
            return _this.recheckAPI(isbn, data.session);
          }, 1000);
        }
        if (data["continue"] === 0) {
          log('done');
          if (data && (data.books != null)) {
            return calil.analyzeData(data.books);
          }
        }
      };
    })(this));
  },
  getBookData: function(isbn) {
    var book, _i, _len, _ref;
    _ref = calil.books;
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      book = _ref[_i];
      if (book.ISBN.replace(/-/g, '') === isbn) {
        return book;
      }
    }
    return false;
  },
  getLibraryData: function(systemid) {
    var lib, _i, _len, _ref;
    _ref = calil.libraries;
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      lib = _ref[_i];
      if (lib.systemid === systemid) {
        return lib;
      }
    }
    return false;
  },
  getColor: function(status) {
    var status_color;
    status_color = {
      "貸出可": "#1ab0f3",
      "蔵書あり": "#20a402",
      "館内のみ": "#f67ba6",
      "貸出中": "#f7ae00",
      "予約中": "#f7ae00",
      "準備中": "#f7ae00",
      "休館中": "#f7ae00"
    };
    if (status_color[status]) {
      return status_color[status];
    }
    return "";
  },
  analyzeData: function(results) {
    var count, isbn, lib, libname, library, libraryName, libs, publicCount, q, result, specialCount, status, statuses, systemid, univCount, _i, _len, _ref, _ref1;
    for (isbn in results) {
      libs = results[isbn];
      if ($('#results #' + isbn + ' .status').attr('analyzed') === 'true') {
        return;
      }
      $('#results #' + isbn + ' .status').empty();
      $('#results #' + isbn + ' .status').attr('analyzed', 'true');
      count = 0;
      publicCount = 0;
      univCount = 0;
      specialCount = 0;
      statuses = {};
      for (systemid in libs) {
        result = libs[systemid];
        library = this.getLibraryData(systemid);
        log(result);
        if (result.status === 'Error') {
          log('Error');
          continue;
        }
        if (result.libkey) {
          _ref = result.libkey;
          for (libname in _ref) {
            status = _ref[libname];
            log(libname);
            log(status);
            if (libname === '東京本館' && status === '蔵書あり') {
              continue;
            }
            if (library.category === 'UNIV' || library.category === 'SPECIAL') {
              libraryName = library.formal;
            } else {
              libraryName = library.city;
            }
            if (library.category === 'SMALL' || library.category === 'MEDIUM' || library.category === 'LARGE' || library.category === 'BM') {
              publicCount += 1;
            }
            if (library.category === 'UNIV') {
              univCount += 1;
            }
            if (library.category === 'SPECIAL') {
              specialCount += 1;
            }
            if (status === '') {
              status = '蔵書なし';
            }
            statuses[library.formal] = status;
            $('#results #' + isbn + ' .status').append("<table>\n  <td>" + libraryName + "</td>\n  <td style=\"color:#FFFFFF;background:" + (this.getColor(status)) + "\">" + libname + ":" + status + "</td>\n</table>");
            count += 1;
          }
        }
      }
      result = [this.getBookData(isbn).property.replace('http://libmaro.kyoto.jp/kyotobook_list/', ''), this.getBookData(isbn).title, this.getBookData(isbn).ISBN, count, publicCount, univCount, specialCount];
      _ref1 = calil.libraries;
      for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
        lib = _ref1[_i];
        if (statuses[lib.formal]) {
          status = statuses[lib.formal];
        } else {
          status = '';
        }
        result.push(status);
      }
      this.results.push(result);
      $('#results #' + isbn + ' .status').prev().append(' ' + count + '冊発見!');
      if (count === 0) {
        $('#results #' + isbn + ' .status').html('見つかりませんでした');
      }
    }
    q = this.getNextQueue(isbn);
    if (q) {
      return this.checkAPI();
    } else {
      log('終了');
      $('.progress-bar').css('width', '100%').removeClass('active');
      $('.percent').html('100% 完了');
      return this.completeFunc();
    }
  },
  completeFunc: function() {}
};

$(function() {
  return calil.getLibrary().done(function(libraries) {
    var addSystems, lib, _i, _len, _ref;
    calil.libraries = libraries;
    addSystems = {};
    _ref = calil.libraries;
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      lib = _ref[_i];
      if (!addSystems[lib.systemid]) {
        calil.systemIds.push(lib.systemid);
        addSystems[lib.systemid] = true;
      }
    }
    return log(calil.systemIds);
  }).done(function() {
    return calil.parseTSV().done(function(tsv) {
      var book, isbn, _i, _len, _ref, _results;
      log(toObject(parseSV(tsv)));
      calil.books = toObject(parseSV(tsv));
      _ref = calil.books;
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        book = _ref[_i];
        if (book.ISBN) {
          if (book.ISBN.match('  ')) {
            isbn = book.ISBN.split('  ')[0];
          } else {
            isbn = book.ISBN.replace(/-/g, '');
          }
          calil.isbns.push(isbn);
          _results.push($('#results').append("<tr id=\"" + isbn + "\"><th>" + book.title + "</th><td class=\"status\"></td></tr>"));
        } else {
          _results.push(void 0);
        }
      }
      return _results;
    }).done(function() {
      calil.initQueue();
      calil.completeFunc = function() {
        return $('#csv').show();
      };
      calil.checkAPI();
      calil.checkAPI();
      calil.checkAPI();
      calil.checkAPI();
      calil.checkAPI();
      calil.checkAPI();
      calil.checkAPI();
      calil.checkAPI();
      calil.checkAPI();
      return calil.checkAPI();
    });
  });
});

$('#csv').click(function() {
  var a, array, blob, csvbuf, header, isbn, lib, r, sjis_array, uint8_array, _i, _j, _len, _len1, _ref, _ref1;
  r = [];
  header = ['', '書名', 'ISBN', '館数(' + calil.libraries.length + '館中)', '公共図書館', '大学図書館', '専門図書館'];
  _ref = calil.libraries;
  for (_i = 0, _len = _ref.length; _i < _len; _i++) {
    lib = _ref[_i];
    header.push(lib.formal);
  }
  header = header;
  r.push(header);
  _ref1 = calil.isbns;
  for (_j = 0, _len1 = _ref1.length; _j < _len1; _j++) {
    isbn = _ref1[_j];
    $(calil.results).each(function(i, result) {
      if (result[2].replace(/-/g, '') === isbn) {
        return r.push(result);
      }
    });
  }
  a = document.createElement('a');
  a.download = '京都本.csv';
  a.type = 'text/csv';
  csvbuf = r.map(function(e) {
    return e.join(',');
  }).join('\r\n');
  array = str2array(csvbuf);
  sjis_array = Encoding.convert(array, "SJIS", "UNICODE");
  uint8_array = new Uint8Array(sjis_array);
  blob = new Blob([uint8_array], {
    "type": "text/csv"
  });
  a.href = (window.URL || webkitURL).createObjectURL(blob);
  return a.click();
});

/*
//@ sourceMappingURL=calil.map
*/
