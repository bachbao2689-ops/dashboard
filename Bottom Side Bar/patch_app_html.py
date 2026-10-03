with open("Dashboard new/app.js", "r") as f:
    js = f.read()

js = js.replace(
    '<div class="login-copy"><span>MANAGEMENT HUB</span><h1 id="login-title">Đăng ký thông tin</h1><p>Vui lòng cập nhật thông tin cá nhân của bạn để sử dụng các tính năng trong hệ thống.</p></div>',
    '<div class="login-wordmark" aria-label="K Coffee">COFFEE</div>\n      <div class="login-copy"><span>MANAGEMENT HUB</span><h1 id="login-title">Đăng ký thông tin</h1><p id="login-title-sub">Vui lòng cập nhật thông tin cá nhân của bạn để sử dụng các tính năng trong hệ thống.</p></div>'
)

js = js.replace(
    '<button type="submit" id="reg-submit-btn" class="primary-button login-submit">Xác nhận thông tin</button>',
    '<div id="login-summary" class="login-summary" hidden></div>\n        <button type="submit" id="reg-submit-btn" class="primary-button login-submit">Xác nhận thông tin</button>'
)

with open("Dashboard new/app.js", "w") as f:
    f.write(js)
print("Patched app.js HTML parts")
