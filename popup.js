// 加载通知数据
    async function loadNotifications() {
      console.log('[OA_GET] [Popup] 开始加载通知数据');
      const container = document.getElementById('notifications-container');
      container.innerHTML = '<div class="empty-state">加载中...</div>';
      
      try {
        // 从background获取通知
        console.log('[OA_GET] [Popup] 发送消息到background请求通知数据');
        const response = await chrome.runtime.sendMessage({ action: 'getTodayNotifications' });
        console.log('[OA_GET] [Popup] 收到background响应:', response ? '成功' : '失败');
        
        const notifications = response?.notifications || [];
        console.log('[OA_GET] [Popup] 获取到通知数量:', notifications.length);
        
        if (notifications.length === 0) {
          console.log('[OA_GET] [Popup] 暂无通知，显示空状态');
          container.innerHTML = '<div class="empty-state">今日暂无通知</div>';
        } else {
          console.log('[OA_GET] [Popup] 开始渲染通知列表');
          container.innerHTML = '';
          
          notifications.forEach((notification, index) => {
            console.log(`[OA_GET] [Popup] 渲染通知项 #${index + 1}:`, notification.title);
            const item = document.createElement('div');
            item.className = 'notification-item';
            item.innerHTML = `
              <div class="notification-title">
          <a href="${notification.url}" target="_blank">${notification.title}</a>
        </div>
        <div class="notification-meta">
          <span>发布单位: ${notification.department}</span>
          <span>发布时间: ${notification.time || '未知'}</span>
          <span>间隔: ${notification.hoursDiff !== undefined ? notification.hoursDiff.toFixed(1) + '小时' : '未知'}</span>
        </div>
            `;
            container.appendChild(item);
          });
          
          console.log('[OA_GET] [Popup] 通知列表渲染完成');
        }
      } catch (error) {
        console.error('[OA_GET] [Popup] 加载通知失败:', error);
        container.innerHTML = '<div class="empty-state">加载失败，请稍后重试</div>';
      }
    }

    // 监听来自background的通知数据（用于自动弹出窗口）
    chrome.runtime.onMessage.addListener((message) => {
      console.log('[OA_GET] [Popup] 收到来自background的消息:', message);
      
      if (message.notifications) {
        console.log('[OA_GET] [Popup] 收到通知数据，数量:', message.notifications.length);
        const container = document.getElementById('notifications-container');
        container.innerHTML = '';
        
        console.log('[OA_GET] [Popup] 开始渲染自动弹出的通知列表');
        message.notifications.forEach((notification, index) => {
          console.log(`[OA_GET] [Popup] 渲染自动弹出通知项 #${index + 1}:`, notification.title);
          const item = document.createElement('div');
          item.className = 'notification-item';
          item.innerHTML = `
            <div class="notification-title">
          <a href="${notification.url}" target="_blank">${notification.title}</a>
        </div>
        <div class="notification-meta">
          <span>发布单位: ${notification.department}</span>
          <span>发布时间: ${notification.time || '未知'}</span>
          <span>间隔: ${notification.hoursDiff !== undefined ? notification.hoursDiff.toFixed(1) + '小时' : '未知'}</span>
        </div>
          `;
          container.appendChild(item);
        });
        
        console.log('[OA_GET] [Popup] 自动弹出通知列表渲染完成');
      }
    });

    // 刷新按钮事件
    document.getElementById('refresh-btn').addEventListener('click', () => {
      console.log('[OA_GET] [Popup] 用户点击了刷新按钮');
      loadNotifications();
    });

    // 页面加载时自动加载通知
    window.addEventListener('load', () => {
      console.log('[OA_GET] [Popup] 页面加载完成，开始自动加载通知');
      loadNotifications();
    });

    // 为通知链接添加点击日志
    document.addEventListener('click', (event) => {
      if (event.target.tagName === 'A' && event.target.href.includes('oa.jlu.edu.cn')) {
        console.log('[OA_GET] [Popup] 用户点击了通知链接:', event.target.href);
      }
    });