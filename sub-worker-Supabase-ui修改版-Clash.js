/**
 * Clash UI Worker with Mihome (Clash Meta) Support - FIXED VERSION V5
 * Fixes: Regex Path Slash Issue, Vmess Encoding, Multi-line splitting
 */

// 基础参数配置
const CONFIG = {
    UUID: 'ea4909ef-7ca6-4b46-bf2e-6c07896ef338', // 管理页面访问路径 /sub-uuid
    APITOKEN: 'lgbt', // 管理节点的API路径密钥
    UP: 'ea4909ef-7ca6-4b46-bf2e-6c07896ef338', // 节点上传密钥
    TOKEN: 'lgbt', // 订阅地址密钥
    USER: '123123', // 登录用户名
    DEFAULT_DOMAIN: '', // 默认即可，无需设置
    EXPIRATION_TIME: 86400000, // 自动上传节点链接有效期(秒), 过期未更新则移除
    MAX_LOGIN_ATTEMPTS: 3, // 最大登录尝试次数
    // 背景图片列表
    BACKGROUND_IMAGE: 'https://media.istockphoto.com/id/508515231/photo/feeling-free-to-express-her-sensuality.jpg?s=1024x1024&w=is&k=20&c=959xvWit4gR8btZtd7FmzTIkqzSwyB8zLIacQyQfLIk=;https://media.istockphoto.com/id/520980967/photo/sexy-beautiful-woman-in-lingerie.jpg?s=612x612&w=is&k=20&c=ciVJawZ8X8wrnyhK3GWaypMzus09kwuT7vildArZ20Q=;https://media.istockphoto.com/id/506435758/photo/beautyful-young-blond-woman-sitting-next-to-the-balkony-door.jpg?s=1024x1024&w=is&k=20&c=BeDnqv_dt3XPN00IVVuO0eJo6kA362nXBlDxBsUX-_8=;https://media.istockphoto.com/id/187150159/photo/naked-girl-in-water-on-a-black-background.jpg?s=1024x1024&w=is&k=20&c=IyxsYlzFJlJVYDDIkkZX3lw6nWYfcvVYVOpPnoM1sBk=;https://media.istockphoto.com/id/538127701/photo/female-torso-with-bra-on-black-background.jpg?s=612x612&w=is&k=20&c=Z1Na-xQxSiXEpf2RvC9MfeVWKssTXx36653LYzbh2oo=;https://cdn.pixabay.com/photo/2024/07/03/15/40/beauty-8870258_1280.png?q=80&w=1280;https://media.istockphoto.com/id/1077567800/photo/hot-young-adult-proud-and-domineering-woman-dressed-in-a-long-scarlet-red-long-dress-sexually.jpg?s=612x612&w=is&k=20&c=Ow7PyaUo2YZ1YDnnlPY3PJlmB9C_x5O9XYjR4Q_xd3U=;https://media.istockphoto.com/id/1077591134/photo/free-your-femininity.jpg?s=612x612&w=is&k=20&c=FqZHQjWLmL7yAslJLYIMPjF7LlXAIZAM9AR6bGHgE1g=;https://media.istockphoto.com/id/1156676927/photo/fashionable-studio-portrait-of-a-sport-girl.jpg?s=612x612&w=is&k=20&c=d4XhyoPnemNVTQBzK5gTb6t8n1un5m9vrZsgbihmS1U=;https://media.istockphoto.com/id/536720005/photo/looking-sensual-in-red.jpg?s=612x612&w=is&k=20&c=eCg7_4FCLHztU8fVuYIpwzezzbyRpw5FHZTS7GF9OHU='
};

// 排除包含关键词的节点
const excludeKeywords = 'GB-eu.com;TW-free.tw';

// 协议配置
const PROTOCOL = {
    xieyi: 'vl',
    xieyi2: 'ess',
    pm: 'vm'
};

// Supabase 客户端类
class SupabaseClient {
    constructor(url, anonKey) {
        this.url = url;
        this.anonKey = anonKey;
        this.headers = {
            'apikey': anonKey,
            'Authorization': `Bearer ${anonKey}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
        };
    }
    async request(endpoint, options = {}) {
        const response = await fetch(`${this.url}/rest/v1/${endpoint}`, {
            headers: { ...this.headers, ...options.headers },
            ...options
        });
        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Supabase error: ${response.status} ${error}`);
        }
        if (response.status === 204) return null;
        return await response.json();
    }
    async select(table, query = '*', filters = {}, order = null) {
        let endpoint = `${table}?select=${query}`;
        Object.entries(filters).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
                endpoint += `&${key}=eq.${encodeURIComponent(value)}`;
            }
        });
        if (order) endpoint += `&order=${order}`;
        return await this.request(endpoint);
    }
    async insert(table, data) {
        return await this.request(table, {
            method: 'POST',
            body: JSON.stringify(Array.isArray(data) ? data : [data])
        });
    }
    async update(table, data, filters = {}) {
        let endpoint = table;
        const filterParams = new URLSearchParams();
        Object.entries(filters).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
                filterParams.append(key, `eq.${value}`);
            }
        });
        if (filterParams.toString()) endpoint += `?${filterParams.toString()}`;
        return await this.request(endpoint, {
            method: 'PATCH',
            body: JSON.stringify(data)
        });
    }
    async delete(table, filters = {}) {
        let endpoint = table;
        const filterParams = new URLSearchParams();
        Object.entries(filters).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
                filterParams.append(key, `eq.${value}`);
            }
        });
        if (filterParams.toString()) endpoint += `?${filterParams.toString()}`;
        return await this.request(endpoint, { method: 'DELETE' });
    }
    async rpc(functionName, params = {}) {
        return await this.request(`rpc/${functionName}`, {
            method: 'POST',
            body: JSON.stringify(params)
        });
    }
}

// HTML页面内容 (保持不变)
const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>订阅管理</title>
    <style>
      body {
            font-family: 'Arial', sans-serif;
            margin: 0;
            padding: 0;
            background-image: url('');
            background-size: cover;
            background-position: center;
            background-repeat: no-repeat;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
        }
         .container {
            background-color: rgba(255, 255, 255, 0.75);
            padding: 30px;
            border-radius: 12px;
            box-shadow: 0 4px 10px rgba(0,0,0,0.3);
            max-width: 900px;
             width: 90%;
        }
         h1 {
            text-align: center;
            margin-bottom: 20px;
            color: #333;
            text-shadow: 1px 1px 2px rgba(0,0,0,0.1);
        }
         .password-form {
            display: flex;
            flex-direction: column;
            margin-bottom: 20px;
            justify-content: center;
            align-items: center;
            gap: 15px;
        }
        .form-row {
            display: flex;
            align-items: center;
            gap: 10px;
        }
        .form-label {
            width: 60px;
            text-align: right;
            font-size: 14px;
            color: #333;
        }
        .form-input {
            width: 200px;
            padding: 10px;
            border: 1px solid #333;
            border-radius: 0;
            box-sizing: border-box;
        }
        .info-box {
            display: none;
            background-color: rgba(248, 249, 250, 0.75);
            border: 1px solid #dee2e6;
            padding: 20px;
            border-radius: 8px;
            margin-top: 20px;
        }
        input[type="password"], input[type="text"], textarea {
           padding: 12px;
            margin-right: 10px;
            border: 1px solid #ddd;
            border-radius: 6px;
           width: calc(100% - 24px);
            margin-bottom: 10px;
              transition: border-color 0.3s, box-shadow 0.3s;
         box-sizing: border-box;
        }
         input[type="password"]:focus, input[type="text"]:focus, textarea:focus{
            border-color: #007bff;
            box-shadow: 0 0 5px rgba(0,123,255,0.5);
        }
        textarea {
            min-height: 120px;
            font-family: monospace;
        }
         button {
            padding: 12px 24px;
            background-color: #007bff;
            color: white;
            border: none;
            border-radius: 6px;
            cursor: pointer;
             transition: background-color 0.3s, transform 0.2s;
        }
        button:disabled {
            background-color: #cccccc;
            cursor: not-allowed;
        }
        button:hover:not(:disabled) {
            background-color: #0056b3;
              transform: translateY(-2px);
         }
        .url {
            word-break: break-all;
            margin: 10px 0;
             padding: 15px;
            background-color: rgba(233, 236, 239, 0.8);
            border-radius: 6px;
         }
        .copy-btn {
            background-color: #28a745;
            margin-left: 10px;
              transition: background-color 0.3s, transform 0.2s;
        }
         .copy-btn:hover:not(:disabled) {
            background-color: #218838;
              transform: translateY(-2px);
        }
        .current-list, .current-sub2-list, .current-keyword-list{
               margin-top: 10px;
               max-height: 350px;
               overflow-y: auto;
          }
        .list-item, .sub2-item, .keyword-item{
            display: flex;
            align-items: center;
            padding: 12px;
            background-color: rgba(248, 249, 250, 0.8);
            border: 1px solid #dee2e6;
            margin-bottom: 5px;
            border-radius: 6px;
        }
        .item-index {
            min-width: 40px;
            font-weight: bold;
            color: #007bff;
            margin-right: 10px;
        }
         .list-url, .sub2-url, .keyword-text {
            flex-grow: 1;
            word-break: break-all;
            margin-right: 10px;
        }
        .delete-btn {
            background-color: #dc3545;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 6px;
            cursor: pointer;
             transition: background-color 0.3s, transform 0.2s;
        }
         .delete-btn:hover {
            background-color: #c82333;
            transform: translateY(-2px);
        }
        .management-section {
              margin-top: 20px;
              padding-top: 20px;
              border-top: 1px solid #dee2e6;
          }
        .success-message {
             color: #28a745;
             margin-top: 10px;
             display: none;
         }
        .error-message {
            color: #dc3545;
            margin-top: 10px;
            display: none;
         }
         .menu {
              display: flex;
              justify-content: space-around;
              margin-bottom: 20px;
              flex-wrap: wrap;
          }
         .menu button {
             padding: 12px 18px;
             background-color: #007bff;
             color: white;
             border: none;
             border-radius: 6px;
             cursor: pointer;
               transition: background-color 0.3s, transform 0.2s;
               margin: 5px;
         }
        .menu button:hover {
            background-color: #0056b3;
             transform: translateY(-2px);
         }
        .tab-content {
            display: none;
        }
        .tab-content.active {
             display: block;
        }
         #loading {
            display: none;
            text-align: center;
            margin-top: 20px;
        }
         .copyright {
            text-align: center;
             margin-top: 20px;
             color: #777;
         }
    </style>
</head>
<body>
    <div class="container">
        <h1>节点自动上传聚合订阅管理系统</h1>
        <div class="password-form">
            <div class="form-row">
                <span class="form-label">用户名</span>
                <input type="text" id="username" class="form-input" placeholder="">
            </div>
            <div class="form-row">
                <span class="form-label">密码</span>
                <input type="password" id="password" class="form-input" placeholder="">
            </div>
            <button onclick="login()" id="loginBtn">登陆</button>
             <div id="loading">Loading...</div>
             <div id="errorMessage" class="error-message"></div>
        </div>
        <div id="infoBox" class="info-box">
             <div class="menu">
                  <button onclick="showTab('home')">首页</button>
                  <button onclick="showTab('upload')">自动上传节点管理</button>
                  <button onclick="showTab('sub2')">自定义节点或链接</button>
                   <button onclick="showTab('keywords')">关键词过滤</button>
              </div>
            <div id="home" class="tab-content active">
                <h3>节点上传地址格式(UP值改成你设置的):</h3>
                <div class="url" id="uploadUrl"></div>
                <button class="copy-btn" onclick="copyToClipboard('uploadUrl')">复制</button>
               
                <h3>订阅地址格式(TOKEN值改成你设置的):</h3>
                <div class="url" id="downloadUrl"></div>
                <button class="copy-btn" onclick="copyToClipboard('downloadUrl')">复制 (V2Ray/Base64)</button>
                
                <h3>Clash Meta (Mihome) 订阅地址:</h3>
                <div class="url" id="clashUrl"></div>
                <button class="copy-btn" onclick="copyToClipboard('clashUrl')">复制 (Clash YAML)</button>
               
                <h3>使用说明:</h3>
                <ol>
                    <li>节点原始优选域名要设置为ip.sb,端口443或8443,否则也不影响使用,只是不支持自动更换优选IP和端口</li>
                    <li>订阅链接参数:cf_ip和cf_port必填,可以自动替换优选域名和端口</li>
                    <li>新增支持 Clash Meta (Mihome) 格式，支持 Vless Reality 等新协议</li>
                </ol>
            </div>
            <div id="upload" class="tab-content">
                  <h3>当前节点列表:</h3>
                  <div id="currentList" class="current-list"></div>
                   <button onclick="loadUrls()" class="load-btn">刷新列表</button>
                  <button onclick="deleteAllUrls()" class="delete-btn">全部删除</button>
              </div>
           <div id="sub2" class="tab-content">
                <h3>添加自定义节点或订阅链接(仅v2格式):</h3>
                <textarea id="sub2Input" placeholder="每行一个URL"></textarea>
                <button onclick="updateSub2()">添加更新</button>
                <div id="sub2SuccessMessage" class="success-message">更新成功!</div>
                <h3>当前自定义节点列表:</h3>
                <div id="currentSub2List" class="current-sub2-list"></div>
                <button onclick="loadSub2()" class="load-btn">刷新列表</button>
                 <button onclick="deleteAllSub2Urls()" class="delete-btn">全部删除</button>
            </div>
              <div id="keywords" class="tab-content">
                  <h3>添加关键词过滤:</h3>
                  <textarea id="keywordInput" placeholder="每行一个关键词"></textarea>
                  <button onclick="updateKeywords()">添加更新</button>
                   <div id="keywordSuccessMessage" class="success-message">更新成功!</div>
                   <h3>当前关键词列表:</h3>
                  <div id="currentKeywordList" class="current-keyword-list"></div>
                  <button onclick="loadKeywords()" class="load-btn">刷新列表</button>
                    <button onclick="deleteAllKeywords()" class="delete-btn">全部删除</button>
              </div>
        </div>
        <div class="copyright">版权所有:FsMs © Copyright 2025</div>
    </div>
    <script>
        let appConfig = { apiToken: '', maxAttempts: 3, backgroundImages: [] };
        let currentBackgroundIndex = 0;
        let loginAttempts = 0;
        let isLoggedIn = false;

        async function preloadBackgroundConfig() {
            try {
                const response = await fetch(\`\${getDomain()}/get-background-config\`);
                if (response.ok) {
                    const data = await response.json();
                    if (data.backgroundImages && data.backgroundImages.length > 0) {
                        appConfig.backgroundImages = data.backgroundImages;
                        initBackground();
                    }
                }
            } catch (error) { console.error('Failed to load background config:', error); }
        }
        function setBackgroundImage(imageUrl) { document.body.style.backgroundImage = \`url('\${imageUrl}')\`; }
        function loadNextBackground() {
          if (appConfig.backgroundImages.length > 0) {
                currentBackgroundIndex = (currentBackgroundIndex + 1) % appConfig.backgroundImages.length;
                setBackgroundImage(appConfig.backgroundImages[currentBackgroundIndex]);
           }
        }
        function handleImageError() { loadNextBackground() }
        function initBackground() {
             if (appConfig.backgroundImages.length > 0) {
               const randomIndex = Math.floor(Math.random() * appConfig.backgroundImages.length);
                currentBackgroundIndex = randomIndex;
                 const imageUrl = appConfig.backgroundImages[randomIndex];
                const img = new Image();
                  img.onload = () => setBackgroundImage(imageUrl);
                  img.onerror = handleImageError;
                  img.src = imageUrl;
            }
        }
        function showTab(tabId) {
            ['home', 'upload', 'sub2', 'keywords'].forEach(id => document.getElementById(id).classList.remove('active'));
            document.getElementById(tabId).classList.add('active');
        }
        function getDomain() { return window.location.origin; }
        function showLoading(show) { document.getElementById('loading').style.display = show ? 'block' : 'none'; }
        
        async function login() {
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            const errorMsg = document.getElementById('errorMessage');
            const loginBtn = document.getElementById('loginBtn');
            if(isLoggedIn){ document.getElementById('infoBox').style.display = 'block'; return; }
            showLoading(true);
            loginBtn.disabled = true;
            errorMsg.style.display = 'none';
            try{
                const response = await fetch(\`\${getDomain()}/login\`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password }),
                });
                if (response.ok) {
                    const data = await response.json();
                    if(data.success){
                        isLoggedIn = true;
                        appConfig.apiToken = data.config.apiToken;
                        appConfig.maxAttempts = data.config.maxAttempts || 3;
                        appConfig.backgroundImages = (data.config.backgroundImage || '').split(';').filter(url => url.trim());
                        initBackground();
                        document.querySelector('.password-form').style.display = 'none';
                        document.getElementById('infoBox').style.display = 'block';
                        showTab('home');
                        const domain = getDomain();
                        document.getElementById('uploadUrl').textContent = \`\${domain}/upload-${CONFIG.UP}\`;
                        document.getElementById('downloadUrl').textContent = \`\${domain}/token=${CONFIG.TOKEN}?cf_ip=ip.sb&cf_port=443\`;
                        document.getElementById('clashUrl').textContent = \`\${domain}/token=${CONFIG.TOKEN}?cf_ip=ip.sb&cf_port=443&format=clash\`;
                        await Promise.all([loadSub2(), loadUrls(), loadKeywords()]);
                    } else {
                        loginAttempts++;
                        const remaining = (data.maxAttempts || 3) - loginAttempts;
                        errorMsg.textContent = loginAttempts >= (data.maxAttempts || 3) ? '登录尝试次数已用完' : \`用户名或密码错误, 还剩 \${remaining} 次\`;
                        errorMsg.style.display = 'block';
                    }
                } else {
                    errorMsg.textContent = '登录失败';
                    errorMsg.style.display = 'block';
                }
            } catch(error){
                errorMsg.textContent = '网络错误';
                errorMsg.style.display = 'block';
            } finally {
                showLoading(false);
                loginBtn.disabled = false;
            }
        }
        function copyToClipboard(elementId) {
            const text = document.getElementById(elementId).textContent;
            navigator.clipboard.writeText(text).then(() => alert('已复制到剪贴板')).catch(err => console.error('复制失败:', err));
        }
        
         async function loadUrls() {
              const response = await fetch(\`\${getDomain()}/get-urls-\${appConfig.apiToken}\`);
              if (response.ok) {
                  const data = await response.json();
                   const listContainer = document.getElementById('currentList');
                   listContainer.innerHTML = '';
                   if (data.urls && data.urls.length > 0) {
                      data.urls.forEach((item, index) => {
                          const listItem = document.createElement('div');
                          listItem.className = 'list-item';
                          const indexSpan = document.createElement('span');
                          indexSpan.className = 'item-index';
                          indexSpan.textContent = (index + 1) + '.';
                          const urlSpan = document.createElement('span');
                          urlSpan.className = 'list-url';
                          urlSpan.textContent = item.urlName;
                          const deleteBtn = document.createElement('button');
                          deleteBtn.className = 'delete-btn';
                          deleteBtn.textContent = '删除';
                           deleteBtn.onclick = () => deleteUrl(item.urlName);
                          listItem.appendChild(indexSpan);
                          listItem.appendChild(urlSpan);
                          listItem.appendChild(deleteBtn);
                          listContainer.appendChild(listItem);
                      });
                   }else { listContainer.textContent = '当前没有节点'; }
              }
          }
           async function deleteUrl(urlName) {
              const response = await fetch(\`\${getDomain()}/delete-url-\${appConfig.apiToken}\`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ urlName })
              });
              if (response.ok) { await loadUrls(); } else { alert('删除失败'); }
          }
          async function deleteAllUrls(){
             const response = await fetch(\`\${getDomain()}/delete-all-urls-\${appConfig.apiToken}\`,{ method: 'POST' });
              if (response.ok) { await loadUrls(); } else { alert('删除失败'); }
          }
        async function updateSub2() {
            const content = document.getElementById('sub2Input').value;
            const lines = content.split('\\n').filter(url => url.trim());
            const urlPattern = /^.+:\\/\\/.+$/;
            const validUrls = lines.filter(l => urlPattern.test(l.trim()));
            if (validUrls.length === 0) { alert('无有效链接'); return; }
           const response = await fetch(\`\${getDomain()}/update-sub2-\${appConfig.apiToken}\`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ urls: validUrls })
            });
            if (response.ok) {
                document.getElementById('sub2SuccessMessage').style.display = 'block';
                setTimeout(() => { document.getElementById('sub2SuccessMessage').style.display = 'none'; }, 3000);
                await loadSub2();
                document.getElementById('sub2Input').value = '';
            } else { alert('更新失败'); }
        }
       async function loadSub2() {
            const response = await fetch(\`\${getDomain()}/get-sub2-\${appConfig.apiToken}\`);
            if (response.ok) {
                const data = await response.json();
                const listContainer = document.getElementById('currentSub2List');
                listContainer.innerHTML = '';
                  if (data.urls && data.urls.length > 0) {
                      data.urls.forEach((item, index) => {
                        const sub2Item = document.createElement('div');
                          sub2Item.className = 'sub2-item';
                          const indexSpan = document.createElement('span');
                          indexSpan.className = 'item-index';
                          indexSpan.textContent = (index + 1) + '.';
                          const urlSpan = document.createElement('span');
                          urlSpan.className = 'sub2-url';
                          urlSpan.textContent = item.url;
                          const deleteBtn = document.createElement('button');
                          deleteBtn.className = 'delete-btn';
                          deleteBtn.textContent = '删除';
                           deleteBtn.onclick = () => deleteSub2Url(item.id);
                          sub2Item.appendChild(indexSpan);
                          sub2Item.appendChild(urlSpan);
                          sub2Item.appendChild(deleteBtn);
                          listContainer.appendChild(sub2Item);
                      });
                  }else{ listContainer.textContent = '当前没有自定义节点'; }
            }
        }
        async function deleteSub2Url(id) {
            const response = await fetch(\`\${getDomain()}/delete-sub2-\${appConfig.apiToken}\`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id })
            });
            if (response.ok) { await loadSub2(); } else { alert('删除失败'); }
        }
         async function deleteAllSub2Urls(){
            const response = await fetch(\`\${getDomain()}/delete-all-sub2-\${appConfig.apiToken}\`,{ method: 'POST' });
              if (response.ok) { await loadSub2(); } else { alert('删除失败'); }
          }
         async function updateKeywords() {
            const content = document.getElementById('keywordInput').value;
            const keywords = content.split('\\n').filter(keyword => keyword.trim());
            const response = await fetch(\`\${getDomain()}/update-keywords-\${appConfig.apiToken}\`, {
              method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ keywords }),
            });
              if (response.ok) {
                document.getElementById('keywordSuccessMessage').style.display = 'block';
                setTimeout(() => { document.getElementById('keywordSuccessMessage').style.display = 'none'; }, 3000);
                document.getElementById('keywordInput').value = '';
                await loadKeywords();
              } else { alert('更新失败'); }
           }
            async function loadKeywords() {
              const response = await fetch(\`\${getDomain()}/get-keywords-\${appConfig.apiToken}\`);
              if (response.ok) {
                  const data = await response.json();
                  const listContainer = document.getElementById('currentKeywordList');
                   listContainer.innerHTML = '';
                   if (data.keywords && data.keywords.length > 0) {
                       data.keywords.forEach((item, index) => {
                          const itemDiv = document.createElement('div');
                          itemDiv.className = 'keyword-item';
                          const keywordSpan = document.createElement('span');
                          keywordSpan.className = 'keyword-text';
                           keywordSpan.textContent = item.keyword;
                          const deleteBtn = document.createElement('button');
                          deleteBtn.className = 'delete-btn';
                          deleteBtn.textContent = '删除';
                           deleteBtn.onclick = () => deleteKeyword(item.id);
                          itemDiv.appendChild(keywordSpan);
                           itemDiv.appendChild(deleteBtn);
                          listContainer.appendChild(itemDiv);
                      });
                   }else { listContainer.textContent = '当前没有关键词'; }
              }
          }
            async function deleteKeyword(id) {
              const response = await fetch(\`\${getDomain()}/delete-keyword-\${appConfig.apiToken}\`, {
                  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id })
              });
              if (response.ok) { await loadKeywords(); } else { alert('删除失败'); }
          }
            async function deleteAllKeywords(){
               const response = await fetch(\`\${getDomain()}/delete-all-keywords-\${appConfig.apiToken}\`,{ method: 'POST' });
              if (response.ok) { await loadKeywords(); } else { alert('删除失败'); }
            }
        document.getElementById('username').addEventListener('keypress', function(e) { if (e.key === 'Enter' && !this.disabled) login(); });
        document.getElementById('password').addEventListener('keypress', function(e) { if (e.key === 'Enter' && !this.disabled) login(); });
        if(isLoggedIn){ document.getElementById('infoBox').style.display = 'block'; }
        preloadBackgroundConfig();
    </script>
</body>
</html>`;

// URL预处理函数
function preProcessUrl(url) {
    if (url.includes("You've hit the daily limit")) {
        url = url.replace(/{\n.*?You've hit the daily limit.*?\n}/s, "UN");
    }
   
    let isSpecialFormat = false;
    if ((url.startsWith('{BASS}://') || url.startsWith(`${PROTOCOL.pm}ess://`)) &&
        url.split('://')[1].charAt(0) !== '{') {
        isSpecialFormat = true;
    }
    if (isSpecialFormat) {
        try {
            let encodedPart = url.split('://')[1];
            let decodedUrl = atob(encodedPart);
            let urlWithPrefix = `${PROTOCOL.pm}ess://` + decodedUrl;
            return urlWithPrefix.replace(/\{PASS\}\-/g, "")
                .replace(/\{PA/g, PROTOCOL.xieyi)
                .replace(/SS\}/g, PROTOCOL.xieyi2)
                .replace(/\{BA/g, PROTOCOL.pm);
        } catch (e) {
            console.error("Error decoding special format URL:", e, url);
            return url;
        }
    } else {
        return url.replace(/\{PASS\}\-/g, "")
            .replace(/\{PA/g, PROTOCOL.xieyi)
            .replace(/SS\}/g, PROTOCOL.xieyi2)
            .replace(/\{BA/g, PROTOCOL.pm);
    }
}

// 检查URL是否包含排除关键词
function shouldExcludeUrl(url) {
    const excludeList = (excludeKeywords || '').split(';').map(keyword => keyword.trim());
    return excludeList.some(keyword => url.includes(keyword));
}

// 初始化数据库表
async function initDatabase(env) {
    const supabase = new SupabaseClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
    try {
        await supabase.rpc('init_tables');
    } catch (error) {
        // console.log("Tables might already exist:", error);
    }
}

// 终极清洗函数：移除所有 ASCII C0/C1 控制字符，包括换行、回车、制表符等
function cleanString(str) {
    if (!str) return '';
    // [\x00-\x1F] 涵盖了 0-31，包括 \n (10), \r (13), \t (9)
    // [\x7F-\x9F] 涵盖了 DEL 和 C1 控制符
    return str.replace(/[\x00-\x1F\x7F-\x9F]/g, "").trim();
}

// 自定义排序函数：英文a-z在前，中文按拼音在后
function customSort(strA, strB) {
    const isEnglishStart = str => /^[a-zA-Z]/.test(str.charAt(0));
    const groupA = isEnglishStart(strA) ? 0 : 1;
    const groupB = isEnglishStart(strB) ? 0 : 1;
    if (groupA !== groupB) return groupA - groupB;
    return strA.localeCompare(strB, 'zh-CN', { numeric: true, sensitivity: 'base' });
}

// 提取节点名称函数 - 使用终极清洗
function extractName(url) {
    try {
        let name = '';
        if (url.startsWith('vmess://')) {
            const json = JSON.parse(decodeBase64Safe(url.slice(8))); // Safe Decode
            name = json.ps || json.add + ':' + json.port;
        } else if (url.startsWith('vless://') || url.startsWith('trojan://') || url.startsWith('tuic://') || url.startsWith('hysteria2://')) {
            const parts = url.split('#');
            name = decodeURIComponent(parts[parts.length - 1]) || '';
        } else if (url.startsWith('ss://')) {
            const parts = url.split('#');
            name = decodeURIComponent(parts[parts.length - 1]) || '';
        } 
        return cleanString(name);
    } catch (e) {
        return '';
    }
}

// Base64 Safe Decoder (UTF-8 compatible) - 修复 Vmess 乱码
function decodeBase64Safe(str) {
    try {
        str = str.replace(/\s/g, ''); // Remove whitespaces
        // Standard decode
        const decoded = atob(str);
        // Convert to Uint8Array for TextDecoder
        const bytes = new Uint8Array(decoded.length);
        for (let i = 0; i < decoded.length; i++) {
            bytes[i] = decoded.charCodeAt(i);
        }
        const decoder = new TextDecoder('utf-8');
        return decoder.decode(bytes);
    } catch (e) {
        return null; 
    }
}

// 获取所有节点
async function getAllUrls(env) {
    const supabase = new SupabaseClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
    try {
        const results = await supabase.select('urls', 'url_name, url', {}, 'url_name.asc');
        // 注意：这里返回的是数据库原始行，拆分逻辑后置到 handleToken
        return results
            .filter(row => row.url && typeof row.url === 'string' && !shouldExcludeUrl(row.url))
            .map(row => ({ url: row.url, urlName: cleanString(row.url_name) }))
            .sort((a, b) => customSort(a.urlName, b.urlName));
    } catch (error) {
        console.error('Error getting all URLs:', error);
        return [];
    }
}

// 获取所有自定义节点
async function getSub2Urls(env) {
    const supabase = new SupabaseClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
    try {
        const results = await supabase.select('sub2_urls', 'url, id', {}, 'url.asc');
        return results
            .filter(row => row.url && typeof row.url === 'string' && !shouldExcludeUrl(row.url))
            .map(row => ({ url: row.url, id: row.id }))
            .sort((a, b) => {
                const nameA = extractName(a.url);
                const nameB = extractName(b.url);
                return customSort(nameA || a.url, nameB || b.url);
            });
    } catch (error) {
        console.error("Error getting SUB2 URLs:", error);
        return [];
    }
}

// 获取排除关键词列表
async function getExcludeKeywords(env) {
    const supabase = new SupabaseClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
    try {
        const results = await supabase.select('exclude_keywords', 'keyword, id', {}, 'id.asc');
        return results.map(row => ({ keyword: row.keyword, id: row.id }));
    } catch (error) {
        console.error('Error getting exclude keywords:', error);
        return [];
    }
}

/**
 * =========================================================================================
 * Clash Meta (Mihome) Parser & Generator
 * =========================================================================================
 */

// 1. Clash Config Template
// 请使用此代码块替换您文件中的 getClashHeader 函数
// --- 请用此代码块完整替换您 Worker 中的 getClashHeader 函数 ---
function getClashHeader() {
    // 恢复到最稳定且经过速度优化的 DNS 配置
return `port: 7890
socks-port: 7891
allow-lan: true
mode: rule
log-level: info
# 标准 Clash 优化的 DNS 配置
dns:
  enable: true
  ipv6: false
  enhanced-mode: fake-ip
  fake-ip-range: 198.18.0.1/16
  default-nameserver:
    - 223.5.5.5
  nameserver:
    - https://223.5.5.5/dns-query # 国内DNS，走 DIRECT
    - https://1.12.12.12/dns-query
  fallback:
    - https://1.1.1.1/dns-query # 国外DNS，走 PROXY
    - https://8.8.8.8/dns-query
  fallback-filter:
    geoip: true
    geoip-code: CN
proxies:
`;
}

// 2. Vmess Parser
function parseVmess(url) {
    try {
        const base64Content = url.replace('vmess://', '');
        let jsonStr = decodeBase64Safe(base64Content); // Use Safe Decoder
        if (!jsonStr) return null;
        
        const config = JSON.parse(jsonStr);
        
        const proxy = {
            name: cleanString(config.ps) || 'vmess',
            type: 'vmess',
            server: cleanString(config.add),
            port: parseInt(config.port),
            uuid: cleanString(config.id),
            alterId: parseInt(config.aid || 0),
            cipher: cleanString(config.scy) || 'auto',
            network: cleanString(config.net) || 'tcp',
            tls: config.tls === 'tls',
            'skip-cert-verify': true,
        };

        if (proxy.network === 'ws') {
            proxy['ws-opts'] = {
                path: cleanString(config.path) || '/',
                headers: { Host: cleanString(config.host) || proxy.server }
            };
        } else if (proxy.network === 'grpc') {
            proxy['grpc-opts'] = {
                'grpc-service-name': cleanString(config.path) || 'grpc'
            };
        }
        return proxy;
    } catch (e) { return null; }
}

// 3. Vless Parser - Fixed Regex for Path
function parseVless(url) {
    try {
        // Updated regex to allow optional slash after port
        const regex = /^vless:\/\/([^@]+)@([^:]+):(\d+)\/?\?(.*?)#(.*)$/;
        const match = url.match(regex);
        if (!match) return null;

        const [_, uuid, server, port, queryStr, name] = match;
        const params = new URLSearchParams(queryStr);
        const decodedName = decodeURIComponent(name);

        const proxy = {
            name: cleanString(decodedName),
            type: 'vless',
            server: cleanString(server),
            port: parseInt(port),
            uuid: cleanString(uuid),
            network: params.get('type') || 'tcp',
            tls: params.get('security') === 'tls' || params.get('security') === 'reality',
            'udp': true,
            'skip-cert-verify': true,
            'flow': params.get('flow') || undefined,
        };

        const serverName = cleanString(params.get('sni') || params.get('host'));
        if (serverName) proxy['servername'] = serverName;
        
        if (params.get('fp')) proxy['client-fingerprint'] = params.get('fp');

        if (params.get('security') === 'reality') {
            proxy['reality-opts'] = {
                'public-key': cleanString(params.get('pbk')),
                'short-id': cleanString(params.get('sid'))
            };
        }

        if (proxy.network === 'ws') {
            proxy['ws-opts'] = {
                path: cleanString(params.get('path')) || '/',
                headers: { Host: cleanString(params.get('host')) || serverName || proxy.server }
            };
        } else if (proxy.network === 'grpc') {
            proxy['grpc-opts'] = {
                'grpc-service-name': cleanString(params.get('serviceName') || params.get('path')) || 'grpc'
            };
        }
        return proxy;
    } catch (e) { return null; }
}

// 4. Trojan Parser - Fixed Regex for Path
function parseTrojan(url) {
    try {
        const regex = /^trojan:\/\/([^@]+)@([^:]+):(\d+)\/?\?(.*?)#(.*)$/;
        const match = url.match(regex);
        if (!match) return null;

        const [_, password, server, port, queryStr, name] = match;
        const params = new URLSearchParams(queryStr);
        const decodedName = decodeURIComponent(name);

        const proxy = {
            name: cleanString(decodedName),
            type: 'trojan',
            server: cleanString(server),
            port: parseInt(port),
            password: cleanString(password),
            network: params.get('type') || 'tcp',
            'skip-cert-verify': true,
            udp: true
        };
        
        const sni = cleanString(params.get('sni') || params.get('peer'));
        if (sni) proxy.sni = sni;

        if (proxy.network === 'ws') {
             proxy['ws-opts'] = {
                path: cleanString(params.get('path')) || '/',
                headers: { Host: cleanString(params.get('host')) || sni || proxy.server }
            };
        }
        return proxy;
    } catch (e) { return null; }
}

// 5. Shadowsocks Parser
// 5. Shadowsocks Parser - Aggressive Cleaning (已修复 SIP002 格式)
function parseShadowsocks(url) {
    try {
        if (!url.startsWith('ss://')) return null;

        // 1. 提取节点名称 (Name) 和主体配置部分 (configPart)
        let name = '';
        let configPart = url.replace('ss://', '');
        
        // 分离 #name 部分
        if (configPart.includes('#')) {
             const parts = configPart.split('#');
             configPart = parts[0];
             name = decodeURIComponent(parts[parts.length - 1]);
        }
        
        // 移除可能的 ?query 部分 (例如 SIP002 的插件参数)
        configPart = configPart.split('?')[0];
        
        if (configPart.includes('@')) {
            // SIP002 格式: credentialsBase64@serverInfo
            const [credentialsBase64, serverInfo] = configPart.split('@');
            
            let decodedCredentials = '';
            try {
                // 仅对凭证部分 (cipher:password) 进行 Base64 解码
                decodedCredentials = atob(credentialsBase64);
            } catch(e) {
                // Base64 解码失败，可能是无效链接
                return null;
            }
            
            // 组合完整的配置字符串: cipher:password@server:port
            const fullConfig = `${decodedCredentials}@${serverInfo}`;
            
            // 匹配格式: cipher:password@server:port
            const pattern = /^(.*?):(.*?)@(.*):(\d+)$/;
            const match = fullConfig.match(pattern);

            if(match) {
                 return {
                     name: cleanString(name) || 'Shadowsocks',
                     type: 'ss',
                     server: cleanString(match[3]),
                     port: parseInt(match[4]),
                     cipher: cleanString(match[1]),
                     password: cleanString(match[2]),
                     udp: true
                 };
            }
        }
        
        // 对于非 SIP002 或无法解析的格式，返回 null
        return null;

    } catch(e) { 
        return null; 
    }
}

// 6. Tuic Parser (NEW) - Fixed Regex
function parseTuic(url) {
    try {
        // Updated regex to allow optional slash after port
        const regex = /^tuic:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/?\?(.*?)#(.*)$/;
        const match = url.match(regex);
        if (!match) return null;

        const [_, uuid, password, server, port, queryStr, name] = match;
        const params = new URLSearchParams(queryStr);
        const decodedName = decodeURIComponent(name);

        const proxy = {
            name: cleanString(decodedName),
            type: 'tuic',
            server: cleanString(server),
            port: parseInt(port),
            uuid: cleanString(uuid),
            password: cleanString(password),
            'skip-cert-verify': params.get('allow_insecure') === '1',
            'udp': true
        };

        if (params.get('sni')) proxy.sni = params.get('sni');
        if (params.get('alpn')) proxy.alpn = [params.get('alpn')];
        if (params.get('congestion_control')) proxy['congestion-controller'] = params.get('congestion_control');
        if (params.get('udp_relay_mode')) proxy['udp-relay-mode'] = params.get('udp_relay_mode');

        return proxy;
    } catch (e) { return null; }
}

// 7. Hysteria2 Parser (NEW) - Fixed Regex
function parseHysteria2(url) {
    try {
        // Updated regex to allow optional slash after port (\d+)\/?\?
        const regex = /^hysteria2:\/\/([^@]+)@([^:]+):(\d+)\/?\?(.*?)#(.*)$/;
        const match = url.match(regex);
        if (!match) return null;

        const [_, auth, server, port, queryStr, name] = match;
        const params = new URLSearchParams(queryStr);
        const decodedName = decodeURIComponent(name);

        const proxy = {
            name: cleanString(decodedName),
            type: 'hysteria2',
            server: cleanString(server),
            port: parseInt(port),
            password: cleanString(auth),
            'skip-cert-verify': params.get('insecure') === '1' || params.get('allow_insecure') === '1',
            'udp': true
        };

        if (params.get('sni')) proxy.sni = params.get('sni');
        if (params.get('alpn')) proxy.alpn = [params.get('alpn')];
        
        return proxy;
    } catch (e) { return null; }
}

// Main Clash Generation Function
function generateClashYaml(urls) {
    let yaml = getClashHeader();
    const proxyNames = [];
    const proxies = [];

    // 1. 节点解析和去重逻辑 (保留不变)
    for (const url of urls) {
        if (!url || typeof url !== 'string') continue;
        
        let proxy = null;
        if (url.startsWith('vmess://')) proxy = parseVmess(url);
        else if (url.startsWith('vless://')) proxy = parseVless(url);
        else if (url.startsWith('trojan://')) proxy = parseTrojan(url);
        else if (url.startsWith('ss://')) proxy = parseShadowsocks(url);
        else if (url.startsWith('tuic://')) proxy = parseTuic(url);
        else if (url.startsWith('hysteria2://')) proxy = parseHysteria2(url);

        // --- 替换原有名称去重逻辑的代码块 ---
if (proxy && proxy.name) {
    // 1. 获取干净的原始名称
    let baseName = proxy.name;
    try {
        // 确保调用 cleanString，清理名称中的控制字符
        baseName = cleanString(baseName); 
    } catch (e) {
        // 如果 cleanString 函数未定义，则使用原始名称进行去重
    }

    let finalName = baseName;
    
    // 2. 检查基础名称是否已经存在于 proxyNames 列表中
    if (proxyNames.includes(baseName)) {
        // 发现重复，使用协议类型作为后缀
        // 将协议类型转换为大写，例如 'vmess' -> 'VMESS'
        const protocolType = proxy.type.toUpperCase(); 
        finalName = `${baseName} ${protocolType}`;
        
        // 3. 检查【基础名称 + 协议】是否仍然重复（例如：两个 VLESS 节点同名）
        if (proxyNames.includes(finalName)) {
            // 如果【BaseName + Protocol】仍然重复，则启用数字后缀，从 2 开始计数
            let counter = 2; 
            let tempName = `${baseName} ${protocolType} ${counter}`;
            
            while (proxyNames.includes(tempName)) {
                counter++;
                tempName = `${baseName} ${protocolType} ${counter}`;
            }
            finalName = tempName;
        }
    }
    
    // 4. 更新节点并添加到列表
    proxy.name = finalName;
    proxyNames.push(finalName);
    proxies.push(proxy);
}
    }
    
    // 2. 空节点处理 (保留不变)
    let finalProxyNames = proxyNames;
    let autoProxies = proxyNames;
    if (proxyNames.length === 0) {
        proxies.push({
             name: '🚫 空节点',
             type: 'socks5',
             server: '127.0.0.1',
             port: 1,
             udp: false
        });
        finalProxyNames = ['🚫 空节点'];
        autoProxies = ['🚫 空节点'];
    }


    // 3. 拼接 Proxies (节点列表) - 保留上次修复后的版本
    proxies.forEach(p => {
        yaml += `  - name: "${p.name.replace(/"/g, '\\"')}"\n`; 

        Object.keys(p).filter(key => key !== 'name').forEach(key => {
            const value = p[key]; 
            if (value === undefined || value === null) return;
            
            if (typeof value === 'object' && value !== null) {
                
                if (Array.isArray(value)) {
                    // Level 2: 数组 (如 'alpn')
                    yaml += `    ${key}:\n`; 
                    value.forEach(item => {
                        const finalItem = typeof item === 'string' ? `"${item.replace(/"/g, '\\"')}"` : item;
                        yaml += `      - ${finalItem}\n`; 
                    });
                    return; 
                }
                
                // Level 2: 映射/Map (ws-opts, grpc-opts)
                yaml += `    ${key}:\n`; 
                
                Object.keys(value).forEach(subKey => { 
                    const subValue = value[subKey];
                    
                    if (subKey === 'headers' && typeof subValue === 'object' && subValue !== null) {
                        // Level 3: 专门处理 'headers' 字段
                        if (Array.isArray(subValue)) {
                            yaml += `      headers: {}\n`; 
                            return; 
                        }
                        
                        // 正常的 Level 3: 'headers:' 是一个映射
                        yaml += `      ${subKey}:\n`; 
                        Object.keys(subValue).forEach(headerKey => {
                            // Level 4: Header key-value pairs
                            const headerValue = typeof subValue[headerKey] === 'string' ? `"${subValue[headerKey].replace(/"/g, '\\"')}"` : subValue[headerKey];
                            yaml += `        ${headerKey}: ${headerValue}\n`; 
                        });
                        
                    } else {
                        // Level 3: 普通的标量值
                        const finalSubValue = typeof subValue === 'string' ? `"${subValue.replace(/"/g, '\\"')}"` : subValue;
                        yaml += `      ${subKey}: ${finalSubValue}\n`; 
                    }
                });

            } else {
                // Level 2: 标量值
                const finalValue = typeof value === 'string' ? `"${value.replace(/"/g, '\\"')}"` : value;
                yaml += `    ${key}: ${finalValue}\n`;
            }
        });
    });


    // 4. 拼接 Proxy Groups (代理组) - 【核心修复：将 load-balance 替换为 fallback】
    yaml += `
proxy-groups:
  - name: 🔰 节点选择
    type: select
    proxies:
      - 🚀 自动选择
      - ♻️ 负载均衡
      - DIRECT
${finalProxyNames.map(n => `      - "${n.replace(/"/g, '\\"')}"`).join('\n')}

  - name: 🚀 自动选择
    type: url-test
    url: http://www.gstatic.com/generate_204
    interval: 300
    tolerance: 50
    proxies:
${autoProxies.map(n => `      - "${n.replace(/"/g, '\\"')}"`).join('\n')}

  - name: ♻️ 负载均衡
    type: fallback 
    url: http://www.gstatic.com/generate_204
    interval: 300
    # 移除了不支持的 strategy: consistent-hash
    proxies:
${autoProxies.map(n => `      - "${n.replace(/"/g, '\\"')}"`).join('\n')}

  - name: 🌍 国外网站
    type: select
    proxies:
      - 🔰 节点选择
      - 🎯 全球直连

  - name: 🇨🇳 国内网站
    type: select
    proxies:
      - 🎯 全球直连
      - 🔰 节点选择

  - name: 🛑 广告拦截
    type: select
    proxies:
      - REJECT
      - 🎯 全球直连

  - name: 🎯 全球直连
    type: select
    proxies:
      - DIRECT
      
  - name: 🆑 其他
    type: select
    proxies:
      - 🔰 节点选择
      - 🎯 全球直连
`;

    // 5. 拼接 Rules (分流规则) - 保留不变
// --- 请用此代码块替换您 generateClashYaml 函数中原有的 Rules (分流规则) 部分 ---

// --- 请用此代码块替换您 generateClashYaml 函数中原有的 Rules (分流规则) 部分 ---

// --- 请用此代码块替换您 generateClashYaml 函数中原有的 Rules (分流规则) 部分 ---

yaml += `
rules:
  # 广告和恶意域名（放在前面拦截）
  - DOMAIN-KEYWORD,ad,🛑 广告拦截
  - DOMAIN-KEYWORD,googlead,🛑 广告拦截
  - DOMAIN-KEYWORD,analytics,🛑 广告拦截

  # 常见流媒体和社交媒体（强制走国外代理）
  - DOMAIN-SUFFIX,youtube.com,🌍 国外网站
  - DOMAIN-SUFFIX,youtu.be,🌍 国外网站
  - DOMAIN-SUFFIX,googlevideo.com,🌍 国外网站 # Youtube 视频流
  - DOMAIN-SUFFIX,v2ex.com,🌍 国外网站
  - DOMAIN-SUFFIX,telegram.org,🌍 国外网站
  - DOMAIN-SUFFIX,t.co,🌍 国外网站
  - DOMAIN-SUFFIX,media-amazon.com,🌍 国外网站 # Amazon/Prime Video
  - DOMAIN-SUFFIX,netflix.com,🌍 国外网站
  - DOMAIN-SUFFIX,spotify.com,🌍 国外网站
  - DOMAIN-SUFFIX,cdninstagram.com,🌍 国外网站 # Instagram CDN
  
  # 局域网/保留地址直连（防止内网流量走代理）
  - IP-CIDR,192.168.0.0/16,🎯 全球直连,no-resolve
  - IP-CIDR,10.0.0.0/8,🎯 全球直连,no-resolve
  - IP-CIDR,172.16.0.0/12,🎯 全球直连,no-resolve

  # 大陆 GEOIP 和 GEOSITE 直连
  - GEOIP,CN,🇨🇳 国内网站
  - GEOSITE,CN,🇨🇳 国内网站

  # 其他常见国外网站走国外代理
  - DOMAIN-SUFFIX,google.com,🌍 国外网站
  - DOMAIN-SUFFIX,facebook.com,🌍 国外网站
  - DOMAIN-SUFFIX,twitter.com,🌍 国外网站
  - DOMAIN-SUFFIX,apple-cloudkit.com,🌍 国外网站
  - DOMAIN-SUFFIX,microsoft.com,🌍 国外网站
  
  # 其他大陆网站走直连
  - DOMAIN-SUFFIX,cn,🇨🇳 国内网站

  # 默认匹配
  - MATCH,🆑 其他
`;

    return yaml;
} 
// --- 确保 } 闭合了 generateClashYaml 函数 ---
// --- 确保 } 闭合了 generateClashYaml 函数 ---
// --- 确保 } 闭合了 generateClashYaml 函数 ---

// Worker Main Entry
export default {
    async fetch(request, env) {
        return handleRequest(request, env);
    }
};

async function handleRequest(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    await initDatabase(env);
    if (path === '/' || path === '') {
        return new Response('Hello World', { headers: { 'content-type': 'text/plain' } });
    }
    if (path === '/login' && request.method === 'POST') {
        return handleLogin(request, env);
    }
    if (path === '/get-background-config') {
        return new Response(JSON.stringify({
            backgroundImages: (CONFIG.BACKGROUND_IMAGE || '').split(';').filter(url => url.trim())
        }), {
            headers: { 'Content-Type': 'application/json' }
        });
    }
    if (path === `/sub-${CONFIG.UUID}`) {
        return new Response(html, {
            headers: { 'content-type': 'text/html;charset=UTF-8' },
        });
    }
    // API Routes
    if (path === `/upload-${CONFIG.UP}` && request.method === 'POST') {
        return handleUpload(request, env);
    } else if (path === `/token=${CONFIG.TOKEN}`) {
        return handleToken(request, env);
    } else if (path === `/update-sub2-${CONFIG.APITOKEN}` && request.method === 'POST') {
        return handleUpdateSub2(request, env);
    } else if (path === `/get-sub2-${CONFIG.APITOKEN}`) {
        return handleGetSub2(env);
    } else if (path === `/delete-sub2-${CONFIG.APITOKEN}` && request.method === 'POST') {
        return handleDeleteSub2(request, env);
    } else if (path === `/get-urls-${CONFIG.APITOKEN}`) {
        return handleGetUrls(env);
    } else if (path === `/delete-url-${CONFIG.APITOKEN}` && request.method === 'POST') {
        return handleDeleteUrl(request, env);
    } else if (path === `/update-keywords-${CONFIG.APITOKEN}` && request.method === 'POST') {
        return handleUpdateKeywordsRequest(request, env);
    } else if (path === `/get-keywords-${CONFIG.APITOKEN}`) {
        return handleGetKeywordsRequest(env);
    } else if (path === `/delete-keyword-${CONFIG.APITOKEN}` && request.method === 'POST') {
        return handleDeleteKeyword(request, env);
    } else if (path === `/delete-all-urls-${CONFIG.APITOKEN}` && request.method === 'POST') {
        return handleDeleteAllUrls(env);
    } else if (path === `/delete-all-sub2-${CONFIG.APITOKEN}` && request.method === 'POST') {
        return handleDeleteAllSub2Urls(env);
    } else if (path === `/delete-all-keywords-${CONFIG.APITOKEN}` && request.method === 'POST') {
        return handleDeleteAllKeywords(env);
    } else {
        return new Response('Not Found', { status: 404 });
    }
}

async function handleLogin(request, env) {
    const { username, password } = await request.json();
    if (username === CONFIG.USER && password === env.PSWD) {
        return new Response(JSON.stringify({
            success: true,
            config: {
                apiToken: CONFIG.APITOKEN,
                maxAttempts: CONFIG.MAX_LOGIN_ATTEMPTS,
                backgroundImage: CONFIG.BACKGROUND_IMAGE
            }
        }), { headers: { 'Content-Type': 'application/json' } });
    }
    return new Response(JSON.stringify({ success: false, maxAttempts: CONFIG.MAX_LOGIN_ATTEMPTS }), {
        headers: { 'Content-Type': 'application/json' }, status: 401
    });
}

async function handleDeleteKeyword(request, env) {
    const { id } = await request.json();
    const supabase = new SupabaseClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
    await supabase.delete('exclude_keywords', { id });
    return new Response('OK', { status: 200 });
}
async function handleGetKeywordsRequest(env) {
    const keywords = await getExcludeKeywords(env);
    return new Response(JSON.stringify({ keywords }), { headers: { 'Content-Type': 'application/json' } });
}
async function handleUpdateKeywordsRequest(request, env) {
    const { keywords } = await request.json();
    const supabase = new SupabaseClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
    const existingKeywords = await getExcludeKeywords(env);
    const existingSet = new Set(existingKeywords.map(item => item.keyword));
    const newKeywords = keywords.filter(k => !existingSet.has(k)).map(k => ({ keyword: k }));
    if (newKeywords.length > 0) await supabase.insert('exclude_keywords', newKeywords);
    return new Response('OK', { status: 200 });
}
async function handleDeleteAllKeywords(env) {
    const supabase = new SupabaseClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
    await supabase.rpc('delete_all_keywords');
    return new Response('OK', { status: 200 });
}
async function handleGetUrls(env) {
    const urls = await getAllUrls(env);
    return new Response(JSON.stringify({ urls }), { headers: { 'Content-Type': 'application/json' } });
}
async function handleDeleteUrl(request, env) {
    const { urlName } = await request.json();
    const supabase = new SupabaseClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
    await supabase.delete('urls', { url_name: urlName });
    return new Response('OK', { status: 200 });
}
async function handleDeleteAllUrls(env) {
    const supabase = new SupabaseClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
    await supabase.rpc('delete_all_urls');
    return new Response('OK', { status: 200 });
}
async function handleDeleteSub2(request, env) {
    const { id } = await request.json();
    const supabase = new SupabaseClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
    await supabase.delete('sub2_urls', { id });
    return new Response('OK', { status: 200 });
}
async function handleDeleteAllSub2Urls(env) {
    const supabase = new SupabaseClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
    await supabase.rpc('delete_all_sub2_urls');
    return new Response('OK', { status: 200 });
}
async function handleUpdateSub2(request, env) {
    const { urls } = await request.json();
    const supabase = new SupabaseClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
    const existingUrls = await getSub2Urls(env);
    const existingSet = new Set(existingUrls.map(item => item.url));
    const newUrls = urls.map(u => preProcessUrl(u)).filter(u => !shouldExcludeUrl(u) && !existingSet.has(u)).map(u => ({ url: u }));
    if (newUrls.length > 0) await supabase.insert('sub2_urls', newUrls);
    return new Response('OK', { status: 200 });
}
async function handleGetSub2(env) {
    const urls = await getSub2Urls(env);
    return new Response(JSON.stringify({ urls }), { headers: { 'Content-Type': 'application/json' } });
}
async function handleUpload(request, env) {
    const supabase = new SupabaseClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
    const { URL_NAME, URL } = await request.json();
    if (!URL_NAME || !URL) return new Response('Missing Data', { status: 400 });
    let processedURL = preProcessUrl(URL);
    if (shouldExcludeUrl(processedURL)) return new Response('OK', { status: 200 });
    const currentTime = Date.now();
    const existingRecords = await supabase.select('urls', 'id, url', { url_name: URL_NAME });
    if (existingRecords && existingRecords.length > 0) {
        if (existingRecords[0].url !== processedURL) {
            await supabase.update('urls', { url: processedURL, last_update: currentTime }, { id: existingRecords[0].id });
        } else {
            await supabase.update('urls', { last_update: currentTime }, { id: existingRecords[0].id });
        }
    } else {
        await supabase.insert('urls', {
            url_name: URL_NAME, url: processedURL, last_update: currentTime, expiration_ttl: CONFIG.EXPIRATION_TIME
        });
    }
    return new Response('OK', { status: 200 });
}

async function handleToken(request, env) {
    const supabase = new SupabaseClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
    const { searchParams } = new URL(request.url);
    const cf_ip = searchParams.get('cf_ip');
    const cf_port = searchParams.get('cf_port');
    const format = searchParams.get('format'); 
   
    if (!cf_ip || !cf_port) {
        return new Response('Missing cf_ip or cf_port', { status: 400 });
    }
   
    try {
        await supabase.rpc('delete_expired_urls', { expired_time: Date.now() - CONFIG.EXPIRATION_TIME * 1000 });
    } catch (error) {}

    let dbUrls = (await getAllUrls(env)).map(item => item.url);
    const sub2Urls = (await getSub2Urls(env)).map(item => item.url);
    dbUrls = dbUrls.concat(sub2Urls);
    
    // FIX: Split multiline DB entries into individual URLs BEFORE any processing
    let urls = [];
    for(const block of dbUrls) {
        if(!block) continue;
        // Split by newline and remove empty lines
        const lines = block.split(/[\r\n]+/).map(line => line.trim()).filter(line => line.length > 0);
        urls.push(...lines);
    }

    const excludeList = await getExcludeKeywords(env);
    urls = urls.filter(url => !excludeList.some(item => url.includes(item.keyword)));

    urls = urls.map(url => {
        if (url.includes('YOUXUAN_IP') || url.includes('ip.sb')) {
            url = url.replace(/YOUXUAN_IP|ip\.sb/g, cf_ip)
                .replace(/\b(443|8443)\b/g, cf_port)
                .replace(/CF_PORT/g, cf_port);
            if (cf_port === '80' || cf_port === '8080') {
                url = url.replace(/=tls/g, '=none').replace(/tls\",/g, '\",');
            }
        } else {
            url = url.replace(/YOUXUAN_IP|ip\.sb/g, cf_ip).replace(/CF_PORT/g, cf_port);
        }
        return url;
    });

    let finalUrls = [];
    for (const url of urls) {
        if (url.startsWith('http')) {
            try {
                const res = await fetch(url);
                let content = await res.text();
                if (!content.includes('<body>')) {
                     try { content = decodeBase64Safe(content) || content; } catch (e) {}
                     const subUrls = content.split('\n').filter(l => l.trim() && !excludeList.some(i => l.includes(i.keyword)));
                     finalUrls = finalUrls.concat(subUrls);
                }
            } catch (e) { console.error('Sub link failed', e); }
        } else {
            finalUrls.push(url);
        }
    }

    let namedUrls = finalUrls.map(url => ({ url, name: extractName(url) })).filter(i => i.name);
    namedUrls.sort((a, b) => customSort(a.name, b.name));
    finalUrls = namedUrls.map(item => item.url);

    if (format === 'clash') {
        const yamlContent = generateClashYaml(finalUrls);
        return new Response(yamlContent, { headers: { 'Content-Type': 'text/yaml;charset=UTF-8' } });
    }

    return new Response(encodeToBase64(finalUrls.join('\n')), { headers: { 'Content-Type': 'text/plain' } });
}

function encodeToBase64(str) {
    try {
        const encoder = new TextEncoder();
        const byteArray = encoder.encode(str);
        let binary = '';
        byteArray.forEach(byte => { binary += String.fromCharCode(byte); });
        return btoa(binary);
    } catch (error) { return null; }
}
