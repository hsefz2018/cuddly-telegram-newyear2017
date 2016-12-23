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
    var t = 2000;
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
}(window));
