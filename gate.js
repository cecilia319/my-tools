/* cecilia workbench 访问门禁 v1.1（每日轮换密码 · 邮件送达 · 会话免密）
 * 验证：SHA-256(盐+密码) 与本文件 hash 比对；密码由 rotate_password.py 每日轮换并发送邮箱
 * 免密：sessionStorage —— 每个浏览器会话输一次，关闭浏览器失效
 */
(function () {
  var CFG = {
    ver: "V202610301854",        // 密码版本（每日轮换时更新）
    hash: "afd551508f4c347eba9abc78b0e8afdb86bf13048c72222d69c5235db807d603",       // SHA-256(salt + password) 十六进制
    salt: "cecilia@my-tools",
    mail: "1091773@qq.com",
    key: "cec_gate_v1"
  };
  var SK = CFG.key;
  try { if (sessionStorage.getItem(SK) === CFG.ver) return; } catch (e) {}

  function sha256(ascii) {
    function rightRotate(v, a) { return (v >>> a) | (v << (32 - a)); }
    var mathPow = Math.pow, maxWord = mathPow(2, 32), result = "", words = [], asciiBitLength = ascii.length * 8;
    var hash = sha256.h = sha256.h || [], k = sha256.k = sha256.k || [], primeCounter = k.length;
    var isComposite = {};
    for (var candidate = 2; primeCounter < 64; candidate++) {
      if (!isComposite[candidate]) {
        for (var i = 0; i < 313; i += candidate) isComposite[i] = candidate;
        hash[primeCounter] = (mathPow(candidate, .5) * maxWord) | 0;
        k[primeCounter++] = (mathPow(candidate, 1 / 3) * maxWord) | 0;
      }
    }
    ascii += "\x80";
    while (ascii.length % 64 - 56) ascii += "\x00";
    for (i = 0; i < ascii.length; i++) {
      var j = ascii.charCodeAt(i);
      if (j >> 8) return;
      words[i >> 2] |= j << ((3 - i) % 4) * 8;
    }
    words[words.length] = ((asciiBitLength / maxWord) | 0);
    words[words.length] = (asciiBitLength);
    for (j = 0; j < words.length;) {
      var w = words.slice(j, j += 16), oldHash = hash;
      hash = hash.slice(0, 8);
      for (i = 0; i < 64; i++) {
        var w15 = w[i - 15], w2 = w[i - 2];
        var a = hash[0], e = hash[4];
        var temp1 = hash[7]
          + (rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25))
          + ((e & hash[5]) ^ ((~e) & hash[6]))
          + k[i]
          + (w[i] = (i < 16) ? w[i] : (
            w[i - 16]
            + (rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3))
            + w[i - 7]
            + (rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10))
          ) | 0
          );
        var temp2 = (rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22))
          + ((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]));
        hash = [(temp1 + temp2) | 0].concat(hash);
        hash[4] = (hash[4] + temp1) | 0;
      }
      for (i = 0; i < 8; i++) hash[i] = (hash[i] + oldHash[i]) | 0;
    }
    for (i = 0; i < 8; i++) {
      for (j = 3; j + 1; j--) {
        var b = (hash[i] >> (j * 8)) & 255;
        result += ((b < 16) ? 0 : "") + b.toString(16);
      }
    }
    return result;
  }

  function utf8(s) { return unescape(encodeURIComponent(s)); }

  var STYLE = ''
    + '#__gate{position:fixed;inset:0;z-index:2147483000;background:#0b1524;display:flex;align-items:center;justify-content:center;font-family:"Microsoft YaHei","PingFang SC",system-ui,sans-serif}'
    + '#__gate .card{width:min(92vw,380px);background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.14);border-radius:16px;padding:26px 24px 20px;color:#e8eef5;box-shadow:0 20px 60px rgba(0,0,0,.45)}'
    + '#__gate h1{font-size:18px;margin:0 0 6px;display:flex;align-items:center;gap:8px}'
    + '#__gate p{font-size:12.5px;color:#9db3c8;line-height:1.7;margin:0 0 14px}'
    + '#__gate input{width:100%;box-sizing:border-box;padding:11px 13px;border-radius:9px;border:1px solid rgba(255,255,255,.2);background:rgba(0,0,0,.3);color:#fff;font-size:16px;letter-spacing:2px;outline:none}'
    + '#__gate input:focus{border-color:#f2b63d}'
    + '#__gate button{width:100%;margin-top:10px;padding:11px;border:none;border-radius:9px;background:#f2b63d;color:#1a1a1a;font-size:14.5px;font-weight:700;cursor:pointer}'
    + '#__gate .err{color:#ff8a80;font-size:12.5px;min-height:18px;margin-top:8px}'
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
    var wrap = document.createElement('div'); wrap.id = '__gate';
    wrap.innerHTML = ''
      + '<div class="card">'
      + '<h1>🔒 cecilia workbench</h1>'
      + '<p>本页面已加密。请输入今日访问密码（每日 08:00 自动更新并发送至 ' + CFG.mail + '）。</p>'
      + '<input id="__gate_in" type="text" autocomplete="off" placeholder="访问密码" maxlength="16">'
      + '<button id="__gate_go">进入</button>'
      + '<div class="err" id="__gate_err"></div>'
      + '<div class="ft">密码通过邮件送达 · 输入后本次浏览器会话内免密<br>该内容仅供个人使用</div>'
      + '</div>';
    document.body.appendChild(wrap);
    var inp = document.getElementById('__gate_in'), err = document.getElementById('__gate_err'), go = document.getElementById('__gate_go');
    document.documentElement.style.visibility = 'visible';

    function verify() {
      var v = inp.value.trim();
      if (!v) { err.textContent = '请输入密码'; return; }
      var h = sha256(utf8(CFG.salt + v));
      if (CFG.hash === h) { unlock(); }
      else { err.textContent = '密码错误，请核对邮箱中的今日密码'; inp.value = ''; inp.focus(); }
    }
    go.onclick = verify;
    inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') verify(); });
    inp.focus();
  }

  document.documentElement.style.visibility = 'hidden';
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build);
  else build();
})();