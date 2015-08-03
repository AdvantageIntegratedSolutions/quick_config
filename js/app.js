// App
// --------------------------------------------------------------------
var App = {
  init: function() {
    var self = this;

    this.cacheElements();
    this.setEventListeners();

    this.getCurrentURL()
    .then(function(url) {
      var appData = Util.parseUrl(url);
      self.appData = appData;

      return Fields.fetch(self.appData)
    })
    .then(function(fields) {
      self.render(fields);
    })
  },

  cacheElements: function() {
    this.$tableLink = $("#tableLink");
    this.$deleteLink = $("#deleteLink");

    this.$tableSection = $("#tables");
    this.$deleteSection = $("#delete");

    this.$copyBtn = $(".copy-button");
    this.$tableName = $(".table-name");
    this.$tableTextArea = $(".table-textarea");

    this.$deleteInput = $("#deleteInput");
    this.$deleteBtn = $("#deleteBtn");
    this.$deleteText = $("#deleteText");
  },

  setEventListeners: function() {
    this.$tableLink.on('click', this.setTableUI);
    this.$deleteLink.on('click', this.setDeleteUI);

    this.$copyBtn.on('click', this.handleCopy);

    this.$deleteInput.on('keyup', this.handleInputKeydown);
    this.$deleteBtn.on('click', this.handleDelete);
  },

  getCurrentURL: function() {
    var dfd = new $.Deferred();

    chrome.tabs.getSelected(function(tab) {
      dfd.resolve(tab.url);
    });

    return dfd.promise();
  },

  render: function(fields) {
    var tableName = fields.tableName;
    var fieldData = fields.fieldData;
    var tableText = JSON.stringify(fieldData, null, 2).replace(/"/g, "");

    this.$tableName.text(tableName);
    this.$tableTextArea.text(tableText);
  },

  setTableUI: function(e) {
    var self = App;

    $(".active").removeClass('active');

    self.$deleteSection.hide();
    self.$tableSection.fadeIn();
    self.$tableLink.addClass('active');
  },

  setDeleteUI: function(e) {
    var self = App;

    $(".active").removeClass('active');

    self.$tableSection.hide();
    self.$deleteSection.fadeIn();
    self.$deleteLink.addClass('active');
  },

  handleCopy: function(e) {
    var self = App;
    var $this = $(this);
    var $textArea = $this.parents('.white-box').find('.table-textarea');

    $textArea.select();
    document.execCommand('copy');
  },

  handleInputKeydown:function(e) {
    var self = App;
    var $this = $(this);
    var val = $this.val().trim().toLowerCase();
    var isCorrect = val == 'delete'

    self.$deleteBtn.attr('disabled', !isCorrect);

    isCorrect ? $(".fa-check").fadeIn(200) : $(".fa-check").fadeOut(200)
  },

  handleDelete: function(e) {
    var self = App;
    var query = "{'1'.EX.'today'}AND{'4'.TV.'_curuser_'}";
    var url = "https://" + self.appData.realm + ".quickbase.com/db/" + self.appData.dbid + "?a=API_PurgeRecords&query=" + query;

    self.$deleteInput.hide();
    self.$deleteBtn.hide();
    $(".fa-check").hide();

    $.ajax(url, {
      method: 'POST',
      contentType: 'xml'
    })
    .done(function(res) {
      var numDeleted = $(res).find('num_records_deleted').text();
      self.$deleteText.text(numDeleted + " record(s) deleted.").fadeIn();
    })
  }
};


// Fields
// --------------------------------------------------------------------
var Fields = {
  fetch: function(appData) {
    var self = this;
    var dbid = appData.dbid;
    var realm = appData.realm;
    var url = "https://" + realm + ".quickbase.com/db/" + dbid + "?a=API_GetSchema";

    return $.ajax(url, {
      method: 'POST',
      contentType: 'xml'
    })
    .then(function(res) {
      console.log("RES:", res)
      return self.parse(res)
    })
  },

  parse: function(res) {
    var self = this;
    var $res = $(res);
    var result;

    if ($res.find('chdbid').length) {
      result = self.parseMultiple($res);
    }
    else {
      result = self.parseSingle($res);
    }

    return result;
  },

  parseMultiple: function($res) {
    var childrenTables = $res.find('chdbid').map(function() {
      var $table = $(this);
      var dbid = $table.text();

      return dbid;
    }).get()

    childrenTables.map(function(dbid) {
      return self.parseSingle
    })
  },

  parseSingle: function($res) {
    var $fields = $res.find('field');
    var tableName = $res.find('name').text();
    var dbid = $res.find('table_id').text();
    var result = {};
    var fieldsObj = {};

    $fields.each(function() {
      var $field = $(this);
      var fieldName = Util.camelize( $field.find('label').text() );
      var fid = Number( $field.attr('id') );

      fieldsObj[fid] = fieldName;
    });

    fieldsObj = Util.invertObj(fieldsObj);
    fieldsObj['dbid'] = "'" + dbid + "'";

    return {
      tableName: tableName,
      fieldData: fieldsObj
    }
  }
};


// Utilities
// --------------------------------------------------------------------
var Util = {
  camelize: function(str) {
    return str.replace(/#/, 'Number').replace(/(?:^\w|[A-Z]|\b\w)/g, function(letter, index) {
      return index == 0 ? letter.toLowerCase() : letter.toUpperCase();
    }).replace(/\s+|\W+/g, '');
  },

  parseUrl: function(url) {
    var matchData = url.match(/https:\/\/(.*)\.quickbase.com\/db\/(\w+)/);
    var realm = matchData[1];
    var dbid = matchData[2];

    return {
      realm: realm,
      dbid: dbid
    }
  },

  invertObj: function(obj) {
    var new_obj = {};

    for (var prop in obj) {
      if(obj.hasOwnProperty(prop)) {
        new_obj[obj[prop]] = prop;
      }
    }

    return new_obj;
  }
};


// Fire It Off!
// --------------------------------------------------------------------
App.init()