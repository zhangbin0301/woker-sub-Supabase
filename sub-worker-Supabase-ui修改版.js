// worker设置里面添加变量PSWD(登录密码)
// 基础参数配置
const CONFIG = {
    UUID: '1',  // 管理页面访问路径 /sub-uuid
    APITOKEN: '1',  // 管理节点的API路径密钥
    UP: '1',           // 节点上传密钥
    TOKEN: '1', // 订阅地址密钥
    USER: '1',  // 登录用户名
    DEFAULT_DOMAIN: '', // 默认即可，无需设置
    EXPIRATION_TIME: 1800, // 自动上传节点链接有效期(秒), 过期未更新则移除
    MAX_LOGIN_ATTEMPTS: 3, // 最大登录尝试次数 (前端限制)
    BACKGROUND_IMAGE: 'https://media.istockphoto.com/id/508515231/photo/feeling-free-to-express-her-sensuality.jpg?s=1024x1024&w=is&k=20&c=959xvWit4gR8btZtd7FmzTIkqzSwyB8zLIacQyQfLIk=;https://media.istockphoto.com/id/520980967/photo/sexy-beautiful-woman-in-lingerie.jpg?s=612x612&w=is&k=20&c=ciVJawZ8X8wrnyhK3GWaypMzus09kwuT7vildArZ20Q=;https://media.istockphoto.com/id/506435758/photo/beautyful-young-blond-woman-sitting-next-to-the-balkony-door.jpg?s=1024x1024&w=is&k=20&c=BeDnqv_dt3XPN00IVVuO0eJo6kA362nXBlDxBsUX-_8=;https://media.istockphoto.com/id/187150159/photo/naked-girl-in-water-on-a-black-background.jpg?s=1024x1024&w=is&k=20&c=IyxsYlzFJlJVYDDIkkZX3lw6nWYfcvVYVOpPnoM1sBk=;https://media.istockphoto.com/id/538127701/photo/female-torso-with-bra-on-black-background.jpg?s=612x612&w=is&k=20&c=Z1Na-xQxSiXEpf2RvC9MfeVWKssTXx36653LYzbh2oo=;https://cdn.pixabay.com/photo/2024/07/03/15/40/beauty-8870258_1280.png?q=80&w=1280;https://media.istockphoto.com/id/1077567800/photo/hot-young-adult-proud-and-domineering-woman-dressed-in-a-long-scarlet-red-long-dress-sexually.jpg?s=612x612&w=is&k=20&c=Ow7PyaUo2YZ1YDnnlPY3PJlmB9C_x5O9XYjR4Q_xd3U=;https://media.istockphoto.com/id/1077591134/photo/free-your-femininity.jpg?s=612x612&w=is&k=20&c=FqZHQjWLmL7yAslJLYIMPjF7LlXAIZAM9AR6bGHgE1g=;https://media.istockphoto.com/id/1156676927/photo/fashionable-studio-portrait-of-a-sport-girl.jpg?s=612x612&w=is&k=20&c=d4XhyoPnemNVTQBzK5gTb6t8n1un5m9vrZsgbihmS1U=;https://media.istockphoto.com/id/536720005/photo/looking-sensual-in-red.jpg?s=612x612&w=is&k=20&c=eCg7_4FCLHztU8fVuYIpwzezzbyRpw5FHZTS7GF9OHU='
};

// 排除包含关键词的节点,分号隔开.目的是移除个别失效节点
const excludeKeywords = 'GB-eu.com;TW-free.tw';

// 协议配置,默认即可.目的是防止cf关键词屏蔽
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
        // 添加排序参数
        if (order) {
            endpoint += `&order=${order}`;
        }
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
        if (filterParams.toString()) {
            endpoint += `?${filterParams.toString()}`;
        }
        return await this.request(endpoint, {
            method: 'PATCH',
            body: JSON.stringify(data)
        });
    }

    async upsert(table, data, conflictColumns = ['id']) {
        return await this.request(table, {
            method: 'POST',
            headers: { 'Prefer': `resolution=merge-duplicates,return=representation` },
            body: JSON.stringify(Array.isArray(data) ? data : [data])
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
        if (filterParams.toString()) {
            endpoint += `?${filterParams.toString()}`;
        }
        return await this.request(endpoint, { method: 'DELETE' });
    }

    async rpc(functionName, params = {}) {
        return await this.request(`rpc/${functionName}`, {
            method: 'POST',
            body: JSON.stringify(params)
        });
    }
}

// HTML页面内容 - 移除硬编码的敏感参数
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
                <button class="copy-btn" onclick="copyToClipboard('downloadUrl')">复制</button>
                
                <h3>使用说明:</h3>
                <ol>
                    <li>节点原始优选域名要设置为ip.sb,端口443或8443,否则也不影响使用,只是不支持自动更换优选IP和端口</li>
                    <li>订阅链接参数:cf_ip和cf_port必填,可以自动替换优选域名和端口</li>
                    <li>默认支持v2r.ayng,hid.dify,neko等软件,其他软件自行转换格式</li>
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
        // 配置参数 - 登录成功后从服务器获取
        let appConfig = {
            apiToken: '',  // API路径密钥
            maxAttempts: 3,
            backgroundImages: []
        };
        
        let currentBackgroundIndex = 0;
        let loginAttempts = 0;
        let isLoggedIn = false;

        // 页面加载时预加载背景图片配置
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
            } catch (error) {
                console.error('Failed to load background config:', error);
            }
        }

       function setBackgroundImage(imageUrl) {
            document.body.style.backgroundImage = \`url('\${imageUrl}')\`;
        }

        function loadNextBackground() {
          if (appConfig.backgroundImages.length > 0) {
                currentBackgroundIndex = (currentBackgroundIndex + 1) % appConfig.backgroundImages.length;
                setBackgroundImage(appConfig.backgroundImages[currentBackgroundIndex]);
           }
       }
       
      function handleImageError() {
         loadNextBackground()
       }

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
              const tabs = ['home', 'upload', 'sub2', 'keywords'];
              tabs.forEach(id => {
                  document.getElementById(id).classList.remove('active');
              });
              document.getElementById(tabId).classList.add('active');
          }

         function getDomain() {
            return window.location.origin;
        }

        function showLoading(show) {
            const loadingDiv = document.getElementById('loading');
            loadingDiv.style.display = show ? 'block' : 'none';
        }

       async function login() {
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            const errorMsg = document.getElementById('errorMessage');
            const loginBtn = document.getElementById('loginBtn');
             
              if(isLoggedIn){
                    document.getElementById('infoBox').style.display = 'block';
                    return;
                }
              
            showLoading(true);
            loginBtn.disabled = true;
            errorMsg.style.display = 'none';
             
             try{
                const response = await fetch(\`\${getDomain()}/login\`, {
                 method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                 },
                body: JSON.stringify({ username, password }),
            });
                  
           if (response.ok) {
              const data = await response.json();
              if(data.success){
                isLoggedIn = true;
                
                // 从服务器响应中获取配置参数(TOKEN和UP不下发,保证安全)
                appConfig.apiToken = data.config.apiToken;
                appConfig.maxAttempts = data.config.maxAttempts || 3;
                appConfig.backgroundImages = (data.config.backgroundImage || '').split(';').filter(url => url.trim());
                
                // 初始化背景图
                initBackground();
                
                // 隐藏登录表单,显示管理界面
                document.querySelector('.password-form').style.display = 'none';
                document.getElementById('infoBox').style.display = 'block';
                showTab('home');
                errorMsg.style.display = 'none';
                const domain = getDomain();
                 
                // 显示带占位符的地址,不暴露真实TOKEN和UP值
                document.getElementById('uploadUrl').textContent = 
                    \`\${domain}/upload-你设置的UP值\`;
                document.getElementById('downloadUrl').textContent = 
                    \`\${domain}/token=你设置的TOKEN值?cf_ip=ip.sb&cf_port=443\`;
                
                await Promise.all([loadSub2(), loadUrls(), loadKeywords()]);
              }else{
                loginAttempts++;
                const remainingAttempts = (data.maxAttempts || 3) - loginAttempts;
                 if (loginAttempts >= (data.maxAttempts || 3)) {
                    errorMsg.textContent = '登录尝试次数已用完,请稍后再试';
                    loginBtn.disabled = true;
                    document.getElementById('username').disabled = true;
                    document.getElementById('password').disabled = true;
                } else {
                    errorMsg.textContent = \`用户名或密码错误,还剩 \${remainingAttempts} 次尝试机会\`;
                }
                errorMsg.style.display = 'block';
              }
           }else{
                 errorMsg.textContent = '登录失败,请重试';
                 errorMsg.style.display = 'block';
           }

            }catch(error){
              errorMsg.textContent = '网络错误,请重试';
              errorMsg.style.display = 'block';
             } finally {
                showLoading(false);
                loginBtn.disabled = false;
            }
        }

        function copyToClipboard(elementId) {
            const text = document.getElementById(elementId).textContent;
            navigator.clipboard.writeText(text).then(() => {
                alert('已复制到剪贴板');
            }).catch(err => {
                console.error('复制失败:', err);
            });
        }
        
          // 上传节点管理 - 使用服务器下发的apiToken
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
                   }else {
                         listContainer.textContent = '当前没有节点';
                     }
              }else {
                console.error('Error loading URLs:', response.statusText);
                const listContainer = document.getElementById('currentList');
                listContainer.textContent = '加载节点列表失败!';
              }
          }
          
           async function deleteUrl(urlName) {
              const response = await fetch(\`\${getDomain()}/delete-url-\${appConfig.apiToken}\`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ urlName })
              });
              if (response.ok) {
                   await loadUrls();
              } else {
                  alert('删除失败,请重试');
              }
          }
          
          async function deleteAllUrls(){
             const response = await fetch(\`\${getDomain()}/delete-all-urls-\${appConfig.apiToken}\`,{
                    method: 'POST'
                });
              if (response.ok) {
                   await loadUrls();
                } else {
                    alert('全部删除失败,请重试');
              }
          }

        async function updateSub2() {
            const content = document.getElementById('sub2Input').value;
            const lines = content.split('\\n').filter(url => url.trim());
            
            // 验证格式:任意字符://任意字符
            const urlPattern = /^.+:\\/\\/.+$/;
            const validUrls = [];
            const invalidUrls = [];
            
            lines.forEach(line => {
                const trimmed = line.trim();
                if (urlPattern.test(trimmed)) {
                    validUrls.push(trimmed);
                } else {
                    invalidUrls.push(trimmed);
                }
            });
            
            // 如果有无效格式,提示用户
            if (invalidUrls.length > 0) {
                alert('以下内容格式不正确(需要 协议://内容 格式):\\n' + invalidUrls.join('\\n'));
                if (validUrls.length === 0) {
                    return;
                }
            }
            
            if (validUrls.length === 0) {
                alert('没有有效的链接可添加');
                return;
            }
            
           const response = await fetch(\`\${getDomain()}/update-sub2-\${appConfig.apiToken}\`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ urls: validUrls })
            });

            if (response.ok) {
                const successMsg = document.getElementById('sub2SuccessMessage');
                successMsg.style.display = 'block';
                setTimeout(() => { successMsg.style.display = 'none'; }, 3000);
                await loadSub2();
                document.getElementById('sub2Input').value = '';
            } else {
                alert('更新失败,请重试');
            }
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
                  }else{
                    listContainer.textContent = '当前没有自定义节点';
                  }
            }else {
                  console.error('Error loading sub2 URLs:', response.statusText);
                 const listContainer = document.getElementById('currentSub2List');
                listContainer.textContent = '加载自定义节点列表失败!';
            }
        }

        async function deleteSub2Url(id) {
            const response = await fetch(\`\${getDomain()}/delete-sub2-\${appConfig.apiToken}\`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id })
            });
            if (response.ok) {
                  await loadSub2();
            } else {
                alert('删除失败,请重试');
            }
        }
        
         async function deleteAllSub2Urls(){
            const response = await fetch(\`\${getDomain()}/delete-all-sub2-\${appConfig.apiToken}\`,{
                 method: 'POST'
                });
              if (response.ok) {
                   await loadSub2();
                } else {
                    alert('全部删除失败,请重试');
              }
          }
          
          // 关键词过滤管理
         async function updateKeywords() {
            const content = document.getElementById('keywordInput').value;
            const keywords = content.split('\\n').filter(keyword => keyword.trim());

            const response = await fetch(\`\${getDomain()}/update-keywords-\${appConfig.apiToken}\`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ keywords }),
            });

              if (response.ok) {
                const successMsg = document.getElementById('keywordSuccessMessage');
                successMsg.style.display = 'block';
                setTimeout(() => { successMsg.style.display = 'none'; }, 3000);
                document.getElementById('keywordInput').value = '';
                await loadKeywords();
              } else {
                  alert('更新失败,请重试');
                }
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
                   }else {
                     listContainer.textContent = '当前没有关键词';
                   }
              }else {
                   console.error('Error loading keywords:', response.statusText);
                   const listContainer = document.getElementById('currentKeywordList');
                listContainer.textContent = '加载关键词列表失败!';
              }
          }
          
            async function deleteKeyword(id) {
              const response = await fetch(\`\${getDomain()}/delete-keyword-\${appConfig.apiToken}\`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                   body: JSON.stringify({ id })
              });
              if (response.ok) {
                  await loadKeywords();
              } else {
                  alert('删除失败,请重试');
              }
          }
          
            async function deleteAllKeywords(){
               const response = await fetch(\`\${getDomain()}/delete-all-keywords-\${appConfig.apiToken}\`,{
                    method: 'POST'
                });
              if (response.ok) {
                   await loadKeywords();
                } else {
                    alert('全部删除失败,请重试');
              }
            }
            
        document.getElementById('username').addEventListener('keypress', function(e) {
            if (e.key === 'Enter' && !this.disabled) {
                login();
            }
        });
        
        document.getElementById('password').addEventListener('keypress', function(e) {
            if (e.key === 'Enter' && !this.disabled) {
                login();
            }
        });

         if(isLoggedIn){
                document.getElementById('infoBox').style.display = 'block';
            }
        
        // 页面加载时就加载背景图
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
        console.log("Database tables initialized successfully.");
    } catch (error) {
        console.log("Tables might already exist or RPC function not available:", error);
    }
}

// 获取所有节点 - 按ID排序确保新添加的在最后
async function getAllUrls(env) {
    const supabase = new SupabaseClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
    try {
        const results = await supabase.select('urls', 'url_name, url', {}, 'id.asc');
        return results
            .filter(row => row.url && typeof row.url === 'string' && !shouldExcludeUrl(row.url))
            .map(row => ({ url: row.url, urlName: row.url_name }));
    } catch (error) {
        console.error('Error getting all URLs:', error);
        return [];
    }
}

// 获取所有自定义节点 - 按ID排序确保新添加的在最后
async function getSub2Urls(env) {
    const supabase = new SupabaseClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
    try {
        const results = await supabase.select('sub2_urls', 'url, id', {}, 'id.asc');
        return results
            .filter(row => row.url && typeof row.url === 'string' && !shouldExcludeUrl(row.url))
            .map(row => ({ url: row.url, id: row.id }));
    } catch (error) {
        console.error("Error getting SUB2 URLs:", error);
        return [];
    }
}

// 获取排除关键词列表 - 按ID排序
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

    // Handle login - 密码验证成功后下发配置参数
    if (path === '/login' && request.method === 'POST') {
        return handleLogin(request, env);
    }

    // 提供背景图片配置(无需登录即可访问)
    if (path === '/get-background-config') {
        return new Response(JSON.stringify({
            backgroundImages: (CONFIG.BACKGROUND_IMAGE || '').split(';').filter(url => url.trim())
        }), {
            headers: { 'Content-Type': 'application/json' }
        });
    }

    // 管理页面路径
    if (path === `/sub-${CONFIG.UUID}`) {
        return new Response(html, {
            headers: { 'content-type': 'text/html;charset=UTF-8' },
        });
    }

    // 处理其他路径 - 使用 APITOKEN 作为 API 路径
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

// 处理登录 - 验证用户名和密码,成功后下发配置参数
async function handleLogin(request, env) {
    const { username, password } = await request.json();
    const correctPassword = env.PSWD;
    const correctUsername = CONFIG.USER;
    
    if (username === correctUsername && password === correctPassword) {
        // 用户名密码正确,下发配置参数(不下发TOKEN和UP,保证数据安全)
        return new Response(JSON.stringify({ 
            success: true,
            config: {
                apiToken: CONFIG.APITOKEN,  // API路径密钥
                maxAttempts: CONFIG.MAX_LOGIN_ATTEMPTS,
                backgroundImage: CONFIG.BACKGROUND_IMAGE
            }
        }), {
            headers: { 'Content-Type': 'application/json' }
        });
    }
    
    // 用户名或密码错误,返回最大尝试次数供前端显示
    return new Response(JSON.stringify({ 
        success: false,
        maxAttempts: CONFIG.MAX_LOGIN_ATTEMPTS
    }), {
        headers: { 'Content-Type': 'application/json' }, 
        status: 401
    });
}

// 处理删除关键词
async function handleDeleteKeyword(request, env) {
    const supabase = new SupabaseClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
    const { id } = await request.json();
    try {
        await supabase.delete('exclude_keywords', { id });
        return new Response('OK', { status: 200 });
    } catch (error) {
        console.error('Error delete keywords:', error);
        return new Response('Error delete keywords', { status: 500 });
    }
}

// 处理获取关键词
async function handleGetKeywordsRequest(env) {
    const keywords = await getExcludeKeywords(env);
    return new Response(JSON.stringify({ keywords }), {
        headers: { 'Content-Type': 'application/json' }
    });
}

// 处理更新关键词
async function handleUpdateKeywordsRequest(request, env) {
    const supabase = new SupabaseClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
    const { keywords } = await request.json();
    
    if (!Array.isArray(keywords)) {
        return new Response('Invalid keywords format', { status: 400 });
    }
    
    try {
        const existingKeywords = await getExcludeKeywords(env);
        const existingKeywordsSet = new Set(existingKeywords.map(item => item.keyword));
        const newKeywords = keywords.filter(keyword => !existingKeywordsSet.has(keyword));
        
        if (newKeywords.length > 0) {
            const keywordsData = newKeywords.map(keyword => ({ keyword }));
            await supabase.insert('exclude_keywords', keywordsData);
        }
        return new Response('OK', { status: 200 });
    } catch (error) {
        console.error('Error updating keywords:', error);
        return new Response('Error updating keywords', { status: 500 });
    }
}

// 处理删除所有关键词
async function handleDeleteAllKeywords(env) {
    const supabase = new SupabaseClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
    try {
        await supabase.rpc('delete_all_keywords');
        return new Response('OK', { status: 200 });
    } catch (error) {
        console.error('Error delete all keywords:', error);
        return new Response('Error delete all keywords', { status: 500 });
    }
}

async function handleGetUrls(env) {
    const urls = await getAllUrls(env);
    return new Response(JSON.stringify({ urls }), {
        headers: { 'Content-Type': 'application/json' }
    });
}

async function handleDeleteUrl(request, env) {
    const supabase = new SupabaseClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
    const { urlName } = await request.json();
    try {
        await supabase.delete('urls', { url_name: urlName });
        return new Response('OK', { status: 200 });
    } catch (error) {
        console.error('Error delete urls:', error);
        return new Response('Error delete urls', { status: 500 });
    }
}

async function handleDeleteAllUrls(env) {
    const supabase = new SupabaseClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
    try {
        await supabase.rpc('delete_all_urls');
        return new Response('OK', { status: 200 });
    } catch (error) {
        console.error('Error delete all urls:', error);
        return new Response('Error delete all urls', { status: 500 });
    }
}

async function handleDeleteSub2(request, env) {
    const supabase = new SupabaseClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
    const { id } = await request.json();
    try {
        await supabase.delete('sub2_urls', { id });
        return new Response('OK', { status: 200 });
    } catch (error) {
        console.error('Error delete sub2_urls:', error);
        return new Response('Error delete sub2_urls', { status: 500 });
    }
}

async function handleDeleteAllSub2Urls(env) {
    const supabase = new SupabaseClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
    try {
        await supabase.rpc('delete_all_sub2_urls');
        return new Response('OK', { status: 200 });
    } catch (error) {
        console.error('Error delete all sub2_urls:', error);
        return new Response('Error delete all sub2_urls', { status: 500 });
    }
}

async function handleUpdateSub2(request, env) {
    const supabase = new SupabaseClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
    const { urls } = await request.json();
    
    if (!Array.isArray(urls)) {
        return new Response('Invalid URLs format', { status: 400 });
    }

    try {
        const existingUrls = await getSub2Urls(env);
        const existingUrlsSet = new Set(existingUrls.map(item => item.url));

        const newUrls = urls
            .map(url => preProcessUrl(url))
            .filter(url => !shouldExcludeUrl(url))
            .filter(url => !existingUrlsSet.has(url));

        if (newUrls.length > 0) {
            const urlsData = newUrls.map(url => ({ url }));
            await supabase.insert('sub2_urls', urlsData);
        }
        return new Response('OK', { status: 200 });
    } catch (error) {
        console.error('Error updating sub2_urls:', error);
        return new Response('Error updating sub2_urls', { status: 500 });
    }
}

async function handleGetSub2(env) {
    const urls = await getSub2Urls(env);
    return new Response(JSON.stringify({ urls }), {
        headers: { 'Content-Type': 'application/json' }
    });
}

async function handleUpload(request, env) {
    const supabase = new SupabaseClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
    const { URL_NAME, URL } = await request.json();
    
    if (!URL_NAME || !URL) {
        return new Response('Missing URL_NAME or URL', { status: 400 });
    }

    let processedURL = preProcessUrl(URL);

    if (shouldExcludeUrl(processedURL)) {
        return new Response('OK', { status: 200 });
    }

    try {
        const currentTime = Date.now();
        const expirationTtl = CONFIG.EXPIRATION_TIME;

        const existingRecords = await supabase.select('urls', 'id, url', { url_name: URL_NAME });
        
        if (existingRecords && existingRecords.length > 0) {
            const existingRecord = existingRecords[0];
            if (existingRecord.url !== processedURL) {
                await supabase.update('urls', { url: processedURL, last_update: currentTime }, { id: existingRecord.id });
            } else {
                await supabase.update('urls', { last_update: currentTime }, { id: existingRecord.id });
            }
        } else {
            await supabase.insert('urls', {
                url_name: URL_NAME,
                url: processedURL,
                last_update: currentTime,
                expiration_ttl: expirationTtl
            });
        }
        return new Response('OK', { status: 200 });
    } catch (error) {
        console.error('Error in handleUpload:', error);
        return new Response('Error in handleUpload', { status: 500 });
    }
}

async function handleToken(request, env) {
    const supabase = new SupabaseClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
    const { searchParams } = new URL(request.url);
    const cf_ip = searchParams.get('cf_ip');
    const cf_port = searchParams.get('cf_port');
    
    if (!cf_ip || !cf_port) {
        return new Response('Missing cf_ip or cf_port in query parameters', { status: 400 });
    }
    
    // 清理过期数据
    try {
        const expiredTime = Date.now() - CONFIG.EXPIRATION_TIME * 1000;
        await supabase.rpc('delete_expired_urls', { expired_time: expiredTime });
    } catch (error) {
        console.error('Error delete expired urls:', error);
    }

    // 获取上传节点URLs
    let urls = await getAllUrls(env);
    urls = urls.map(item => item.url);

    // 获取自定义节点URLs
    const sub2Urls = await getSub2Urls(env);
    urls = urls.concat(sub2Urls.map(item => item.url));

    // 获取关键词过滤列表
    const excludeList = await getExcludeKeywords(env);
    const filterUrls = urls.filter(url => !excludeList.some(item => url.includes(item.keyword)));

    // 处理所有URLs
    urls = filterUrls.map(url => {
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

    // 处理编码
    urls = urls.map(url => {
        if ((url.startsWith('{BASS}://') || url.startsWith(`${PROTOCOL.pm}ess://`))) {
            const afterProtocol = url.split('://')[1];
            if (afterProtocol) {
                const firstNonSpaceChar = afterProtocol.trimStart().charAt(0);
                if (firstNonSpaceChar === '{') {
                    let content = url.split('://')[1];
                    let encodedContent = btoa(content);
                    return `${PROTOCOL.pm}ess://` + encodedContent;
                }
            }
        }
        return url;
    });

    // 处理订阅链接
    let finalUrls = [];
    for (const url of urls) {
        if (url.toLowerCase().startsWith('http://') || url.toLowerCase().startsWith('https://')) {
            try {
                const response = await fetch(url);
                let content = await response.text();

                const isHtmlContent = (content) => {
                    const lowerContent = content.toLowerCase().trim();
                    return lowerContent.includes('<html>') || 
                           lowerContent.includes('<!doctype html>') ||
                           lowerContent.includes('<head>') ||
                           lowerContent.includes('<body>');
                };

                if (isHtmlContent(content)) {
                    console.log('订阅链接失效,返回了HTML页面,跳过:', url);
                    continue;
                }

                try { content = atob(content); } catch (e) {}

                const subUrls = content.split('\n')
                    .filter(line => line.trim())
                    .filter(line => !excludeList.some(item => line.includes(item.keyword)));
                finalUrls = finalUrls.concat(subUrls);
            } catch (error) {
                console.error('处理订阅链接失败:', error);
            }
        } else {
            finalUrls.push(url);
        }
    }

    let content = finalUrls.join('\n');
    let encodedContent;
    try {
        encodedContent = encodeToBase64(content);
    } catch (error) {
        console.error('Error in encodeToBase64:', error);
        return new Response('Error in encodeToBase64', { status: 500 });
    }
    
    if (encodedContent === null) {
        return new Response('Error encodeToBase64', { status: 500 });
    }

    return new Response(encodedContent, { headers: { 'Content-Type': 'text/plain' } });
}

function encodeToBase64(str) {
    try {
        const encoder = new TextEncoder();
        const byteArray = encoder.encode(str);
        let binary = '';
        byteArray.forEach(byte => { binary += String.fromCharCode(byte); });
        return btoa(binary);
    } catch (error) {
        console.error("Error encoding to base64:", error);
        return null;
    }
}
