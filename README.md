cuddly-telegram-newyear2017
===========================

[Cuddly Telegram](https://github.com/hsefz2018/cuddly-telegram-newyear2016) is back!

## API

POST **http://182.61.4.84:6033/**…

### `POST /verify`
- (HTTP header): `Content-Type: text/plain; charset=utf-8`
- (POST body): (String) 整个 POST body 为验证密码

用于确认本服务器确实是一台正常向的服务器。本次请求通过后会设定一个有效期为 30 天的 cookie，后续请求需要包含这个 cookie 才会被接受。

（反正传不传 MD5 都是明文传输……总之就这样吧 233333）

POST body 样例: `$$$letmeinImtheWeChatserver$$$`

### `POST /new_comment`
- (POST body) **uid_sub**: (String) 用户 ID (OpenID etc.)
- (POST body) **text**: (String) 评论内容
- (POST body) **attr**: (String) 评论的颜色和位置，以 `<colour>;<position>` 的形式记录。其中 `<colour>` 是任意 HTML 颜色值，`<position>` 是一个字符 `t` (top) 或者 `b` (bottom)

发送一条评论。

POST body 样例: `uid=d41d8cd98f00b204e9800998ecf8427e&text=Hello+World&attr=#ffffff;t`

**注：以 x-www-form-urlencoded 或者 JSON 格式发送请求均可以被接受。**
