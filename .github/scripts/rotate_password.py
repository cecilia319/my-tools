# -*- coding: utf-8 -*-
"""站点门禁密码轮换：生成随机密码 -> 更新 gate.js 哈希 -> QQ邮箱发送
用法:
  python rotate_password.py            # 生成+更新+发邮件
  python rotate_password.py --no-mail  # 只生成+更新，不发信（打印密码）
  python rotate_password.py --gate "D:\\个人\\gate.js"
"""
import hashlib, io, os, random, re, smtplib, ssl, sys, datetime
from email.mime.text import MIMEText
from email.header import Header
from email.utils import formataddr

GATE = r"D:\个人\gate.js"
SALT = "cecilia@my-tools"
MAIL_TO = os.environ.get("MAIL_TO") or "1091773@qq.com"
MAIL_FROM = "1091773@qq.com"
SMTP_HOST, SMTP_PORT = "smtp.qq.com", 465
AUTH_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "qq_smtp_authcode.txt")
CHARS = "abcdefghjkmnpqrstuvwxyzACDEFGHJKLMNPQRSTUVWXYZ23456789"  # 去掉易混字符


def gen(len_=10):
    return "".join(random.SystemRandom().choice(CHARS) for _ in range(len_))


def main():
    global GATE
    no_mail = "--no-mail" in sys.argv
    if "--gate" in sys.argv:
        GATE = sys.argv[sys.argv.index("--gate") + 1]
    pwd = gen()
    h = hashlib.sha256((SALT + pwd).encode("utf-8")).hexdigest()
    ver = "V" + datetime.datetime.now().strftime("%Y%m%d%H%M")

    src = io.open(GATE, encoding="utf-8").read()
    src = re.sub(r'ver:\s*"[^"]*"', 'ver: "%s"' % ver, src, count=1)
    src = re.sub(r'hash:\s*"[^"]*"', 'hash: "%s"' % h, src, count=1)
    io.open(GATE, "w", encoding="utf-8", newline="\n").write(src)
    print("GATE UPDATED", GATE, ver)
    print("PASSWORD:", pwd)

    if no_mail:
        return 0
    if not os.path.exists(AUTH_FILE):
        print("NO AUTH FILE:", AUTH_FILE); return 2
    code = (os.environ.get("QQ_SMTP_AUTHCODE") or "").strip()
    if not code and os.path.exists(AUTH_FILE):
        raw = io.open(AUTH_FILE, encoding="utf-8", errors="ignore").read()
        code = re.sub(r"[^A-Za-z0-9]", "", raw)[:16]  # 授权码16位，剔除文件尾部水印杂质
    if len(code) < 10:
        print("BAD OR MISSING AUTH CODE"); return 2
    now = datetime.datetime.now().strftime("%Y-%m-%d %H:%M")
    html = """<div style="font-family:-apple-system,'Microsoft YaHei',sans-serif;max-width:520px;margin:0 auto;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden">
<div style="background:linear-gradient(135deg,#0A2E5C,#1273D1);color:#fff;padding:18px 22px">
<div style="font-size:16px;font-weight:700">cecilia workbench · 访问密码</div>
<div style="font-size:12px;opacity:.85;margin-top:4px">%s 自动生成</div></div>
<div style="padding:22px">
<p style="font-size:14px;color:#374151;margin:0 0 12px">本次访问密码如下（下次轮换后自动失效）：</p>
<div style="background:#F3F6FA;border:1px dashed #B9D4EE;border-radius:10px;padding:16px;text-align:center;font-size:28px;letter-spacing:6px;font-weight:700;color:#0A2E5C;font-family:Consolas,monospace">%s</div>
<p style="font-size:12.5px;color:#6b7280;line-height:1.8;margin:14px 0 0">· 打开站点后输入该密码，本次浏览器会话内免密<br>· 密码每日自动轮换，以最新一封邮件为准<br>· 若非本人操作请忽略本邮件</p>
</div></div>""" % (now, pwd)
    msg = MIMEText(html, "html", "utf-8")
    msg["Subject"] = Header("【访问密码】cecilia workbench " + now, "utf-8")
    msg["From"] = formataddr((str(Header("cecilia workbench 门禁", "utf-8")), MAIL_FROM))
    msg["To"] = MAIL_TO
    ctx = ssl.create_default_context()
    with smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT, context=ctx, timeout=30) as s:
        s.login(MAIL_FROM, code)
        s.sendmail(MAIL_FROM, [MAIL_TO], msg.as_string())
    print("MAIL SENT ->", MAIL_TO)
    return 0


if __name__ == "__main__":
    sys.exit(main())