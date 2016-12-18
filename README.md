cuddly-telegram-newyear2017
===========================

[Cuddly Telegram](https://github.com/hsefz2018/cuddly-telegram-newyear2016) is back!

## Static files

* `index.html`
* `commenting.min.js` (同一目录，或者改动 `index.html` 第 48 行的 URL)

## API

#### `POST http://182.61.4.84:6033/new_comment?timestamp=<timestamp>&sign=<sign>`
- (URL) **timestamp**: (Number) UNIX 时间戳（以秒为单位），有效期 30 s
- (URL) **sign**: (String) 时间戳与来自东方的神秘字符串的结合之后再进行神秘 hash 算法所得的结果
- (POST body) **uid_sub**: (String) 用户 ID (OpenID etc.)
- (POST body) **text**: (String) 评论内容
- (POST body) **attr**: (String) 评论的颜色和位置，以 `<colour>;<position>` 的形式记录。其中 `<colour>` 是任意 HTML 颜色值，`<position>` 是一个字符 `t` (top) 或者 `b` (bottom)

发送一条评论。

##### POST body 样例

JSON
```json
{
    "uid_sub": "d41d8cd98f00b204e9800998ecf8427e",
    "text": "Hello World",
    "attr": "#ffffff;t"
}
```

Form
```
uid_sub=d41d8cd98f00b204e9800998ecf8427e&text=Hello%20World&attr=green%3Bt
```

**注：以 x-www-form-urlencoded，multipart 或者 JSON 格式发送请求均可以被接受。**
