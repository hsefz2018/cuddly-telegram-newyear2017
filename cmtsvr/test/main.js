const assert = require('assert')
const _request = require('request')
var jar = _request.jar()
const request = _request.defaults({jar: jar})
const redis = new require('ioredis')()

const api = require('../main')

redis.flushall(() => run())

const domain = 'http://127.0.0.1:6033'

describe('API Level', function () {
  describe('User management', function () {
    var rand_uid = ''
    it('should have #createClient() working with random ID', async function () {
      const uid = api.createClient(2)
      rand_uid = uid
      assert.equal(await redis.hget('client:' + uid, 'role'), 2)
    })
    it('should have #createClient() working with given ID', async function () {
      const uid = api.createClientWithID('Orz~ Orz', 2)
      assert.strictEqual(uid, 'Orz~ Orz')
      assert.equal(await redis.hget('client:' + uid, 'role'), 2)
      api.createClientWithID('YesYes', 3)
      assert.equal(await redis.hget('client:' + 'YesYes', 'role'), 3)
    })
    it('should have #createClient() complain with non-printable characters', function () {
      assert.strictEqual(api.createClientWithID('\x20\x20\x08\x7f\x81\x20\xa0', 1), null)
    })
    it('should have #createClient() complain with empty strings and non-strings', async function () {
      assert.strictEqual(api.createClientWithID('', 1), null)
      assert.strictEqual(api.createClientWithID(998244353, 2), null)
      assert.strictEqual(api.createClientWithID({ message: 'nyan' }, 3), null)
      assert.equal(await redis.exists('client:'), 0)
    })
    it('should have lists `group:<role>` created by #loginClient()', async function () {
      assert.strictEqual(await api.loginClient(rand_uid), true)
      assert.strictEqual(await api.loginClient('Orz~ Orz'), true)
      assert.strictEqual(await api.loginClient('YesYes'), true)
      assert.equal(await redis.scard('group:2'), 2)
      assert.equal(await redis.scard('group:3'), 1)
    })
    it('should have #reassignClient() working', async function () {
      const uid = 'Orz~ Orz'
      await api.reassignClient(uid, 3)
      assert.equal(await redis.hget('client:' + uid, 'role'), 3)
    })
    it('should have lists `group:<role>` correctly updated by #reassignClient()', async function () {
      assert.deepEqual(await redis.smembers('group:2'), [rand_uid])
      assert.deepEqual((await redis.smembers('group:3')).sort(), ['Orz~ Orz', 'YesYes'].sort())
    })
    it('should have lists `group:<role>` correctly updated by #logoutClient()', async function () {
      await api.logoutClient('Orz~ Orz')
      assert.deepEqual(await redis.smembers('group:2'), [rand_uid])
      assert.deepEqual(await redis.smembers('group:3'), ['YesYes'])
      assert.strictEqual(await api.logoutClient(rand_uid), true)
      assert.equal(await redis.scard('group:2'), 0)
      assert.deepEqual(await redis.smembers('group:3'), ['YesYes'])
      assert.strictEqual(await api.logoutClient('YesYes'), true)
      assert.equal(await redis.scard('group:2'), 0)
      assert.equal(await redis.scard('group:3'), 0)
    })
    it('should have #logoutAllClients() working', async function () {
      await api.loginClient('YesYes')
      await api.loginClient('Orz~ Orz')
      assert.equal(await redis.scard('group:3'), 2)
      await api.logoutAllClients()
      assert.equal(await redis.scard('group:3'), 0)
    })
    it('should have #loginClient() complain with nonexistent UID and non-strings', async function () {
      assert.strictEqual(await api.loginClient('qwelk'), false)
      assert.strictEqual(await api.loginClient(1317), false)
      assert.strictEqual(await api.loginClient({ message: 'Catch Me If You Can' }), false)
    })
    it('should have #reassignClient() complain with nonexistent UID and non-strings', async function () {
      assert.strictEqual(await api.reassignClient('qwelk', 0), false)
      assert.strictEqual(await api.reassignClient(1317, 0), false)
      assert.strictEqual(await api.reassignClient({ message: 'Catch Me If You Can' }, 0), false)
    })
    it('should have #logoutClient() complain with nonexistent UID and non-strings', async function () {
      assert.strictEqual(await api.logoutClient('qwelk'), false)
      assert.strictEqual(await api.logoutClient(1317), false)
      assert.strictEqual(await api.logoutClient({ message: 'Catch Me If You Can' }), false)
    })
  })
  describe('Comment management', function () {
    it('should have #createComment() working correctly', async function () {
      assert.strictEqual(await api.createComment('YesYes', 'Lorem ipsum dolor sit amet', '#fff;b'), true)
      assert.strictEqual(await api.createComment('YesYes1', 'Lorem ipsum dolor sit amet', 'magenta;t'), true)
    })
    it('should complain #createComment() with invalid arguments', async function () {
      assert.strictEqual(await api.createComment('YesYes2'), false)
      assert.strictEqual(await api.createComment('YesYes3', 123), false)
      assert.strictEqual(await api.createComment('YesYes4', 'What'), false)
    })
    it('should complain #createComment() with invalid attributes', async function () {
      assert.strictEqual(await api.createComment('YesYes5', 'What', "No semicolon :)"), false)
      assert.strictEqual(await api.createComment('YesYes6', 'What', "I am sooooo long a colour :);t"), false)
      assert.strictEqual(await api.createComment('YesYes7', 'What', "black;d"), false)
      assert.strictEqual(await api.createComment('YesYes8', 'What', "black;T"), false)
    })
    it('should complain #createComment() with large densities', async function () {
      assert.strictEqual(await api.createComment('YesYes9', 'Lorem ipsum dolor sit amet', 'magenta;t'), true)
      assert.strictEqual(await api.createComment('YesYes9', 'Consectetur adipiscing elit', 'magenta;t'), false)
      assert.strictEqual(await api.createComment('YesYes9', 'Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua', 'magenta;t'), false)
      assert.strictEqual(await api.createComment('YesYes10', 'Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua', 'magenta;t'), true)
    })
    it('should accept consecutive #createComment() after 5000 ms', function (done) {
      this.slow(5300);
      this.timeout(7000);
      setTimeout(async () => {
        try {
          assert.strictEqual(await api.createComment('YesYes9', 'Consectetur adipiscing elit', 'magenta;t'), true)
          assert.strictEqual(await api.createComment('YesYes9', 'Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua', 'magenta;t'), false)
        } catch (e) {
          done(e)
          return
        }
        done()
      }, 5010)
    })
  })
})

describe('HTTP Level', function () {
  describe('Session management', function () {
    var uid = ''
    it('should set a random cookie for a new visitor', function (done) {
      request.get(domain + '/player/play.html', (err, resp) => {
        assert.strictEqual(jar.getCookies(domain)[0].key, 'auth')
        assert.strictEqual(jar.getCookies(domain)[0].value.length, 36)
        uid = jar.getCookies(domain)[0].value
        done()
      })
    })
    it('should set role of the newcomer to be 1 (HTML_RESTRAINED)', async function () {
      const role = await redis.hget('client:' + uid, 'role')
      assert.equal(role, 1)
    })
    it('should update the role correctly after a successful verification', function (done) {
      request.post(domain + '/verify', { headers: { 'Content-Type': 'text/plain' }, body: 'nodnod985661441' }, async (err, resp, body) => {
        assert.strictEqual(body.substr(0, 7), 'Success')
        assert.equal(await redis.hget('client:' + uid, 'role'), 2)
        request.post(domain + '/verify', { headers: { 'Content-Type': 'text/plain' }, body: 'cfcf1000000007' }, async (err, resp, body) => {
          assert.strictEqual(body.substr(0, 7), 'Success')
          assert.equal(await redis.hget('client:' + uid, 'role'), 4)
          done()
        })
      })
    })
    it('should report and keep database state after a failed verification', function (done) {
      request.post(domain + '/verify', { headers: { 'Content-Type': 'text/plain' }, body: 'bluh bluh' }, async (err, resp, body) => {
        assert.strictEqual(body.substr(0, 2), 'No')
        assert.equal(await redis.hget('client:' + uid, 'role'), 4)
        done()
      })
    })
    it('should refresh client ID on invalidation', function (done) {
      jar.setCookie('auth=ThisAuthCertainlyDoesntExistXD', domain)
      request.get(domain + '/player/play.html', (err, resp) => {
        var new_uid = jar.getCookies(domain)[0].value
        assert.notEqual(uid, new_uid)
        done()
      })
    })
    it('should make `/get_filtration` work', function (done) {
      request.get(domain + '/get_filtration', (err, resp, body) => {
        assert.equal(body, '1')
        done()
      })
    })
    it('should make `/set_filtration/<is_restrained>` work', function (done) {
      request.post(domain + '/set_filtration/0', (err, resp, body) => {
        assert.equal(body.substr(0, 7), 'Success')
        request.get(domain + '/get_filtration', (err, resp, body) => {
          assert.equal(body, '0')
          request.post(domain + '/set_filtration/1', (err, resp, body) => {
            assert.equal(body.substr(0, 7), 'Success')
            request.get(domain + '/get_filtration', (err, resp, body) => {
              assert.equal(body, '1')
              done()
            })
          })
        })
      })
    })
    it('should complain `/set_filtration/<is_restrained>` uses on non-HTML clients', function (done) {
      request.post(domain + '/verify', { headers: { 'Content-Type': 'text/plain' }, body: 'cfcf1000000007' }, () => {
        request.post(domain + '/set_filtration/0', (err, resp) => {
          assert.equal(resp.statusCode, 403)
          done()
        })
      })
    })
  })
  describe('IM server', function () {
    it('should work with new sub-clients', function (done) {
      request.post(domain + '/new_comment', { form: { uid_sub: 'ClientOne', text: 'Hello World!', attr: '#fff;t' } }, (err, resp, body) => {
        assert.equal(body.substr(0, 7), 'Success')
        request.post(domain + '/new_comment', { form: { uid_sub: 'ClientTwo', text: 'Lorem ipsum!', attr: '#fff;t' } }, (err, resp, body) => {
          assert.equal(body.substr(0, 7), 'Success')
          done()
        })
      })
    })
    it('should work with existing sub-clients', function (done) {
      request.post(domain + '/new_comment', { form: { uid_sub: 'ClientOne', text: 'Hello World Again!', attr: '#eee;b' } }, (err, resp, body) => {
        assert.equal(body.substr(0, 7), 'Success')
        done()
      })
    })
    it('should complain uses on non-IM clients', function (done) {
      request.post(domain + '/verify', { headers: { 'Content-Type': 'text/plain' }, body: 'uojuoj998244353' }, () => {
        request.post(domain + '/new_comment', { form: { uid_sub: 'ClientOne', text: 'Hello World Once More!', attr: '#eee;b' } }, (err, resp) => {
          assert.equal(resp.statusCode, 403)
          done()
        })
      })
    })
  })
})
