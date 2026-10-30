/* cecilia workbench 访问门禁 v2.0（TOTP 动态口令 · 无后端 · 每次打开一次性）
 * 模式优先级：CFG.api（邮件OTP，需后端可达） > CFG.mode="totp"（身份验证器） > CFG.mode="hash"（每日密码）
 * 免密：sessionStorage —— 每个浏览器会话输一次，关闭浏览器失效
 */
(function () {
  var CFG = {
    mode: "totp",                                        // totp | hash
    totpSecret: "CHWV42S3VAYK6D3TUEC53NX6RTMAXUJY",      // Base32（20字节）
    ver: "V20261030",                                    // 会话凭据版本
    hash: "",                                            // hash 模式备用
    salt: "cecilia@my-tools",
    api: "",                                             // 邮件OTP后端（留空=不启用）
    mail: "1091773@qq.com",
    key: "cec_gate_v2"
  };
  var SK = CFG.key;
  try { if (sessionStorage.getItem(SK) === CFG.ver) return; } catch (e) {}

  /* ---------- SHA-1 / HMAC-SHA1 / Base32 / TOTP ---------- */
  function sha1Bytes(bytes) {
    var ml = bytes.length * 8;
    var msg = new Array(bytes.length);
    for (var i = 0; i < bytes.length; i++) msg[i] = bytes[i];
    msg.push(0x80);
    while (msg.length % 64 !== 56) msg.push(0);
    var hi = Math.floor(ml / 4294967296), lo = ml >>> 0;
    msg.push((hi >>> 24) & 255, (hi >>> 16) & 255, (hi >>> 8) & 255, hi & 255);
    msg.push((lo >>> 24) & 255, (lo >>> 16) & 255, (lo >>> 8) & 255, lo & 255);

    var h = [0x67452301, 0xEFCDAB89, 0x98BADCFE, 0x10325476, 0xC3D2E1F0];
    var w = new Array(80);
    for (var off = 0; off < msg.length; off += 64) {
      for (i = 0; i < 16; i++) {
        w[i] = (msg[off + i * 4] << 24) | (msg[off + i * 4 + 1] << 16) | (msg[off + i * 4 + 2] << 8) | msg[off + i * 4 + 3];
      }
      for (i = 16; i < 80; i++) {
        var v = w[i - 3] ^ w[i - 8] ^ w[i - 14] ^ w[i - 16];
        w[i] = (v << 1) | (v >>> 31);
      }
      var a = h[0], b = h[1], c = h[2], d = h[3], e = h[4];
      for (i = 0; i < 80; i++) {
        var f, k;
        if (i < 20) { f = (b & c) | ((~b) & d); k = 0x5A827999; }
        else if (i < 40) { f = b ^ c ^ d; k = 0x6ED9EBA1; }
        else if (i < 60) { f = (b & c) | (b & d) | (c & d); k = 0x8F1BBCDC; }
        else { f = b ^ c ^ d; k = 0xCA62C1D6; }
        var t = (((a << 5) | (a >>> 27)) + f + e + k + w[i]) | 0;
        e = d; d = c; c = (b << 30) | (b >>> 2); b = a; a = t;
      }
      h[0] = (h[0] + a) | 0; h[1] = (h[1] + b) | 0; h[2] = (h[2] + c) | 0;
      h[3] = (h[3] + d) | 0; h[4] = (h[4] + e) | 0;
    }
    var out = [];
    for (i = 0; i < 5; i++) out.push((h[i] >>> 24) & 255, (h[i] >>> 16) & 255, (h[i] >>> 8) & 255, h[i] & 255);
    return out;
  }
  function hmacSha1(keyBytes, msgBytes) {
    var block = 64;
    var k = keyBytes.slice(0);
    if (k.length > block) k = sha1Bytes(k);
    while (k.length < block) k.push(0);
    var oPad = [], iPad = [];
    for (var i = 0; i < block; i++) { oPad.push(k[i] ^ 0x5c); iPad.push(k[i] ^ 0x36); }
    return sha1Bytes(oPad.concat(sha1Bytes(iPad.concat(msgBytes))));
  }
  function b32decode(s) {
    var A = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
    s = s.toUpperCase().replace(/=+$/, "");
    var bits = 0, value = 0, out = [];
    for (var i = 0; i < s.length; i++) {
      var idx = A.indexOf(s[i]);
      if (idx < 0) continue;
      value = (value << 5) | idx;
      bits += 5;
      if (bits >= 8) { out.push((value >>> (bits - 8)) & 255); bits -= 8; }
    }
    return out;
  }
  function totpAt(timeMs) {
    var step = 30, digits = 6;
    var counter = Math.floor((timeMs || Date.now()) / 1000 / step);
    var hi = Math.floor(counter / 4294967296), lo = counter >>> 0;
    var msgBytes = [
      (hi >>> 24) & 255, (hi >>> 16) & 255, (hi >>> 8) & 255, hi & 255,
      (lo >>> 24) & 255, (lo >>> 16) & 255, (lo >>> 8) & 255, lo & 255
    ];
    var h = hmacSha1(b32decode(CFG.totpSecret), msgBytes);
    var o = h[h.length - 1] & 0x0f;
    var bin = ((h[o] & 0x7f) << 24) | (h[o + 1] << 16) | (h[o + 2] << 8) | h[o + 3];
    var code = String(bin % Math.pow(10, digits));
    while (code.length < digits) code = "0" + code;
    return code;
  }
  function verifyTotp(input) {
    var now = Date.now(), ok = false;
    [-1, 0, 1].forEach(function (d) {
      if (totpAt(now + d * 30000) === input) ok = true;
    });
    return ok;
  }

  /* ---------- UI ---------- */
  var STYLE = ''
    + '#__gate{position:fixed;inset:0;z-index:2147483000;background:#0b1524;display:flex;align-items:center;justify-content:center;font-family:"Microsoft YaHei","PingFang SC",system-ui,sans-serif}'
    + '#__gate .card{width:min(92vw,390px);background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.14);border-radius:16px;padding:26px 24px 20px;color:#e8eef5;box-shadow:0 20px 60px rgba(0,0,0,.45)}'
    + '#__gate h1{font-size:18px;margin:0 0 6px;display:flex;align-items:center;gap:8px}'
    + '#__gate p{font-size:12.5px;color:#9db3c8;line-height:1.7;margin:0 0 14px}'
    + '#__gate input{width:100%;box-sizing:border-box;padding:11px 13px;border-radius:9px;border:1px solid rgba(255,255,255,.2);background:rgba(0,0,0,.3);color:#fff;font-size:20px;letter-spacing:6px;text-align:center;outline:none;font-family:Consolas,monospace}'
    + '#__gate input:focus{border-color:#f2b63d}'
    + '#__gate button{width:100%;margin-top:10px;padding:11px;border:none;border-radius:9px;background:#f2b63d;color:#1a1a1a;font-size:14.5px;font-weight:700;cursor:pointer}'
    + '#__gate button:disabled{opacity:.5}'
    + '#__gate .err{color:#ff8a80;font-size:12.5px;min-height:18px;margin-top:8px;text-align:center}'
    + '#__gate .ft{margin-top:14px;padding-top:12px;border-top:1px dashed rgba(255,255,255,.14);font-size:11.5px;color:#6c86a0;line-height:1.7}';

  function unlock() {
    try { sessionStorage.setItem(SK, CFG.ver); } catch (e) {}
    var m = document.getElementById('__gate');
    document.documentElement.style.visibility = '';
    if (m) setTimeout(function () { if (m.parentNode) m.parentNode.removeChild(m); }, 250);
  }

  function build() {
    if (document.getElementById('__gate')) return;
    var st = document.createElement('style'); st.textContent = STYLE; document.head.appendChild(st);
    var otpMode = !!CFG.api;
    var wrap = document.createElement('div'); wrap.id = '__gate';
    wrap.innerHTML = ''
      + '<div class="card">'
      + '<h1>🔒 cecilia workbench</h1>'
      + '<p id="__gate_tip">' + (otpMode
        ? '本页面已加密。点击"发送验证码"，6 位验证码将发送至 ' + CFG.mail + '，5 分钟内有效。'
        : (CFG.mode === 'totp'
          ? '本页面已加密。请输入身份验证器 App（Google Authenticator）中的 6 位动态码，每 30 秒自动更新。'
          : '本页面已加密。请输入今日访问密码。')) + '</p>'
      + '<input id="__gate_in" type="text" inputmode="numeric" autocomplete="one-time-code" placeholder="' + (otpMode || CFG.mode === 'totp' ? '6 位验证码' : '访问密码') + '" maxlength="16">'
      + (otpMode ? '<button id="__gate_send">发送验证码到邮箱</button>' : '')
      + '<button id="__gate_go">进入</button>'
      + '<div class="err" id="__gate_err"></div>'
      + '<div class="ft">验证码来自身份验证器 App · 本次浏览器会话内免密<br>该内容仅供个人使用</div>'
      + '</div>';
    document.body.appendChild(wrap);
    var inp = document.getElementById('__gate_in'), err = document.getElementById('__gate_err'), go = document.getElementById('__gate_go');
    document.documentElement.style.visibility = 'visible';
    inp.focus();

    function fail(msg) { err.textContent = msg; inp.value = ''; inp.focus(); }

    if (otpMode) {
      var send = document.getElementById('__gate_send');
      send.onclick = function () {
        send.disabled = true; err.textContent = '';
        fetch(CFG.api.replace(/\/$/, '') + '/send-code', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"to":"' + CFG.mail + '"}' })
          .then(function (r) { return r.json(); })
          .then(function (j) { err.textContent = (j && j.ok) ? '验证码已发送，请查收邮箱' : ((j && j.msg) || '发送失败'); })
          .catch(function () { err.textContent = '网络异常，请稍后重试'; })
          .then(function () { setTimeout(function () { send.disabled = false; }, 20000); });
      };
      go.onclick = function () {
        var v = inp.value.trim();
        if (!/^\d{6}$/.test(v)) return fail('请输入 6 位数字');
        fetch(CFG.api.replace(/\/$/, '') + '/verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"code":"' + v + '"}' })
          .then(function (r) { return r.json(); })
          .then(function (j) { if (j && j.ok) unlock(); else fail('验证码错误或已过期'); })
          .catch(function () { fail('网络异常，请稍后重试'); });
      };
    } else if (CFG.mode === 'totp') {
      go.onclick = function () {
        var v = inp.value.replace(/\s/g, '');
        if (!/^\d{6}$/.test(v)) return fail('请输入 6 位数字');
        if (verifyTotp(v)) unlock(); else fail('验证码错误（请确认手机时间准确）');
      };
    } else {
      go.onclick = function () { fail('当前为动态口令模式，请使用身份验证器'); };
    }
    inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') go.click(); });
  }

  document.documentElement.style.visibility = 'hidden';
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build);
  else build();
})();