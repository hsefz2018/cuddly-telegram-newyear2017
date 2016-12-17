(function (window) {
  var ctel = function (opt) {
    if (!(this instanceof ctel)) return new ctel(opt);
    opt = opt || {};
    opt.width = opt.width || window.innerWidth || 1080;
    opt.height = opt.height || window.innerHeight || 720;
    opt.lineHeight = opt.lineHeight || undefined;
    opt.fontSize = opt.fontSize || undefined;
    opt.removeCallback = opt.removeCallback || undefined;
    opt.timeoutCallback = opt.timeoutCallback || undefined;
    this.opt = opt;
    this._rowTSpareR = [];
    this._rowTSpareL = [];
    this._rowBSpare = [];
    this._bulletsT = [];
    this._bulletsB = [];
    this._showT = true;
    this._showB = true;
    this._selBullet = null;
    this.sayHello();
    this.initEl();
  };

  ctel.prototype.sayHello = function () {
    console.log('Hello from Cuddly Telegram');
  };

  ctel.prototype.initEl = function () {
    this._el = window.document.createElement('div');
    this._el.style.position = 'absolute';
    this._el.style.left = '0px';
    this._el.style.top = '0px';
    this._el.style.pointerEvents = 'none';
    this._el.style.background = 'none';
    this._el.style.overflow = 'hidden';
    this._el.style.transition = 'width 500ms cubic-bezier(0.215, 0.610, 0.355, 1), height 200ms cubic-bezier(0.215, 0.610, 0.355, 1)';
    this.updateSize();
  };

  ctel.prototype.getEl = function () { return this._el; };

  ctel.prototype.getLineHeight = function () { return (this.opt.lineHeight || (this.opt.height * 1.2 / 24)); };

  ctel.prototype.updateSize = function (w, h) {
    this.opt.width = w || this.opt.width;
    this.opt.height = h || this.opt.height;
    this._el.style.width = this.opt.width.toString() + 'px';
    this._el.style.height = this.opt.height.toString() + 'px';
    var cur_rows = Math.floor(this.opt.height / this.getLineHeight());
    while (this._rowTSpareR.length < cur_rows) this._rowTSpareR.push(-1);
    while (this._rowTSpareL.length < cur_rows) this._rowTSpareL.push(-1);
    while (this._rowBSpare.length < cur_rows) this._rowBSpare.push(-1);
    while (this._rowTSpareR.length > cur_rows) this._rowTSpareR.pop();
    while (this._rowTSpareL.length > cur_rows) this._rowTSpareL.pop();
    while (this._rowBSpare.length > cur_rows) this._rowBSpare.pop();
  };

  ctel.prototype.createBullet = function (id, text, colour, isShown) {
    var el = window.document.createElement('div');
    this._el.appendChild(el);
    el._cmtID = id;
    el.style.fontSize = this.opt.fontSize || (Math.round(this.opt.height / 24).toString() + 'px');
    el.style.color = colour || 'white';
    el.style.width = 'auto';
    el.style.whiteSpace = 'nowrap'; // for handling whitespaces; see http://stackoverflow.com/questions/118241/
    el.textContent = text;
    el.style.position = 'absolute';
    el.style.pointerEvents = 'none';
    el.style.opacity = isShown ? 1 : 0;
    el.style.transition = 'opacity 0.15s linear, background-color 0.15s linear';
    return el;
  };

  ctel.prototype.emitTop = function (id, text, colour) {
    var el = this.createBullet(id, text, colour, this._showT);
    // Abstractions
    var now = Date.now();
    var x = this.opt.width;
    var d = this.opt.width + el.clientWidth;
    var t = 10000;
    var v = d / t;
    var unblockR = now + el.clientWidth / v;
    var touchL = now + x / v;
    var unblockL = now + t;
    var rowIdx = -1;
    for (var i = 0; i < this._rowTSpareL.length; ++i) {
      if (this._rowTSpareR[i] < now && this._rowTSpareL[i] < touchL) { rowIdx = i; break; }
    }
    if (rowIdx == -1) {
      rowIdx = 0;
      for (var i = 1; i < this._rowTSpareL.length; ++i) {
        if (this._rowTSpareL[i] < this._rowTSpareL[rowIdx]) rowIdx = i;
      }
    }
    this._rowTSpareR[rowIdx] = unblockR;
    this._rowTSpareL[rowIdx] = unblockL;
    // Styles
    el.style.transition += ', left ' + Math.round(t / 1000).toString() + 's linear';
    el.style.left = Math.round(x).toString() + 'px';
    el.style.top = Math.round(rowIdx * this.getLineHeight() + 6).toString() + 'px';
    el._arrId = this._bulletsT.push(el) - 1;
    el._cancelled = false;
    setTimeout((function (_el, _x) { return function () {
      _el.style.left = _x.toString() + 'px';
    }; }(el, -el.clientWidth)), 25);
    var transitionEndCallback = (function (_this) { return function (e) {
      if (e.propertyName !== 'left') return;
      _this._bulletsT[e.target._arrId] = _this._bulletsT[_this._bulletsT.length - 1];
      _this._bulletsT[e.target._arrId]._arrId = e.target._arrId;
      _this._bulletsT.pop();
      e.target.parentNode.removeChild(e.target);
      if (!e.target._cancelled && typeof _this.opt.timeoutCallback === 'function') {
        _this.opt.timeoutCallback(e.target._cmtID);
      }
    }; }(this));
    el.addEventListener('transitionend', transitionEndCallback);
    el.addEventListener('webkitTransitionend', transitionEndCallback);
  };

  ctel.prototype.emitBottom = function (id, text, colour) {
    var el = this.createBullet(id, text, colour, this._showB);
    // Abstractions
    var now = Date.now();
    var x = (this.opt.width - el.clientWidth) / 2;
    var t = 5000;
    var unblock = now + t;
    var rowIdx = -1;
    for (var i = 0; i < this._rowBSpare.length; ++i) {
      if (this._rowBSpare[i] < now) { rowIdx = i; break; }
    }
    if (rowIdx == -1) {
      rowIdx = 0;
      for (var i = 1; i < this._rowBSpare.length; ++i) {
        if (this._rowBSpare[i] < this._rowBSpare[rowIdx]) rowIdx = i;
      }
    }
    this._rowBSpare[rowIdx] = unblock;
    // Styles
    el.style.left = Math.round(x).toString() + 'px';
    el.style.top = '';
    el.style.bottom = Math.round(rowIdx * this.getLineHeight() + 6).toString() + 'px';
    el._arrId = this._bulletsB.push(el) - 1;
    el._cancelled = false;
    setTimeout((function (_this, _el) { return function () {
      _this._bulletsB[_el._arrId] = _this._bulletsB[_this._bulletsB.length - 1];
      _this._bulletsB[_el._arrId]._arrId = _el._arrId;
      _this._bulletsB.pop();
      _el.parentNode.removeChild(_el);
      if (!_el._cancelled && typeof _this.opt.timeoutCallback === 'function') {
        _this.opt.timeoutCallback(_el._cmtID);
      }
    }; }(this, el)), t);
  };

  ctel.prototype.updateTopDisp = function (isShown) {
    this._showT = isShown;
    for (var i = 0; i < this._bulletsT.length; ++i)
      this._bulletsT[i].style.opacity = isShown ? 1 : 0;
  };
  ctel.prototype.updateBottomDisp = function (isShown) {
    this._showB = isShown;
    for (var i = 0; i < this._bulletsB.length; ++i)
      this._bulletsB[i].style.opacity = isShown ? 1 : 0;
  };

  var inRect = function (x0, y0, x1, y1, w, h) {
    return (x0 >= x1 && x0 <= x1 + w && y0 >= y1 && y0 <= y1 + h);
  };
  ctel.prototype.getBulletAt = function (x, y) {
    for (var i = 0; i < this._bulletsT.length; ++i)
      if (inRect(x, y, this._bulletsT[i].offsetLeft, this._bulletsT[i].offsetTop, this._bulletsT[i].clientWidth, this._bulletsT[i].clientHeight))
        return this._bulletsT[i];
    for (var i = 0; i < this._bulletsB.length; ++i)
      if (inRect(x, y, this._bulletsB[i].offsetLeft, this._bulletsB[i].offsetTop, this._bulletsB[i].clientWidth, this._bulletsB[i].clientHeight))
        return this._bulletsB[i];
    return null;
  };

  ctel.prototype.handleMouseMove = function (x, y) {
    var bullet = this.getBulletAt(x, y);
    if (!bullet) {
      if (this._selBullet) {
        this._selBullet.style.background = 'none';
        this._selBullet = null;
      }
    } else {
      bullet.style.background = 'rgba(255, 255, 255, 0.4)';
      this._selBullet = bullet;
    }
  };

  ctel.prototype.handleClick = function (x, y) {
    var bullet = this.getBulletAt(x, y) || this._selBullet;
    if (!bullet) return;
    bullet.style.opacity = 0;
    bullet._cancelled = true;
    if (typeof this.opt.removeCallback === 'function') {
      this.opt.removeCallback(bullet._cmtID);
    }
  };

  window.ctel = ctel;

// Network parts
var createXHR;
if (window.XMLHttpRequest) createXHR = function () { return new XMLHttpRequest(); };
else createXHR = function () { return new ActiveXObject('Microsoft.XMLHTTP'); };

// Plug-in parts

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }
function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }
function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var Component = videojs.getComponent('Component');
var Button = videojs.getComponent('Button');
var Popup = videojs.getComponent('Popup');
var PopupButton = videojs.getComponent('PopupButton');

// Hand-written classes (´Д` )
var ToggleButton = function (_Button) {
  _inherits(ToggleButton, _Button);

  function ToggleButton(player, options) {
    _classCallCheck(this, ToggleButton);
    var _this = _possibleConstructorReturn(this, _Button.call(this, player, options));
    _this.controlText(options && options.controlText || '');
    _this._isOn = false;
    return _this;
  }

  ToggleButton.prototype.buildCSSClass = function buildCSSClass() {
    return 'vjs-menu-object vjs-toggle-btn off ' + _Button.prototype.buildCSSClass.call(this);
  };

  ToggleButton.prototype.manualToggle = function manualToggle() {
    this._isOn = !this._isOn;
    if (this._isOn) {
      this.el_.classList.remove('off'); this.el_.classList.add('on');
    } else {
      this.el_.classList.remove('on'); this.el_.classList.add('off');
    }
  };

  ToggleButton.prototype.handleClick = function handleClick() {
    this.manualToggle();
    this.trigger('toggle', this._isOn);
  };

  return ToggleButton;
}(Button);

var CommentCtrlPanel = function (_Component) {
  _inherits(CommentCtrlPanel, _Component);

  function CommentCtrlPanel(player, options) {
    _classCallCheck(this, CommentCtrlPanel);
    var _this = _possibleConstructorReturn(this, _Component.call(this, player, options));
    return _this;
  }

  CommentCtrlPanel.prototype.createEl = function createEl() {
    var el = _Component.prototype.createEl.call(this, 'div', { className: 'vjs-cmtctrlpanel vjs-control' });

    var grpKara = document.createElement('div');
    var txtKara = document.createElement('div');
    txtKara.classList.add('vjs-menu-object');
    txtKara.textContent = '弹幕颜色';
    grpKara.appendChild(txtKara);
    var iptKara = document.createElement('button');
    iptKara.classList.add('vjs-menu-object');
    var picker = new jscolor(iptKara, {
      container: grpKara, value: "FFFFFF", mode: "HS", position: "left", hash: true,
      width: 120, height: 80, shadow: false, backgroundColor: 'transparent', borderWidth: 0
    });
    this._picker = iptKara;
    grpKara.appendChild(iptKara);
    el.appendChild(grpKara);

    var grpSendAs = document.createElement('div');
    var txtSendAs = document.createElement('div');
    txtSendAs.classList.add('vjs-menu-object');
    txtSendAs.textContent = '弹幕位置';
    grpSendAs.appendChild(txtSendAs);
    var btnSendAs = new ToggleButton();
    btnSendAs.addClass('vjs-toggle-btn-send');
    btnSendAs.on('toggle', (function (_this) { return function (e, isOn) { _this._sendAsBottom = isOn; }; }(this)));
    this._sendAsBottom = false;
    grpSendAs.appendChild(btnSendAs.el());
    el.appendChild(grpSendAs);

    var grpTop = document.createElement('div');
    var txtTop = document.createElement('div');
    txtTop.classList.add('vjs-menu-object');
    txtTop.textContent = '显示顶端';
    grpTop.appendChild(txtTop);
    var btnTop = new ToggleButton();
    btnTop.on('toggle', (function (_this) { return function (e, isOn) {
      if (typeof _this.updateTopDisp === 'function') _this.updateTopDisp(isOn);
    }; }(this)));
    btnTop.manualToggle();
    grpTop.appendChild(btnTop.el());
    el.appendChild(grpTop);

    var grpBottom = document.createElement('div');
    var txtBottom = document.createElement('div');
    txtBottom.classList.add('vjs-menu-object');
    txtBottom.textContent = '显示底部';
    grpBottom.appendChild(txtBottom);
    var btnBottom = new ToggleButton();
    btnBottom.on('toggle', (function (_this) { return function (e, isOn) {
      if (typeof _this.updateBottomDisp === 'function') _this.updateBottomDisp(isOn);
    }; }(this)));
    btnBottom.manualToggle();
    grpBottom.appendChild(btnBottom.el());
    el.appendChild(grpBottom);

    var grpFiltration = document.createElement('div');
    var txtFiltration = document.createElement('div');
    txtFiltration.classList.add('vjs-menu-object');
    txtFiltration.textContent = '弹幕过滤';
    grpFiltration.appendChild(txtFiltration);
    var btnFiltration = new ToggleButton();
    btnFiltration.addClass('vjs-toggle-btn-filtr');
    btnFiltration.on('toggle', function (e, isOn) {
      if (e.target.classList.contains('waiting')) return;
      e.target.classList.add('waiting');
      var xhr = createXHR();
      xhr.onreadystatechange = (function (_target) { return function () {
        if (xhr.readyState == 4 && xhr.status == 200) {
          _target.classList.remove('waiting');
        }
      }; }(e.target))
      xhr.open('POST', 'http://127.0.0.1:6033/set_filtration/' + (isOn ? '1' : '0'), true);
      xhr.send();
    });
    grpFiltration.appendChild(btnFiltration.el());
    el.appendChild(grpFiltration);
    var xhr = createXHR();
    xhr.onreadystatechange = function () {
      if (xhr.readyState == 4 && xhr.status == 200) {
        var filState = parseInt(xhr.responseText);
        if (filState == 1) btnFiltration.manualToggle();
      }
    }
    xhr.open('GET', 'http://127.0.0.1:6033/get_filtration', true);
    xhr.send();

    return el;
  };

  return CommentCtrlPanel;
}(Component);

var CommentCtrlPopupBtn = function (_PopupButton) {
  _inherits(CommentCtrlPopupBtn, _PopupButton);

  function CommentCtrlPopupBtn(player, options) {
    _classCallCheck(this, CommentCtrlPopupBtn);
    var _this = _possibleConstructorReturn(this, _PopupButton.call(this, player, options));
    return _this;
  }

  CommentCtrlPopupBtn.prototype.createPopup = function () {
    var popup = new Popup(this, { contentElType: 'div' });

    popup.el().style.height = 'auto';
    var b = new CommentCtrlPanel();
    popup.addItem(b);
    this.panel = b;

    return popup;
  };

  CommentCtrlPopupBtn.prototype.buildCSSClass = function () {
    return 'vjs-cmt-popupbtn ' + _PopupButton.prototype.buildCSSClass.call(this);
  };

  return CommentCtrlPopupBtn;
}(PopupButton);

  window.commentingPlugin = function (options) {
  this.on('loadeddata', function (e) {
    var xhr = createXHR();
    var _this = this;

    xhr.onreadystatechange = function () {
      if (xhr.readyState == 4 && xhr.status == 200) {

    // Connecting to socket
    var socket = io('http://127.0.0.1:6033/');
    socket.on('unauthorized', function () {
      window.location.href = window.location.href;
    });
    socket.on('comment', function (c) {
      // c: id, text, attr("<color>;<t/b>")
      var p = c.attr.lastIndexOf(';');
      var colour = c.attr.substring(0, p), style = c.attr.substring(p + 1);
      if (style === 't') player.ctel.emitTop(c.id, c.text, colour);
      else if (style === 'b') player.ctel.emitBottom(c.id, c.text, colour);
    });

    // Overlay
    var ctrlBarHeight = document.getElementsByClassName('vjs-control-bar')[0].clientHeight;
    player.ctel = new ctel({
      width: player.el().offsetWidth, height: player.el().offsetHeight - ctrlBarHeight,
      removeCallback: function (id) {
        socket.emit('overrule', id);
      }, timeoutCallback: function (id) {
        socket.emit('approve', id);
      }
    });
    var cuddlyTgUpdSize = (function (_player, _ctel, _ctrlBarHeight) { return function () {
      _ctel.updateSize(player.el().offsetWidth, player.el().offsetHeight - (_player.userActive() || _player.paused() ? _ctrlBarHeight : 0));
    }; }(player, player.ctel, ctrlBarHeight));
    player.on('resize', cuddlyTgUpdSize);
    player.on('fullscreenchange', function () { setTimeout(cuddlyTgUpdSize, 500); });
    player.on('useractive', cuddlyTgUpdSize);
    player.on('userinactive', cuddlyTgUpdSize);
    player.addChild({ name: function () { return 'CommentingOverlay'; }, el: function () { return player.ctel.getEl(); } }, 0);
    if (options.isModerator) {
      var videoTechEl = player.el().childNodes[0];
      if (videoTechEl.tagName.toUpperCase() !== 'VIDEO') document.getElementsByTagName('video')[0];
      player.on('mousemove', (function (__targ, __ovl, __el) { return function (e) { __ovl.handleMouseMove(e.offsetX, e.offsetY); }; }(videoTechEl, player.ctel, player.ctel.getEl())));
      player.on('click', (function (__targ, __ovl, __el) { return function (e) { __ovl.handleClick(e.offsetX, e.offsetY); }; }(videoTechEl, player.ctel, player.ctel.getEl())));
      player.on('pause', function () { this.play(); });
    }

    // Other controls
    document.getElementsByClassName('vjs-captions-button')[0].style.display = 'none';
    if (options.isModerator) return;

    var fscrCtrl = document.getElementsByClassName('vjs-fullscreen-control')[0];

    var textArea = document.createElement('input');
    textArea.classList.add('vjs-cmtinput');
    textArea.setAttribute('placeholder', '在此输入弹幕~');
    textArea.setAttribute('maxlength', '140');
    _this.controlBar.addChild(textArea);
    player.controlBar.el().insertBefore(textArea, fscrCtrl);

    var sendBtn = new Button();
    sendBtn.addClass('vjs-icon-circle-inner-circle');
    sendBtn.el().setAttribute('title', '发送');
    player.controlBar.el().insertBefore(sendBtn.el(), fscrCtrl);
    textArea.addEventListener('keypress', (function (_sendBtn) { return function (e) {
      if (e.keyCode == 13) _sendBtn.click();
    }; }(sendBtn.el())));

    var cmtDispBtn = new CommentCtrlPopupBtn(_this);
    cmtDispBtn.addClass('vjs-icon-subtitles');
    cmtDispBtn.el().setAttribute('title', '弹幕设置');
    player.controlBar.el().insertBefore(cmtDispBtn.el(), fscrCtrl);
    cmtDispBtn.panel.updateTopDisp = (function (_ctel) { return function (isOn) { _ctel.updateTopDisp(isOn); }; }(player.ctel));
    cmtDispBtn.panel.updateBottomDisp = (function (_ctel) { return function (isOn) { _ctel.updateBottomDisp(isOn); }; }(player.ctel));
    
    var menuBtn = document.getElementsByClassName('vjs-cmt-popupbtn')[0];
    var menuEl = menuBtn.childNodes[0];
    menuEl.classList.add('vjs-cmt-menu');
    menuBtn.addEventListener('mouseenter', (function (_menuEl) { return function (e) {
      clearTimeout(_menuEl.timer);
      _menuEl.style.display = 'block';
    }; }(menuEl)));
    menuBtn.addEventListener('mouseleave', (function (_menuEl) { return function (e) {
      clearTimeout(_menuEl.timer);
      _menuEl.timer = setTimeout(function () { _menuEl.style.display = 'none'; _menuEl.timer = null; }, 360);
    }; }(menuEl)));

    sendBtn.on('click', (function (_panel, _textArea) { return function () {
      var style = _panel._picker.textContent + ';' + (_panel._sendAsBottom ? 'b' : 't');
      var text = _textArea.value;
      if (text.trim().length === 0) return;
      _textArea.setAttribute('disabled', '');
      socket.emit('pop', text, style, (function (__textArea) { return function () {
        __textArea.value = '';
        setTimeout(function () { __textArea.removeAttribute('disabled'); }, 5000);
      }; }(_textArea)));
    }; }(cmtDispBtn.panel, textArea)));
    
      }
    };
    xhr.open('GET', 'http://127.0.0.1:6033/get_filtration', true);
    xhr.send();
  });
};

}(window));
