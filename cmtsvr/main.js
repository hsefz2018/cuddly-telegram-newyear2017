const Koa = require('koa')
const app = new Koa()

const send = require('koa-send')
const bodyParser = require('koa-body')()

const Router = require('koa-better-router')
const router = new Router().loadMethods()

var sockets = {}, sidmap = {}
const role_priv = {
  NOTHING: 0, UNFILTERED: 1, APPROVED: 2, OVERRULED: 4, OWN: 8,
}
const role_cfg = {
  HTML_FREESTYLE: 0, '0': role_priv.UNFILTERED | role_priv.OWN,
  HTML_RESTRAINED: 1, '1': role_priv.APPROVED | role_priv.OWN,
  MODERATOR: 2, '2': role_priv.UNFILTERED,
  DISPLAY: 3, '3': role_priv.APPROVED,
  IMSERVER: 4, '4': role_priv.NOTHING,
  ROLES_CT: 5,
  IGNORANT: 9987, '9987': role_priv.NOTHING
}

const Redis = require('ioredis')
const redis = new Redis()

const cookie = require('cookie')
const uuid = require('uuid')

app.use(async (ctx, next) => {
  ctx.response.set('Access-Control-Allow-Origin', '*')
  await next()
})
app.use(router.middleware())

const pass_cfg = {
  'nodnod985661441': role_cfg.MODERATOR,
  'uojuoj998244353': role_cfg.DISPLAY,
  'cfcf1000000007': role_cfg.IMSERVER
}

const notifyAll = async (priv, obj, event) => {
  var notifylist = []
  for (var i = 0; i < role_cfg.ROLES_CT; ++i) if (role_cfg[i] & priv) {
    notifylist = notifylist.concat((await redis.smembers('group:' + i)) || [])
  }
  for (var i = 0; i < notifylist.length; ++i) {
    sockets[sidmap[notifylist[i]]].emit(event || 'comment', obj)
  }
}

const approveComment = async (cid) => {
  const cmt = await redis.hmget('cmt:' + cid, 'text', 'attr')
  await notifyAll(role_priv.APPROVED, { id: cid, state: role_priv.APPROVED, text: cmt[0], attr: cmt[1] })
}

const createComment = async (uid, text, attr) => {
  // Validation
  if (!text || !attr) return false
  if (attr.length > 20 || (attr.substr(-2) !== ';t' && attr.substr(-2) !== ';b')) return false
  // Density check
  if (!(await redis.set('cooldown:' + uid, 1, 'EX', 5, 'NX'))) return false
  // Add to the database
  console.log(`From ${uid}: ${text} / ${attr}`)
  const cid = await redis.incr('cmt_count')
  const transaction = redis.multi()
    .hmset('cmt:' + cid,
      'owner', uid, 'text', text, 'attr', attr,
      'created', Date.now(), 'score', 0)
    .lpush('cmtby:' + uid, cid)
  const jury = await redis.smembers('group:' + role_cfg.MODERATOR)
  if (jury.length != 0) {
    transaction.sadd.apply(transaction, ['cmtjury:' + cid].concat(jury))
    transaction.zadd('pending-cmts', Date.now(), cid)
  }
  transaction.exec()
  await notifyAll(role_priv.UNFILTERED, { id: cid, state: role_priv.UNFILTERED, text: text, attr: attr })
  if (jury.length == 0) {
    await approveComment(cid)
  }
  return true
}

const wrapupInterval = 10000;
const wrapupThreshold = 30000;
const wrapupPendingComments = async () => {
  const now = Date.now()
  const ordered = await redis.zrangebyscore('pending-cmts', -1, now - wrapupThreshold)
  for (var i = 0; i < ordered.length; ++i) {
    if (await redis.hget('cmt:' + ordered[i], 'score') >= 0) await approveComment(ordered[i])
  }
  await redis.zremrangebyscore('pending-cmts', -1, now - wrapupThreshold)
}
setInterval(wrapupPendingComments, wrapupInterval)

const scoreComment = async (cid, uid, score) => {
  if (await redis.srem('cmtjury:' + cid, uid) < 1) return
  const new_score = await redis.hincrby('cmt:' + cid, 'score', score)
  if (await redis.scard('cmtjury:' + cid) == 0) {
    if (new_score >= 0) await approveComment(cid)
  }
}

const createClientWithID = (new_uid, role) => {
  if (typeof new_uid !== 'string' || new_uid.length <= 0) return null
  for (var i = 0; i < new_uid.length; ++i) if (new_uid.charCodeAt(i) < 32 || new_uid.charCodeAt(i) > 127) return null
  redis.hmset('client:' + new_uid, 'created', Date.now(), 'role', role == null ? role_cfg.IGNORANT : role)
  return new_uid
}
const createClient = (role) => createClientWithID(uuid(), role)
const ensureClientWithID = async (uid, role) => {
  if (await redis.exists(uid) == 0) createClientWithID(uid, role)
}

const loginClient = async (uid) => {
  if (typeof uid !== 'string') return false
  const prev_role = await redis.hget('client:' + uid, 'role')
  if (prev_role === null) return false
  redis.sadd('group:' + prev_role, uid)
  return true
}

const reassignClient = async (uid, new_role) => {
  if (typeof uid !== 'string') return false
  const prev_role = await redis.hget('client:' + uid, 'role')
  if (prev_role === null) return false
  await redis.multi()
    .hset('client:' + uid, 'role', new_role)
    .srem('group:' + prev_role, uid)
    .sadd('group:' + new_role, uid)
    .exec()
  return true
}

const logoutClient = async (uid) => {
  if (typeof uid !== 'string') return false
  const prev_role = await redis.hget('client:' + uid, 'role')
  if (prev_role === null) return false
  redis.srem('group:' + prev_role, uid)
  return true
}

const logoutAllClients = () => {
  const transaction = redis.multi()
  for (var i = 0; i < role_cfg.ROLES_CT; ++i) transaction.del('group:' + i)
  transaction.exec()
}
logoutAllClients()

const checkCookies = (_role) => async (ctx, next) => {
  const refreshCookies = () => {
    var new_uid = createClient(role_cfg.HTML_RESTRAINED)
    ctx.cookies.set('auth', new_uid, { expires: new Date(Date.now() + 1000 * 3600) })
    return new_uid
  }
  var uid = ctx.cookies.get('auth')
  if (!uid) uid = refreshCookies()
  else {
    const is_authorized = await redis.exists('client:' + uid)
    if (!is_authorized) refreshCookies()
  }
  var role = (typeof _role === 'function') ? _role(ctx.params.html || '') : _role
  if (role != null && !(role instanceof Array)) role = [role]
  if (role != null && role.indexOf(parseInt(await redis.hget('client:' + uid, 'role'))) === -1) {
    return ctx.status = 403
  }
  return next()
}

const clientID = (ctx) => {
  if (ctx.method.toUpperCase() === 'POST' && ctx.request.body.uid_sub != null) {
    return ctx.cookies.get('auth') + '-' + ctx.request.body.uid_sub
  } else {
    return ctx.cookies.get('auth')
  }
}

router.get('/', ctx => {
  ctx.redirect('/index.html')
})

router.get('/lib/:file', async (ctx, next) => {
  await send(ctx, ctx.params.file, { root: __dirname + '/../player/lib' })
  return next()
})
router.get('/player/:file', checkCookies(null), async (ctx, next) => {
  await send(ctx, ctx.params.file, { root: __dirname + '/../player' })
  return next()
})

router.get('/:html([A-Za-z0-9_-]+\\.html)',
  checkCookies((e) => e === 'monitor.html' ? role_cfg.MODERATOR : null),
  async (ctx, next) => {
    await send(ctx, ctx.params.html, { root: __dirname + '/static' })
    return next()
  }
)

router.get('/get_filtration', checkCookies([role_cfg.HTML_FREESTYLE, role_cfg.HTML_RESTRAINED]), async (ctx, next) => {
  ctx.body = (await redis.hget('client:' + clientID(ctx), 'role')) == role_cfg.HTML_RESTRAINED ? '1' : '0'
  return next()
})

router.post('/set_filtration/:is_restrained([01])',
  checkCookies([role_cfg.HTML_FREESTYLE, role_cfg.HTML_RESTRAINED]), bodyParser,
  async (ctx, next) => {
    await reassignClient(clientID(ctx), parseInt(ctx.params.is_restrained) ? role_cfg.HTML_RESTRAINED : role_cfg.HTML_FREESTYLE)
    ctx.body = 'Success ♪( ´▽｀)'
    return next()
  }
)

router.post('/verify', checkCookies(null), bodyParser, async (ctx, next) => {
  const new_role = pass_cfg[ctx.request.body]
  if (new_role != null) {
    await reassignClient(clientID(ctx), new_role)
    ctx.body = 'Success ♪( ´▽｀)'
  } else {
    ctx.body = 'No changes -_-#'
  }
  return next()
})

router.post('/new_comment', checkCookies(role_cfg.IMSERVER), bodyParser, async (ctx, next) => {
  const reqbody = ctx.request.body
  if (reqbody.uid_sub == null || reqbody.text == null || reqbody.attr == null) return ctx.status = 400
  await ensureClientWithID(clientID(ctx))
  await createComment(clientID(ctx), reqbody.text, reqbody.attr)
  ctx.body = 'Success ♪( ´▽｀)'
})

const server = require('http').Server(app.callback())
const io = require('socket.io')(server)

router.get('/my', checkCookies(null), async (ctx, next) => {
  var uid = clientID(ctx)
  const cidlist = await redis.lrange('cmtby:' + uid, 0, 4)
  const ops1 = cidlist.map((cid) => ['hmget', 'cmt:' + cid, 'text', 'score'])
  const ops2 = cidlist.map((cid) => ['scard', 'cmtjury:' + cid])
  const results = await redis.multi(ops1.concat(ops2)).exec()
  if (!results || results.length === 0) ctx.body = 'No items'
  else {
    ctx.body = ''
    for (var i = 0; i < results.length / 2; ++i)
      ctx.body += `${results[i][1][0]} (score ${results[i][1][1]}, pending ${results[i + results.length / 2][1]})\n`
  }
})

io.on('connection', async (socket) => {
  const uid = (cookie.parse(socket.handshake.headers.cookie) || { auth: '' }).auth
  const is_authorized = await redis.exists('client:' + uid)
  if (!is_authorized) {
    socket.emit('unauthorized')
    socket.disconnect(true)
    return
  }

  socket.uid = uid
  console.log(`Connected:    ${socket.id} / ${socket.uid}`)
  sockets[socket.id] = socket
  sidmap[uid] = socket.id
  await loginClient(socket.uid)
  socket.on('disconnect', ((_socket) => async () => {
    console.log(`Disconnected: ${_socket.id} / ${_socket.uid}`)
    sockets[_socket.id] = null
    sidmap[_socket.uid] = null
    await logoutClient(socket.uid)
  })(socket))

  socket.on('pop', ((_socket) => async (text, attr, callback) => {
    await createComment(_socket.uid, text, attr)
    if (callback) callback()
  })(socket))
  socket.on('approve', ((_socket) => async (cid) => {
    await scoreComment(cid, _socket.uid, +1)
  })(socket))
  socket.on('overrule', ((_socket) => async (cid) => {
    await scoreComment(cid, _socket.uid, -1)
  })(socket))
})

const port = process.env.PORT || 6033
server.listen(port, () => {
  console.log(`Up at http://127.0.0.1:${port}/ (/=w=)~`)
})

module.exports = {
  createClient: createClient,
  createClientWithID: createClientWithID,
  reassignClient: reassignClient,
  loginClient: loginClient,
  logoutClient: logoutClient,
  logoutAllClients: logoutAllClients,

  createComment: createComment
}
